import * as React from "react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "../ui/sheet";
import styles from "./tp-drawer.module.scss";

function TPDrawer({ open, onOpenChange, children }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {children}
    </Sheet>
  );
}

const TPDrawerTrigger = SheetTrigger;

function TPDrawerContent({
  className = "",
  side = "right",
  size = "md",
  children,
  ...props
}) {
  const hasTitle = React.Children.toArray(children).some(
    (child) => child.type === TPDrawerHeader || child.type === TPDrawerTitle
  );

  return (
    <SheetContent
      side={side}
      className={`${styles.content} ${styles[`side-${side}`]} ${
        styles[size] || ""
      } ${className}`}
      {...props}
    >
      {children}
    </SheetContent>
  );
}

function TPDrawerHeader({ className = "", ...props }) {
  return (
    <SheetHeader className={`${styles.header} ${className}`} {...props} />
  );
}

function TPDrawerFooter({ className = "", ...props }) {
  return (
    <SheetFooter className={`${styles.footer} ${className}`} {...props} />
  );
}

function TPDrawerTitle({ className = "", ...props }) {
  return (
    <SheetTitle className={`${styles.title} ${className}`} {...props} />
  );
}

function TPDrawerDescription({ className = "", ...props }) {
  return (
    <SheetDescription
      className={`${styles.description} ${className}`}
      {...props}
    />
  );
}

const TPDrawerClose = SheetClose;

export {
  TPDrawer,
  TPDrawerTrigger,
  TPDrawerContent,
  TPDrawerHeader,
  TPDrawerFooter,
  TPDrawerTitle,
  TPDrawerDescription,
  TPDrawerClose,
};