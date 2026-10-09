import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import styles from "./button.module.scss";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const VARIANT_CLASS_MAP = {
  default: styles.variantDefault,
  destructive: styles.variantDestructive,
  outline: styles.variantOutline,
  secondary: styles.variantSecondary,
  ghost: styles.variantGhost,
  link: styles.variantLink,
};

const SIZE_CLASS_MAP = {
  default: styles.sizeDefault,
  sm: styles.sizeSm,
  lg: styles.sizeLg,
  icon: styles.sizeIcon,
  "icon-sm": styles.sizeIconSm,
  "icon-lg": styles.sizeIconLg,
};

function buttonVariants({ variant = "default", size = "default", className } = {}) {
  return cx(styles.buttonBase, VARIANT_CLASS_MAP[variant], SIZE_CLASS_MAP[size], className);
}

function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={buttonVariants({ variant, size, className })}
      {...props} />);


}
export { Button, buttonVariants };