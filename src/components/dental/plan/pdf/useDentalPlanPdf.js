import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { useDispatch, useSelector } from "react-redux";
import DentalPlanPdf from "./DentalPlanPdf";
import {
  buildCombinedEstimatePayload,
  buildConsolidatedRxPayload,
  buildSingleEstimatePayload,
  buildSingleVisitRxPayload,
  mapAppointmentPatientToBillPatient,
  resolveDentalPlanPdfVariant,
} from "./dentalPlanPdfMappers";
import { getDentalPlanPrintSettings } from "./dentalPlanPdfConstants";
import { getAppointmentPatient } from "../../lib/appointment-patients";
import { fetchPrintSetting } from "../../../../pages/opdBilling/service";
import { setBillPrintSettings } from "../../../../redux/billingSlice";
import { getDefaultPrintsettings } from "../../../../redux/doctorsSlice";

function buildBillDataShim() {
  const now = new Date().toISOString();
  return {
    billDate: now,
    createdAt: now,
  };
}

function resolvePlansForDrawer(drawer, plans) {
  if (drawer.mode === "combined") {
    return plans.filter((p) => p.status === "draft");
  }
  if (drawer.planId) {
    const plan = plans.find((p) => p.id === drawer.planId);
    return plan ? [plan] : [];
  }
  if (drawer.serviceId) {
    const plan = plans.find((p) =>
      p.services?.some((s) => s.id === drawer.serviceId)
    );
    return plan ? [plan] : [];
  }
  return [];
}

function findPlanForDrawer(drawer, plans) {
  if (drawer.planId) {
    return plans.find((p) => p.id === drawer.planId) || null;
  }
  if (drawer.serviceId) {
    return (
      plans.find((p) => p.services?.some((s) => s.id === drawer.serviceId)) ||
      null
    );
  }
  return resolvePlansForDrawer(drawer, plans)[0] || null;
}

export function useDentalPlanPdf({ drawer, patientId, plans: plansProp }) {
  const dispatch = useDispatch();
  const { billPrintSettings, advancedSettings } = useSelector(
    (state) => state.billing
  );
  const { profile, userId, defaultPrintSettings } = useSelector(
    (state) => state.doctors
  );
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [printBlob, setPrintBlob] = useState(null);
  const generationKeyRef = useRef(null);

  const variant = resolveDentalPlanPdfVariant(drawer);
  const isOpen =
    drawer?.type === "bill-preview" || drawer?.type === "rx-preview";

  const plans = useMemo(() => plansProp ?? [], [plansProp]);

  const patientData = useMemo(() => {
    const ap = getAppointmentPatient(patientId);
    return mapAppointmentPatientToBillPatient(ap);
  }, [patientId]);

  const resolvedContext = useMemo(() => {
    if (!variant || !isOpen) return null;

    const matchedPlans = resolvePlansForDrawer(drawer, plans);
    const plan = findPlanForDrawer(drawer, plans);

    let service = null;
    let sitting = null;

    if (drawer.serviceId && plan) {
      service = plan.services?.find((s) => s.id === drawer.serviceId) || null;
    }
    if (drawer.sittingId && service) {
      sitting =
        service.sittings?.find((s) => s.id === drawer.sittingId) || null;
    }

    let estimatePayload = null;
    let rxPayload = null;

    if (variant === "estimate-combined") {
      estimatePayload = buildCombinedEstimatePayload(matchedPlans);
    } else if (variant === "estimate-plan" && plan) {
      estimatePayload = buildSingleEstimatePayload({
        plan,
        services: plan.services || [],
        includePlanDiscount: true,
      });
    } else if (variant === "estimate-service" && plan && service) {
      estimatePayload = buildSingleEstimatePayload({
        plan,
        services: [service],
        includePlanDiscount: false,
      });
    } else if (variant === "rx-consolidated" && service) {
      rxPayload = buildConsolidatedRxPayload(service);
    } else if (variant === "rx-visit" && service && sitting) {
      rxPayload = buildSingleVisitRxPayload(service, sitting);
    }

    return {
      variant,
      plan,
      service,
      sitting,
      estimatePayload,
      rxPayload,
    };
  }, [drawer, isOpen, plans, variant]);

  const generationKey = useMemo(() => {
    if (!isOpen || !variant) return null;
    return JSON.stringify({
      variant,
      planId: drawer.planId,
      serviceId: drawer.serviceId,
      sittingId: drawer.sittingId,
      mode: drawer.mode,
      plansSignature: plans.map((p) => `${p.id}:${p.version ?? 0}`).join("|"),
    });
  }, [
    drawer.mode,
    drawer.planId,
    drawer.serviceId,
    drawer.sittingId,
    isOpen,
    plans,
    variant,
  ]);

  useEffect(() => {
    if (!isOpen || !generationKey || !resolvedContext?.variant) {
      generationKeyRef.current = null;
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setPrintBlob(null);
      setNumPages(0);
      setError(null);
      setLoading(false);
      return;
    }

    if (generationKeyRef.current === generationKey) return;

    let cancelled = false;

    const run = async () => {
      generationKeyRef.current = generationKey;
      setLoading(true);
      setError(null);

      try {
        let billSettings = billPrintSettings;
        if (!billSettings || Object.keys(billSettings).length === 0) {
          if (userId) {
            const response = await fetchPrintSetting(userId);
            if (response) {
              dispatch(setBillPrintSettings(response));
              billSettings = response;
            }
          }
        }

        let rxPrintSettings = defaultPrintSettings;
        if (!rxPrintSettings && userId) {
          const result = await dispatch(
            getDefaultPrintsettings({ default: true })
          );
          if (getDefaultPrintsettings.fulfilled.match(result)) {
            rxPrintSettings = result.payload;
          }
        }

        const settings = getDentalPlanPrintSettings(
          billSettings,
          rxPrintSettings
        );

        const blob = await pdf(
          <DentalPlanPdf
            variant={resolvedContext.variant}
            printSettings={settings}
            patientData={patientData}
            profile={profile}
            billData={buildBillDataShim()}
            gstIn={advancedSettings?.GSTIN}
            showCreatedBy={advancedSettings?.enableCreatedByInRx}
            estimatePayload={resolvedContext.estimatePayload}
            rxPayload={resolvedContext.rxPayload}
          />
        ).toBlob();

        if (cancelled) return;

        setPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        setPrintBlob(blob);
      } catch (err) {
        if (!cancelled) {
          console.error("Dental plan PDF generation failed:", err);
          setError("Failed to generate PDF preview.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [
    advancedSettings?.GSTIN,
    advancedSettings?.enableCreatedByInRx,
    billPrintSettings,
    defaultPrintSettings,
    dispatch,
    generationKey,
    isOpen,
    patientData,
    profile,
    resolvedContext,
    userId,
  ]);

  const downloadPdf = useCallback(
    (filename) => {
      if (!printBlob) return;
      const url = URL.createObjectURL(printBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "dental-plan.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    [printBlob]
  );

  const printPdf = useCallback(() => {
    if (!printBlob) return;
    const url = URL.createObjectURL(printBlob);
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    frame.src = url;
    document.body.appendChild(frame);
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    };
  }, [printBlob]);

  return {
    variant,
    loading,
    error,
    pdfUrl,
    printBlob,
    numPages,
    setNumPages,
    downloadPdf,
    printPdf,
    resolvedContext,
  };
}
