"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Pen,
  Highlighter,
  Eraser,
  Undo2,
  Redo2,
  Plus,
  Minus,
  Maximize2,
  X,
} from "@/src/components/atoms/icons/lucide";
import { CLINICAL_COLORS, HIGHLIGHTER_COLORS } from "./constants";

/**
 * Floating, draggable drawing toolbar. Re-orients between vertical and
 * horizontal as it nears a screen edge; the settings panel opens toward the
 * inside of the canvas. Ported from the doctor portal — icons swapped to
 * lucide-react and AntD removed.
 */
const Toolbar = ({
  toolSettings,
  setToolSettings,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  showSettings,
  setShowSettings,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onFit,
}) => {
  const DEFAULT_PEN_THICKNESS = 2;
  const DEFAULT_ERASER_THICKNESS = 2;
  const DEFAULT_HIGHLIGHTER_THICKNESS = 14;

  const [isMinimized, setIsMinimized] = useState(false);
  // Default clear of the 80px blue rail + ~250px secondary content panel.
  const [position, setPosition] = useState({ x: 360, y: 160 });
  const [orientation, setOrientation] = useState("vertical");
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const toolbarRef = useRef(null);
  const settingsPanelRef = useRef(null);
  const lastPointerDownTs = useRef(0);

  const activeColors =
    toolSettings.activeTool === "highlighter" ? HIGHLIGHTER_COLORS : CLINICAL_COLORS;
  const isTextTool = toolSettings.activeTool === "text";
  const zoomPercent = Math.round((zoomLevel || 1) * 100);

  const getToolThickness = (settings, tool) => {
    if (tool === "pen") return settings.penThickness ?? DEFAULT_PEN_THICKNESS;
    if (tool === "eraser") return settings.eraserThickness ?? DEFAULT_ERASER_THICKNESS;
    if (tool === "highlighter")
      return settings.highlighterThickness ?? DEFAULT_HIGHLIGHTER_THICKNESS;
    return settings.thickness ?? DEFAULT_PEN_THICKNESS;
  };

  useEffect(() => {
    if (!showSettings) return undefined;
    const handleOutsidePointer = (e) => {
      const target = e.target;
      if (!target) return;
      if (toolbarRef.current && toolbarRef.current.contains(target)) return;
      if (settingsPanelRef.current && settingsPanelRef.current.contains(target)) return;
      setShowSettings(false);
    };
    window.addEventListener("pointerdown", handleOutsidePointer, true);
    return () => window.removeEventListener("pointerdown", handleOutsidePointer, true);
  }, [showSettings, setShowSettings]);

  const handlePointerDown = (e) => {
    const target = e.target;
    if (target.closest("button") || target.closest("input")) return;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    e.stopPropagation();
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;

    const maxX = window.innerWidth - (orientation === "vertical" ? 80 : 350);
    const maxY = window.innerHeight - (orientation === "vertical" ? 350 : 80);

    const clampedX = Math.max(10, Math.min(maxX, newX));
    const clampedY = Math.max(10, Math.min(maxY, newY));

    setPosition({ x: clampedX, y: clampedY });

    const distToVerticalEdge = Math.min(newX, window.innerWidth - newX);
    const distToHorizontalEdge = Math.min(newY, window.innerHeight - newY);

    if (distToHorizontalEdge < distToVerticalEdge * 0.8) {
      setOrientation("horizontal");
    } else {
      setOrientation("vertical");
    }
    e.stopPropagation();
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      if (e.currentTarget?.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}
    e.stopPropagation();
  };

  const handleToolSelect = (tool) => {
    if (tool === toolSettings.activeTool && !isMinimized) {
      setShowSettings(!showSettings);
    } else {
      setToolSettings({
        ...toolSettings,
        penThickness: toolSettings.penThickness ?? DEFAULT_PEN_THICKNESS,
        eraserThickness: toolSettings.eraserThickness ?? DEFAULT_ERASER_THICKNESS,
        highlighterThickness:
          toolSettings.highlighterThickness ?? DEFAULT_HIGHLIGHTER_THICKNESS,
        activeTool: tool,
        thickness: getToolThickness(toolSettings, tool),
      });
      setShowSettings(true);
    }
  };

  const getDrawerClasses = () => {
    const isRight = position.x > window.innerWidth / 2;
    const isBottom = position.y > window.innerHeight / 2;
    if (orientation === "vertical") {
      return isRight ? "left" : "right";
    }
    return isBottom ? "top" : "bottom";
  };

  if (isMinimized) {
    return (
      <button
        type="button"
        className="tab-rx-toolbar minimized-button"
        style={{ left: position.x, top: position.y }}
        onPointerDown={(e) => {
          setIsDragging(true);
          e.currentTarget.setPointerCapture(e.pointerId);
          dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={() => !isDragging && setIsMinimized(false)}
      >
        <Pen />
      </button>
    );
  }

  const ToolButton = ({ tool, icon: Icon }) => (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        lastPointerDownTs.current = performance.now();
        if (!isDragging) handleToolSelect(tool);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (performance.now() - lastPointerDownTs.current < 500) return;
        if (!isDragging) handleToolSelect(tool);
      }}
      className={`tool-button ${toolSettings.activeTool === tool ? "active" : ""}`}
      aria-label={tool}
    >
      <Icon />
    </button>
  );

  const ActionButton = ({ onAction, disabled, title, children }) => (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        lastPointerDownTs.current = performance.now();
        if (!isDragging) onAction?.();
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (performance.now() - lastPointerDownTs.current < 500) return;
        if (!isDragging) onAction?.();
      }}
      disabled={disabled}
      className="action-button"
      title={title}
    >
      {children}
    </button>
  );

  return (
    <div
      ref={toolbarRef}
      className={`tab-rx-toolbar ${orientation}`}
      style={{ left: position.x, top: position.y }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className={`toolbar-container ${orientation}`}>
        <div className={`drag-handle ${orientation}`}>
          <div className="grid-dots">
            <div className="dot-row">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
            <div className="dot-row">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        </div>

        <ToolButton tool="pen" icon={Pen} />
        <ToolButton tool="highlighter" icon={Highlighter} />
        <ToolButton tool="eraser" icon={Eraser} />

        <div className={`divider ${orientation}`} />

        <ActionButton onAction={onUndo} disabled={!canUndo} title="Undo">
          <Undo2 />
        </ActionButton>
        <ActionButton onAction={onRedo} disabled={!canRedo} title="Redo">
          <Redo2 />
        </ActionButton>

        <div className={`divider ${orientation}`} />

        <ActionButton onAction={onZoomOut} title="Zoom Out">
          <Minus />
        </ActionButton>

        <div className="zoom-level" title={`Zoom ${zoomPercent}%`}>
          {zoomPercent}%
        </div>

        <ActionButton onAction={onZoomIn} title="Zoom In">
          <Plus />
        </ActionButton>

        <ActionButton onAction={onFit} title="Fit to Screen">
          <Maximize2 />
        </ActionButton>

        <div className={`divider ${orientation}`} />

        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            lastPointerDownTs.current = performance.now();
            if (!isDragging) setIsMinimized(true);
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (performance.now() - lastPointerDownTs.current < 500) return;
            if (!isDragging) setIsMinimized(true);
          }}
          className="close-button"
          aria-label="Minimize toolbar"
        >
          <X />
        </button>

        {showSettings && (
          <div
            ref={settingsPanelRef}
            className={`settings-panel ${orientation} ${getDrawerClasses()}`}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {toolSettings.activeTool !== "eraser" && (
              <div
                className={`color-section ${
                  orientation === "horizontal" ? "with-border" : ""
                }`}
              >
                <span className="section-title">Ink Color</span>
                <div className={`color-grid ${orientation === "horizontal" ? "horizontal" : ""}`}>
                  {activeColors.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => setToolSettings((prev) => ({ ...prev, color: c.hex }))}
                      className={`color-button ${toolSettings.color === c.hex ? "active" : ""}`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {!isTextTool && (
              <div className="thickness-section">
                <div className="thickness-header">
                  <span className="section-title">
                    {toolSettings.activeTool === "eraser" ? "Eraser Size" : "Thickness"}
                  </span>
                  <span className="thickness-value">{toolSettings.thickness}px</span>
                </div>

                <div className="ink-preview">
                  <svg width="100%" height="100%" viewBox="0 0 160 60" preserveAspectRatio="none">
                    <path
                      d="M 20 30 Q 50 10, 80 30 T 140 30"
                      fill="none"
                      stroke={toolSettings.activeTool === "eraser" ? "#94a3b8" : toolSettings.color}
                      strokeWidth={toolSettings.thickness}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ opacity: toolSettings.activeTool === "highlighter" ? 0.6 : 1 }}
                    />
                  </svg>
                </div>

                <div className="thickness-slider">
                  <span className="slider-label">1px</span>
                  <input
                    type="range"
                    min="1"
                    max="24"
                    step="1"
                    value={toolSettings.thickness}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      setToolSettings((prev) => {
                        const next = { ...prev, thickness: value };
                        if (prev.activeTool === "pen") next.penThickness = value;
                        else if (prev.activeTool === "eraser") next.eraserThickness = value;
                        else if (prev.activeTool === "highlighter")
                          next.highlighterThickness = value;
                        return next;
                      });
                    }}
                  />
                  <span className="slider-label">24px</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Toolbar;
