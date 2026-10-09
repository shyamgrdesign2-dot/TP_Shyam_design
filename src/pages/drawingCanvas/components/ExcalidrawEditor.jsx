import React, { useState, useEffect, useRef } from 'react';
import { Excalidraw, MainMenu, exportToBlob } from '@excalidraw/excalidraw';
import { Button, Switch, Tooltip, Input, message } from 'antd';
import CommonModal from "../../../common/CommonModal";
import { ASSETS } from "../../../assets";
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  PlayCircleFilled,
  LayoutOutlined,
  SaveOutlined,
  PrinterOutlined,
  CaretRightOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { printCanvasWithIframe } from '../utils/printCanvasWithIframe';
import {
  VIEWPORT_PADDING,
  FIXED_APP_STATE,
  getViewportSize,
  fitDimensionsToViewport,
  fitElementsToViewport,
  clampElementsToViewport,
  elementsSceneChanged,
} from '../utils/excalidrawViewportUtils';
import { trackEvent } from '../../../utils/utils';
import { CANVAS_NAME_MAX_LENGTH, normalizeCanvasName } from '../constants';
import './ExcalidrawEditor.scss';

const alertIcon = ASSETS.images.alerticon;


export default function ExcalidrawEditor({ 
  canvasId,
  canvasName, 
  initialData, 
  onSave, 
  onBack,
  onOpenTemplates,
  onOpenSaveTemplate,
  excalidrawApiRef,
  initialShowInRx = true,
  templateData = null,
  templateTrigger = 0,
  trackingAttrs = {},
}) {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [showInRx, setShowInRx] = useState(initialShowInRx !== false);
  const [isReady, setIsReady] = useState(false);
  const [localTitle, setLocalTitle] = useState(canvasName || "");
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [isBackModalOpen, setIsBackModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [canvasHasContent, setCanvasHasContent] = useState(false);
  const prevElementCountRef = useRef(0);
  const prevActiveTool = useRef(null);
  const editorLoadStartRef = useRef(Date.now());
  const hasTrackedLoadRef = useRef(false);
  const wrapperRef = useRef(null);
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });
  const isClampingRef = useRef(false);

  useEffect(() => {
    setLocalTitle(canvasName || "");
  }, [canvasName]);

  // New canvas: default Show in Rx on when opening editor only (do not re-sync from parent — it stays always "true" in parent useMemo and would reset the toggle).
  useEffect(() => {
    if (canvasId === "new" || canvasId == null) {
      setShowInRx(true);
    }
  }, [canvasId]);

  useEffect(() => {
    if (canvasId && canvasId !== "new") {
      setShowInRx(initialShowInRx === true);
    }
  }, [canvasId, initialShowInRx]);

  const handleBackClick = () => {
    setIsBackModalOpen(true);
  };

  const handleConfirmLeave = () => {
    setIsBackModalOpen(false);
    onBack();
  };

  const showHideBackModal = () => {
    setIsBackModalOpen(false);
  };

  const startRenaming = () => {
    setRenameValue(localTitle);
    setIsRenaming(true);
  };

  const handleRenameSave = () => {
    const newName = normalizeCanvasName(renameValue);
    if (!newName) {
      message.warning("Canvas name cannot be empty.");
      return;
    }
    if (newName !== localTitle) {
      setLocalTitle(newName);
    }
    setIsRenaming(false);
  };

  const handleRenameCancel = () => {
    setRenameValue(localTitle);
    setIsRenaming(false);
  };

  useEffect(() => {
    // Wait for the Drawer's sliding animation to finish before mounting Excalidraw.
    // If we mount during the animation, Excalidraw incorrectly calculates its coordinate offsets.
    const timer = setTimeout(() => setIsReady(true), 350);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const wrapperEl = wrapperRef.current;
    if (!wrapperEl) return undefined;

    const updateSize = () => {
      setViewportSize(getViewportSize(wrapperEl));
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(wrapperEl);
    return () => observer.disconnect();
  }, [isReady]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      if (!ctrlOrCmd) return;
      if (e.key === "z" && !e.shiftKey) {
        trackEvent("drawing_canvas_undo_used", { ...trackingAttrs, canvas_id: canvasId });
      } else if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
        trackEvent("drawing_canvas_redo_used", { ...trackingAttrs, canvas_id: canvasId });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [trackingAttrs, canvasId]);

  const sanitizedData = React.useMemo(() => {
    if (!initialData) return { elements: [], appState: {}, files: {} };
    // Deep clone appState to avoid mutating original
    const appState = { ...initialData.appState };
    if (appState.collaborators) {
      delete appState.collaborators;
    }
    
    Object.assign(appState, FIXED_APP_STATE);

    const { width, height } = viewportSize;
    const elements = clampElementsToViewport(
      initialData.elements || [],
      width,
      height,
      VIEWPORT_PADDING
    );

    return {
      elements,
      appState,
      files: initialData.files || {}
    };
  }, [initialData, viewportSize]);

  // Track the current canvas ID to detect when we switch to a different drawing
  const activeCanvasIdRef = React.useRef(null);

  useEffect(() => {
    if (excalidrawAPI && sanitizedData) {
      const currentId = canvasId ?? initialData?.id ?? 'new';
      
      // ONLY update the scene if we are switching to a DIFFERENT canvas
      // or if it's the very first time we've loaded anything.
      if (activeCanvasIdRef.current !== currentId) {
        activeCanvasIdRef.current = currentId;

        excalidrawAPI.updateScene({
          elements: sanitizedData.elements,
          appState: {
            ...sanitizedData.appState,
            ...FIXED_APP_STATE,
          },
          files: sanitizedData.files
        });
      }
    }
  }, [excalidrawAPI, sanitizedData, initialData, canvasId]);

  useEffect(() => {
    if (!excalidrawAPI || !isReady || isClampingRef.current) return;

    const elements = excalidrawAPI.getSceneElements() || [];
    const clamped = clampElementsToViewport(
      elements,
      viewportSize.width,
      viewportSize.height,
      VIEWPORT_PADDING
    );

    if (!elementsSceneChanged(elements, clamped)) return;

    isClampingRef.current = true;
    excalidrawAPI.updateScene({
      elements: clamped,
      appState: {
        ...excalidrawAPI.getAppState(),
        ...FIXED_APP_STATE,
      },
    });
    requestAnimationFrame(() => {
      isClampingRef.current = false;
    });
  }, [excalidrawAPI, isReady, viewportSize.width, viewportSize.height]);

  useEffect(() => {
    if (!excalidrawApiRef) return;
    excalidrawApiRef.current = excalidrawAPI ?? null;
    if (excalidrawAPI) {
      const elements = excalidrawAPI.getSceneElements();
      setCanvasHasContent(
        (elements || []).filter((el) => !el.isDeleted).length > 0
      );
    } else {
      setCanvasHasContent(false);
    }
  }, [excalidrawAPI, excalidrawApiRef]);

  useEffect(() => {
    if (!isReady || !excalidrawAPI || hasTrackedLoadRef.current) return;
    hasTrackedLoadRef.current = true;
    const canvasCount = (excalidrawAPI.getSceneElements() || []).filter((el) => !el?.isDeleted).length;
    trackEvent("drawing_canvas_load_time", {
      ...trackingAttrs,
      load_time_ms: Date.now() - editorLoadStartRef.current,
      canvas_count: canvasCount,
      device_type: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
    });
  }, [isReady, excalidrawAPI, trackingAttrs]);

  const handleExcalidrawChange = React.useCallback((elements, appState) => {
    const activeCount = (elements || []).filter((el) => !el.isDeleted).length;
    setCanvasHasContent(activeCount > 0);

    // Track annotation added (element count increased)
    if (activeCount > prevElementCountRef.current) {
      const newElement = (elements || []).filter((el) => !el.isDeleted)[activeCount - 1];
      trackEvent("drawing_canvas_annotation_added", {
        ...trackingAttrs,
        canvas_id: canvasId,
        annotation_type: newElement?.type || "unknown",
        tool_used: appState?.activeTool?.type || "unknown",
      });
    }
    prevElementCountRef.current = activeCount;

    // Track tool selection change
    const currentTool = appState?.activeTool?.type;
    if (currentTool && currentTool !== prevActiveTool.current) {
      prevActiveTool.current = currentTool;
      if (currentTool !== "selection" && currentTool !== "hand") {
        trackEvent("drawing_canvas_tool_selected", {
          ...trackingAttrs,
          tool_name: currentTool,
          canvas_id: canvasId,
        });
      }
    }

    if (isClampingRef.current || !excalidrawAPI) return;

    const { width, height } = viewportSize;
    const clampedElements = clampElementsToViewport(
      elements,
      width,
      height,
      VIEWPORT_PADDING
    );
    const needsClamp = elementsSceneChanged(elements, clampedElements);
    const needsViewportLock =
      appState.scrollX !== 0 ||
      appState.scrollY !== 0 ||
      appState.zoom?.value !== 1;

    if (needsClamp || needsViewportLock) {
      isClampingRef.current = true;
      excalidrawAPI.updateScene({
        elements: clampedElements,
        appState: {
          ...appState,
          ...FIXED_APP_STATE,
        },
      });
      requestAnimationFrame(() => {
        isClampingRef.current = false;
      });
    }
  }, [excalidrawAPI, trackingAttrs, canvasId, viewportSize]);

  const handleSaveTemplateClick = () => {
    if (!onOpenSaveTemplate) return;
    if (!canvasHasContent) return;
    onOpenSaveTemplate();
  };

  const performSave = async (titleToSave) => {
    if (!excalidrawAPI || isSaving) return;

    const currentAppState = excalidrawAPI.getAppState();
    
    // Pick only essential keys to keep the payload clean and environment-agnostic
    const sanitizedAppState = {
      theme: currentAppState.theme,
      viewBackgroundColor: currentAppState.viewBackgroundColor,
      gridSize: currentAppState.gridSize,
      name: currentAppState.name,
      scrollX: currentAppState.scrollX,
      scrollY: currentAppState.scrollY,
      zoom: currentAppState.zoom,
    };

    const payload = {
      elements: excalidrawAPI.getSceneElements(),
      appState: sanitizedAppState,
      files: excalidrawAPI.getFiles(),
    };

    if (onSave) {
      setIsSaving(true);
      try {
        await onSave(payload, titleToSave, { showInRx });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleSave = async () => {
    let finalTitle = normalizeCanvasName(localTitle);
    const isUntitled = !finalTitle || finalTitle.toLowerCase() === "untitled canvas";

    if (isUntitled) {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yy = String(now.getFullYear()).slice(-2);
      const dateSuffix = `${dd}-${mm}-${yy}`;
      finalTitle = `canvas01_${dateSuffix}`;
      setLocalTitle(finalTitle);
    }

    await performSave(finalTitle);
  };

  const handlePrint = async () => {
    if (!excalidrawAPI || isPrinting) return;

    setIsPrinting(true);
    try {
      const result = await printCanvasWithIframe({
        excalidrawAPI,
        title: localTitle || "Canvas",
      });

      if (result?.status === false && result?.reason === "EMPTY_CANVAS") {
        message.open({
          type: "warning",
          content: "Canvas is empty. Add drawing before printing.",
          style: { zIndex: 5000 },
          duration: 3,
        });
      }
    } catch (error) {
      console.error("Print failed", error);
      message.open({
        type: "error",
        content: "Failed to prepare print preview",
        style: { zIndex: 5000 },
        duration: 4,
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const suggestedCanvasNames = React.useMemo(() => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const patientToken = "Patient";
    return [
      `${patientToken}_${dateStr}`,
      `${dateStr}_${patientToken}`,
      `${patientToken}_Canvas_${dateStr}`,
    ];
  }, []);

  useEffect(() => {
    if (!excalidrawAPI || templateTrigger <= 0 || !templateData) return;

    let cancelled = false;

    const generateId = () => `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    const insertImageTemplate = async () => {
      const imageUrl = templateData?.url;
      if (!imageUrl) return;

      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const mimeType = blob.type || (templateData?.fileType ? `image/${templateData.fileType}` : "image/png");

        const dataURL = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        if (cancelled) return;

        const dimensions = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth || 400, height: img.naturalHeight || 300 });
          img.onerror = reject;
          img.src = dataURL;
        });

        if (cancelled) return;

        const { width: viewportWidth, height: viewportHeight } = getViewportSize(wrapperRef.current);
        const fitted = fitDimensionsToViewport(
          dimensions.width,
          dimensions.height,
          viewportWidth,
          viewportHeight,
          VIEWPORT_PADDING
        );

        const fileId = generateId();
        const elementId = generateId();
        const now = Date.now();

        excalidrawAPI.addFiles([
          {
            id: fileId,
            dataURL,
            mimeType,
            created: now,
            lastRetrieved: now,
          },
        ]);

        const currentElements = excalidrawAPI.getSceneElements() || [];
        const imageElement = {
          id: elementId,
          type: "image",
          x: fitted.x,
          y: fitted.y,
          width: fitted.width,
          height: fitted.height,
          angle: 0,
          strokeColor: "transparent",
          backgroundColor: "transparent",
          fillStyle: "hachure",
          strokeWidth: 1,
          strokeStyle: "solid",
          roughness: 0,
          opacity: 100,
          groupIds: [],
          seed: Math.floor(Math.random() * 2147483647),
          version: 1,
          versionNonce: Math.floor(Math.random() * 2147483647),
          isDeleted: false,
          boundElements: null,
          updated: now,
          link: null,
          locked: false,
          fileId,
          status: "saved",
          scale: [1, 1],
        };

        excalidrawAPI.updateScene({
          elements: [...currentElements, imageElement],
          appState: {
            ...excalidrawAPI.getAppState(),
            ...FIXED_APP_STATE,
          },
        });
      } catch (error) {
        console.error("Failed to insert template image", error);
        message.open({
          type: "error",
          content: "Failed to load template image",
          style: { zIndex: 5000 },
          duration: 4,
        });
      }
    };

    if (templateData?.templateType === "image") {
      insertImageTemplate();
      return () => {
        cancelled = true;
      };
    }

    if (excalidrawAPI && templateTrigger > 0 && templateData) {
      const isArrayLike = Array.isArray(templateData);
      const newElements = isArrayLike ? templateData : (templateData.elements || []);
      const newAppState = isArrayLike ? {} : (templateData.appState || {});
      const newFiles = isArrayLike ? {} : (templateData.files || {});

      // Add template to the CURRENT board directly but with unique IDs to allow repeated insertions
      const idMap = {};
      const newElementsDuplicated = JSON.parse(JSON.stringify(newElements)).map(el => {
        const oldId = el.id;
        const newId = generateId();
        idMap[oldId] = newId;
        el.id = newId;
        return el;
      });

      newElementsDuplicated.forEach(el => {
        if (Array.isArray(el.groupIds)) {
          el.groupIds = el.groupIds.map(gId => {
            if (!idMap[gId]) idMap[gId] = generateId();
            return idMap[gId];
          });
        }
        if (Array.isArray(el.boundElements)) {
          el.boundElements = el.boundElements.map(b => ({ ...b, id: idMap[b.id] || b.id }));
        }
        if (el.startBinding) {
          el.startBinding.elementId = idMap[el.startBinding.elementId] || el.startBinding.elementId;
        }
        if (el.endBinding) {
          el.endBinding.elementId = idMap[el.endBinding.elementId] || el.endBinding.elementId;
        }
      });

      const { width: viewportWidth, height: viewportHeight } = getViewportSize(wrapperRef.current);
      const fittedNewElements = fitElementsToViewport(
        newElementsDuplicated,
        viewportWidth,
        viewportHeight,
        VIEWPORT_PADDING
      );

      const currentElements = excalidrawAPI.getSceneElements() || [];
      const mergedElements = clampElementsToViewport(
        [...currentElements, ...fittedNewElements],
        viewportWidth,
        viewportHeight,
        VIEWPORT_PADDING
      );

      excalidrawAPI.updateScene({
        elements: mergedElements,
        appState: {
          ...excalidrawAPI.getAppState(),
          ...newAppState,
          ...FIXED_APP_STATE,
        },
      });

      if (Object.keys(newFiles).length > 0) {
        excalidrawAPI.addFiles(Object.values(newFiles));
      }
    }
    return () => {
      cancelled = true;
    };
  }, [excalidrawAPI, templateTrigger, templateData]);

  return (
    <div className="excalidraw-editor-container">
      <div className="excalidraw-header">
        <div className="header-left">
          <div className="back-btn-wrapper" onClick={handleBackClick}>
            <ArrowLeftOutlined />
          </div>
          <div className="divider"></div>
          <div className="canvas-title-container">
            {isRenaming ? (
              <div className="rename-input-container d-flex align-items-center">
                <Input
                  autoFocus
                  className="rename-input"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value.slice(0, CANVAS_NAME_MAX_LENGTH))}
                  maxLength={CANVAS_NAME_MAX_LENGTH}
                  suffix={`${renameValue.length}/${CANVAS_NAME_MAX_LENGTH}`}
                  onPressEnter={handleRenameSave}
                  style={{ width: '240px', marginRight: '10px' }}
                />
                <CloseOutlined onClick={handleRenameCancel} style={{ cursor: "pointer", color: "#ff4d4f", fontSize: '16px', marginRight: '10px' }} title="Cancel" className='cross-icon'/>
                <CheckOutlined onClick={handleRenameSave} style={{ cursor: "pointer", color: "#2e8b57", fontSize: '16px' }} title="Save" className='tick-icon'/>
              </div>
            ) : (
              <>
                <h2 className="canvas-name" onClick={startRenaming} style={{ cursor: "pointer" }}>{localTitle}</h2>
                <i
                  className="icon-Edit fs-21 cursor-pointer"
                  onClick={startRenaming}
                  style={{cursor: 'pointer' }}
                ></i>
                {/* <EditOutlined className="edit-icon" onClick={startRenaming} style={{ cursor: "pointer", marginLeft: '8px' }} /> */}
              </>
            )}
          </div>
        </div>

        <div className="header-right">
          {/* <Tooltip title="Watch Tutorial">
            <div className="icon-btn play-btn" onClick={() => console.log("Tutorial Clicked")}>
               <div className="play-circle">
                 <CaretRightOutlined />
               </div>
            </div>
          </Tooltip> */}
          
          {/* <div className="divider"></div> */}

          <Tooltip title="Templates">
            <div className="icon-btn" onClick={onOpenTemplates}>
              <LayoutOutlined />
            </div>
          </Tooltip>

          {onOpenSaveTemplate ? (
            <Tooltip
              title={canvasHasContent ? "Save to Template" : "No content available"}
            >
              <div
                className="icon-btn"
                onClick={handleSaveTemplateClick}
                style={{ cursor: canvasHasContent ? "pointer" : "default" }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSaveTemplateClick();
                  }
                }}
              >
                <SaveOutlined />
              </div>
            </Tooltip>
          ) : null}

          <div className="divider"></div>

          <div className="show-in-rx-container">
            <span>Show in Rx</span>
            <Switch 
                checked={showInRx} 
                onChange={(checked) => {
                  trackEvent("drawing_canvas_show_in_rx_toggled", {
                    ...trackingAttrs,
                    canvas_id: canvasId,
                    toggle_state: checked ? "enabled" : "disabled",
                  });
                  setShowInRx(checked);
                }}
                size="small"
                style={{ backgroundColor: showInRx ? '#4b4ad5' : undefined }}
            />
          </div>

          <Button 
            className="pill-btn print-btn btn-outline-primary" 
            icon={<PrinterOutlined />}
            onClick={handlePrint}
            loading={isPrinting}
            disabled={isPrinting}
          >
            Print
          </Button>

          <Button 
            className="pill-btn save-btn-canvas" 
            onClick={handleSave}
            loading={isSaving}
            disabled={isSaving}
          >
            Save
          </Button>
        </div>
      </div>

      <div className="excalidraw-wrapper" ref={wrapperRef}>
        {isReady && (
          <Excalidraw
            initialData={sanitizedData}
            excalidrawAPI={(api) => setExcalidrawAPI(api)}
            onChange={handleExcalidrawChange}
            UIOptions={{
              tools: {
                hand: false,
              },
            }}
          >
            <MainMenu>
              <MainMenu.DefaultItems.LoadScene />
              <MainMenu.DefaultItems.Export />
              <MainMenu.DefaultItems.SaveAsImage />
              <MainMenu.DefaultItems.Help />
              <MainMenu.DefaultItems.ClearCanvas />
              <MainMenu.Separator />
              <MainMenu.DefaultItems.ToggleTheme />
              <MainMenu.DefaultItems.ChangeCanvasBackground />
            </MainMenu>
          </Excalidraw>
        )}
      </div>

      <CommonModal
        isModalOpen={isBackModalOpen}
        onCancel={showHideBackModal}
        modalWidth={500}
        title={"You may lose your data"}
        modalBody={
          <>
            <div className="alert-warning rounded-10px p-2 patient-details">
              <div className="d-flex align-items-center">
                <img className="me-3" src={alertIcon} alt="Warning" />
                <span>
                  Are you sure you want to leave? <br />
                  You will permanently lose your data.
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div
                  onClick={handleConfirmLeave}
                  className="me-4 text-decoration-underline btn p-0 text-main"
                >
                  Yes Leave
                </div>
                <Button
                  onClick={showHideBackModal}
                  className="lh-lg btn btn-primary3 btn-41 px-4"
                >
                  <span>No, Stay</span>
                </Button>
              </div>
            </div>
          </>
        }
      />
    </div>
  );
}
