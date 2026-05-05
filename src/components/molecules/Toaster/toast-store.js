"use client";

/**
 * toast-store — tiny, hand-rolled toast queue. Replaces `sonner`.
 *
 * Public API mirrors sonner's import shape so callers don't change:
 *   import { toast } from "@/src/components/molecules/Toaster";
 *   toast.success("Saved");
 *   toast.error("Couldn't copy");
 *   toast.message("Microphone switched", { description: "iPhone" });
 *
 * The Toaster molecule subscribes to this store, renders the toasts in
 * a top-center stack, and auto-dismisses after `duration` ms.
 */

let _id = 0;
const subscribers = new Set();
let toasts = [];

function emit() {
  for (const fn of subscribers) fn(toasts);
}

function add(type, message, opts = {}) {
  const id = ++_id;
  const duration = opts.duration ?? 2400;
  const t = {
    id,
    type,
    title: message,
    description: opts.description,
    createdAt: Date.now(),
    duration,
  };
  toasts = [...toasts, t];
  emit();
  if (duration > 0) {
    setTimeout(() => dismiss(id), duration);
  }
  return id;
}

export function dismiss(id) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function subscribe(fn) {
  subscribers.add(fn);
  fn(toasts);
  return () => subscribers.delete(fn);
}

export const toast = Object.assign(
  (message, opts) => add("default", message, opts),
  {
    success: (message, opts) => add("success", message, opts),
    error: (message, opts) => add("error", message, opts),
    warning: (message, opts) => add("warning", message, opts),
    info: (message, opts) => add("info", message, opts),
    message: (message, opts) => add("default", message, opts),
    dismiss,
  },
);
