"use client";

import React, { useRef } from "react";
import { Plus, FileText, X, MoreVertical, Trash2 } from "@/src/components/atoms/icons/lucide";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/components/molecules/DropdownMenu";
import { generateStandardTemplateBackground } from "./standardTemplateHelper";
import { generateId } from "./geometry";

/**
 * Letterhead picker rendered as a right-docked panel inside the canvas.
 *
 * Backend wiring from the source product (download / edit / preview / remote
 * upload) is dropped — letterheads are managed locally: "Add New Letterhead"
 * loads an image from disk as an object URL and adds it as a selectable
 * template. Blank Canvas and Standard Template are always present.
 */
const TemplateSidebar = ({
  visible,
  onClose,
  selectedTemplateId,
  onTemplateSelect,
  templates = [],
  onTemplatesUpdate,
  profile,
}) => {
  const fileInputRef = useRef(null);

  const handleTemplateSelect = (templateId) => {
    onTemplateSelect?.(templateId);
  };

  const handleAddNew = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const newTemplate = {
      id: generateId(),
      title: file.name.replace(/\.[^.]+$/, "") || "Custom Letterhead",
      uploaded_files: [{ file_url: url }],
    };
    onTemplatesUpdate?.([...(templates || []), newTemplate]);
    onTemplateSelect?.(newTemplate.id);
    // Allow re-selecting the same file later.
    e.target.value = "";
  };

  const handleDelete = (templateId) => {
    const next = (templates || []).filter((t) => t.id !== templateId);
    onTemplatesUpdate?.(next);
    if (selectedTemplateId === templateId) onTemplateSelect?.("blank");
  };

  const getTemplateThumbnail = (template) => {
    if (template.uploaded_files && template.uploaded_files.length > 0) {
      const firstFile = template.uploaded_files[0];
      return firstFile.file_url || firstFile.url || null;
    }
    return null;
  };

  const Radio = ({ checked }) => (
    <span className={`tabrx-radio ${checked ? "checked" : ""}`} aria-hidden />
  );

  return (
    <div className={`tab-rx-template-drawer ${visible ? "open" : ""}`} aria-hidden={!visible}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden-file-input"
        onChange={handleFileChange}
      />
      <div className="tab-rx-template-sidebar">
        <div className="template-sidebar-header">
          <div className="header-top">
            <div className="header-left">
              <FileText size={20} className="header-icon" />
              <h3 className="header-title">Select Letterhead</h3>
            </div>
            <button className="header-close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div className="header-add-wrap">
            <button className="add-new-letterhead-btn" onClick={handleAddNew}>
              <Plus size={18} className="add-icon" />
              <span className="add-text">Add New Letterhead</span>
            </button>
          </div>
        </div>

        <div className="template-sidebar-content">
          {/* Blank Canvas */}
          <div
            className={`template-option ${selectedTemplateId === "blank" ? "selected" : ""}`}
            onClick={() => handleTemplateSelect("blank")}
          >
            <Radio checked={selectedTemplateId === "blank"} />
            <div className="template-thumbnail blank-thumbnail" />
            <div className="tab-rx-template-info">
              <div className="template-name">Blank Canvas</div>
              <div className="template-meta">1 Page Letterhead</div>
            </div>
          </div>

          {/* Standard Template */}
          <div
            className={`template-option ${selectedTemplateId === "standard" ? "selected" : ""}`}
            onClick={() => handleTemplateSelect("standard")}
          >
            <Radio checked={selectedTemplateId === "standard"} />
            <div className="template-thumbnail">
              <img src={generateStandardTemplateBackground(profile)} alt="Standard Template" />
            </div>
            <div className="tab-rx-template-info">
              <div className="template-name">Standard Template</div>
              <div className="template-meta">1 Page Letterhead</div>
            </div>
          </div>

          {/* Custom (locally uploaded) templates */}
          {(templates || []).map((template) => {
            const thumbnail = getTemplateThumbnail(template);
            const isSelected = selectedTemplateId === template.id;
            return (
              <div
                key={template.id}
                className={`template-option ${isSelected ? "selected" : ""}`}
                onClick={() => handleTemplateSelect(template.id)}
              >
                <Radio checked={isSelected} />
                <div className="template-thumbnail">
                  {thumbnail ? (
                    <img src={thumbnail} alt={template.title} />
                  ) : (
                    <div className="template-placeholder">
                      <FileText size={22} />
                    </div>
                  )}
                </div>
                <div className="tab-rx-template-info">
                  <div className="template-name">{template.title || "Untitled Template"}</div>
                  <div className="template-meta">
                    {template.uploaded_files?.length || 1} Page Letterhead
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="template-menu-btn"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Template options"
                    >
                      <MoreVertical size={18} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-[1300]">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(template.id);
                      }}
                      style={{ color: "var(--tp-error-600)" }}
                    >
                      <Trash2 size={16} className="mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TemplateSidebar;
