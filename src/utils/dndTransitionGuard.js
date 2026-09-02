// Guards react-beautiful-dnd's drop-animation listener against transitionend
// events that bubbled up from a draggable's own children.
//
// TATVAPRACTICE-NQ: 250 events, 67 doctors, /prescription. Sentry titles it "c"
// because the thrown value is a plain object rather than an Error, so the group
// took its name from a minified frame; the real message is in the payload,
// {"message": "Invariant failed"}.
//
// What happens (react-beautiful-dnd 13.1.1):
//
//   1. <Draggable> hands us draggableProps carrying an onTransitionEnd, which
//      RBD binds only while a drop animation is running (its `onMoveEnd`).
//   2. onMoveEnd checks three things — mid-drag, dropping, and
//      event.propertyName === "transform" — and then dispatches
//      DROP_ANIMATION_FINISHED. It never checks that the event came from the
//      draggable element itself.
//   3. transitionend bubbles. Our draggable rows wrap antd components that
//      animate transform too, so a child finishing its own transition inside
//      the ~330ms drop window looks identical to the drop animation ending.
//   4. That second dispatch lands after the store has already left the
//      DROP_ANIMATING phase, and RBD's reducer asserts on it. In a production
//      build the assertion carries no message, so it throws the bare string
//      "Invariant failed".
//
// The fix is the check RBD is missing: forward the event only when it was
// raised on the draggable element, not on a descendant. Genuine drop
// animations transition the draggable itself, so target === currentTarget
// holds for the event RBD actually cares about and drops still complete.
//
// Applied at every <Draggable> in the app rather than only the two that
// produce NQ today: the omission is in the library, so every draggable row
// wrapping a transition-capable child has the same latent bug.

export const guardDropAnimation = (draggableProps) => {
  if (!draggableProps) return draggableProps;

  return {
    ...draggableProps,
    onTransitionEnd: (event) => {
      // `event &&` is load-bearing: with optional chaining alone, a missing
      // event makes both sides undefined, the inequality is false, and the
      // handler runs on an event that carries no evidence at all.
      if (!event || event.target !== event.currentTarget) return;
      draggableProps.onTransitionEnd?.(event);
    },
  };
};
