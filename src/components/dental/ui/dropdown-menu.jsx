import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { CheckCircle2, ChevronRight, Circle } from "lucide-react";
import styles from "./dropdown-menu.module.scss";

const cx = (...classes) => classes.filter(Boolean).join(" ");
function DropdownMenu({ ...props }) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}
function DropdownMenuPortal({ ...props }) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />);

}
function DropdownMenuTrigger({ ...props }) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props} />);


}
function DropdownMenuContent({ className, sideOffset = 4, ...props }) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cx("treatment-plan", styles.content, className)}
        {...props} />

    </DropdownMenuPrimitive.Portal>);

}
function DropdownMenuGroup({ ...props }) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />);

}
function DropdownMenuItem({ className, inset, variant = "default", ...props }) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cx(styles.item, className)}
      {...props} />);


}
function DropdownMenuCheckboxItem({ className, children, checked, ...props }) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cx(styles.checkboxItem, className)}
      checked={checked}
      {...props}>

      <span className={styles.indicator}>
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckCircle2 size={16} className={styles.iconSm} />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>);

}
function DropdownMenuRadioGroup({ ...props }) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props} />);


}
function DropdownMenuRadioItem({ className, children, ...props }) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cx(styles.radioItem, className)}
      {...props}>

      <span className={styles.indicator}>
        <DropdownMenuPrimitive.ItemIndicator>
          <Circle size={8} className={styles.circleFill} />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>);

}
function DropdownMenuLabel({ className, inset, ...props }) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cx(styles.label, className)}
      {...props} />);


}
function DropdownMenuSeparator({ className, ...props }) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cx(styles.separator, className)}
      {...props} />);


}
function DropdownMenuShortcut({ className, ...props }) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cx(styles.shortcut, className)}
      {...props} />);


}
function DropdownMenuSub({ ...props }) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}
function DropdownMenuSubTrigger({ className, inset, children, ...props }) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cx(styles.subTrigger, className)}
      {...props}>

      {children}
      <ChevronRight size={16} className={styles.subChevron} />
    </DropdownMenuPrimitive.SubTrigger>);

}
function DropdownMenuSubContent({ className, ...props }) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cx(styles.subContent, className)}
      {...props} />);


}
export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent };
