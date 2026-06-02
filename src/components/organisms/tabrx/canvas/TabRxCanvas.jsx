"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Plus, Trash2 } from "@/src/components/atoms/icons/lucide";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/components/molecules/DropdownMenu";
import { ConfirmDialog } from "@/src/components/molecules/ConfirmDialog";
import { Spinner } from "@/src/components/atoms/Spinner";
import CanvasEngine from "./CanvasEngine";
import Toolbar from "./Toolbar";
import TemplateSidebar from "./TemplateSidebar";
import { A4_BASE_WIDTH, A4_BASE_HEIGHT, ZOOM_CONSTRAINTS } from "./constants";
import { generateId } from "./geometry";
import { generateStandardTemplateBackground } from "./standardTemplateHelper";

const INITIAL_TOOL_SETTINGS = {
  activeTool: "pen",
  color: "#000000",
  thickness: 2,
  penThickness: 2,
  highlighterThickness: 14,
  eraserThickness: 2,
  fontSize: 16,
};

/**
 * TabRxCanvas — multi-page A4 freehand prescription surface.
 *
 * Ported from the TatvaCare doctor portal, de-coupled from its backend:
 * letterhead templates live in local state, page export is exposed via ref
 * for a future print/save hook, and the standalone document scroll-lock is
 * removed since this renders inside the RxPad shell (not full-screen).
 */
const TabRxCanvas = forwardRef(
  (
    {
      profile = null,
      initialTemplateId = "blank",
      showTemplateDrawer = false,
      onToggleTemplateDrawer = null,
      onContentChange = null,
      onTemplateChange = null,
      templates = [],
      onTemplatesUpdate = null,
      backgroundImage = null,
    },
    ref
  ) => {
    const [pagesMetadata, setPagesMetadata] = useState([
      { id: generateId(), type: "blank", templateId: null, templateImageIndex: null },
    ]);
    const [strokesByPage, setStrokesByPage] = useState({});
    const [textElementsByPage, setTextElementsByPage] = useState({});
    const [currentPageIndex, setCurrentPageIndex] = useState(0);

    useEffect(() => {
      setStrokesByPage((prev) => {
        const updated = { ...prev };
        pagesMetadata.forEach((page) => {
          if (!updated[page.id]) updated[page.id] = [];
        });
        return updated;
      });
      setTextElementsByPage((prev) => {
        const updated = { ...prev };
        pagesMetadata.forEach((page) => {
          if (!updated[page.id]) updated[page.id] = [];
        });
        return updated;
      });
    }, [pagesMetadata]);

    // Global stroke-level undo/redo across ALL pages.
    const [undoStack, setUndoStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);
    const [forceStrokesSyncByPage, setForceStrokesSyncByPage] = useState({});

    // Viewport
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [panOffset, setPanOffset] = useState({ x: 20, y: 20 });

    // Tools
    const [toolSettings, setToolSettings] = useState(INITIAL_TOOL_SETTINGS);
    const [showToolbarSettings, setShowToolbarSettings] = useState(false);

    // Template
    const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId);
    useEffect(() => {
      onTemplateChange?.(selectedTemplateId || null);
    }, [selectedTemplateId, onTemplateChange]);

    const [pageImageLoading, setPageImageLoading] = useState({});
    const preloadedUrls = useRef(new Set());

    // Confirmation dialogs
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [pageToDeleteIndex, setPageToDeleteIndex] = useState(null);
    const [isTemplateSwitchModalOpen, setIsTemplateSwitchModalOpen] = useState(false);
    const [pendingTemplateId, setPendingTemplateId] = useState(null);

    const canvasRefsByPage = useRef({});
    const scrollPagesRef = useRef(null);
    const touchScrollRef = useRef({ active: false, pointerId: null, lastY: 0 });
    const scrollLockRef = useRef({ locked: false, scrollEl: null, lockedScrollTop: 0, scrollHandler: null });

    // Finger-scroll the pages stack even when the gesture starts on a canvas.
    useEffect(() => {
      const el = scrollPagesRef.current;
      if (!el) return;

      const onPointerDown = (e) => {
        if (e.pointerType !== "touch") return;
        touchScrollRef.current = { active: true, pointerId: e.pointerId, lastY: e.clientY };
      };
      const onPointerMove = (e) => {
        const s = touchScrollRef.current;
        if (!s.active || s.pointerId !== e.pointerId) return;
        const dy = e.clientY - s.lastY;
        const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
        const nextTop = el.scrollTop - dy;
        if (nextTop < 0) {
          el.scrollTop = 0;
        } else if (nextTop > maxScroll) {
          el.scrollTop = maxScroll;
        } else {
          el.scrollTop = nextTop;
        }
        s.lastY = e.clientY;
        if (e.cancelable) e.preventDefault();
      };
      const end = (e) => {
        const s = touchScrollRef.current;
        if (s.pointerId !== e.pointerId) return;
        touchScrollRef.current = { active: false, pointerId: null, lastY: 0 };
      };

      el.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
      el.addEventListener("pointermove", onPointerMove, { capture: true, passive: false });
      window.addEventListener("pointerup", end, { capture: true, passive: true });
      window.addEventListener("pointercancel", end, { capture: true, passive: true });
      return () => {
        el.removeEventListener("pointerdown", onPointerDown, true);
        el.removeEventListener("pointermove", onPointerMove, true);
        window.removeEventListener("pointerup", end, true);
        window.removeEventListener("pointercancel", end, true);
      };
    }, []);

    // Chrome can treat vertical pen drags as scroll unless prevented early.
    useEffect(() => {
      const inCanvasPage = (target) =>
        target && typeof target.closest === "function" && target.closest(".tab-rx-canvas-page");
      const blockPenChromeScroll = (e) => {
        if (e.pointerType !== "pen") return;
        if (!inCanvasPage(e.target)) return;
        if (e.cancelable) e.preventDefault();
      };
      window.addEventListener("pointerdown", blockPenChromeScroll, { capture: true, passive: false });
      window.addEventListener("pointermove", blockPenChromeScroll, { capture: true, passive: false });
      return () => {
        window.removeEventListener("pointerdown", blockPenChromeScroll, true);
        window.removeEventListener("pointermove", blockPenChromeScroll, true);
      };
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        exportToImages: async () => {
          const files = [];
          const blobs = [];
          for (let i = 0; i < pagesMetadata.length; i++) {
            const pageId = pagesMetadata[i].id;
            const engine = canvasRefsByPage.current[pageId];
            if (!engine || typeof engine.getCanvas !== "function") continue;
            const canvas = engine.getCanvas();
            if (!canvas) continue;
            try {
              const blob = await new Promise((resolve, reject) => {
                canvas.toBlob(
                  (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
                  "image/jpeg",
                  0.95
                );
              });
              blobs.push(blob);
              files.push(new File([blob], `${generateId()}.jpeg`, { type: "image/jpeg" }));
            } catch (_) {}
          }
          return { files, blobs };
        },
        getCanvasData: () => ({
          pagesMetadata,
          strokesByPage,
          textElementsByPage,
          selectedTemplateId,
        }),
        clearCanvas: () => {
          const newPageId = generateId();
          setPagesMetadata([
            { id: newPageId, type: "blank", templateId: null, templateImageIndex: null },
          ]);
          setStrokesByPage({ [newPageId]: [] });
          setTextElementsByPage({ [newPageId]: [] });
          setCurrentPageIndex(0);
          setSelectedTemplateId("blank");
          onContentChange?.(false);
        },
      }),
      [pagesMetadata, strokesByPage, textElementsByPage, selectedTemplateId, onContentChange]
    );

    const fitCanvasToScreen = useCallback(() => {
      const drawerWidth = showTemplateDrawer ? 320 : 0;
      // 110 ≈ blue rail (80) + breathing room.
      const availableWidth = window.innerWidth - (drawerWidth + 110);
      let optimalZoom = availableWidth / A4_BASE_WIDTH;
      optimalZoom = Math.min(Math.max(optimalZoom, ZOOM_CONSTRAINTS.MIN), ZOOM_CONSTRAINTS.MAX);
      setZoomLevel(optimalZoom);
      const centeredX = (availableWidth - A4_BASE_WIDTH * optimalZoom) / 2 + 20;
      setPanOffset({ x: Math.max(20, centeredX), y: 40 });
    }, [showTemplateDrawer]);

    useEffect(() => {
      fitCanvasToScreen();
    }, [fitCanvasToScreen]);

    const getBackgroundForPage = useCallback(
      (pageMeta) => {
        if (!pageMeta || pageMeta.type === "blank") return null;
        if (pageMeta.type === "template" && pageMeta.templateId) {
          if (pageMeta.templateId === "standard") {
            return generateStandardTemplateBackground(profile);
          }
          const template = templates.find((t) => t.id === pageMeta.templateId);
          if (!template) return null;
          const imageIndex = pageMeta.templateImageIndex ?? 0;
          if (template.uploaded_files && template.uploaded_files.length > 0) {
            const file = template.uploaded_files[imageIndex];
            if (file) return file.file_url || file.url || null;
          } else if (template.pages && template.pages.length > 0) {
            const page = template.pages[imageIndex];
            if (page) return typeof page === "string" ? page : page.imageUrl || null;
          }
        }
        return null;
      },
      [templates, profile]
    );

    // Preload page backgrounds; show a spinner until each loads.
    useEffect(() => {
      pagesMetadata.forEach((pageMeta) => {
        const bgUrl = pageMeta.customImage || getBackgroundForPage(pageMeta);
        if (!bgUrl || preloadedUrls.current.has(bgUrl)) return;
        preloadedUrls.current.add(bgUrl);
        setPageImageLoading((prev) => ({ ...prev, [pageMeta.id]: true }));
        const img = new Image();
        img.onload = () => setPageImageLoading((prev) => ({ ...prev, [pageMeta.id]: false }));
        img.onerror = () => setPageImageLoading((prev) => ({ ...prev, [pageMeta.id]: false }));
        img.src = bgUrl;
      });
    }, [pagesMetadata, getBackgroundForPage]);

    // ── Zoom ──────────────────────────────────────────────────────────────────
    const handleZoomIn = () => setZoomLevel((p) => Math.min(p + 0.1, ZOOM_CONSTRAINTS.MAX));
    const handleZoomOut = () => setZoomLevel((p) => Math.max(p - 0.1, ZOOM_CONSTRAINTS.MIN));

    const handleInteractionStart = useCallback(() => {
      setShowToolbarSettings(false);
      const el = scrollPagesRef.current;
      if (!el) return;
      const state = scrollLockRef.current;
      if (!state.locked) {
        state.locked = true;
        state.scrollEl = el;
        state.lockedScrollTop = el.scrollTop;
        state.scrollHandler = () => {
          const s = scrollLockRef.current;
          if (!s.locked || !s.scrollEl) return;
          if (s.scrollEl.scrollTop !== s.lockedScrollTop) s.scrollEl.scrollTop = s.lockedScrollTop;
        };
        el.addEventListener("scroll", state.scrollHandler, { passive: true });
      }
      const unlock = () => {
        const s = scrollLockRef.current;
        if (!s.locked) return;
        s.locked = false;
        const targetEl = s.scrollEl || el;
        if (s.scrollHandler && targetEl) targetEl.removeEventListener("scroll", s.scrollHandler);
        s.scrollEl = null;
        s.scrollHandler = null;
        window.removeEventListener("pointerup", unlock, true);
        window.removeEventListener("pointercancel", unlock, true);
        window.removeEventListener("touchend", unlock, true);
        window.removeEventListener("touchcancel", unlock, true);
      };
      window.addEventListener("pointerup", unlock, true);
      window.addEventListener("pointercancel", unlock, true);
      window.addEventListener("touchend", unlock, true);
      window.addEventListener("touchcancel", unlock, true);
    }, []);

    const handleStrokeComplete = useCallback(
      (pageId, newStroke) => {
        setUndoStack((prev) => [...prev, { pageId, stroke: newStroke }]);
        setRedoStack([]);
        setStrokesByPage((prev) => {
          const current = prev[pageId] || [];
          return { ...prev, [pageId]: [...current, newStroke] };
        });
        if (onContentChange) setTimeout(() => onContentChange(true), 0);
        const pageIndex = pagesMetadata.findIndex((p) => p.id === pageId);
        if (pageIndex !== -1) setCurrentPageIndex(pageIndex);
      },
      [pagesMetadata, onContentChange]
    );

    const handleEraseStart = useCallback(() => {
      setRedoStack([]);
    }, []);

    const handleUndo = useCallback(() => {
      setUndoStack((prevUndo) => {
        if (prevUndo.length === 0) return prevUndo;
        const last = prevUndo[prevUndo.length - 1];
        if (!last?.pageId || !last?.stroke) return prevUndo.slice(0, -1);
        const { pageId, stroke } = last;
        setCurrentPageIndex((prevIdx) => {
          const idx = pagesMetadata.findIndex((p) => p.id === pageId);
          return idx !== -1 ? idx : prevIdx;
        });
        setStrokesByPage((prev) => {
          const current = prev[pageId] || [];
          return { ...prev, [pageId]: current.filter((s) => s.id !== stroke.id) };
        });
        setForceStrokesSyncByPage((prev) => ({ ...prev, [pageId]: (prev[pageId] || 0) + 1 }));
        setRedoStack((prevRedo) => [...prevRedo, last]);
        return prevUndo.slice(0, -1);
      });
    }, [pagesMetadata]);

    const handleRedo = useCallback(() => {
      setRedoStack((prevRedo) => {
        if (prevRedo.length === 0) return prevRedo;
        const last = prevRedo[prevRedo.length - 1];
        if (!last?.pageId || !last?.stroke) return prevRedo.slice(0, -1);
        const { pageId, stroke } = last;
        setCurrentPageIndex((prevIdx) => {
          const idx = pagesMetadata.findIndex((p) => p.id === pageId);
          return idx !== -1 ? idx : prevIdx;
        });
        setStrokesByPage((prev) => {
          const current = prev[pageId] || [];
          if (current.some((s) => s.id === stroke.id)) return prev;
          return { ...prev, [pageId]: [...current, stroke] };
        });
        setForceStrokesSyncByPage((prev) => ({ ...prev, [pageId]: (prev[pageId] || 0) + 1 }));
        setUndoStack((prevUndo) => [...prevUndo, last]);
        return prevRedo.slice(0, -1);
      });
    }, [pagesMetadata]);

    const hasAnyCanvasContent = useCallback(() => {
      return Object.values(strokesByPage || {}).some((arr) => (arr || []).length > 0);
    }, [strokesByPage]);

    const executeTemplateSelect = useCallback(
      (templateId) => {
        setSelectedTemplateId(templateId);
        setCurrentPageIndex(0);
        if (templateId === "blank" || !templateId) {
          const newPageId = generateId();
          setPagesMetadata([
            { id: newPageId, type: "blank", templateId: null, templateImageIndex: null },
          ]);
          setStrokesByPage({ [newPageId]: [] });
          setTextElementsByPage({ [newPageId]: [] });
        } else if (templateId === "standard") {
          const newPageId = generateId();
          setPagesMetadata([
            { id: newPageId, type: "template", templateId: "standard", templateImageIndex: null },
          ]);
          setStrokesByPage({ [newPageId]: [] });
          setTextElementsByPage({ [newPageId]: [] });
        } else {
          const template = templates.find((t) => t.id === templateId);
          if (template) {
            const pageCount = template.uploaded_files?.length || template.pages?.length || 1;
            const newPages = Array.from({ length: pageCount }, (_, i) => ({
              id: generateId(),
              type: "template",
              templateId,
              templateImageIndex: i,
            }));
            setPagesMetadata(newPages);
            const newStrokes = {};
            const newText = {};
            newPages.forEach((page) => {
              newStrokes[page.id] = [];
              newText[page.id] = [];
            });
            setStrokesByPage(newStrokes);
            setTextElementsByPage(newText);
          }
        }
        setUndoStack([]);
        setRedoStack([]);
      },
      [templates]
    );

    const handleTemplateSelect = useCallback(
      (templateId) => {
        if (templateId === selectedTemplateId) return;
        if (hasAnyCanvasContent()) {
          setPendingTemplateId(templateId);
          setIsTemplateSwitchModalOpen(true);
          return;
        }
        executeTemplateSelect(templateId);
      },
      [selectedTemplateId, hasAnyCanvasContent, executeTemplateSelect]
    );

    const confirmTemplateSwitch = useCallback(() => {
      if (pendingTemplateId == null) return;
      executeTemplateSelect(pendingTemplateId);
      setIsTemplateSwitchModalOpen(false);
      setPendingTemplateId(null);
    }, [pendingTemplateId, executeTemplateSelect]);

    const handleAddPage = useCallback(
      (afterIndex, pageType) => {
        const newPageId = generateId();
        let newPageMeta;
        if (pageType === "blank") {
          newPageMeta = { id: newPageId, type: "blank", templateId: null, templateImageIndex: null };
        } else if (pageType === "same") {
          const sourcePage = pagesMetadata[afterIndex];
          if (sourcePage) {
            const isTemplatePage = sourcePage.type === "template" && sourcePage.templateId;
            newPageMeta = {
              id: newPageId,
              type: sourcePage.type,
              templateId: sourcePage.templateId,
              templateImageIndex: sourcePage.templateImageIndex,
              customImage: isTemplatePage ? null : sourcePage.customImage || null,
            };
          } else {
            newPageMeta = { id: newPageId, type: "blank", templateId: null, templateImageIndex: null };
          }
        } else {
          return;
        }
        const newPages = [...pagesMetadata];
        newPages.splice(afterIndex + 1, 0, newPageMeta);
        setPagesMetadata(newPages);
        setStrokesByPage((prev) => ({ ...prev, [newPageId]: [] }));
        setTextElementsByPage((prev) => ({ ...prev, [newPageId]: [] }));
        setCurrentPageIndex(afterIndex + 1);
        setUndoStack([]);
        setRedoStack([]);
      },
      [pagesMetadata]
    );

    const showDeleteModal = useCallback(
      (pageIndex) => {
        if (pagesMetadata.length <= 1) return;
        setPageToDeleteIndex(pageIndex);
        setIsDeleteModalOpen(true);
      },
      [pagesMetadata.length]
    );

    const handleDeletePage = useCallback(
      (pageIndex) => {
        if (pagesMetadata.length <= 1) return;
        const pageToDelete = pagesMetadata[pageIndex];
        if (!pageToDelete) return;
        const newPages = pagesMetadata.filter((_, i) => i !== pageIndex);
        setPagesMetadata(newPages);
        setStrokesByPage((prev) => {
          const updated = { ...prev };
          delete updated[pageToDelete.id];
          return updated;
        });
        setTextElementsByPage((prev) => {
          const updated = { ...prev };
          delete updated[pageToDelete.id];
          return updated;
        });
        if (currentPageIndex >= newPages.length) setCurrentPageIndex(newPages.length - 1);
        else if (currentPageIndex > pageIndex) setCurrentPageIndex(currentPageIndex - 1);
        else if (currentPageIndex === pageIndex) setCurrentPageIndex(Math.max(0, pageIndex - 1));
        setUndoStack([]);
        setRedoStack([]);
      },
      [pagesMetadata, currentPageIndex]
    );

    const confirmDeletePage = useCallback(() => {
      if (pageToDeleteIndex !== null) handleDeletePage(pageToDeleteIndex);
      setIsDeleteModalOpen(false);
      setPageToDeleteIndex(null);
    }, [pageToDeleteIndex, handleDeletePage]);

    return (
      <div className="tab-rx-canvas-page">
        <TemplateSidebar
          visible={showTemplateDrawer}
          onClose={onToggleTemplateDrawer || (() => {})}
          selectedTemplateId={selectedTemplateId}
          onTemplateSelect={handleTemplateSelect}
          templates={templates}
          onTemplatesUpdate={onTemplatesUpdate}
          profile={profile}
        />

        <div className="canvas-wrapper-container">
          <div
            className="canvas-pages-scroll"
            ref={scrollPagesRef}
            style={{ paddingRight: showTemplateDrawer ? 320 : 0 }}
          >
            <div className="canvas-pages-content">
              {pagesMetadata.map((pageMeta, pageIndex) => {
                const pageId = pageMeta.id;
                const pageStrokes = strokesByPage[pageId] || [];
                const isBlankPage =
                  pageMeta?.type === "blank" ||
                  pageMeta?.templateId === "blank" ||
                  pageMeta?.templateId === null;
                const isSelected = currentPageIndex === pageIndex;

                return (
                  <div
                    key={pageId}
                    className={`canvas-page-block ${isSelected ? "selected" : ""}`}
                    style={{ width: A4_BASE_WIDTH * zoomLevel, height: A4_BASE_HEIGHT * zoomLevel }}
                  >
                    <div className="page-number-label">Page {pageIndex + 1}</div>

                    {pageImageLoading[pageId] && (
                      <div className="page-image-loading">
                        <Spinner size="lg" />
                      </div>
                    )}

                    <CanvasEngine
                      ref={(canvasRef) => {
                        if (canvasRef) canvasRefsByPage.current[pageId] = canvasRef;
                        else delete canvasRefsByPage.current[pageId];
                      }}
                      strokes={pageStrokes}
                      forceStrokesSyncToken={forceStrokesSyncByPage[pageId] || 0}
                      setStrokes={(newStrokes) => {
                        setStrokesByPage((prev) => ({ ...prev, [pageId]: newStrokes }));
                      }}
                      onStrokeComplete={(newStroke) => handleStrokeComplete(pageId, newStroke)}
                      onEraseStart={() => handleEraseStart(pageId)}
                      toolSettings={toolSettings}
                      setToolSettings={setToolSettings}
                      zoomLevel={zoomLevel}
                      setZoomLevel={setZoomLevel}
                      panOffset={{ x: 0, y: 0 }}
                      setPanOffset={() => {}}
                      onInteractionStart={handleInteractionStart}
                      onPageFocus={() => setCurrentPageIndex(pageIndex)}
                      backgroundImage={
                        pageMeta.customImage
                          ? pageMeta.customImage
                          : getBackgroundForPage(pageMeta) ||
                            (backgroundImage && pageIndex === 0 ? backgroundImage : null)
                      }
                      embeddedInScroll
                      onContentChange={onContentChange}
                    />

                    <div className="page-action-buttons">
                      <button
                        className="page-action-btn transparent-btn delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          showDeleteModal(pageIndex);
                        }}
                        disabled={pagesMetadata.length <= 1}
                        title="Delete Page"
                      >
                        <Trash2 size={20} />
                      </button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="page-action-btn transparent-btn add-btn"
                            onClick={(e) => e.stopPropagation()}
                            title="Add Page"
                          >
                            <Plus size={20} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          side="top"
                          className="page-add-dropdown z-[1300]"
                        >
                          <DropdownMenuItem
                            disabled={isBlankPage}
                            onClick={() => handleAddPage(pageIndex, "same")}
                          >
                            Add Same Canvas Page
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAddPage(pageIndex, "blank")}>
                            Add Blank Page
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Toolbar
            toolSettings={toolSettings}
            setToolSettings={setToolSettings}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            showSettings={showToolbarSettings}
            setShowSettings={setShowToolbarSettings}
            zoomLevel={zoomLevel}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFit={fitCanvasToScreen}
          />
        </div>

        <ConfirmDialog
          open={isDeleteModalOpen}
          onOpenChange={setIsDeleteModalOpen}
          title="You may lose your data"
          warning="Are you sure you want to delete this page? This action cannot be undone and you will lose all data on this page."
          secondaryLabel="Cancel"
          primaryLabel="Delete"
          primaryTone="error"
          onPrimary={confirmDeletePage}
        />

        <ConfirmDialog
          open={isTemplateSwitchModalOpen}
          onOpenChange={(o) => {
            setIsTemplateSwitchModalOpen(o);
            if (!o) setPendingTemplateId(null);
          }}
          title="You may lose your data"
          warning="Switching the letterhead/template will clear the current canvas pages and content. Do you want to continue?"
          secondaryLabel="Cancel"
          primaryLabel="Yes, switch"
          primaryTone="error"
          onPrimary={confirmTemplateSwitch}
        />
      </div>
    );
  }
);

TabRxCanvas.displayName = "TabRxCanvas";

export default TabRxCanvas;
