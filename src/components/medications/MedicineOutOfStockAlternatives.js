import React, { useCallback, useEffect, useRef, useState } from "react";
import { Popover, Spin } from "antd";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import ApiMedication from "../../api/services/ApiMedication";
import { getMedicineStockLabel } from "../../utils/utils";
import "./MedicineOutOfStockAlternatives.scss";
import { MEDICINE_STOCK_STATUS } from "../../utils/constants";

const MAX_ALTERNATIVES = 5;

const getMedicineColumnWidth = (element) => {
  if (!element) return null;
  const medicineCell =
    element.closest('[class*="medicationNameCell"]') ||
    element.closest(".ant-col");
  return medicineCell?.getBoundingClientRect().width ?? null;
};

const normalizeAlternativesResponse = (response) => {
  const list = Array.isArray(response)
    ? response
    : response?.status && Array.isArray(response.data)
      ? response.data
      : Array.isArray(response?.data)
        ? response.data
        : [];
  return list.slice(0, MAX_ALTERNATIVES);
};

const getAlternativeStockLabel = (alternative) => {
  const quantity =
    alternative.strip_quantity ?? alternative.quantity ?? 0;
  return `In stock · ${quantity}`;
};

const EmptyAlternativesIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--tp-slate-400, #a2a2a8)"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9 9h.01M15 9h.01M8 15h8" />
  </svg>
);

function MedicineOutOfStockAlternatives({
  med,
  renderHmTypeBadge,
  onSelectAlternative,
}) {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [popoverWidth, setPopoverWidth] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const medicineName = med?.tmm_medicine_name || "";

  const updatePopoverWidth = useCallback(() => {
    const width = getMedicineColumnWidth(anchorRef.current);
    if (width) {
      setPopoverWidth(width);
    }
  }, []);

  const fetchAlternatives = useCallback(async () => {
    const medicineId = med?.reference_id;
    if (!medicineId) {
      setAlternatives([]);
      setFetchError("Medicine reference not found");
      return;
    }

    setLoading(true);
    setFetchError(null);
    try {
      const response = await ApiMedication.getMedicineAlternatives(medicineId);
      setAlternatives(normalizeAlternativesResponse(response));
    } catch {
      setAlternatives([]);
      setFetchError("Failed to load alternatives");
    } finally {
      setLoading(false);
    }
  }, [med?.reference_id]);

  const handleOpenChange = (nextOpen) => {
    if (nextOpen) {
      updatePopoverWidth();
      fetchAlternatives();
    }
    setOpen(nextOpen);
  };

  useEffect(() => {
    if (!open) return undefined;
    window.addEventListener("resize", updatePopoverWidth);
    return () => window.removeEventListener("resize", updatePopoverWidth);
  }, [open, updatePopoverWidth]);

  const renderBodyContent = () => {
    if (loading) {
      return (
        <div className="medicine-oos-alternatives__status">
          <Spin size="small" />
        </div>
      );
    }

    if (fetchError) {
      return (
        <div className="medicine-oos-alternatives__empty">
          <div className="medicine-oos-alternatives__empty-icon">
            <EmptyAlternativesIcon />
          </div>
          <p className="medicine-oos-alternatives__empty-title">
            Unable to load alternatives
          </p>
          <p className="medicine-oos-alternatives__empty-desc">{fetchError}</p>
        </div>
      );
    }

    if (alternatives.length === 0) {
      return (
        <div className="medicine-oos-alternatives__empty">
          <div className="medicine-oos-alternatives__empty-icon">
            <EmptyAlternativesIcon />
          </div>
          <p className="medicine-oos-alternatives__empty-title">
            No alternatives available
          </p>
          <p className="medicine-oos-alternatives__empty-desc">
            Nothing in stock matches this medicine&apos;s class right now.
          </p>
        </div>
      );
    }

    return (
      <div className="medicine-oos-alternatives__list">
        {alternatives.map((alternative) => (
          <button
            key={alternative.objectID || alternative.tmm_id}
            type="button"
            className="medicine-oos-alternatives__item"
            onClick={() => {
              onSelectAlternative?.(alternative);
              setOpen(false);
            }}
          >
            <div className="medicine-oos-alternatives__info">
              <div className="medicine-oos-alternatives__name-row">
                <span className="medicine-oos-alternatives__name">
                  {alternative.tmm_medicine_name}
                </span>
                {renderHmTypeBadge?.(alternative)}
              </div>
              {alternative.tmm_generic ? (
                <span className="medicine-oos-alternatives__generic">
                  {alternative.tmm_generic}
                </span>
              ) : null}
            </div>
            <span className="medicine-oos-alternatives__stock">
              <span
                className="medicine-oos-alternatives__stock-dot"
                aria-hidden="true"
              />
              {getAlternativeStockLabel(alternative)}
            </span>
          </button>
        ))}
      </div>
    );
  };

  const popoverContent = (
    <div
      role="dialog"
      aria-label={`In-stock alternatives for ${medicineName}`}
      className="medicine-oos-alternatives"
    >
      <div className="medicine-oos-alternatives__header">
        <p className="medicine-oos-alternatives__label">In-stock alternatives</p>
        <p className="medicine-oos-alternatives__for">for {medicineName}</p>
      </div>
      <div className="medicine-oos-alternatives__body">{renderBodyContent()}</div>
    </div>
  );

  const isLowStock = med?.stock_status === MEDICINE_STOCK_STATUS.LOW_STOCK;
  const stockLabel = isLowStock
    ? getMedicineStockLabel(med) || "Low stock"
    : "Out of stock";

  return (
    <div ref={anchorRef} className="medicine-oos-anchor">
      <Popover
        open={open}
        onOpenChange={handleOpenChange}
        trigger="click"
        placement="bottomLeft"
        arrow={false}
        overlayClassName="pp-0 medicine-oos-alternatives-popover"
        // overlayStyle={popoverWidth ? { width: popoverWidth } : undefined}
        content={popoverContent}
      >
        <div className="medicine-oos-trigger" role="button" tabIndex={0}>
          <div
            className={`medicine-oos-actions${
              isLowStock ? " medicine-oos-actions--low-stock" : ""
            }`}
          >
            <span className="medicine-oos-actions__status">
              <span className="medicine-oos-actions__dot" />
              {stockLabel}
            </span>
            <span className="medicine-oos-actions__divider" />
            <span className="medicine-oos-actions__find-alt">
              Find alt.
              {open ? (
                <UpOutlined style={{ fontSize: 10 }} />
              ) : (
                <DownOutlined style={{ fontSize: 10 }} />
              )}
            </span>
          </div>
        </div>
      </Popover>
    </div>
  );
}

export default MedicineOutOfStockAlternatives;
