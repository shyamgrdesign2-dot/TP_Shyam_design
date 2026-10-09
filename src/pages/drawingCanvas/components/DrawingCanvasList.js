import React from "react";
import { Col } from "react-bootstrap";
import { Row } from "antd";
import DrawingCanvasCard from "./DrawingCanvasCard";

const DrawingCanvasList = ({ drawingCanvases, setDrawingCanvases, handleDrawerDrawingCanvas }) => {
  if (!drawingCanvases || drawingCanvases.length === 0) return null;

  return (
    <div className="px-14 pb-14 mt-3">
      <Row sm={2} md={2} lg={2} style={{ columnGap: "14px" }}>
        {drawingCanvases.slice(0, 2)?.map((canvas, index) => {
          return (
            <Col key={index} className="gx-4" style={{ width: "calc(50% - 7px)" }}>
              <div style={{ cursor: "pointer" }}>
                <DrawingCanvasCard
                  canvas={canvas}
                  rxDrawingCanvasIds={[]}
                  onToggleRx={() => {}}
                  onOpen={handleDrawerDrawingCanvas}
                  onPreview={handleDrawerDrawingCanvas}
                  onRename={(canvas, newName) => {
                    setDrawingCanvases(prev => prev.map(c => c.id === canvas.id ? { ...c, name: newName } : c));
                  }}
                  onDuplicate={(canvas) => {
                    const newCanvas = { ...canvas, id: `new_${Date.now()}`, name: `${canvas.name || canvas.title} (Copy)` };
                    setDrawingCanvases(prev => [newCanvas, ...prev]);
                  }}
                  onDelete={(canvas) => {
                    setDrawingCanvases(prev => prev.filter(c => c.id !== canvas.id));
                  }}
                  hideShowInRx={true}
                  hideMoreOptions={true}
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
