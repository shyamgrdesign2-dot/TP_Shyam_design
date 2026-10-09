import { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { message } from "antd";
import {
  fetchPlanTemplates,
  fetchServiceTemplates,
  fetchOnePlanTemplate,
  fetchOneServiceTemplate,
  savePlanTemplate,
  saveServiceTemplate,
  removePlanTemplate,
  removeServiceTemplate,
  selectPlanTemplates,
  selectServiceTemplates,
  selectPlanTemplateSaving,
} from "../../../../redux/dentalPlanTemplateSlice";

/**
 * Manages plan-level or service-level treatment plan templates.
 *
 * @param {"plan"|"service"} domain
 * @returns {{ templates, saving, save, update, remove, apply }}
 */
export function useTreatmentPlanTemplates(domain) {
  const isPlan = domain === "plan";
  const dispatch = useDispatch();

  const rawTemplates = useSelector(isPlan ? selectPlanTemplates : selectServiceTemplates);
  const saving = useSelector(selectPlanTemplateSaving);

  useEffect(() => {
    dispatch(isPlan ? fetchPlanTemplates() : fetchServiceTemplates());
  }, [isPlan, dispatch]);

  const templates = useMemo(
    () =>
      rawTemplates.map((t) => ({
        id: t.id,
        name: t.name,
        description: describeTemplate(t),
        _raw: t,
      })),
    [rawTemplates]
  );

  /** Save current rows as a new template. @param {string} name @param {object} payload */
  const save = useCallback(
    (name, payload) => {
      dispatch(isPlan ? savePlanTemplate({ name, payload }) : saveServiceTemplate({ name, payload }));
    },
    [isPlan, dispatch]
  );

  /** Overwrite an existing template with new rows. @param {string} id @param {string} name @param {object} payload */
  const update = useCallback(
    (id, name, payload) => {
      dispatch(isPlan ? savePlanTemplate({ id, name, payload }) : saveServiceTemplate({ id, name, payload }));
    },
    [isPlan, dispatch]
  );

  /** Delete a template by id. */
  const remove = useCallback(
    async (id) => {
      const action = await dispatch(isPlan ? removePlanTemplate(id) : removeServiceTemplate(id));
      if (action.type.endsWith("/rejected")) {
        message.error(action.payload || "Failed to delete template");
      }
    },
    [isPlan, dispatch]
  );

  /**
   * Fetch full template payload and pass it to the apply callback.
   * @param {{ id: string, _raw?: object }} tpl
   * @param {(payload: object) => void} applyFn
   */
  const apply = useCallback(
    async (tpl, applyFn) => {
      const action = await dispatch(
        isPlan ? fetchOnePlanTemplate(tpl.id) : fetchOneServiceTemplate(tpl.id)
      );
      if (action.payload) applyFn(action.payload.payload ?? action.payload);
    },
    [isPlan, dispatch]
  );

  return { templates, saving, save, update, remove, apply };
}

function describeTemplate(t) {
  const p = t.payload || {};
  const services = p.services || [];
  if (services.length === 0) {
    const single = p.service || (p.treatment ? p : null);
    if (single?.treatment) return single.treatment;
    return "";
  }
  return services
    .slice(0, 3)
    .map((s) => s.treatment)
    .join(", ");
}
