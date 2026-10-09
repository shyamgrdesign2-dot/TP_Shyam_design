import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Button, Drawer, message } from "antd";
import { saveAs } from "file-saver";

import DrawingCanvasEmptyState from "./components/DrawingCanvasEmptyState";
import DrawingCanvasCard from "./components/DrawingCanvasCard";
import ExcalidrawEditor from "./components/ExcalidrawEditor";
import TemplatesDrawer from "./components/TemplatesDrawer";
import SaveTemplateDrawer from "./components/SaveTemplateDrawer";
import CanvasPreview from "./components/CanvasPreview";
import { 
  createCustomCanvas, 
  linkCanvasToPatient, 
  editMapping,
  getShowCanvasPopup,
  setShowCanvasPopup
} from "./service";
import { trackEvent } from "../../utils/utils";

import "./DrawingCanvas.scss";
import { formatCanvasDefaultNameDateSuffix } from "./utils/canvasDateFormat";

const DrawingCanvas = ({
  patientId = null,
  tcmId = null,
  canvases = [],
  rxDrawingCanvasIds = [],
  onToggleRx = () => {},
  onCreateCanvas = () => {},
  onSave = () => {},
  onClose = null,
  onKnowMore = () => {},
  trackingAttrs = {},
}) => {
  const emptyScene = { elements: [], appState: {}, files: {} };
  const fromProps = Array.isArray(canvases) && canvases.length > 0;

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorCanvasId, setEditorCanvasId] = useState(null);
  const [internalCanvases, setInternalCanvases] = useState(canvases || []);
  const [templateDrawerOpen, setTemplateDrawerOpen] = useState(false);
  const [shouldShowPreview, setShouldShowPreview] = useState(false);
  const [previewCanvasId, setPreviewCanvasId] = useState(null);
  const [templateData, setTemplateData] = useState(null);
  const [templateTrigger, setTemplateTrigger] = useState(0);
  const [templatesRefreshKey, setTemplatesRefreshKey] = useState(0);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [saveTemplateDrawerOpen, setSaveTemplateDrawerOpen] = useState(false);
  const excalidrawApiRef = useRef(null);

  const hasCanvases = Array.isArray(internalCanvases) && internalCanvases.length > 0;
  const normalizedRxDrawingCanvasIds = useMemo(() => {
    if (Array.isArray(rxDrawingCanvasIds)) return rxDrawingCanvasIds;
    if (typeof rxDrawingCanvasIds === "string") {
      return rxDrawingCanvasIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
    }
    return [];
  }, [rxDrawingCanvasIds]);

  const editorInitialShowInRx = useMemo(() => {
    if (editorCanvasId === "new" || editorCanvasId == null) return true;
    return normalizedRxDrawingCanvasIds.some((id) => String(id) === String(editorCanvasId));
  }, [editorCanvasId, normalizedRxDrawingCanvasIds]);

  useEffect(() => {
    setInternalCanvases(prev => {
      if (!Array.isArray(canvases)) return prev;
      return canvases.map(newCanvas => {
        const existing = prev.find(p => p.id === newCanvas.id);
        if (existing && existing.scene && (existing.url === newCanvas.url || !newCanvas.url)) {
          return { ...newCanvas, scene: existing.scene };
        }
        return newCanvas;
      });
    });
  }, [canvases]);
  
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await getShowCanvasPopup();
        if (res.status && typeof res.isCanvasPopup !== 'undefined') {
          setIsFirstTimeUser(res.isCanvasPopup);
          if (res.isCanvasPopup) {
            trackEvent("drawing_canvas_ftue_viewed", {
              ...trackingAttrs,
              doctor_speciality: trackingAttrs?.specialty || trackingAttrs?.doctor_speciality,
            });
          }
        } else if (!res?.status) {
          trackEvent("drawing_canvas_api_failed", {
            ...trackingAttrs,
            api_name: "getShowCanvasPopup",
            error_code: res?.code || "UNKNOWN",
            error_message: res?.message || "Failed to fetch FTUE metadata",
          });
        }
      } catch (error) {
        trackEvent("drawing_canvas_api_failed", {
          ...trackingAttrs,
          api_name: "getShowCanvasPopup",
          error_code: error?.code || "EXCEPTION",
          error_message: error?.message || "Failed to fetch FTUE metadata",
        });
      }
    };
    fetchMetadata();
  }, [trackingAttrs]);

  const openEditorForCanvas = useCallback(async (canvasId) => {
    // If scene is missing but we have a url, fetch it
    const canvas = internalCanvases.find(c => c.id === canvasId);
    const sceneUrl = canvas?.url || canvas?.canvas_url;
    if (canvas && !canvas.scene && sceneUrl) {
      try {
        const res = await fetch(sceneUrl.replace(/^http:\/\//i, "https://"));
        const textData = await res.text();
        const sceneData = JSON.parse(textData);
        setInternalCanvases(prev => prev.map(c => c.id === canvasId ? { ...c, scene: sceneData } : c));
      } catch (err) {
        console.error("Failed to load scene from url", err);
        trackEvent("drawing_canvas_corrupt_scene_detected", {
          ...trackingAttrs,
          canvas_id: canvasId,
          render_context: "editor_load",
        });
      }
    }
    setEditorCanvasId(canvasId);
    setEditorOpen(true);
  }, [internalCanvases]);

  const previewCanvas = useCallback(async (canvas) => {
    const sceneUrl = canvas?.url || canvas?.canvas_url;
    if (!canvas.scene && sceneUrl) {
      try {
        const res = await fetch(sceneUrl.replace(/^http:\/\//i, "https://"));
        const textData = await res.text();
        const sceneData = JSON.parse(textData);
        setInternalCanvases(prev => prev.map(c => c.id === canvas.id ? { ...c, scene: sceneData } : c));
      } catch (err) {
        console.error("Failed to load scene from url", err);
        trackEvent("drawing_canvas_corrupt_scene_detected", {
          ...trackingAttrs,
          canvas_id: canvas?.id,
          render_context: "preview_load",
        });
      }
    }
    trackEvent("drawing_canvas_preview_opened", {
      ...trackingAttrs,
      canvas_id: canvas?.id,
      preview_source: "canvas_card",
    });
    setPreviewCanvasId(canvas?.id);
    setShouldShowPreview(true);
  }, [trackingAttrs]);

  const handleDuplicate = useCallback(async (canvas) => {
    let sceneCopy = null;
    try {
      if (canvas?.scene && typeof canvas.scene === "object") {
        sceneCopy = JSON.parse(JSON.stringify(canvas.scene));
      } else {
        const rawUrl = canvas?.url || canvas?.canvas_url;
        if (!rawUrl) {
          message.open({
            type: "error",
            content: "Could not duplicate: drawing data is not available yet. Open the canvas once, then try again.",
            style: { zIndex: 5000 },
            duration: 4,
          });
          return;
        }
        const res = await fetch(rawUrl.replace(/^http:\/\//i, "https://"));
        const textData = await res.text();
        sceneCopy = JSON.parse(textData);
      }
    } catch (err) {
      console.error("Duplicate canvas: failed to load scene", err);
      trackEvent("drawing_canvas_corrupt_scene_detected", {
        ...trackingAttrs,
        canvas_id: canvas?.id,
        render_context: "duplicate",
      });
      message.open({
        type: "error",
        content: "Could not duplicate this canvas. Try opening it first, then duplicate again.",
        style: { zIndex: 5000 },
        duration: 4,
      });
      return;
    }

    const copyName = `${canvas.name || canvas.title || "Untitled Canvas"} (Copy)`;
    const newCanvas = {
      ...canvas,
      id: `new_${Date.now()}`,
      name: copyName,
      title: copyName,
      url: null,
      canvas_url: null,
      scene: sceneCopy,
    };
    const updated = [...internalCanvases, newCanvas];
    setInternalCanvases(updated);
    if (typeof onSave === "function") onSave(updated);
    trackEvent("drawing_canvas_duplicated", {
      ...trackingAttrs,
      original_canvas_id: canvas?.id,
      duplicated_canvas_id: newCanvas.id,
    });
  }, [internalCanvases, onSave, trackingAttrs]);

  const handleDelete = useCallback((canvas) => {
    const updated = internalCanvases.filter(c => c.id !== canvas.id);
    setInternalCanvases(updated);
    if (typeof onSave === "function") onSave(updated);
  }, [internalCanvases, onSave]);

  const handleRename = useCallback((canvas, newName) => {
    const updated = internalCanvases.map(c => c.id === canvas.id ? { ...c, name: newName } : c);
    setInternalCanvases(updated);
    if (typeof onSave === "function") onSave(updated);
  }, [internalCanvases, onSave]);

  const generateDefaultCanvasName = useCallback(() => {
    const dateSuffix = formatCanvasDefaultNameDateSuffix(new Date());
    if (!dateSuffix) {
      return "canvas01";
    }
    const suffixLower = `_${dateSuffix}`.toLowerCase();
    const todayCanvasesCount = internalCanvases.filter((c) => {
      const name = (c.name || c.title || "").trim().toLowerCase();
      return name.endsWith(suffixLower);
    }).length;
    const paddedNum = String(todayCanvasesCount + 1).padStart(2, "0");
    return `canvas${paddedNum}_${dateSuffix}`;
  }, [internalCanvases]);

  const openEditorForNewCanvas = useCallback(async () => {
    if (isFirstTimeUser) {
      await setShowCanvasPopup(false);
      trackEvent("drawing_canvas_ftue_dismissed", {
        ...trackingAttrs,
        dismissal_type: "create_new_canvas",
      });
      setIsFirstTimeUser(false);
    }
    trackEvent("drawing_canvas_create_started", {
      ...trackingAttrs,
      entry_source: "drawer",
      first_time_user: isFirstTimeUser,
    });
    setEditorCanvasId("new");
    setEditorOpen(true);
    if (typeof onCreateCanvas === "function") onCreateCanvas();
  }, [onCreateCanvas, isFirstTimeUser, trackingAttrs]);

  const handleCloseEditor = useCallback(() => {
    setEditorOpen(false);
    setTemplateData(null);
    setTemplateTrigger(0);
    setEditorCanvasId(null);
    setSaveTemplateDrawerOpen(false);
    excalidrawApiRef.current = null;
  }, []);

  const handleOpenSaveTemplateDrawer = useCallback(() => {
    setSaveTemplateDrawerOpen(true);
  }, []);

  const handleCloseSaveTemplateDrawer = useCallback(() => {
    setSaveTemplateDrawerOpen(false);
  }, []);

  const handleKnowMoreClick = useCallback(() => {
    if (isFirstTimeUser) {
      trackEvent("drawing_canvas_ftue_dismissed", {
        ...trackingAttrs,
        dismissal_type: "know_more",
      });
    }
    onKnowMore?.();
  }, [isFirstTimeUser, trackingAttrs, onKnowMore]);

  const getExcalidrawApi = useCallback(() => excalidrawApiRef.current, []);

  const handleEditorSave = useCallback(
    async (payload, canvasTitle, saveMeta = {}) => {
      if (!editorCanvasId) return false;

      const showInRxValue = saveMeta?.showInRx !== false;
      const annotationCount = (payload?.elements || []).filter((el) => !el.isDeleted).length;

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const file = new File([blob], `${canvasTitle || 'new_canvas'}.json`, { type: "application/json" });

      const isNew = editorCanvasId === "new" || (typeof editorCanvasId === "string" && editorCanvasId.startsWith("new_"));

      if (isNew) {
          const linkRes = await linkCanvasToPatient(canvasTitle || "New Canvas", file, patientId, tcmId);
          if (linkRes.status === true) {
              const mappingId =
                linkRes.mapping_id ??
                linkRes.mappingId ??
                linkRes?.data?.mapping_id;
              trackEvent("drawing_canvas_created", {
                ...trackingAttrs,
                canvas_id: mappingId,
                canvas_type: "freehand",
                annotation_count: annotationCount,
                has_template: !!(saveMeta?.hasTemplate),
                show_in_rx_enabled: showInRxValue,
                save_source: "save_button",
              });
              if (typeof onSave === "function") {
                if (mappingId != null && mappingId !== "") {
                  onSave(null, { mappingId, showInRx: showInRxValue });
                } else {
                  onSave();
                }
              }
              message.open({
                type: "success",
                content: "Canvas saved successfully",
                style: { zIndex: 5000 },
                duration: 3,
              });
              handleCloseEditor();
              return true;
          }
          trackEvent("drawing_canvas_create_failed", {
            ...trackingAttrs,
            error_message: linkRes.message || "Failed to save canvas",
            canvas_type: "freehand",
          });
          trackEvent("drawing_canvas_api_failed", {
            ...trackingAttrs,
            api_name: "linkCanvasToPatient",
            error_code: linkRes?.code || "FAILED",
            error_message: linkRes?.message || "Failed to save canvas",
          });
          message.open({
            type: "error",
            content: linkRes.message || "Failed to save canvas",
            style: { zIndex: 5000 },
            duration: 4,
          });
          return false;
      }
      const editRes = await editMapping(editorCanvasId, file);
      if (editRes.status === true) {
          trackEvent("drawing_canvas_edited", {
            ...trackingAttrs,
            canvas_id: editorCanvasId,
            edit_source: "save_button",
          });
          setInternalCanvases(prev => prev.map(c => c.id === editorCanvasId ? { ...c, scene: payload, name: canvasTitle } : c));
          if (typeof onSave === "function") {
            onSave(null, { mappingId: editorCanvasId, showInRx: showInRxValue });
          }
          message.open({
            type: "success",
            content: "Canvas saved successfully",
            style: { zIndex: 5000 },
            duration: 3,
          });
          handleCloseEditor();
          return true;
      }
      message.open({
        type: "error",
        content: editRes.message || "Failed to save canvas",
        style: { zIndex: 5000 },
        duration: 4,
      });
      trackEvent("drawing_canvas_api_failed", {
        ...trackingAttrs,
        api_name: "editMapping",
        error_code: editRes?.code || "FAILED",
        error_message: editRes?.message || "Failed to edit canvas",
      });
      return false;
    },
    [editorCanvasId, patientId, tcmId, onSave, handleCloseEditor, trackingAttrs]
  );

  const handleTemplatesToggle = useCallback(() => {
    setTemplateDrawerOpen(prev => {
      const nextOpen = !prev;
      if (nextOpen) {
        trackEvent("drawing_canvas_template_drawer_opened", {
          ...trackingAttrs,
          canvas_id: editorCanvasId,
        });
      }
      return nextOpen;
    });
  }, [trackingAttrs, editorCanvasId]);

  const handleSelectTemplate = useCallback(async (template) => {
    if (!editorCanvasId) return;
    trackEvent("drawing_canvas_template_selected", {
      ...trackingAttrs,
      template_id: template?.canvas_id || template?.id,
      template_type: template?.is_custom ? "custom" : "default",
      template_source: template?.is_custom ? "custom" : "default",
      canvas_id: editorCanvasId,
    });

    const templateUrl = template?.canvas_url || template?.url;
    const templateFileType = String(template?.file_type || "").toLowerCase();
    const isImageTemplate = ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(templateFileType);

    if (isImageTemplate && templateUrl) {
      setTemplateData({
        templateType: "image",
        url: templateUrl,
        name: template?.name || "Template image",
        fileType: templateFileType,
      });
      setTemplateTrigger(prev => prev + 1);
      setTemplateDrawerOpen(false);
      return;
    }

    let templateScene = null;
    if (templateUrl) {
        try {
            const res = await fetch(templateUrl);
            templateScene = await res.json();
        } catch(e) {
            console.error("Error fetching template", e);
        }
    }

    if (!templateScene) templateScene = emptyScene;

    setTemplateData(templateScene);
    setTemplateTrigger(prev => prev + 1);
    setTemplateDrawerOpen(false);
  }, [editorCanvasId, emptyScene]);

  const handleSaveTemplateWrapper = useCallback(async (payload, canvasTitle) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const file = new File([blob], `${canvasTitle || "new_template"}.json`, { type: "application/json" });

    const res = await createCustomCanvas(canvasTitle || "New Template", file);
    if (res.status === true) {
      trackEvent("drawing_canvas_template_saved", {
        ...trackingAttrs,
        template_id: res.canvas_id || res.id || res?.data?.canvas_id,
        template_name: canvasTitle,
        source_canvas_id: editorCanvasId,
      });
      setTemplatesRefreshKey((prev) => prev + 1);
      return true;
    }
    message.open({
      type: "error",
      content: res.message || "Template save failed",
      style: { zIndex: 5000 },
      duration: 4,
    });
    console.error("Template save failed", res.message);
    return false;
  }, [trackingAttrs, editorCanvasId]);

  const editorInitialData = useMemo(() => {
    if (!editorCanvasId) return emptyScene;
    const c = internalCanvases.find((x) => x?.id === editorCanvasId);
    return c?.scene || emptyScene;
  }, [editorCanvasId, internalCanvases]);

  return (
    <div className="drawing-canvas">
      <div
        className="modalCard-header align-items-center justify-content-between d-flex"
        style={{
          position: "sticky",
          top: "0px",
          zIndex: 2,
          height: "60px",
        }}
      >
        <div className="align-items-center d-flex">
          {onClose && (
            <Button
              type="text"
              className="btn btn-delete-prescription px-3 focus-none h-100"
              onClick={onClose}
            >
              <i className="icon-Cross fs-3"></i>
            </Button>
          )}
          <div className="modal-title">Drawing Canvas</div>
        </div>

        <div className="d-flex align-items-center" style={{ padding: "0 20px" }}>
          <Button
            className="btn-41 btn ant-btn-text btn-input"
            style={{ display: "flex", alignItems: "center", gap: "5px" }}
            onClick={openEditorForNewCanvas}
          >
            <span className="drawing-canvas__create-btn-plus" aria-hidden="true" style={{ fontSize: "20px", fontWeight: "300" }}>
              +
            </span>
            <span>Create New Canvas</span>
          </Button>
        </div>
      </div>

      <div className="drawing-canvas__body">
        {!hasCanvases ? (
          <DrawingCanvasEmptyState
            isFirstTimeUser={isFirstTimeUser}
            onCreateCanvas={openEditorForNewCanvas}
            onKnowMore={handleKnowMoreClick}
          />
        ) : (
          <div className="drawing-canvas__grid">
            {internalCanvases.map((canvas, idx) => (
              <div key={canvas?.id ?? idx} className="drawing-canvas__grid-item">
                <DrawingCanvasCard
                  canvas={canvas}
                  rxDrawingCanvasIds={normalizedRxDrawingCanvasIds}
                  onToggleRx={(checked) => onToggleRx(canvas?.id, checked)}
                  onOpen={() => openEditorForCanvas(canvas?.id)}
                  onPreview={previewCanvas}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onRename={handleRename}
                  trackingAttrs={trackingAttrs}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {editorOpen && (
        <Drawer
          open={editorOpen}
          closable={false}
          maskClosable
          mask={true}
          placement="right"
          width="100%"
          bodyStyle={{ padding: 0, backgroundColor: "#ffffff" }}
          style={{ top: 0, height: "100vh" }}
          zIndex={2000}
          onClose={handleCloseEditor}
        >
          <ExcalidrawEditor
            canvasId={editorCanvasId}
            canvasName={
              editorCanvasId === "new" || (typeof editorCanvasId === "string" && editorCanvasId.startsWith("new_"))
                ? generateDefaultCanvasName()
                : (internalCanvases.find(c => c?.id === editorCanvasId)?.name || internalCanvases.find(c => c?.id === editorCanvasId)?.title || "Untitled Canvas")
            }
            initialData={editorInitialData}
            onSave={handleEditorSave}
            onBack={handleCloseEditor}
            onOpenTemplates={handleTemplatesToggle}
            onOpenSaveTemplate={handleOpenSaveTemplateDrawer}
            excalidrawApiRef={excalidrawApiRef}
            initialShowInRx={editorInitialShowInRx}
            templateData={templateData}
            templateTrigger={templateTrigger}
            trackingAttrs={trackingAttrs}
          />
        </Drawer>
      )}

      {shouldShowPreview && (
        <Drawer
            closeIcon={false}
            placement="right"
            bodyStyle={{ backgroundColor: "#222222", padding: 0 }}
            onClose={() => setShouldShowPreview(false)}
            open={shouldShowPreview}
            width="100%"
            height={"100%"}
            push={false}
            zIndex={3000}
        >
          <CanvasPreview
            onClose={() => setShouldShowPreview(false)}
            canvasName={internalCanvases.find(c => c?.id === previewCanvasId)?.name || internalCanvases.find(c => c?.id === previewCanvasId)?.title || "Untitled Canvas"}
            scene={internalCanvases.find(c => c?.id === previewCanvasId)?.scene}
            handleEdit={() => {
               trackEvent("drawing_canvas_preview_edit_clicked", {
                 ...trackingAttrs,
                 canvas_id: previewCanvasId,
               });
               setShouldShowPreview(false);
               openEditorForCanvas(previewCanvasId);
            }}
            handleDelete={() => {
               const canvas = internalCanvases.find(c => c?.id === previewCanvasId);
               if (canvas) handleDelete(canvas);
               setShouldShowPreview(false);
            }}
          />
        </Drawer>
      )}

      <Drawer 
        title={null}
        closable={false}
        placement="right"
        onClose={handleTemplatesToggle}
        open={templateDrawerOpen}
        push={false}
        width={500}
        zIndex={3000}
        bodyStyle={{ padding: '0 20px' }}
      >
        <TemplatesDrawer 
          open={templateDrawerOpen}
          refreshKey={templatesRefreshKey}
          onClose={handleTemplatesToggle} 
          onSelectTemplate={handleSelectTemplate}
          trackingAttrs={trackingAttrs}
        />
      </Drawer>

      <SaveTemplateDrawer
        open={saveTemplateDrawerOpen}
        onClose={handleCloseSaveTemplateDrawer}
        getExcalidrawApi={getExcalidrawApi}
        onSaveTemplate={handleSaveTemplateWrapper}
      />
    </div>
  );
};

export default DrawingCanvas;
