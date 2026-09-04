// Stops react-beautiful-dnd's drop-animation listener from dispatching twice
// for a single drop.
//
// TATVAPRACTICE-NQ: 255 events, 68 doctors, /prescription. Sentry titles it "c"
// (a minified frame) because the thrown value is a plain object rather than an
// Error; the real message is in the payload, {"message": "Invariant failed"}.
//
// What react-beautiful-dnd 13.1.1 does. <Draggable> puts an onTransitionEnd on
// draggableProps, but only while a drop is animating:
//
//   var onTransitionEnd =
//     mapped.type === 'DRAGGING' && mapped.dropping ? onMoveEnd : null;
//
// onMoveEnd checks it is mid-drag, that a drop is animating, and that
// event.propertyName is "transform", then dispatches DROP_ANIMATION_FINISHED.
// The reducer asserts the store is still in the DROP_ANIMATING phase when that
// action lands. The first dispatch moves it out of that phase, so a *second*
// dispatch inside the same drop trips the assertion — and a production build
// compiles that assertion without a message, hence the bare "Invariant failed".
//
// A second dispatch is easy to come by: the row carries more than one
// transform-animating thing (antd's own transitions, the .taper-dose badge),
// and the handler stays attached until React re-renders it away, which is not
// synchronous with the animation ending.
//
// Why the previous attempt (PR #4031) did not work. It forwarded the event only
// when `event.target === event.currentTarget`, on the theory that the stray
// transition came from a child. The captured events disprove that — target is
// the draggable row itself:
//
//   target:        div.ant-row.taper-dose.align-items-center.border-bottom
//   currentTarget: body > div#root   (React 18's delegation root)
//
// so the check passed the event straight through and changed nothing.
//
// What this does instead: forward the first transform transitionend of a drop
// and ignore the rest, which is exactly the one dispatch the reducer expects.
// The latch is keyed on the draggable's own id — RBD's onMoveEnd identity is
// not stable (its useCallback lists `mapped`, which changes during the drop),
// so the function itself cannot be used as the key. When a drop is not
// animating RBD passes onTransitionEnd: null, and that is the signal to clear
// the latch for the next drop.

// When each draggable id last dispatched, so a repeat inside the same drop can
// be recognised. Two things clear it, and they cover each other's gap:
//
//   - RBD rendering onTransitionEnd: null, which always follows a finished
//     drop. Exact, and the normal path.
//   - The entry ageing out. Needed because the first clause never runs if the
//     row unmounts mid-drop (navigating away, the list re-keying). Without it a
//     stale id would sit here for the life of the page and swallow the *real*
//     dispatch of that row's next drop, which would leave the store stuck in
//     DROP_ANIMATING — a worse bug than the one being fixed.
//
// RBD's drop animation is ~330ms; the window is comfortably longer than that
// and far shorter than any plausible drag-drop-drag of the same row.
const DROP_DISPATCH_WINDOW_MS = 1000;
const lastDispatchAt = new Map();

export const guardDropAnimation = (draggableProps) => {
  if (!draggableProps) return draggableProps;

  const draggableId = draggableProps["data-rbd-draggable-id"];
  const onTransitionEnd = draggableProps.onTransitionEnd;

  // No handler means no drop is animating, so the next one starts clean.
  if (typeof onTransitionEnd !== "function") {
    if (draggableId != null) lastDispatchAt.delete(draggableId);
    return draggableProps;
  }

  return {
    ...draggableProps,
    onTransitionEnd: (event) => {
      // Only the drop animation's own property is worth forwarding. RBD
      // ignores the rest anyway, and checking here stops an unrelated
      // transition from consuming this drop's single dispatch.
      if (!event || event.propertyName !== "transform") return;

      if (draggableId != null) {
        const now = Date.now();
        const previous = lastDispatchAt.get(draggableId);
        if (previous != null && now - previous < DROP_DISPATCH_WINDOW_MS)
          return;
        lastDispatchAt.set(draggableId, now);
      }

      onTransitionEnd(event);
    },
  };
};
