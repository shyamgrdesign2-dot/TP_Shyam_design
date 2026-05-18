import { useEffect, useId, useMemo, useState } from "react";
import { ArrowDown2, ArrowUp2, InfoCircle } from "iconsax-reactjs";
import { TPDrawer, TPDrawerContent } from "./tp-ui/tp-drawer";
import { DrawerHeader } from "./plan/plan-shared";
import { TPButton as Button } from "./tp-ui/button-system";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger } from
"./ui/tooltip";

import {
  computeBillingLineTotal,
  formatBillingInr } from
"./lib/billing-catalog";
import { useBillingCatalog } from "./lib/useBillingCatalog";
import styles from "./AddDentalBillItemDrawer.module.scss";

function sanitizeDecimal(raw) {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return (
    cleaned.slice(0, firstDot + 1) +
    cleaned.slice(firstDot + 1).replace(/\./g, ""));

}

/**
 * Tooltip copy shown next to the drawer title — mirrors the shared-catalog
 * explainer from the main billing settings drawer, but worded for the
 * dental exam / treatment plan surface where this drawer is launched.
 */
function DentalServiceHelpContent() {
  return (
    <div className={styles.helpContainer}>
      <p className={styles.helpTitle}>Shared billing catalog</p>
      <p className={styles.helpDesc}>
        After you save, this name and price can be picked again in the dental
        exam, treatment plan, and billing.
      </p>
      <ul className={styles.helpList}>
        <li className={styles.helpListItem}>
          <span
            aria-hidden
            className={styles.helpBullet} />


          <span className={styles.helpListItemText}>
            Keep the name{" "}
            <strong className={styles.helpStrong}>
              short and easy to read
            </strong>
            .
          </span>
        </li>
        <li className={styles.helpListItem}>
          <span
            aria-hidden
            className={styles.helpBullet} />


          <span className={styles.helpListItemText}>
            Use{" "}
            <strong className={styles.helpStrong}>
              accurate pricing
            </strong>{" "}
            so estimates stay consistent.
          </span>
        </li>
      </ul>
    </div>);

}

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {string} [props.initialName]
 * @param {(item: import("./lib/billing-catalog").BillingItem) => void} [props.onSaved]
 */
export function AddDentalBillItemDrawer({
  open,
  onOpenChange,
  initialName = "",
  onSaved
}) {
  const formId = useId();
  const { addItem } = useBillingCatalog();
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCgst, setFormCgst] = useState("");
  const [formSgst, setFormSgst] = useState("");
  const [formDiscount, setFormDiscount] = useState("");
  const [formDiscountUnit, setFormDiscountUnit] = useState("inr");
  const [formErrors, setFormErrors] = useState({ name: "", price: "" });

  useEffect(() => {
    if (open) {
      setFormName(initialName.trim());
      setFormPrice("");
      setFormCgst("");
      setFormSgst("");
      setFormDiscount("");
      setFormDiscountUnit("inr");
      setFormErrors({ name: "", price: "" });
    }
  }, [open, initialName]);

  const drawerPreviewTotal = useMemo(() => {
    const priceNum = Number(sanitizeDecimal(String(formPrice)));
    if (!Number.isFinite(priceNum) || priceNum <= 0) return null;
    const cgstPct =
    formCgst.trim() === "" ?
    0 :
    Number(sanitizeDecimal(String(formCgst))) || 0;
    const sgstPct =
    formSgst.trim() === "" ?
    0 :
    Number(sanitizeDecimal(String(formSgst))) || 0;
    const gstPct = cgstPct + sgstPct;
    const discountRaw = sanitizeDecimal(String(formDiscount));
    const discount = discountRaw === "" ? 0 : Number(discountRaw);
    if (!Number.isFinite(discount) || discount < 0) return null;
    return computeBillingLineTotal(
      priceNum,
      discount,
      gstPct,
      formDiscountUnit
    );
  }, [formPrice, formCgst, formSgst, formDiscount, formDiscountUnit]);

  function handleSave() {
    const name = formName.trim();
    const priceNum = Number(sanitizeDecimal(String(formPrice)));
    const nextErrors = { name: "", price: "" };
    if (!name) nextErrors.name = "Enter a name to continue.";
    if (!Number.isFinite(priceNum) || priceNum <= 0)
    nextErrors.price = "Enter a valid price greater than zero.";
    if (nextErrors.name || nextErrors.price) {
      setFormErrors(nextErrors);
      return;
    }

    const cgstPct =
    formCgst.trim() === "" ?
    0 :
    Number(sanitizeDecimal(String(formCgst))) || 0;
    const sgstPct =
    formSgst.trim() === "" ?
    0 :
    Number(sanitizeDecimal(String(formSgst))) || 0;
    const gstPct = cgstPct + sgstPct;
    const discountRaw = sanitizeDecimal(String(formDiscount));
    const discount = discountRaw === "" ? 0 : Number(discountRaw);
    if (!Number.isFinite(discount) || discount < 0) return;

    const item = {
      id:
      typeof crypto !== "undefined" && crypto.randomUUID ?
      crypto.randomUUID() :
      `dent-${Date.now()}`,
      name,
      type: "dental",
      price: priceNum,
      priceUnit: "per_unit",
      discount,
      discountUnit: formDiscountUnit,
      cgstPct,
      sgstPct,
      gstPct
    };

    addItem(item);
    onSaved?.(item);
    onOpenChange(false);
  }

  return (
    <TooltipProvider delayDuration={200}>
      <TPDrawer open={open} onOpenChange={onOpenChange}>
        <TPDrawerContent
          side="right"
          size="lg"
          overlayClassName="!z-[100]"
          className={`!gap-0 !p-0 !rounded-none !z-[100] ${styles.drawerSheet}`}>

          <DrawerHeader
            title={
            <span className={styles.billingDrawerTitleRow}>
                <span>Add dental service</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                    type="button"
                    className={styles.infoIconBtn}
                    aria-label="About dental services in the catalog">

                      <InfoCircle
                      size={16}
                      variant="Linear"
                      color="var(--tp-slate-500)" />

                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                  side="bottom"
                  align="start"
                  className={styles.tooltipContent}>

                    <DentalServiceHelpContent />
                  </TooltipContent>
                </Tooltip>
              </span>}

            titleClassName={styles.billingDrawerTitle}
            onClose={() => onOpenChange(false)}
            action={
            <Button
              type="button"
              variant="solid"
              theme="primary"
              size="sm"
              surface="light"
              className={styles.drawerSaveCompact}
              onClick={handleSave}>

                Save
              </Button>} />



          <div className={styles.drawerBody}>
            <form
              id={formId}
              className={styles.form}
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={`${formId}-name`}>
                  Dental service name
                  <span className={styles.requiredMark} aria-hidden>
                    {" "}
                    *
                  </span>
                </label>
                <input
                  id={`${formId}-name`}
                  className={`${styles.drawerInput} ${
                    formErrors.name ? styles.drawerInputError : ""
                  }`}
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (formErrors.name)
                    setFormErrors((er) => ({ ...er, name: "" }));
                  }}
                  placeholder="e.g., Ceramic crown"
                  autoFocus />


                {formErrors.name ?
                <p className={styles.fieldError}>{formErrors.name}</p> :
                null}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={`${formId}-price`}>
                  Price (₹)
                  <span className={styles.requiredMark} aria-hidden>
                    {" "}
                    *
                  </span>
                </label>
                <div
                  className={`${styles.inputAffix} ${
                    formErrors.price ? styles.inputAffixError : ""
                  }`}>

                  <span className={styles.inputAffixPrefix} aria-hidden>
                    ₹
                  </span>
                  <input
                    id={`${formId}-price`}
                    className={styles.drawerInputAffixed}
                    inputMode="decimal"
                    value={formPrice}
                    onChange={(e) => {
                      setFormPrice(sanitizeDecimal(e.target.value));
                      if (formErrors.price)
                      setFormErrors((er) => ({ ...er, price: "" }));
                    }}
                    placeholder="0" />

                </div>
                {formErrors.price ?
                <p className={styles.fieldError}>{formErrors.price}</p> :
                null}
              </div>

              <div className={styles.field}>
                <div className={styles.drawerPricingTriple}>
                  <div className={styles.pricingCol}>
                    <label
                      className={styles.pricingMiniLabel}
                      htmlFor={`${formId}-cgst`}>

                      CGST (%)
                    </label>
                    <div className={styles.inputAffix}>
                      <input
                        id={`${formId}-cgst`}
                        className={styles.drawerInputAffixed}
                        inputMode="decimal"
                        value={formCgst}
                        onChange={(e) =>
                        setFormCgst(sanitizeDecimal(e.target.value))}

                        placeholder="0" />


                      <span className={styles.inputAffixSuffix} aria-hidden>
                        %
                      </span>
                    </div>
                  </div>
                  <div className={styles.pricingCol}>
                    <label
                      className={styles.pricingMiniLabel}
                      htmlFor={`${formId}-sgst`}>

                      SGST (%)
                    </label>
                    <div className={styles.inputAffix}>
                      <input
                        id={`${formId}-sgst`}
                        className={styles.drawerInputAffixed}
                        inputMode="decimal"
                        value={formSgst}
                        onChange={(e) =>
                        setFormSgst(sanitizeDecimal(e.target.value))}

                        placeholder="0" />


                      <span className={styles.inputAffixSuffix} aria-hidden>
                        %
                      </span>
                    </div>
                  </div>
                  <div className={styles.pricingCol}>
                    <label
                      className={styles.pricingMiniLabel}
                      htmlFor={`${formId}-disc`}>

                      Discount
                    </label>
                    <div className={styles.discountInline}>
                      <input
                        id={`${formId}-disc`}
                        className={styles.discountInlineInput}
                        inputMode="decimal"
                        value={formDiscount}
                        onChange={(e) =>
                        setFormDiscount(sanitizeDecimal(e.target.value))}

                        placeholder="0"
                        aria-label={
                        formDiscountUnit === "percent" ?
                        "Discount percent" :
                        "Discount amount"} />



                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() =>
                        setFormDiscountUnit(
                          formDiscountUnit === "inr" ? "percent" : "inr"
                        )}

                        className={styles.discountUnitSwitch}
                        title={
                        formDiscountUnit === "inr" ?
                        "Switch to %" :
                        "Switch to ₹"}>


                        <span>{formDiscountUnit === "inr" ? "₹" : "%"}</span>
                        <span
                          className={styles.discountUnitChevrons}
                          aria-hidden>

                          <ArrowUp2
                            size={8}
                            color="currentColor"
                            variant="Bold" />


                          <ArrowDown2
                            size={8}
                            color="currentColor"
                            variant="Bold" />

                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div className={styles.drawerTotalFooter} aria-live="polite">
            <p className={styles.drawerTotalLabel}>Total amount (incl. GST)</p>
            <p className={styles.drawerTotalValue}>
              {drawerPreviewTotal === null ?
              "—" :
              formatBillingInr(drawerPreviewTotal)}
            </p>
          </div>
        </TPDrawerContent>
      </TPDrawer>
    </TooltipProvider>);

}