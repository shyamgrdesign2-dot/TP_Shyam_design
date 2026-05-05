import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function safeClipboardWrite(text) {
  try {
    const result = navigator.clipboard?.writeText(text);
    // writeText returns a Promise that may reject asynchronously
    // (e.g., "Write permission denied" in non-active tabs / iframes).
    // Swallow the rejection so it doesn't bubble up as an uncaught error.
    if (result && typeof result.catch === "function") {
      result.catch(() => {});
    }
  } catch {

    /* permission denied (synchronous throw) */}
}