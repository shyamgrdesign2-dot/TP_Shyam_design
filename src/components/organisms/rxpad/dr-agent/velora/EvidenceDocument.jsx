"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { CopilotIcon } from './CopilotIcon';
import s from './EvidenceDrawer.module.scss';

export function EvidenceDocument({ row, patient, live }) {
  const pages = useRef(null), viewportRef = useRef(null);
  const [position, setPosition] = useState({ page: 1 });
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    // The current live evidence API returns extracted records, not original files.
    if (live) return;
    let cancelled = false, task, downloadUrl;
    const renders = [];
    const container = pages.current;
    async function load() {
      try {
        const [{ createSampleEvidencePdf }, pdfjs] = await Promise.all([import('./sampleEvidencePdf'), import('pdfjs-dist/build/pdf.mjs')]);
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        const bytes = await createSampleEvidencePdf(row, patient);
        if (cancelled) return;
        downloadUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        task = pdfjs.getDocument({ data: bytes.slice(), isEvalSupported: false });
        const pdf = await task.promise;
        container.replaceChildren();
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.7 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width; canvas.height = viewport.height;
          canvas.setAttribute('role', 'img');
          canvas.setAttribute('aria-label', `${row.title} — complete PDF page ${i} of ${pdf.numPages}`);
          container.append(canvas);
          const render = page.render({ canvasContext: canvas.getContext('2d'), viewport });
          renders.push(render); await render.promise;
        }
        if (!cancelled) setState({ loading: false, count: pdf.numPages, downloadUrl });
      } catch {
        if (!cancelled) setState({ loading: false, error: true });
      }
    }
    load();
    return () => { cancelled = true; renders.forEach(render => render.cancel()); task?.destroy(); if (downloadUrl) URL.revokeObjectURL(downloadUrl); };
  }, [row, patient, live]);
  const updatePosition = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || !pages.current?.children.length) return;
    const bounds = viewport.getBoundingClientRect();
    let page = 1, largestVisible = -1;
    [...pages.current.children].forEach((canvas, index) => {
      const rect = canvas.getBoundingClientRect();
      const visible = Math.max(0, Math.min(rect.bottom, bounds.bottom) - Math.max(rect.top, bounds.top));
      if (visible > largestVisible) { page = index + 1; largestVisible = visible; }
    });
    setPosition(previous => previous.page === page ? previous : { page });
  }, []);
  useEffect(() => {
    if (!state.count) return;
    const observer = new ResizeObserver(updatePosition);
    observer.observe(viewportRef.current);
    observer.observe(pages.current);
    return () => observer.disconnect();
  }, [state.count, updatePosition]);
  const goToPage = page => {
    const canvas = pages.current?.children[page - 1], viewport = viewportRef.current;
    if (!canvas || !viewport) return;
    const top = canvas.getBoundingClientRect().top - viewport.getBoundingClientRect().top + viewport.scrollTop;
    viewport.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  if (live) return <div className={s.fileUnavailable}><CopilotIcon name="document-text" size={22} /><strong>Original document unavailable</strong><p>The source API returned an extracted record without its original PDF or uploaded file.</p></div>;
  return <div className={s.document}>
    {state.loading && <div className={s.documentLoading} role="status">Loading document…</div>}
    {state.error && <p role="alert" className={s.documentLoading}>The document could not be displayed. Collapse and reopen this record to try again.</p>}
    <div className={s.viewerFrame}>
      <div ref={viewportRef} className={s.documentViewport} role="region" aria-label="Source document pages" tabIndex={0} onScroll={updatePosition}><div ref={pages} className={s.pdfPages} /></div>
      {state.count && <>
        <div className={s.pageControls} role="group" aria-label="Document page controls">
          <button type="button" aria-label="Previous page" disabled={position.page <= 1} onClick={() => goToPage(position.page - 1)}><CopilotIcon name="arrow-short-left" variant="linear" size={16} /></button>
          <span className={s.pageLabel} aria-live="polite" aria-atomic="true">Page <strong>{position.page}</strong> of {state.count}</span>
          <button type="button" aria-label="Next page" disabled={position.page >= state.count} onClick={() => goToPage(position.page + 1)}><CopilotIcon name="arrow-short-right" variant="linear" size={16} /></button>
          <span className={s.controlDivider} aria-hidden="true" />
          <a href={state.downloadUrl} download={`${row.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`} aria-label="Download document" title="Download document"><CopilotIcon name="document-download" variant="linear" size={18} /></a>
        </div>
      </>}
    </div>
  </div>;
}
