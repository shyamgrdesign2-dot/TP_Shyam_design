import React from "react";
import { Col } from "react-bootstrap";
import { Row } from "antd";
import DrawingCanvasCard from "./DrawingCanvasCard";

// Defaults match the legacy left-column usage in Prescription.js (two cards, no
// overflow menu, no Rx toggle). The NewRx sidenav opts into the fuller treatment.
const DrawingCanvasList = ({
  drawingCanvases,
  setDrawingCanvases,
  handleDrawerDrawingCanvas,
  rxDrawingCanvasIds = [],
  onToggleRx,
  hideShowInRx = true,
  hideMoreOptions = true,
  hiddenMenuKeys = [],
  maxItems = 2,
}) => {
  if (!drawingCanvases || drawingCanvases.length === 0) return null;

  const visibleCanvases = maxItems ? drawingCanvases.slice(0, maxItems) : drawingCanvases;

  return (
    <div className="px-14 pb-14 mt-3">
      <Row sm={2} md={2} lg={2} style={{ columnGap: "14px" }}>
        {visibleCanvases?.map((canvas, index) => {
          return (
            <Col key={canvas?.id ?? index} className="gx-4" style={{ width: "calc(50% - 7px)" }}>
              <div style={{ cursor: "pointer" }}>
                <DrawingCanvasCard
                  canvas={canvas}
                  rxDrawingCanvasIds={rxDrawingCanvasIds}
                  onToggleRx={(checked) => onToggleRx?.(canvas?.id, checked)}
                  // Add/Edit and Preview need the Excalidraw editor and preview modal,
                  // which only exist inside the DrawingCanvas drawer.
                  onOpen={handleDrawerDrawingCanvas}
                  onPreview={handleDrawerDrawingCanvas}
                  onRename={(renamed, newName) => {
                    setDrawingCanvases(prev => prev.map(c => c.id === renamed.id ? { ...c, name: newName } : c));
                  }}
                  onDelete={(deleted) => {
                    setDrawingCanvases(prev => prev.filter(c => c.id !== deleted.id));
                  }}
                  hideShowInRx={hideShowInRx}
                  hideMoreOptions={hideMoreOptions}
                  hiddenMenuKeys={hiddenMenuKeys}
                />
              </div>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default DrawingCanvasList;
