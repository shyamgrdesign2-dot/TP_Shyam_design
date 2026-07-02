import { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { message } from "antd";
import {
  fetchOralTemplates,
  fetchOralTemplate,
  saveOralTemplate,
  deleteOralTemplate,
  selectOralTemplatesByType,
} from "../../../../redux/oralTemplateSlice";
import {
  fetchTemplates,
  fetchTemplate,
  saveTemplate,
  deleteTemplate,
  selectTemplatesByType,
} from "../../../../redux/dentalTemplateSlice";

function describeTemplate(t) {
  const p = t.payload || {};
  const rows = p.findings || p.procedures || p.treatment_history || [];
  if (rows.length) return rows.slice(0, 3).map((r) => r.name).join(", ");
  const text = p.overall_notes || p.notes || "";
  return text ? String(text).slice(0, 60) : "";
}

/**
 * Fetches, saves, and deletes examination templates for a given section type.
 *
 * domain: "oral" | "dental"
 * type:   "findings" | "procedures" | "treatment-history" | "notes" | "examination"
 *
 * Returns:
 *   templates  — mapped to { id, name, description, _raw } for ExaminationTemplateActions
 *   saving     — boolean
 *   onSaveNew  — (name, payload) => void   create new template
 *   onUpdate   — ({ id, name }, payload) => void  overwrite existing
 *   onDelete   — (id) => void
 */
export function useExaminationTemplates({ type, domain }) {
  const isOral = domain === "oral";
  const dispatch = useDispatch();

  const rawTemplates = useSelector(
    isOral ? selectOralTemplatesByType(type) : selectTemplatesByType(type)
  );
  const saving = useSelector(
    (s) => (isOral ? s.oralTemplate?.loading : s.dentalTemplate?.loading) || false
  );

  useEffect(() => {
    dispatch(isOral ? fetchOralTemplates(type) : fetchTemplates(type));
  }, [type, isOral, dispatch]);

  const templates = useMemo(
    () => rawTemplates.map((t) => ({
      id: t.id,
      name: t.name,
      description: describeTemplate(t),
      _raw: t,
    })),
    [rawTemplates]
  );

  const onSaveNew = useCallback(
    (name, payload) => {
      const data = { name, ...payload };
      dispatch(isOral ? saveOralTemplate({ type, data }) : saveTemplate({ type, data }));
    },
    [type, isOral, dispatch]
  );

  const onUpdate = useCallback(
    ({ id, name }, payload) => {
      const data = { id, name, ...payload };
      dispatch(isOral ? saveOralTemplate({ type, data }) : saveTemplate({ type, data }));
    },
    [type, isOral, dispatch]
  );

  const onDelete = useCallback(
    async (id) => {
      const action = await dispatch(
        isOral ? deleteOralTemplate({ type, id }) : deleteTemplate({ type, id })
      );
      if (action.type.endsWith("/rejected")) {
        message.error(action.payload || "Failed to delete template");
      }
    },
    [type, isOral, dispatch]
  );

  const applyTemplate = useCallback(
    async (t, apply) => {
      const action = await dispatch(
        isOral
          ? fetchOralTemplate({ type, id: t.id })
          : fetchTemplate({ type, id: t.id })
      );

      if (action.meta.requestStatus === "fulfilled" && action.payload) {
        apply(action.payload);
      } else if (action.meta.requestStatus === "rejected") {
        message.error("Failed to load template");
      }
    },
    [type, isOral, dispatch]
  );

  return { templates, saving, onSaveNew, onUpdate, onDelete, applyTemplate };
}
