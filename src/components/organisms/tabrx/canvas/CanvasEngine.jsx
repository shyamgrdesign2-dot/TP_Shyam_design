"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { A4_BASE_WIDTH, A4_BASE_HEIGHT, ZOOM_CONSTRAINTS } from "./constants";
import { getMidPoint, generateId, splitStroke } from "./geometry";

/**
 * CanvasEngine — low-level freehand drawing surface for a single A4 page.
 *
 * Ported from the TatvaCare doctor portal. All mutable drawing state lives in
 * refs (Excalidraw pattern) so the render loop never reads a stale closure.
 * Pointer/touch listeners are attached once and dispatch through ref-stored
 * handlers so events are never lost across React re-renders. Stylus draws,
 * finger scrolls, two fingers pinch-zoom.
 */
const CanvasEngine = React.forwardRef(
  (
    {
      strokes,
      setStrokes,
      onStrokeComplete,
      onEraseStart,
      toolSettings,
      setToolSettings,
      zoomLevel,
      setZoomLevel,
      panOffset,
      setPanOffset,
      onInteractionStart,
      onPageFocus,
      backgroundImage,
      embeddedInScroll = false,
      onContentChange = null,
      forceStrokesSyncToken = 0,
    },
    ref
  ) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const backgroundLayerRef = useRef(null);
    const strokesLayerRef = useRef(null);
    const isBackgroundLayerDirtyRef = useRef(true);
    const isStrokesLayerDirtyRef = useRef(true);

    React.useImperativeHandle(
      ref,
      () => ({ getCanvas: () => canvasRef.current }),
      []
    );

    const strokesRef = useRef(strokes);
    const lastForceStrokesSyncTokenRef = useRef(forceStrokesSyncToken);
    const bgImageObjRef = useRef(null);
    const currentStrokeRef = useRef(null);

    const isDrawingRef = useRef(false);
    const isPanningRef = useRef(false);
    const isErasingRef = useRef(false);

    const isInteractingRef = useRef(false);
    const activePointerId = useRef(null);
    const lastPanPointRef = useRef(null);

    const initialPinchDist = useRef(null);
    const initialZoom = useRef(1);
    const pinchStartCanvasPoint = useRef(null);

    const zoomLevelRef = useRef(zoomLevel);
    const panOffsetRef = useRef(panOffset);

    const handlePointerDownRef = useRef(null);
    const handlePointerMoveRef = useRef(null);
    const handlePointerUpRef = useRef(null);
    const handlePointerCancelRef = useRef(null);

    const completedStrokesQueueRef = useRef([]);
    const onStrokeCompleteRef = useRef(onStrokeComplete);
    const onContentChangeRef = useRef(onContentChange);

    useEffect(() => {
      zoomLevelRef.current = zoomLevel;
    }, [zoomLevel]);
    useEffect(() => {
      panOffsetRef.current = panOffset;
    }, [panOffset]);
    useEffect(() => {
      onStrokeCompleteRef.current = onStrokeComplete;
    }, [onStrokeComplete]);
    useEffect(() => {
      onContentChangeRef.current = onContentChange;
    }, [onContentChange]);

    const isIOS =
      typeof navigator !== "undefined" &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

    // ── RENDER — reads ONLY from refs ─────────────────────────────────────────
    const drawStrokeOnContext = useCallback((ctx, stroke) => {
      if (!ctx || !stroke || stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.thickness;
      if (stroke.tool === "highlighter") {
        ctx.globalAlpha = 0.3;
        ctx.globalCompositeOperation = "multiply";
        ctx.lineWidth = stroke.thickness * 2;
      } else {
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = "source-over";
      }
      const p0 = stroke.points[0];
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < stroke.points.length - 1; i++) {
        const p1 = stroke.points[i];
        const p2 = stroke.points[i + 1];
        const mid = getMidPoint(p1, p2);
        ctx.quadraticCurveTo(p1.x, p1.y, mid.x, mid.y);
      }
      const last = stroke.points[stroke.points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = "source-over";
    }, []);

    const ensureLayerCanvases = useCallback(() => {
      const mainCanvas = canvasRef.current;
      if (!mainCanvas) return false;

      if (!backgroundLayerRef.current) {
        backgroundLayerRef.current = document.createElement("canvas");
      }
      if (!strokesLayerRef.current) {
        strokesLayerRef.current = document.createElement("canvas");
      }

      const bg = backgroundLayerRef.current;
      const st = strokesLayerRef.current;

      if (bg.width !== mainCanvas.width || bg.height !== mainCanvas.height) {
        bg.width = mainCanvas.width;
        bg.height = mainCanvas.height;
        isBackgroundLayerDirtyRef.current = true;
      }
      if (st.width !== mainCanvas.width || st.height !== mainCanvas.height) {
        st.width = mainCanvas.width;
        st.height = mainCanvas.height;
        isStrokesLayerDirtyRef.current = true;
      }

      return true;
    }, []);

    const rebuildBackgroundLayer = useCallback(() => {
      if (!ensureLayerCanvases()) return;
      const bg = backgroundLayerRef.current;
      const ctx = bg.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, bg.width, bg.height);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, bg.width, bg.height);

      if (bgImageObjRef.current) {
        ctx.drawImage(bgImageObjRef.current, 0, 0, bg.width, bg.height);
      } else {
        ctx.strokeStyle = "#F3F4F6";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < bg.width; x += 40) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, bg.height);
        }
        for (let y = 0; y < bg.height; y += 40) {
          ctx.moveTo(0, y);
          ctx.lineTo(bg.width, y);
        }
        ctx.stroke();
      }
      isBackgroundLayerDirtyRef.current = false;
    }, [ensureLayerCanvases]);

    const rebuildStrokesLayer = useCallback(() => {
      if (!ensureLayerCanvases()) return;
      const strokesCanvas = strokesLayerRef.current;
      const ctx = strokesCanvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, strokesCanvas.width, strokesCanvas.height);
      strokesRef.current.forEach((stroke) => drawStrokeOnContext(ctx, stroke));
      isStrokesLayerDirtyRef.current = false;
    }, [ensureLayerCanvases, drawStrokeOnContext]);

    const renderCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (isBackgroundLayerDirtyRef.current) rebuildBackgroundLayer();
      if (isStrokesLayerDirtyRef.current) rebuildStrokesLayer();

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (backgroundLayerRef.current) ctx.drawImage(backgroundLayerRef.current, 0, 0);
      if (strokesLayerRef.current) ctx.drawImage(strokesLayerRef.current, 0, 0);

      if (currentStrokeRef.current) {
        drawStrokeOnContext(ctx, currentStrokeRef.current);
      }
    }, [rebuildBackgroundLayer, rebuildStrokesLayer, drawStrokeOnContext]);

    // Sync strokesRef with the strokes prop — never overwrite with stale/shrunk data.
    useEffect(() => {
      if (!isDrawingRef.current) {
        const currentStrokes = strokesRef.current;

        const forceSync = forceStrokesSyncToken !== lastForceStrokesSyncTokenRef.current;
        if (forceSync) {
          lastForceStrokesSyncTokenRef.current = forceStrokesSyncToken;
          strokesRef.current = strokes;
          isStrokesLayerDirtyRef.current = true;
          renderCanvas();
          return;
        }

        if (strokes.length < currentStrokes.length) {
          if (setStrokes && currentStrokes.length > 0) setStrokes(currentStrokes);
          return;
        }

        if (strokes.length === 0 && currentStrokes.length > 0) return;

        const strokesChanged =
          currentStrokes.length !== strokes.length ||
          strokes.some((stroke, idx) => {
            const currentStroke = currentStrokes[idx];
            return (
              !currentStroke ||
              currentStroke.id !== stroke.id ||
              currentStroke.points.length !== stroke.points.length
            );
          });

        if (strokesChanged) {
          if (
            strokes.length >= currentStrokes.length ||
            (strokes.length === 0 && currentStrokes.length === 0)
          ) {
            strokesRef.current = strokes;
            isStrokesLayerDirtyRef.current = true;
            renderCanvas();
          }
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [strokes, setStrokes, forceStrokesSyncToken]);

    // Background image
    useEffect(() => {
      if (backgroundImage) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = backgroundImage;
        img.onload = () => {
          bgImageObjRef.current = img;
          isBackgroundLayerDirtyRef.current = true;
          renderCanvas();
        };
        img.onerror = () => {
          bgImageObjRef.current = null;
          isBackgroundLayerDirtyRef.current = true;
          renderCanvas();
        };
      } else {
        bgImageObjRef.current = null;
        isBackgroundLayerDirtyRef.current = true;
        renderCanvas();
      }
    }, [backgroundImage, renderCanvas]);

    // ── ERASER ────────────────────────────────────────────────────────────────
    const getCanvasCoordinates = useCallback((e) => {
      if (!canvasRef.current) return { x: 0, y: 0, pressure: 0.5 };
      const rect = canvasRef.current.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / zoomLevelRef.current,
        y: (e.clientY - rect.top) / zoomLevelRef.current,
        pressure: e.pressure !== undefined ? e.pressure : 0.5,
      };
    }, []);

    const performErase = useCallback(
      (eraserPoint) => {
        const eraserRadius = (toolSettings.thickness * 4) / zoomLevelRef.current;
        let hasChanges = false;
        const nextStrokes = [];
        for (const stroke of strokesRef.current) {
          const fragments = splitStroke(stroke, eraserPoint, eraserRadius);
          if (
            fragments.length === 1 &&
            fragments[0].points.length === stroke.points.length
          ) {
            nextStrokes.push(stroke);
          } else {
            hasChanges = true;
            nextStrokes.push(...fragments);
          }
        }
        if (hasChanges) {
          strokesRef.current = nextStrokes;
          setStrokes(nextStrokes);
          isStrokesLayerDirtyRef.current = true;
          renderCanvas();
        }
      },
      [toolSettings.thickness, setStrokes, renderCanvas]
    );

    // ── POINTER HANDLERS ────────────────────────────────────────────────────
    const internalPointerDown = useCallback(
      (e) => {
        if (e.isPrimary === false) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const isPen = e.pointerType === "pen";
        const isMouse = e.pointerType === "mouse";

        // Finger scrolls; pen/stylus and mouse draw (mouse enabled for
        // desktop authoring — tablet still uses the pen path).
        if (e.pointerType === "touch") return;
        if (!isPen && !isMouse) return;
        // Mouse only draws on the primary (left) button.
        if (isMouse && e.button !== 0 && e.button !== undefined) return;

        if (activePointerId.current !== null && activePointerId.current !== e.pointerId) {
          activePointerId.current = null;
          isDrawingRef.current = false;
          currentStrokeRef.current = null;
        }

        if (isPen || isMouse) {
          if (e.preventDefault) e.preventDefault();
          if (e.stopPropagation) e.stopPropagation();
        }

        isInteractingRef.current = true;
        activePointerId.current = e.pointerId;

        if (containerRef.current) {
          containerRef.current.setAttribute("data-pen-active", "true");
        }
        canvas.setAttribute("data-pen-active", "true");

        if (canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) {
          try {
            canvas.releasePointerCapture(e.pointerId);
          } catch (_) {}
        }
        if ((isPen || isMouse) && canvas.setPointerCapture) {
          try {
            canvas.setPointerCapture(e.pointerId);
          } catch (_) {}
        }

        if (onInteractionStart) onInteractionStart();
        if (onPageFocus) onPageFocus();

        if (currentStrokeRef.current) {
          const orphanedStroke = currentStrokeRef.current;
          strokesRef.current = [...strokesRef.current, orphanedStroke];
          if (setStrokes) setStrokes(strokesRef.current);
          isStrokesLayerDirtyRef.current = true;
          renderCanvas();
          completedStrokesQueueRef.current.push(orphanedStroke);
          currentStrokeRef.current = null;
        }

        if (toolSettings.activeTool === "move") {
          isDrawingRef.current = false;
          isPanningRef.current = true;
          isErasingRef.current = false;
          lastPanPointRef.current = { x: e.clientX, y: e.clientY };
          return;
        }

        if (toolSettings.activeTool === "eraser") {
          isDrawingRef.current = false;
          isPanningRef.current = false;
          isErasingRef.current = true;
          onEraseStart();
          performErase(getCanvasCoordinates(e));
          return;
        }

        isDrawingRef.current = true;
        isPanningRef.current = false;
        isErasingRef.current = false;

        const point = getCanvasCoordinates(e);
        currentStrokeRef.current = {
          id: generateId(),
          tool: toolSettings.activeTool,
          color: toolSettings.color,
          thickness: toolSettings.thickness,
          opacity: 1,
          points: [point],
        };

        renderCanvas();
      },
      [
        toolSettings,
        onInteractionStart,
        onPageFocus,
        onEraseStart,
        performErase,
        getCanvasCoordinates,
        setStrokes,
        renderCanvas,
      ]
    );

    const internalPointerMove = useCallback(
      (e) => {
        if (e.isPrimary === false) return;
        if (activePointerId.current != null && e.pointerId !== activePointerId.current)
          return;

        const isPen = e.pointerType === "pen";
        if (e.pointerType === "touch") return;
        if (isPen && e.preventDefault) e.preventDefault();

        if (isPanningRef.current && lastPanPointRef.current) {
          const dx = e.clientX - lastPanPointRef.current.x;
          const dy = e.clientY - lastPanPointRef.current.y;
          lastPanPointRef.current = { x: e.clientX, y: e.clientY };
          setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
          return;
        }

        if (isErasingRef.current) {
          performErase(getCanvasCoordinates(e));
          return;
        }

        if (isDrawingRef.current && currentStrokeRef.current) {
          const point = getCanvasCoordinates(e);
          if (
            point.x < -100 ||
            point.y < -100 ||
            point.x > A4_BASE_WIDTH + 100 ||
            point.y > A4_BASE_HEIGHT + 100
          )
            return;

          const events =
            typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [e];
          let newPoints = events.map((ev) => getCanvasCoordinates(ev));

          if (isIOS && currentStrokeRef.current.points.length === 1 && newPoints.length > 0) {
            const p0 = currentStrokeRef.current.points[0];
            const FIRST_MOVE_MAX = 72;
            const p1 = newPoints[0];
            const d = Math.hypot(p1.x - p0.x, p1.y - p0.y);
            if (d > FIRST_MOVE_MAX) {
              const s = FIRST_MOVE_MAX / d;
              newPoints = [
                { x: p0.x + (p1.x - p0.x) * s, y: p0.y + (p1.y - p0.y) * s },
                ...newPoints.slice(1),
              ];
            }
          }

          if (embeddedInScroll && newPoints.length > 0) {
            const MAX_SEGMENT = 140;
            const pts = currentStrokeRef.current.points;
            const base = pts.length > 0 ? pts[pts.length - 1] : null;
            const filtered = [];
            let prev = base;
            for (const p of newPoints) {
              if (prev && Math.hypot(p.x - prev.x, p.y - prev.y) > MAX_SEGMENT) continue;
              filtered.push(p);
              prev = p;
            }
            newPoints = filtered;
            if (newPoints.length === 0) return;
          }

          currentStrokeRef.current = {
            ...currentStrokeRef.current,
            points: [...currentStrokeRef.current.points, ...newPoints],
          };

          renderCanvas();
        }
      },
      [isIOS, setPanOffset, performErase, getCanvasCoordinates, renderCanvas, embeddedInScroll]
    );

    const internalPointerUp = useCallback(
      (e) => {
        const isPen = e.pointerType === "pen";
        const canvas = canvasRef.current;

        if (e.pointerType === "touch") return;
        if (isPen && e.preventDefault) e.preventDefault();

        if (currentStrokeRef.current && isDrawingRef.current) {
          const completedStroke = currentStrokeRef.current;
          strokesRef.current = [...strokesRef.current, completedStroke];
          if (setStrokes) setStrokes(strokesRef.current);
          currentStrokeRef.current = null;
          completedStrokesQueueRef.current.push(completedStroke);
          isStrokesLayerDirtyRef.current = true;
          renderCanvas();
        }

        if (canvas && canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) {
          try {
            canvas.releasePointerCapture(e.pointerId);
          } catch (_) {}
        }

        activePointerId.current = null;
        isDrawingRef.current = false;
        isPanningRef.current = false;
        isErasingRef.current = false;
        lastPanPointRef.current = null;
        isInteractingRef.current = false;

        if (containerRef.current) containerRef.current.removeAttribute("data-pen-active");
        if (canvas) canvas.removeAttribute("data-pen-active");
      },
      [setStrokes, renderCanvas]
    );

    const internalPointerCancel = useCallback(
      (e) => {
        internalPointerUp(e);
      },
      [internalPointerUp]
    );

    const handleContextMenu = useCallback((e) => {
      if (isInteractingRef.current || e.pointerType === "pen") {
        e.preventDefault();
        e.stopPropagation();
        if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === "function") {
          e.nativeEvent.stopImmediatePropagation();
        }
        return false;
      }
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const handler = (e) => {
        if (isInteractingRef.current) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      };
      canvas.addEventListener("contextmenu", handler, { passive: false, capture: true });
      return () => canvas.removeEventListener("contextmenu", handler, { capture: true });
    }, []);

    useEffect(() => {
      handlePointerDownRef.current = internalPointerDown;
      handlePointerMoveRef.current = internalPointerMove;
      handlePointerUpRef.current = internalPointerUp;
      handlePointerCancelRef.current = internalPointerCancel;
    }, [internalPointerDown, internalPointerMove, internalPointerUp, internalPointerCancel]);

    // Native listeners attached once; handlers dispatched through refs.
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const isUiControl = (target) =>
        target &&
        typeof target.closest === "function" &&
        !!target.closest(
          ".page-action-buttons, .page-add-dropdown, .tab-rx-toolbar, .settings-panel"
        );

      const handleTouchStart = (e) => {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        if (!isIOS) return;
        if (!touch.touchType || touch.touchType !== "stylus") return;

        const canvasRect = canvas.getBoundingClientRect();
        const x = touch.clientX;
        const y = touch.clientY;
        const isWithinCanvas =
          x >= canvasRect.left - 10 &&
          x <= canvasRect.right + 10 &&
          y >= canvasRect.top - 10 &&
          y <= canvasRect.bottom + 10;
        if (!isWithinCanvas) return;
        if (isUiControl(e.target)) return;

        const syntheticEvent = {
          ...e,
          pointerType: "pen",
          pointerId: touch.identifier,
          isPrimary: true,
          clientX: touch.clientX,
          clientY: touch.clientY,
          preventDefault: () => e.preventDefault(),
          stopPropagation: () => e.stopPropagation(),
          target: e.target,
          nativeEvent: e,
        };
        if (handlePointerDownRef.current) handlePointerDownRef.current(syntheticEvent);
      };

      const handleDown = (e) => {
        // Finger scrolls; pen and mouse draw.
        if (e.pointerType === "touch") return;

        const canvasRect = canvas.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        const isWithinCanvas =
          x >= canvasRect.left - 10 &&
          x <= canvasRect.right + 10 &&
          y >= canvasRect.top - 10 &&
          y <= canvasRect.bottom + 10;

        const target = e.target;
        const isCanvas = target === canvas;
        const isContainer =
          container && (target === container || container.contains(target));

        if (isUiControl(target)) return;
        if (!isWithinCanvas && !isCanvas && !isContainer) return;

        if (handlePointerDownRef.current) handlePointerDownRef.current(e);
      };

      const handleMove = (e) => handlePointerMoveRef.current && handlePointerMoveRef.current(e);
      const handleUp = (e) => handlePointerUpRef.current && handlePointerUpRef.current(e);
      const handleCancel = (e) =>
        handlePointerCancelRef.current && handlePointerCancelRef.current(e);

      canvas.addEventListener("pointerdown", handleDown, { passive: false, capture: true });
      const container = containerRef.current;
      if (container)
        container.addEventListener("pointerdown", handleDown, { passive: false, capture: true });
      window.addEventListener("pointerdown", handleDown, { passive: false, capture: true });

      const handleTouchMove = (e) => {
        if (activePointerId.current == null) return;
        const touch = Array.from(e.touches).find(
          (t) => t.identifier === activePointerId.current
        );
        if (!touch) return;
        e.preventDefault();
        const syntheticEvent = {
          ...e,
          pointerType: "pen",
          pointerId: touch.identifier,
          isPrimary: true,
          clientX: touch.clientX,
          clientY: touch.clientY,
          preventDefault: () => e.preventDefault(),
          stopPropagation: () => e.stopPropagation(),
          target: e.target,
          nativeEvent: e,
          getCoalescedEvents: () => [],
        };
        if (handlePointerMoveRef.current) handlePointerMoveRef.current(syntheticEvent);
      };

      const handleTouchEnd = (e) => {
        const touch = Array.from(e.changedTouches).find(
          (t) => t.identifier === activePointerId.current
        );
        if (!touch && activePointerId.current != null) {
          const firstTouch = e.changedTouches[0];
          if (firstTouch) activePointerId.current = firstTouch.identifier;
        }
        if (activePointerId.current == null) return;
        e.preventDefault();
        const syntheticEvent = {
          ...e,
          pointerType: "pen",
          pointerId: activePointerId.current,
          isPrimary: true,
          clientX: touch ? touch.clientX : e.changedTouches[0]?.clientX || 0,
          clientY: touch ? touch.clientY : e.changedTouches[0]?.clientY || 0,
          preventDefault: () => e.preventDefault(),
          stopPropagation: () => e.stopPropagation(),
          target: e.target,
          nativeEvent: e,
        };
        if (handlePointerUpRef.current) handlePointerUpRef.current(syntheticEvent);
      };

      const handleTouchCancel = (e) => {
        const touch = Array.from(e.changedTouches).find(
          (t) => t.identifier === activePointerId.current
        );
        if (!touch && activePointerId.current != null) {
          const firstTouch = e.changedTouches[0];
          if (firstTouch) activePointerId.current = firstTouch.identifier;
        }
        if (activePointerId.current == null) return;
        e.preventDefault();
        const syntheticEvent = {
          ...e,
          pointerType: "pen",
          pointerId: activePointerId.current,
          isPrimary: true,
          clientX: touch ? touch.clientX : e.changedTouches[0]?.clientX || 0,
          clientY: touch ? touch.clientY : e.changedTouches[0]?.clientY || 0,
          preventDefault: () => e.preventDefault(),
          stopPropagation: () => e.stopPropagation(),
          target: e.target,
          nativeEvent: e,
        };
        if (handlePointerCancelRef.current) handlePointerCancelRef.current(syntheticEvent);
      };

      canvas.addEventListener("touchstart", handleTouchStart, { passive: false, capture: true });
      if (container)
        container.addEventListener("touchstart", handleTouchStart, { passive: false, capture: true });
      window.addEventListener("touchstart", handleTouchStart, { passive: false, capture: true });

      canvas.addEventListener("touchmove", handleTouchMove, { passive: false, capture: true });
      if (container)
        container.addEventListener("touchmove", handleTouchMove, { passive: false, capture: true });
      window.addEventListener("touchmove", handleTouchMove, { passive: false, capture: true });

      canvas.addEventListener("touchend", handleTouchEnd, { passive: false, capture: true });
      if (container)
        container.addEventListener("touchend", handleTouchEnd, { passive: false, capture: true });
      window.addEventListener("touchend", handleTouchEnd, { passive: false, capture: true });

      canvas.addEventListener("touchcancel", handleTouchCancel, { passive: false, capture: true });
      if (container)
        container.addEventListener("touchcancel", handleTouchCancel, { passive: false, capture: true });
      window.addEventListener("touchcancel", handleTouchCancel, { passive: false, capture: true });

      window.addEventListener("pointermove", handleMove, { passive: false });
      window.addEventListener("pointerup", handleUp, { passive: false });
      window.addEventListener("pointercancel", handleCancel, { passive: false });

      const windowUpHandler = (e) => {
        if (activePointerId.current == null || e.pointerId !== activePointerId.current) return;
        if (currentStrokeRef.current && isDrawingRef.current) {
          const completedStroke = currentStrokeRef.current;
          currentStrokeRef.current = null;
          strokesRef.current = [...strokesRef.current, completedStroke];
          if (setStrokes) setStrokes(strokesRef.current);
          isStrokesLayerDirtyRef.current = true;
          renderCanvas();
          completedStrokesQueueRef.current.push(completedStroke);
        }
        isDrawingRef.current = false;
        isPanningRef.current = false;
        isErasingRef.current = false;
        isInteractingRef.current = false;
        activePointerId.current = null;
        lastPanPointRef.current = null;
        if (containerRef.current) containerRef.current.removeAttribute("data-pen-active");
        if (canvas) canvas.removeAttribute("data-pen-active");
      };

      window.addEventListener("pointerup", windowUpHandler);
      window.addEventListener("pointercancel", windowUpHandler);

      return () => {
        try {
          canvas.removeEventListener("pointerdown", handleDown, { capture: true });
          if (container)
            container.removeEventListener("pointerdown", handleDown, { capture: true });
          window.removeEventListener("pointerdown", handleDown, { capture: true });

          canvas.removeEventListener("touchstart", handleTouchStart, { capture: true });
          if (container)
            container.removeEventListener("touchstart", handleTouchStart, { capture: true });
          window.removeEventListener("touchstart", handleTouchStart, { capture: true });

          canvas.removeEventListener("touchmove", handleTouchMove, { capture: true });
          if (container)
            container.removeEventListener("touchmove", handleTouchMove, { capture: true });
          window.removeEventListener("touchmove", handleTouchMove, { capture: true });

          canvas.removeEventListener("touchend", handleTouchEnd, { capture: true });
          if (container)
            container.removeEventListener("touchend", handleTouchEnd, { capture: true });
          window.removeEventListener("touchend", handleTouchEnd, { capture: true });

          canvas.removeEventListener("touchcancel", handleTouchCancel, { capture: true });
          if (container)
            container.removeEventListener("touchcancel", handleTouchCancel, { capture: true });
          window.removeEventListener("touchcancel", handleTouchCancel, { capture: true });

          window.removeEventListener("pointermove", handleMove);
          window.removeEventListener("pointerup", handleUp);
          window.removeEventListener("pointercancel", handleCancel);
          window.removeEventListener("pointerup", windowUpHandler);
          window.removeEventListener("pointercancel", windowUpHandler);
        } catch (_) {}
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Drain completed-stroke queue to parent after render.
    useEffect(() => {
      if (completedStrokesQueueRef.current.length === 0) return;
      const queue = [...completedStrokesQueueRef.current];
      completedStrokesQueueRef.current = [];
      queue.forEach((stroke) => {
        if (onStrokeCompleteRef.current) onStrokeCompleteRef.current(stroke);
      });
      if (queue.length > 0 && onContentChangeRef.current) onContentChangeRef.current(true);
    });

    // ── PINCH ZOOM ────────────────────────────────────────────────────────────
    const handleTouchStart = useCallback(
      (e) => {
        if (e.touches.length === 2) {
          e.preventDefault();
          const p1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          const p2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
          initialPinchDist.current = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          initialZoom.current = zoomLevelRef.current;
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const cx = (p1.x + p2.x) / 2 - rect.left;
            const cy = (p1.y + p2.y) / 2 - rect.top;
            pinchStartCanvasPoint.current = {
              x: (cx - panOffsetRef.current.x) / zoomLevelRef.current,
              y: (cy - panOffsetRef.current.y) / zoomLevelRef.current,
            };
          }
          if (currentStrokeRef.current) {
            const abortedStroke = currentStrokeRef.current;
            strokesRef.current = [...strokesRef.current, abortedStroke];
            if (setStrokes) setStrokes(strokesRef.current);
            isStrokesLayerDirtyRef.current = true;
            renderCanvas();
            completedStrokesQueueRef.current.push(abortedStroke);
            currentStrokeRef.current = null;
            isDrawingRef.current = false;
          }
        }
      },
      [setStrokes, renderCanvas]
    );

    const handleTouchMove = useCallback(
      (e) => {
        if (
          e.touches.length === 2 &&
          initialPinchDist.current &&
          pinchStartCanvasPoint.current &&
          containerRef.current
        ) {
          e.preventDefault();
          const p1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          const p2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          const scale = dist / initialPinchDist.current;
          const newZoom = Math.min(
            Math.max(initialZoom.current * scale, ZOOM_CONSTRAINTS.MIN),
            ZOOM_CONSTRAINTS.MAX
          );
          const rect = containerRef.current.getBoundingClientRect();
          const cx = (p1.x + p2.x) / 2 - rect.left;
          const cy = (p1.y + p2.y) / 2 - rect.top;
          const newPanX = cx - pinchStartCanvasPoint.current.x * newZoom;
          const newPanY = cy - pinchStartCanvasPoint.current.y * newZoom;
          setZoomLevel(newZoom);
          setPanOffset({ x: newPanX, y: newPanY });
        }
      },
      [setZoomLevel, setPanOffset]
    );

    const handleTouchEnd = useCallback(() => {
      initialPinchDist.current = null;
      pinchStartCanvasPoint.current = null;
    }, []);

    // ── WHEEL ZOOM ────────────────────────────────────────────────────────────
    const handleWheel = useCallback(
      (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const zoomSensitivity = 0.002;
          const delta = -e.deltaY * zoomSensitivity;
          const newZoom = Math.min(
            Math.max(zoomLevelRef.current + delta, ZOOM_CONSTRAINTS.MIN),
            ZOOM_CONSTRAINTS.MAX
          );
          if (embeddedInScroll) {
            setZoomLevel(newZoom);
          } else if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const canvasX = (mouseX - panOffsetRef.current.x) / zoomLevelRef.current;
            const canvasY = (mouseY - panOffsetRef.current.y) / zoomLevelRef.current;
            setPanOffset({ x: mouseX - canvasX * newZoom, y: mouseY - canvasY * newZoom });
            setZoomLevel(newZoom);
          } else {
            setZoomLevel(newZoom);
          }
        } else if (!embeddedInScroll) {
          setPanOffset((prev) => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
        }
      },
      [embeddedInScroll, setZoomLevel, setPanOffset]
    );

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      container.addEventListener("wheel", handleWheel, { passive: false });
      return () => container.removeEventListener("wheel", handleWheel);
    }, [handleWheel]);

    return (
      <div
        ref={containerRef}
        className={`tab-rx-canvas-container ${embeddedInScroll ? "embedded-in-scroll" : ""}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={handleContextMenu}
      >
        <div
          className="canvas-wrapper"
          style={{
            transform: embeddedInScroll
              ? `translate(${panOffset.x}px, ${panOffset.y}px)`
              : `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          }}
        >
          <canvas
            ref={canvasRef}
            width={A4_BASE_WIDTH}
            height={A4_BASE_HEIGHT}
            onContextMenu={handleContextMenu}
            style={{
              userSelect: "none",
              WebkitUserSelect: "none",
              touchAction: "none",
              WebkitTouchCallout: "none",
              WebkitTapHighlightColor: "transparent",
            }}
          />
        </div>
      </div>
    );
  }
);

CanvasEngine.displayName = "CanvasEngine";

export default CanvasEngine;
