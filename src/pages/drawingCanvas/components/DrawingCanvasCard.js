import React, { useState, useEffect } from "react";
import { Card, Switch, Dropdown, Input, Button, message } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { exportToBlob } from "@excalidraw/excalidraw";
import CommonModal from "../../../common/CommonModal";
import { ASSETS } from "../../../assets";
import "./DrawingCanvasCard.scss";
import { renameMapping, deleteMapping } from "../service";
import { CANVAS_NAME_MAX_LENGTH, normalizeCanvasName } from "../constants";
import { formatCanvasCreatedSubtitle } from "../utils/canvasDateFormat";
import { trackEvent } from "../../../utils/utils";

const editIcon = ASSETS.images.documentEdit;
const trashIcon = ASSETS.images.trash;
const downloadIcon = ASSETS.images.documentDownload;
const duplicateIcon = ASSETS.images.onboardPageIcons.copy;
const previewIcon = ASSETS.images.eyePreview;
const alertIcon = ASSETS.images.alerticon;

const DrawingCanvasCard = ({
  canvas,
  rxDrawingCanvasIds = [],
  onToggleRx = () => {},
  onOpen,
  onPreview,
  onRename,
  onDuplicate,
  onDelete,
  hideShowInRx = false,
  hideMoreOptions = false,
  trackingAttrs = {},
}) => {
  const [localTitle, setLocalTitle] = useState(canvas?.title || canvas?.name || "Untitled Canvas");

  useEffect(() => {
    setLocalTitle(canvas?.title || canvas?.name || "Untitled Canvas");
  }, [canvas?.title, canvas?.name]);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const isShowInRx = (rxDrawingCanvasIds || []).some(
    (rid) => String(rid) === String(canvas?.id)
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const createdAtSubtitle = formatCanvasCreatedSubtitle(
    canvas?.created_at ?? canvas?.createdAt ?? canvas?.canvas_created_at
  );

  useEffect(() => {
    let isMounted = true;
    
    const generatePreview = async () => {
      let activeScene = canvas?.scene;

      if (!activeScene && (canvas?.url || canvas?.canvas_url)) {
        try {
          const targetUrl = canvas.url || canvas.canvas_url;
          const res = await fetch(targetUrl.replace("http://", "https://")); // ensure https if needed or just use verbatim
          activeScene = await res.json();
        } catch (error) {
          console.error("Failed to fetch scene for preview thumbnail:", error);
        }
      }

      if (!activeScene?.elements || activeScene.elements.length === 0) {
        setPreviewUrl(null);
        return;
      }

      try {
        const blob = await exportToBlob({
          elements: activeScene.elements,
          appState: {
            ...activeScene.appState,
            exportWithDarkMode: false,
            viewBackgroundColor: "#ffffff",
          },
          files: activeScene.files,
          mimeType: "image/png",
          quality: 0.8,
        });

        if (isMounted) {
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }
      } catch (error) {
        console.error("Error generating thumbnail:", error);
      }
    };

    generatePreview();

    return () => {
      isMounted = false;
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [canvas?.scene, canvas?.url, canvas?.canvas_url, canvas?.id]);

  const handleOpen = () => {
    if (!isRenaming && typeof onOpen === "function") {
      onOpen(canvas);
    }
  };

  const startRenaming = (e) => {
    e.stopPropagation();
    setRenameValue(localTitle);
    setIsRenaming(true);
  };

  const handleRenameSave = async (e) => {
    e?.stopPropagation?.();
    const newName = normalizeCanvasName(renameValue);
    if (!newName) {
      message.warning("Canvas name cannot be empty.");
      return;
    }
    if (newName === localTitle) {
      setIsRenaming(false);
      return;
    }
    if (canvas?.id && !canvas.id.toString().includes("new_")) {
      const res = await renameMapping(canvas.id, newName);
      if (!res.status) {
        message.error(res.message || "Failed to rename canvas");
        return;
      }
      trackEvent("drawing_canvas_renamed", {
        ...trackingAttrs,
        canvas_id: canvas?.id,
        old_name: localTitle,
        new_name: newName,
      });
      message.success("Canvas renamed successfully");
    }

    setLocalTitle(newName);
    if (onRename) {
      onRename(canvas, newName);
    }
    setIsRenaming(false);
  };

  const handleRenameCancel = (e) => {
    e?.stopPropagation?.();
    setRenameValue(localTitle);
    setIsRenaming(false);
  };

  const handleToggleRx = (checked, e) => {
    e.stopPropagation();
    trackEvent("drawing_canvas_show_in_rx_toggled", {
      ...trackingAttrs,
      canvas_id: canvas?.id,
      toggle_state: checked ? "enabled" : "disabled",
    });
    onToggleRx(checked);
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (canvas?.id && !canvas.id.toString().includes("new_")) {
      const res = await deleteMapping(canvas.id);
      if (!res.status) {
        message.error(res.message || "Failed to delete canvas");
        setIsDeleteModalOpen(false);
        return;
      }
      trackEvent("drawing_canvas_deleted", {
        ...trackingAttrs,
        canvas_id: canvas?.id,
        delete_source: "card_menu",
        had_rx_visibility: isShowInRx,
      });
      message.success("Canvas deleted successfully");
    }

    if (onDelete) {
      onDelete(canvas);
    }
    setIsDeleteModalOpen(false);
  };

  const handleMenuClick = ({ key, domEvent }) => {
    domEvent.stopPropagation();
    switch (key) {
      case "addEdit":
        handleOpen();
        break;
      case "preview":
        trackEvent("drawing_canvas_preview_opened", {
          ...trackingAttrs,
          canvas_id: canvas?.id,
          preview_source: "card_menu",
        });
        if (onPreview) {
          onPreview(canvas);
        }
        break;
      case "rename":
        startRenaming(domEvent);
        break;
      case "download":
        if (previewUrl) {
          const a = document.createElement("a");
          a.href = previewUrl;
          a.download = `${localTitle || 'canvas'}.png`;
          a.click();
        }
        break;
      case "duplicate":
        if (onDuplicate) {
          onDuplicate(canvas);
        }
        break;
      case "delete":
        setIsDeleteModalOpen(true);
        break;
      default:
        break;
    }
  };

  const menuItems = [
    {
      key: "addEdit",
      label: (
        <div className="d-flex align-items-center">
          <img src={editIcon} alt="edit" className="me-2" style={{ width: 16 }} />
          Add/Edit
        </div>
      ),
    },
    {
      key: "preview",
      label: (
        <div className="d-flex align-items-center">
          <img src={previewIcon} alt="preview" className="me-2" style={{ width: 16 }} />
          Preview
        </div>
      ),
    },
    {
      key: "rename",
      label: (
        <div className="d-flex align-items-center">
          <img src={editIcon} alt="rename" className="me-2" style={{ width: 16 }} />
          Rename
        </div>
      ),
    },
    {
      key: "download",
      label: (
        <div className="d-flex align-items-center">
          <img src={downloadIcon} alt="download" className="me-2" style={{ width: 16 }} />
          Download
        </div>
      ),
    },
    {
      key: "duplicate",
      label: (
        <div className="d-flex align-items-center">
          {/* <img src={duplicateIcon} alt="duplicate" className="me-2" style={{ width: 16 }} /> */}
          <div className="pe-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="18" viewBox="0 0 20 20" fill="none">
              <path opacity="0.4" d="M12.9166 10.9583H11.1083C9.62496 10.9583 8.41663 9.75825 8.41663 8.26659V6.45825C8.41663 6.11659 8.14163 5.83325 7.79163 5.83325H5.14996C3.22496 5.83325 1.66663 7.08325 1.66663 9.31659V14.8499C1.66663 17.0833 3.22496 18.3333 5.14996 18.3333H10.0583C11.9833 18.3333 13.5416 17.0833 13.5416 14.8499V11.5833C13.5416 11.2333 13.2583 10.9583 12.9166 10.9583Z" fill="#A461D8"/>
              <path d="M14.85 1.66675H13.2083H12.3H9.94168C8.05834 1.66675 6.53334 2.86675 6.46667 5.00842C6.51667 5.00842 6.55834 5.00008 6.60834 5.00008H8.96667H9.87501H11.5167C13.4417 5.00008 15 6.25008 15 8.48342V10.1251V12.3834V14.0251C15 14.0751 14.9917 14.1167 14.9917 14.1584C16.85 14.1001 18.3333 12.8667 18.3333 10.6917V9.05008V6.79175V5.15008C18.3333 2.91675 16.775 1.66675 14.85 1.66675Z" fill="#A461D8"/>
              <path d="M9.98332 5.95837C9.72499 5.70004 9.28333 5.87504 9.28333 6.23337V8.4167C9.28333 9.33337 10.0583 10.0834 11.0083 10.0834C11.6 10.0917 12.425 10.0917 13.1333 10.0917C13.4917 10.0917 13.675 9.67504 13.425 9.42504C12.5167 8.5167 10.9 6.8917 9.98332 5.95837Z" fill="#A461D8"/>
            </svg>
          </div>
          Duplicate
        </div>
      ),
    },
    {
      key: "delete",
      label: (
        <div className="d-flex align-items-center text-danger">
          <img src={trashIcon} alt="delete" className="me-2" style={{ width: 16 }} />
          Delete
        </div>
      ),
    },
  ];

  return (
    <>
      <Card bordered={false} className="drawing-canvas-card">
        {!hideShowInRx && (
          <div className="drawing-canvas-card__rx-toggle" onClick={(e) => e.stopPropagation()}>
            <span>Show in Rx</span>
            <Switch
              checked={isShowInRx}
              onChange={handleToggleRx}
              size="small"
            />
          </div>
        )}

        <div
          className="drawing-canvas-card__thumb"
          aria-hidden="true"
          onClick={handleOpen}
        >
          {previewUrl ? (
            <img src={previewUrl} alt={localTitle} className="drawing-canvas-card__preview-image" />
          ) : (
            <div className="drawing-canvas-card__thumb-icon" />
          )}
        </div>

        <div className="drawing-canvas-card__footer">
          {isRenaming ? (
            <div className="drawing-canvas-card__rename-input-container" onClick={(e) => e.stopPropagation()}>
              <Input
                autoFocus
                className="drawing-canvas-card__rename-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value.slice(0, CANVAS_NAME_MAX_LENGTH))}
                maxLength={CANVAS_NAME_MAX_LENGTH}
                suffix={`${renameValue.length}/${CANVAS_NAME_MAX_LENGTH}`}
                onPressEnter={handleRenameSave}
              />
              <CloseOutlined className="drawing-canvas-card__rename-action drawing-canvas-card__rename-cancel ms-1" onClick={handleRenameCancel} />
              <CheckOutlined className="drawing-canvas-card__rename-action drawing-canvas-card__rename-save" onClick={handleRenameSave} />
            </div>
          ) : (
            <>
              <div className="drawing-canvas-card__title-container" onClick={handleOpen}>
                <div className="drawing-canvas-card__title" title={localTitle}>
                  {localTitle}
                </div>
                {createdAtSubtitle ? (
                  <div className="drawing-canvas-card__subtitle">{createdAtSubtitle}</div>
                ) : null}
              </div>
             {!hideMoreOptions ? <div onClick={(e) => e.stopPropagation()}>
                <Dropdown
                  menu={{ items: menuItems, onClick: handleMenuClick }}
                  trigger={['click']}
                  placement="bottomRight"
                >
                  <div className="btn p-0" style={{ cursor: "pointer" }}>
                    <i className="icon-More iconrotate90" style={{ fontSize: 18 }} />
                  </div>
                </Dropdown>
              </div> : null}
            </>
          )}
        </div>
      </Card>

      <CommonModal
        isModalOpen={isDeleteModalOpen}
        onCancel={handleDeleteCancel}
        modalWidth={510}
        title="Are you sure you want to delete this Canvas?"
        modalBody={
          <>
            <div className="alert-warning rounded-10px p-2 patient-details mt-2">
              <div className="d-flex align-items-center">
                <img className="me-3" src={alertIcon} alt="Warning" />
                <span>
                  This action cannot be undone. The &quot;<strong>{localTitle}</strong>&quot; canvas cannot be recovered once deleted
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div
                  onClick={handleDeleteConfirm}
                  className="me-4 text-decoration-underline text-danger"
                  style={{ cursor: "pointer", fontWeight: 500 }}
                >
                  Delete Canvas
                </div>
                <Button
                  onClick={handleDeleteCancel}
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
    </>
  );
};

export default DrawingCanvasCard;

