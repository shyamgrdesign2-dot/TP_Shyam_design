import { useEffect } from "react";

/** Breathing room kept between the popover and the viewport edges. */
const EDGE_MARGIN = 8;

const POPOVER_SELECTOR = '[id^="tp-drp-popover-"]';

/**
 * Keeps Tesseract's DatePicker popover inside the viewport.
 *
 * The picker portals its popover to <body> and positions it at
 * `trigger.bottom + 6`. It only flips above the trigger when the whole popover
 * fits there, otherwise it leaves the popover hanging past the bottom edge with
 * no way to scroll — on a short viewport (tablet, in-app webview) the day grid
 * and the Apply button simply cannot be reached, so a surgery date can be
 * picked but never applied.
 *
 * This pulls an overflowing popover back up and caps its height, leaving the
 * library's own positioning alone whenever it already fits.
 */
export default function useClampedDatePickerPopover() {
    useEffect(() => {
        const clamp = () => {
            document.querySelectorAll(POPOVER_SELECTOR).forEach((el) => {
                const available = window.innerHeight - EDGE_MARGIN * 2;
                if (available <= 0) return;

                // Measure the natural height, not a height we capped earlier.
                el.style.maxHeight = "";
                const naturalHeight = el.getBoundingClientRect().height;
                const height = Math.min(naturalHeight, available);

                if (naturalHeight > available) {
                    el.style.maxHeight = `${available}px`;
                    el.style.overflowY = "auto";
                }

                const top = parseFloat(el.style.top) || el.getBoundingClientRect().top;
                const maxTop = window.innerHeight - EDGE_MARGIN - height;
                if (top > maxTop) {
                    el.style.top = `${Math.max(EDGE_MARGIN, maxTop)}px`;
                }
            });
        };

        // The popover only exists while it is open, so watch for it appearing.
        const observer = new MutationObserver(clamp);
        observer.observe(document.body, { childList: true });
        window.addEventListener("resize", clamp);
        // Capture phase: the picker repositions on scroll too, and this has to
        // run after it has written its own inline top.
        window.addEventListener("scroll", clamp, true);
        clamp();

        return () => {
            observer.disconnect();
            window.removeEventListener("resize", clamp);
            window.removeEventListener("scroll", clamp, true);
        };
    }, []);
}
