import React, { useState, useEffect, useCallback } from "react";
import { Drawer, Button, Input, message } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { exportToBlob } from "@excalidraw/excalidraw";
import "./SaveTemplateDrawer.scss";

const buildTemplatePayload = (excalidrawAPI) => {
  if (!excalidrawAPI) return null;
  const currentAppState = excalidrawAPI.getAppState();
  const sanitizedAppState = {
    theme: currentAppState.theme,
    viewBackgroundColor: currentAppState.viewBackgroundColor,
    gridSize: currentAppState.gridSize,
    name: currentAppState.name,
    scrollX: currentAppState.scrollX,
    scrollY: currentAppState.scrollY,
    zoom: currentAppState.zoom,
  };
  return {
    elements: excalidrawAPI.getSceneElements(),
    appState: sanitizedAppState,
    files: excalidrawAPI.getFiles(),
  };
};

const SaveTemplateDrawer = ({
  open,
  onClose,
  getExcalidrawApi,
  onSaveTemplate,
}) => {
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [templatePreviewUrl, setTemplatePreviewUrl] = useState(null);
  const [isSubmittingTemplate, setIsSubmittingTemplate] = useState(false);

  const closeDrawer = useCallback(() => {
    onClose?.();
    setTemplateNameInput("");
    setIsSubmittingTemplate(false);
    setTemplatePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [onClose]);

  useEffect(() => {
    if (open) {
      setTemplateNameInput("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const excalidrawAPI = getExcalidrawApi?.();
    if (!excalidrawAPI) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const elements = excalidrawAPI.getSceneElements();
        const currentAppState = excalidrawAPI.getAppState();
        const files = excalidrawAPI.getFiles();

        if (!elements?.length) {
          if (!cancelled) {
            setTemplatePreviewUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return null;
            });
          }
          return;
        }

        const blob = await exportToBlob({
          elements,
          appState: {
            ...currentAppState,
            exportWithDarkMode: false,
            viewBackgroundColor: currentAppState.viewBackgroundColor || "#ffffff",
          },
          files,
          mimeType: "image/png",
          quality: 0.8,
        });

        if (cancelled) return;

        const url = URL.createObjectURL(blob);
        setTemplatePreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (e) {
        console.error("Template preview export failed", e);
        if (!cancelled) {
          setTemplatePreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, getExcalidrawApi]);

  const handleConfirmSaveTemplate = async () => {
    const excalidrawAPI = getExcalidrawApi?.();
    if (!excalidrawAPI || !onSaveTemplate) return;
    const name = templateNameInput.trim();
    if (!name) return;

    const payload = buildTemplatePayload(excalidrawAPI);
    if (!payload) return;

    setIsSubmittingTemplate(true);
    try {
      const ok = await Promise.resolve(onSaveTemplate(payload, name));
      if (ok === true) {
        message.open({
          type: "success",
          content: "Canvas Template saved successfully",
          className: "canvas-template-saved-message",
          style: { zIndex: 5000 },
          duration: 3,
        });
        closeDrawer();
      }
    } catch (e) {
      message.open({
        type: "error",
        content: e?.message || "Template save failed",
        style: { zIndex: 5000 },
        duration: 4,
      });
    } finally {
      setIsSubmittingTemplate(false);
    }
  };

  return (
    <Drawer
      title={null}
      placement="right"
      width={440}
      open={open}
      closable={false}
      onClose={closeDrawer}
      zIndex={3000}
      maskClosable
      destroyOnClose={false}
      bodyStyle={{ padding: 0 }}
      rootStyle={{ top: 0 }}
    >
      <div className="save-template-drawer">
        <div className="save-template-drawer__header">
          <button
            type="button"
            className="save-template-drawer__icon-btn"
            onClick={closeDrawer}
            aria-label="Close"
          >
            <CloseOutlined />
          </button>
          <h2 className="save-template-drawer__title">Save This Canvas as a Template</h2>
          <Button
            type="primary"
            className="save-template-drawer__save-btn"
            disabled={!templateNameInput.trim() || isSubmittingTemplate}
            loading={isSubmittingTemplate}
            onClick={handleConfirmSaveTemplate}
          >
            Save
          </Button>
        </div>

        <div className="save-template-drawer__body">
          <label className="save-template-drawer__label" htmlFor="template-name-input-save">
            Enter Template Name
          </label>
          <div className="save-template-drawer__input-wrap">
            <Input
              id="template-name-input-save"
              value={templateNameInput}
              onChange={(e) => setTemplateNameInput(e.target.value.slice(0, 30))}
              maxLength={30}
              placeholder="e.g., Dental Diagram"
              className="save-template-drawer__input"
              autoFocus
            />
            <span className="save-template-drawer__counter">
              {templateNameInput.length}/30
            </span>
          </div>

          <p className="save-template-drawer__label save-template-drawer__label--preview">Template Preview</p>
          <div className="save-template-drawer__preview">
            {templatePreviewUrl ? (
              <img src={templatePreviewUrl} alt="Template preview" className="save-template-drawer__preview-img" />
            ) : (
              <span className="save-template-drawer__preview-empty">Nothing to preview yet</span>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
};

export default SaveTemplateDrawer;
