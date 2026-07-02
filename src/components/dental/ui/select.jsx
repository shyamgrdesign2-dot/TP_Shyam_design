import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import styles from "./select.module.scss";

const cx = (...classes) => classes.filter(Boolean).join(" ");
function Select({ ...props }) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}
function SelectGroup({ ...props }) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}
function SelectValue({ ...props }) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}
function SelectTrigger({ className, size = "default", children, ...props }) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cx(styles.trigger, className)}
      {...props}>

      {children}
      <SelectPrimitive.Icon asChild={true}>
        <ChevronDown size={16} className={styles.iconMuted} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>);

}
function SelectContent({ className, children, position = "popper", ...props }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cx("treatment-plan", styles.content, position === "popper" ? styles.contentPopper : "", className)}
        position={position}
        {...props}>

        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cx(styles.viewport, position === "popper" ? styles.viewportPopper : "")}>

          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>);

}
function SelectLabel({ className, ...props }) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cx(styles.label, className)}
      {...props} />);


}
function SelectItem({ className, children, ...props }) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cx(styles.item, className)}
      {...props}>

      <span className={styles.itemIndicator}>
        <SelectPrimitive.ItemIndicator>
          <CheckCircle2 size={16} className={styles.iconSm} />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>);

}
function SelectSeparator({ className, ...props }) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cx(styles.separator, className)}
      {...props} />);


}
function SelectScrollUpButton({ className, ...props }) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cx(styles.scrollButton, className)}
      {...props}>

      <ChevronUp size={16} className={styles.iconSm} />
    </SelectPrimitive.ScrollUpButton>);

}
function SelectScrollDownButton({ className, ...props }) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cx(styles.scrollButton, className)}
      {...props}>

      <ChevronDown size={16} className={styles.iconSm} />
    </SelectPrimitive.ScrollDownButton>);

}
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue };
