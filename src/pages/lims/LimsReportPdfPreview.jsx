import React, { useCallback, useEffect, useRef, useState } from "react";
import { Spin } from "antd";
import { pdf } from "@react-pdf/renderer";
import { Document, Page, pdfjs } from "react-pdf";

import LimsReportPdf from "./LimsReportPdf";
import styles from "./LimsReportPdfPreview.module.css";

const worker = require("pdfjs-dist/build/pdf.worker.min.js");
pdfjs.GlobalWorkerOptions.workerSrc = worker;

/**
 * Renders a live paginated preview from the same LimsReportPdf document
 * used for LIMS print and download.
 */
export default function LimsReportPdfPreview({
  results = [],
  patient = {},
  printSettings,
  fileHeader,
  fileFooter,
  fileLogo,
  fileWatermark,
  fileSignature,
  className,
  previewClassName,
  loadingText = "Preparing preview...",
  onReadyChange,
}) {
  const containerRef = useRef(null);
  const onReadyChangeRef = useRef(onReadyChange);
  onReadyChangeRef.current = onReadyChange;
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [previewNumPages, setPreviewNumPages] = useState(0);
  const [previewPdfReady, setPreviewPdfReady] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(0);

  useEffect(() => {
    if (!printSettings) return;
    let cancelled = false;

    const buildPreview = async () => {
      setPreviewLoading(true);
      setPreviewPdfReady(false);
      setPreviewNumPages(0);
      onReadyChangeRef.current?.(false);

      try {
        const blob = await pdf(
          <LimsReportPdf
            results={results}
            patient={patient}
            printSettings={printSettings}
            fileHeader={fileHeader}
            fileFooter={fileFooter}
            fileLogo={fileLogo}
            fileWatermark={fileWatermark}
            fileSignature={fileSignature}
          />,
        ).toBlob();
        if (cancelled) return;

        const url = URL.createObjectURL(blob);
        setPreviewPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (error) {
        if (!cancelled) {
          console.error("LIMS preview PDF failed:", error);
          setPreviewPdfUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    };

    buildPreview();
    return () => {
      cancelled = true;
    };
  }, [
    results,
    patient,
    printSettings,
    fileHeader,
    fileFooter,
    fileLogo,
    fileWatermark,
    fileSignature,
  ]);

  useEffect(
    () => () => {
      setPreviewPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    },
    [],
  );

  useEffect(() => {
    const updateWidth = () => {
      setPreviewWidth(containerRef.current?.offsetWidth || 0);
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [previewPdfUrl, previewPdfReady]);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }) => {
      setPreviewNumPages(numPages);
      setPreviewPdfReady(true);
      onReadyChangeRef.current?.(true);
    },
    [],
  );

  if (!printSettings) {
    return <div className={styles.emptyState}>Loading print settings...</div>;
  }

  if (previewLoading && !previewPdfUrl) {
    return (
      <div className={styles.loadingState}>
        <Spin />
        <span>{loadingText}</span>
      </div>
    );
  }

  if (!previewPdfUrl) {
    return <div className={styles.emptyState}>Failed to prepare preview.</div>;
  }

  const containerClassName = [
    previewClassName || `printheight ${styles.pdfPreview}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={containerRef} className={containerClassName}>
      <Document
        loading={
          <div className={styles.loadingState}>
            <Spin />
          </div>
        }
        error={<div className={styles.emptyState}>Failed to load PDF preview.</div>}
        file={previewPdfUrl}
        onLoadSuccess={onDocumentLoadSuccess}
      >
        {Array.from({ length: previewNumPages }, (_, index) => index + 1).map(
          (page) => (
            <Page
              key={page}
              className={previewPdfReady ? "react-pdf__Page_afterload" : undefined}
              loading={null}
              width={previewWidth || undefined}
              pageNumber={page}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          ),
        )}
      </Document>
    </div>
  );
}
