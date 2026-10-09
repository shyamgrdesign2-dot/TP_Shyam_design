import React, { useState, useEffect, useRef } from "react";
import { Button, Card } from "antd";
import { exportToBlob } from "@excalidraw/excalidraw";
import {
  TransformWrapper,
  TransformComponent,
  useControls,
} from "react-zoom-pan-pinch";
import CommonModal from "../../../common/CommonModal";
import { ASSETS } from "../../../assets";

const alertIcon = ASSETS.images.alerticon;

const CanvasPreview = ({
  onClose,
  canvasName,
  scene,
  handleEdit,
  handleDelete,
  handleDownload,
}) => {
  const [scale, setScale] = useState(1.0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const controlsTimeoutRef = useRef(null);

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const generatePreview = async () => {
      if (scene) {
        try {
          const blob = await exportToBlob({
            elements: scene.elements || [],
            appState: { ...scene.appState, exportBackground: true },
            files: scene.files || {},
            mimeType: "image/png",
          });
          if (isMounted) {
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
          }
        } catch (error) {
          console.error("Error generating canvas preview:", error);
        }
      }
    };
    generatePreview();
    return () => {
      isMounted = false;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  const Controls = ({ handleImgZoomOut, handleImgZoomIn }) => {
    return (
      <div
        className="controls mb-4 d-flex align-items-center"
        style={{
          background: "rgba(0, 0, 0, 0.8)",
          padding: 12,
          borderRadius: 12,
          columnGap: 30,
          position: "absolute",
          bottom: 30,
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", columnGap: "8px" }}>
          <Button
            type="text"
            className="btn btn-delete-prescription px-0 focus-none h-100"
            onClick={handleImgZoomOut}
          >
            <i className="icon-minus" style={{ color: "white" }} />
          </Button>
          <span
            className="mx-2 document-measurement document-measurement-box text-white"
            style={{ minWidth: 70, textAlign: "center" }}
          >
            {Math.round(scale * 100)}%
          </span>
          <Button
            type="text"
            className="btn btn-delete-prescription px-0 focus-none h-100"
            onClick={handleImgZoomIn}
          >
            <i className="icon-Add" style={{ color: "white" }} />
          </Button>
        </div>
      </div>
    );
  };

  const ImageControls = () => {
    const { zoomIn, zoomOut } = useControls();

    const handleImgZoomIn = () => {
      zoomIn();
      setScale((prevScale) => prevScale + 0.2);
    };

    const handleImgZoomOut = () => {
      zoomOut();
      setScale((prevScale) => (prevScale - 0.2 > 1 ? prevScale - 0.2 : 1));
    };

    return (
      <Controls
        handleImgZoomOut={handleImgZoomOut}
        handleImgZoomIn={handleImgZoomIn}
      />
    );
  };

  return (
    <div onMouseMove={resetControlsTimeout} style={{ height: "100%", background: "#222222" }}>
      <Card bordered={false} className="search-modalCard" style={{ background: "#222222", border: "none" }}>
        <div style={{ position: "sticky", top: "0px", zIndex: 2 }}>
          <div
            className="h-60 align-items-center justify-content-between d-flex"
            style={{ background: "#222222", padding: "0" }}
          >
            <div className="align-items-center d-flex">
              <Button
                type="text"
                className="btn btn-delete-prescription px-3 focus-none h-100"
                onClick={onClose}
              >
                <i className="icon-right text-white" />
              </Button>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <span className="text-white" style={{ fontSize: 16, fontWeight: 500 }}>
                  Drawing Canvas
                </span>
                <span className="document-separator" style={{ background: "white", width: "1px", height: "14px", display: "inline-block" }} />
                <span className="document-date text-white">
                  {canvasName || "Untitled Canvas"}
                </span>
              </div>
            </div>
            <div className="align-items-center d-flex gap-4" style={{ padding: "20px" }}>
              <i
                className="icon-download"
                style={{ cursor: "pointer", color: "white" }}
                onClick={() => {
                  if (handleDownload && previewUrl) {
                    handleDownload(previewUrl, canvasName);
                  } else if (previewUrl) {
                    const a = document.createElement("a");
                    a.href = previewUrl;
                    a.download = `${canvasName || 'canvas'}.png`;
                    a.click();
                  }
                }}
              />

              <i
                className="icon-delete"
                style={{ cursor: "pointer", color: "white" }}
                onClick={() => setIsDeleteModalOpen(true)}
              />
              <i
                className="icon-Edit"
                style={{ cursor: "pointer", color: "white" }}
                onClick={handleEdit}
              />

              <Button
                className="btn btn-primary3 btn-text-white px-4 btn-41"
                onClick={onClose}
                style={{ background: "#4B4AD5", borderColor: "#4B4AD5", color: "white" }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="d-flex flex-column justify-content-center align-items-center" style={{ height: "calc(100vh - 100px)", background: "#222222" }}>
        <div
          className="pdf-container"
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: "10px",
          }}
        >
          {previewUrl && (
            <TransformWrapper
              initialScale={1}
              options={{ zoomStep: 0.2 }}
              onTransformed={(e) => {
                setScale(e.state.scale);
              }}
            >
              {({ zoomIn, zoomOut, ...rest }) => (
                <>
                  {showControls && <ImageControls />}
                  <TransformComponent>
                    <div
                      style={{
                        width: "100vw",
                        height: "100%",
                        position: "relative",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <img
                        src={previewUrl}
                        alt="canvas-preview"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "80vh",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          )}
        </div>
      </div>

      <CommonModal
        isModalOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        modalWidth={510}
        zIndex={4000}
        title="Are you sure you want to delete this Canvas?"
        modalBody={
          <>
            <div className="alert-warning rounded-10px p-2 patient-details mt-2">
              <div className="d-flex align-items-center">
                <img className="me-3" src={alertIcon} alt="Warning" />
                <span>
                  This action cannot be undone. The &quot;<strong>{canvasName || "Untitled Canvas"}</strong>&quot; canvas cannot be recovered once deleted
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div
                  onClick={() => {
                    if (handleDelete) handleDelete();
                    setIsDeleteModalOpen(false);
                  }}
                  className="me-4 text-decoration-underline text-danger"
                  style={{ cursor: "pointer", fontWeight: 500 }}
                >
                  Delete Canvas
                </div>
                <Button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="btn btn-primary3 btn-41 px-4"
                  style={{ minWidth: 100 }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </>
        }
      />
    </div>
  );
};

export default CanvasPreview;
