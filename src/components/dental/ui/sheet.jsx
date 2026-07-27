import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import styles from "./sheet.module.scss";

const cx = (...classes) => classes.filter(Boolean).join(" ");
function Sheet({ ...props }) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}
function SheetTrigger({ ...props }) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}
function SheetClose({ ...props }) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}
function SheetPortal({ ...props }) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}
function SheetContent({
  className,
  overlayClassName,
  children,
  side = "right",
  ...props
}) {
  return (
    <SheetPortal>
      <SheetPrimitive.Overlay
        data-slot="sheet-overlay"
        className={cx(styles.overlay, overlayClassName)} />

      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cx("treatment-plan", styles.contentBase, styles[`side${side[0].toUpperCase()}${side.slice(1)}`], className)}
        {...props}>
        
        {/* Visually hidden title for Radix UI accessibility requirements */}
        <SheetPrimitive.Title style={{ position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: '0' }}>
          Sheet Content
        </SheetPrimitive.Title>

        {children}
      </SheetPrimitive.Content>
    </SheetPortal>);

}
function SheetHeader({ className, ...props }) {
  return (
    <div
      data-slot="sheet-header"
      className={cx(styles.header, className)}
      {...props} />);


}
function SheetFooter({ className, ...props }) {
  return (
    <div
      data-slot="sheet-footer"
      className={cx(styles.footer, className)}
      {...props} />);


}
function SheetTitle({ className, ...props }) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cx(styles.title, className)}
      {...props} />);


}
function SheetDescription({ className, ...props }) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cx(styles.description, className)}
      {...props} />);


}
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription
};
