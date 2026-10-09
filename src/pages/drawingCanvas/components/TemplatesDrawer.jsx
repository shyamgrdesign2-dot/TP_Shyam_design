import React, { useState, useMemo } from 'react';
import { Input, Dropdown, Button, message } from 'antd';
import { 
  SearchOutlined, 
  LayoutOutlined, 
  CloseOutlined, 
  CheckOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined
} from '@ant-design/icons';
import CommonModal from '../../../common/CommonModal';
import { ASSETS } from '../../../assets';
import { listTemplates, renameCanvasTemplate, deleteCanvasTemplate } from '../service';
import { trackEvent } from '../../../utils/utils';
import './TemplatesDrawer.scss';

const alertIcon = ASSETS.images.alerticon;


const TemplatesDrawer = ({ onClose, onSelectTemplate, open = false, refreshKey = 0, trackingAttrs = {} }) => {
  const [templates, setTemplates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);

  const resetLocalState = React.useCallback(() => {
    setSearchQuery('');
    setEditingId(null);
    setRenameValue('');
    setIsDeleteModalOpen(false);
    setTemplateToDelete(null);
  }, []);

  React.useEffect(() => {
    if (!open) {
      resetLocalState();
      return;
    }

    // Reset transient UI state when reopening or after template save (refreshKey change).
    resetLocalState();

    const fetchTemplates = async () => {
      const res = await listTemplates();
      if (res.status) {
        let allTemplates = [];
        if (res.default_templates) {
          allTemplates = [...allTemplates, ...res.default_templates];
        }
        if (res.custom_templates) {
          allTemplates = [...allTemplates, ...res.custom_templates];
        }

        const mapped = allTemplates
          .map(t => ({
            ...t,
            id: t.canvas_id,  // ensure id exists for list keys and internal tracking
          }))
          .sort((a, b) => (a?.name || "").localeCompare(b?.name || "", undefined, { sensitivity: "base" }));
        setTemplates(mapped);
      } else {
        setTemplates([]);
      }
    };
    fetchTemplates();
  }, [open, refreshKey, resetLocalState]);

  const filteredTemplates = useMemo(() => {
    return templates.filter(temp => 
      temp.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [templates, searchQuery]);

  const handleStartRename = (template, e) => {
    e.stopPropagation();
    setEditingId(template.id);
    setRenameValue(template.name);
  };

  const handleCancelRename = (e) => {
    e.stopPropagation();
    setEditingId(null);
    setRenameValue('');
  };

  const handleSaveRename = async (e) => {
    e.stopPropagation();
    const newName = renameValue.trim();
    if (!newName) return;
    
    const templateBeingRenamed = templates.find(t => t.id === editingId);
    try {
      const res = await renameCanvasTemplate(editingId, newName);
      if (res.status) {
        trackEvent("drawing_canvas_template_renamed", {
          ...trackingAttrs,
          template_id: editingId,
          old_name: templateBeingRenamed?.name,
          new_name: newName,
        });
        setTemplates(prev => prev.map(t => 
          t.id === editingId ? { ...t, name: newName } : t
        ));
        setEditingId(null);
        message.success("Template renamed successfully");
      } else {
        message.error(res.message || "Failed to rename template");
      }
    } catch (error) {
      message.error("An error occurred while renaming the template");
    }
  };

  const showDeleteConfirm = (template, e) => {
    e.stopPropagation();
    setTemplateToDelete(template);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await deleteCanvasTemplate(templateToDelete?.id);
      if (res.status) {
        trackEvent("drawing_canvas_template_deleted", {
          ...trackingAttrs,
          template_id: templateToDelete?.id,
          template_source: templateToDelete?.is_custom ? "custom" : "default",
        });
        setTemplates(prev => prev.filter(t => t.id !== templateToDelete?.id));
        setIsDeleteModalOpen(false);
        setTemplateToDelete(null);
        message.success("Template deleted successfully");
      } else {
        message.error(res.message || "Failed to delete template");
      }
    } catch (error) {
      message.error("An error occurred while deleting the template");
    }
  };

  const menuItems = (template) => [
    {
      key: 'rename',
      label: (
        <div className="template-menu-item" onClick={(e) => handleStartRename(template, e)}>
          <div className="menu-icon-bg rename">
            <EditOutlined />
          </div>
          <span>Rename</span>
        </div>
      ),
    },
    {
      key: 'delete',
      label: (
        <div className="template-menu-item" onClick={(e) => showDeleteConfirm(template, e)}>
          <div className="menu-icon-bg delete">
            <DeleteOutlined />
          </div>
          <span>Delete</span>
        </div>
      ),
    },
  ];

  return (
    <div className="templates-drawer-container">
      <div className="templates-header">
        <div className="header-title">
          <LayoutOutlined className="title-icon" />
          <span>Canvas Templates</span>
        </div>
        <div className="close-btn" onClick={onClose}>
          <CloseOutlined />
        </div>
      </div>

      <div className="search-container">
        <Input 
          placeholder="Search Template" 
          prefix={<SearchOutlined />} 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
        />
      </div>

      <div className="templates-list">
        {filteredTemplates.map(template => (
          <div 
            key={template.id} 
            className={`template-item ${editingId === template.id ? 'renaming' : ''}`}
            onClick={() => !editingId && onSelectTemplate && onSelectTemplate(template)}
          >
            <div className="template-icon-wrapper">
              <LayoutOutlined className="template-main-icon" />
            </div>

            <div className="template-content">
              {editingId === template.id ? (
                <div className="rename-input-wrapper" onClick={e => e.stopPropagation()}>
                  <Input 
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    maxLength={30}
                    autoFocus
                    onPressEnter={handleSaveRename}
                    suffix={`${renameValue.length}/30`}
                  />
                  <div className="action-icons">
                    <CloseOutlined className="cancel-icon" onClick={handleCancelRename} />
                    <CheckOutlined className="save-icon" onClick={handleSaveRename} />
                  </div>
                </div>
              ) : (
                <div className="template-name" title={template.name}>
                  {template.name}
                </div>
              )}
            </div>

            {!editingId && (
              <div className="template-actions" onClick={e => e.stopPropagation()}>
                <Dropdown
                  menu={{ items: menuItems(template) }}
                  trigger={['click']}
                  placement="bottomRight"
                >
                  <MoreOutlined className="more-btn" />
                </Dropdown>
              </div>
            )}
          </div>
        ))}
      </div>

      <CommonModal
        isModalOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        modalWidth={510}
        zIndex={4000}
        title="Are you sure you want to delete this Template?"
        modalBody={
          <div className="delete-canvas-modal-body">
            <div className="alert-warning">
              <img src={alertIcon} alt="Warning" />
              <span>
                This action cannot be undone. The "<strong>{templateToDelete?.name}</strong>" template cannot be recovered once deleted
              </span>
            </div>
            <div className="modal-actions">
              <div className="delete-link" onClick={handleDeleteConfirm}>
                Delete Template
              </div>
              <Button className="cancel-btn" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        }
      />
    </div>
  );
};

export default TemplatesDrawer;