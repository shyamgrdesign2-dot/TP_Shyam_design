"use client";

/**
 * Tabs — Tab navigation molecule wrapping Radix Tabs.
 * Styling: Tabs.module.scss (data-state="active" drives the blue indicator).
 */

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import styles from "./Tabs.module.scss";





export function Tabs({ className = "", ...props }) {
  return <TabsPrimitive.Root className={className} {...props} />;
}





export function TabsList({ className = "", style, ...props }) {
  const cls = [styles.list, className].filter(Boolean).join(" ");
  return <TabsPrimitive.List className={cls} style={style} {...props} />;
}





export function TabsTrigger({ className = "", style, ...props }) {
  const cls = [styles.trigger, className].filter(Boolean).join(" ");
  return <TabsPrimitive.Trigger className={cls} style={style} {...props} />;
}





export function TabsContent({ className = "", style, ...props }) {
  const cls = [styles.content, className].filter(Boolean).join(" ");
  return <TabsPrimitive.Content className={cls} style={style} {...props} />;
}

Tabs.displayName = "Tabs";
TabsList.displayName = "TabsList";
TabsTrigger.displayName = "TabsTrigger";
TabsContent.displayName = "TabsContent";