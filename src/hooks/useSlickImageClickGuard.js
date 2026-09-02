import { useEffect } from 'react';

const GUARD_FLAG = '__slickFocusGuard';
const SLIDE_IMAGE_SELECTOR = '.slick-slide img';
const DEFAULT_INTERVAL_MS = 1000;

/**
 * react-slick (used by antd's <Carousel>) re-runs `checkImagesLoad` on every
 * componentDidUpdate. That helper wraps each slide image's `onclick` in a new
 * closure that calls the *previous* handler and then focuses the slide:
 *
 *   const prevClickHandler = image.onclick;
 *   image.onclick = (e) => { prevClickHandler(e); image.parentNode.focus(); };
 *
 * Nothing ever unwinds the chain, so a carousel that updates often accumulates
 * one closure per update. Tapping a slide then unwinds the whole chain in one
 * synchronous call and blows the stack with
 * "RangeError: Maximum call stack size exceeded".
 *
 * This hook periodically collapses the chain back to a single handler that
 * preserves the focus-the-slide behaviour react-slick intends, so the depth
 * stays bounded no matter how often the carousel re-renders.
 *
 * @param {React.RefObject<HTMLElement>} containerRef element wrapping the carousel
 * @param {number} intervalMs how often to collapse the handler chain
 */
export function useSlickImageClickGuard(containerRef, intervalMs = DEFAULT_INTERVAL_MS) {
  useEffect(() => {
    const collapseClickChain = () => {
      const container = containerRef.current;
      if (!container) return;

      container.querySelectorAll(SLIDE_IMAGE_SELECTOR).forEach((image) => {
        if (image.onclick && image.onclick[GUARD_FLAG]) return;

        const focusSlide = () => {
          if (image.parentNode && image.parentNode.focus) {
            image.parentNode.focus();
          }
        };
        focusSlide[GUARD_FLAG] = true;
        image.onclick = focusSlide;
      });
    };

    collapseClickChain();
    const timer = setInterval(collapseClickChain, intervalMs);

    return () => clearInterval(timer);
  }, [containerRef, intervalMs]);
}

export default useSlickImageClickGuard;
