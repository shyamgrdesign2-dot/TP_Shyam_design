import { useState } from "react";
import { Input, Button, Popover, Tabs, Select, Tooltip } from "antd";
import { Grid5, Ram } from "iconsax-reactjs";
import {
  DENTAL_MOENGAGE_EVENTS,
  trackDentalEvent,
} from "../../../utils/dentalMoengage";

const TAB_ADD = "add";
const TAB_UPDATE = "update";
const TEMPLATE_TABS = [
  { key: TAB_ADD, label: "New Template" },
  { key: TAB_UPDATE, label: "Update Template" },
];

/**
 * Renders the paired Template (list) + Save (create/update) popovers
 * for an examination section or panel header.
 *
 * UI matches SymptomsBox exactly: pop-350/pop-450 overlay widths,
 * same pop-header / pop-body structure, same tab layout.
 *
 * Props are plain callbacks — Redux wiring happens at the call site.
 */
export function ExaminationTemplateActions({
  title,
  templates = [],
  saving = false,
  hasData = false,
  onSelect,
  onDelete,
  onSaveNew,
  onUpdate,
  btnClassName,
  oralSection = "",
}) {
  const [listOpen, setListOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [activeTab, setActiveTab] = useState(TAB_ADD);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const handleListOpenChange = (open) => {
    if (open && oralSection) {
      trackDentalEvent(DENTAL_MOENGAGE_EVENTS.ORAL_TEMPLATE_SELECT_CLICKED, {
        oral_section: oralSection,
        available_template_count: templates.length,
      });
    }
    setListOpen(open);
  };

  const handleSaveOpenChange = (open) => {
    if (open && oralSection) {
      trackDentalEvent(DENTAL_MOENGAGE_EVENTS.ORAL_TEMPLATE_SAVE_CLICKED, {
        oral_section: oralSection,
        has_oral_notes: hasData,
      });
    }
    if (hasData) setSaveOpen(open);
  };

  const handleSelectTemplate = (t) => {
    onSelect?.(t);
    setListOpen(false);
    if (oralSection) {
      trackDentalEvent(DENTAL_MOENGAGE_EVENTS.ORAL_TEMPLATE_APPLIED, {
        oral_section: oralSection,
        template_id: t.id,
        entries_applied_count: t._raw?.payload
          ? Object.values(t._raw.payload).reduce(
              (acc, v) => acc + (Array.isArray(v) ? v.length : 0),
              0
            )
          : 0,
      });
    }
  };

  const handleSaveTemplate = () => {
    onSaveNew?.(templateName);
    if (oralSection) {
      trackDentalEvent(DENTAL_MOENGAGE_EVENTS.ORAL_TEMPLATE_SAVED, {
        oral_section: oralSection,
        template_id: "",
        entry_count: 0,
      });
    }
    setTemplateName("");
    setSaveOpen(false);
  };

  const filtered = templates.filter(
    (t) => !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  const listContent = (
    <>
      <div className="pop-header" key="exam-tpl-list">
        <div className="align-items-center d-flex justify-content-between">
          <div className="title-common">{title}</div>
          <Button className="btn btn-delete-prescription p-0" onClick={() => setListOpen(false)}>
            <i className="icon-Cross" />
          </Button>
        </div>
        <div className="mt-3">
          <Input
            allowClear
            className="popinput"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Templates"
            prefix={<i className="icon-search me-2" />}
          />
        </div>
      </div>
      <div className="pop-body">
        {filtered.map((t) => (
          <div className="align-items-center d-flex medicine-templates" key={t.id}>
            <div className="round-box" onClick={() => handleSelectTemplate(t)}>
              <i className="icon-template" />
            </div>
            <div className="text-truncate w-100" onClick={() => handleSelectTemplate(t)}>
              <div className="title text-main2">{t.name}</div>
              {t.description && <div className="text-truncate"><span>{t.description}</span></div>}
            </div>
            <Button className="btn btn-delete-prescription p-0 ms-2" onClick={() => onDelete?.(t.id)}>
              <i className="icon-delete" />
            </Button>
          </div>
        ))}
      </div>
    </>
  );

  const saveContent = (
    <>
      <div className="d-flex justify-content-between align-items-center border-bottom templatepopover">
        <Tabs
          activeKey={activeTab}
          items={TEMPLATE_TABS}
          onChange={(key) => { setActiveTab(key); setTemplateName(""); setSelectedTemplate(null); }}
          className="w-100"
        />
        <Button className="btn btn-delete-prescription" onClick={() => setSaveOpen(false)}>
          <i className="icon-Cross" />
        </Button>
      </div>
      {activeTab === TAB_ADD ? (
        <div className="pop-header d-flex">
          <Input
            allowClear
            value={templateName}
            className="popinput inputheight41"
            placeholder="Template Name"
            onChange={(e) => setTemplateName(e.target.value)}
          />
          <Button
            className="btn btn-primary3 btn-41 ms-3"
            loading={saving}
            disabled={!templateName}
            onClick={handleSaveTemplate}
          >
            Save
          </Button>
        </div>
      ) : (
        <div className="pop-header d-flex">
          <Select
            showSearch
            value={selectedTemplate?.name}
            className="autocomplete-custom w-100 popinput inputheight41"
            placeholder="Select Template"
            optionLabelProp="label"
            options={templates.map((t) => ({ key: t.id, value: t.name, label: t.name }))}
            onSelect={(_, opt) => setSelectedTemplate({ id: opt.key, name: opt.value })}
          />
          <Button
            className="btn btn-primary3 btn-41 ms-3"
            loading={saving}
            disabled={!selectedTemplate}
            onClick={() => { onUpdate?.(selectedTemplate); setSelectedTemplate(null); setSaveOpen(false); }}
          >
            Update
          </Button>
        </div>
      )}
    </>
  );

  return (
    <>
      <Popover
        open={listOpen}
        onOpenChange={handleListOpenChange}
        content={listContent}
        trigger="click"
        overlayClassName="pop-350 pp-0"
        placement="bottom"
      >
        <button type="button" title="Templates" className={btnClassName}>
          <Grid5 color="currentColor" size={16} strokeWidth={1.5} variant="Linear" />
        </button>
      </Popover>
      <Tooltip
        placement="bottom"
        title={hasData ? "" : "Add some data first to save as a template"}
      >
        <Popover
          open={saveOpen}
          onOpenChange={handleSaveOpenChange}
          content={saveContent}
          trigger="click"
          overlayClassName="pop-450 pp-0"
          placement="bottom"
        >
          <button type="button" title="Save as template" className={btnClassName}>
            <Ram color="currentColor" size={16} strokeWidth={1.5} variant="Linear" />
          </button>
        </Popover>
      </Tooltip>
    </>
  );
}
