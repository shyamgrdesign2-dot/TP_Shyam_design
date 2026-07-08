import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { buttonVariants } from "./button";
import styles from "./alert-dialog.module.scss";

const cx = (...classes) => classes.filter(Boolean).join(" ");
function AlertDialog({ ...props }) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}
function AlertDialogTrigger({ ...props }) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />);

}
function AlertDialogPortal({ ...props }) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />);

}
function AlertDialogOverlay({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cx(styles.overlay, className)}
      {...props} />);


}
function AlertDialogContent({ className, children, ...props }) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cx("treatment-plan", styles.content, className)}
        {...props}>
        
        {/* Visually hidden title for Radix UI accessibility requirements */}
        <AlertDialogPrimitive.Title style={{ position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: '0' }}>
          Alert Dialog Content
        </AlertDialogPrimitive.Title>

        {children}
      </AlertDialogPrimitive.Content>
    </AlertDialogPortal>);

}
function AlertDialogHeader({ className, ...props }) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cx(styles.header, className)}
      {...props} />);


}
function AlertDialogFooter({ className, ...props }) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cx(styles.footer, className)}
      {...props} />);


}
function AlertDialogTitle({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cx(styles.title, className)}
      {...props} />);


}
function AlertDialogDescription({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cx(styles.description, className)}
      {...props} />);


}
function AlertDialogAction({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Action
      className={buttonVariants({ className })}
      {...props} />);


}
function AlertDialogCancel({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Cancel
      className={buttonVariants({ variant: "outline", className })}
      {...props} />);


}
export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel };
