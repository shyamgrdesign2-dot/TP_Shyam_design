import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Spin } from "antd";
import styles from "./PlanPdfPreview.module.scss";

const worker = require("pdfjs-dist/build/pdf.worker.min.js");
pdfjs.GlobalWorkerOptions.workerSrc = worker;

export function PlanPdfPreview({ pdfUrl, loading, error, onNumPages }) {
  const divRef = useRef(null);
  const [divWidth, setDivWidth] = useState(0);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      if (divRef.current) {
        setDivWidth(divRef.current.getBoundingClientRect().width);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    setNumPages(0);
  }, [pdfUrl]);

  if (loading) {
    return (
      <div className={styles.centered}>
        <Spin size="large" />
        <p className={styles.loadingText}>Generating preview…</p>
      </div>
    );
  }

  if (error) {
    return <div className={styles.centered}>{error}</div>;
  }

  if (!pdfUrl) {
    return <div className={styles.centered}>No preview available.</div>;
  }

  return (
    <div ref={divRef} className={styles.previewRoot}>
      <Document
        file={pdfUrl}
        loading={
          <div className={styles.centered}>
            <Spin />
          </div>
        }
        onLoadSuccess={({ numPages: pages }) => {
          setNumPages(pages);
          onNumPages?.(pages);
        }}
      >
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
          <Page
            key={pageNumber}
            pageNumber={pageNumber}
            width={divWidth > 40 ? divWidth - 8 : 520}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className={styles.page}
          />
        ))}
      </Document>
    </div>
  );
}
