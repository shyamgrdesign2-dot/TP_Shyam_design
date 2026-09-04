// Keeps react-beautiful-dnd's drop-animation listener from turning a duplicate
// transitionend into a thrown assertion.
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
// onMoveEnd dispatches DROP_ANIMATION_FINISHED for any transitionend whose
// propertyName is "transform". The reducer asserts the store is still in the
// DROP_ANIMATING phase when that action lands. The first dispatch moves it out,
// so a second dispatch inside the same drop trips the assertion — and a
// production build compiles that assertion without a message, hence the bare
// "Invariant failed".
//
// A duplicate is easy to come by: the row carries more than one
// transform-animating thing, and the handler stays attached until React
// re-renders it away, which is not synchronous with the animation ending.
//
// Two guards, in order:
//
//   1. Only forward events raised on the draggable element itself. A
//      descendant's transform transition would otherwise be forwarded, RBD
//      would dispatch while the phase is still DROP_ANIMATING (so no throw) and
//      the drop animation would end early — a visible regression rather than a
//      logged one. The draggable is identified by the data attribute RBD puts
//      on it, which no descendant carries; `event.currentTarget` is not usable
//      here, since React 18 delegates at the root container.
//
//   2. Swallow RBD's own assertion if it fires anyway. By the time it throws,
//      the first dispatch has already completed the drop — the state the
//      assertion is protecting is fine, and the throw is the library
//      complaining about being told twice. Only that exact message is
//      swallowed; anything else propagates untouched.
//
// Deliberately stateless. An earlier revision latched "one dispatch per drop"
// in a module-level Map keyed on the draggable id. Review found that key is not
// unique across the app (AdviceBox, TabAdviceBox and TabAdviceSearch all emit
// `advice-${index}`), that clearing the latch meant mutating module state
// during render at twelve call sites, and that rows unmounting mid-drop leaked
// entries permanently. None of those risks exist without the state.

// RBD's assertion message in a production build, where invariant() is compiled
// without the developer-facing detail. See its `var prefix = 'Invariant failed'`.
const RBD_INVARIANT_MESSAGE = "Invariant failed";

const RBD_DRAGGABLE_ID_ATTRIBUTE = "data-rbd-draggable-id";

// True when the transition ended on the draggable itself rather than on
// something inside it. Falls back to forwarding when the id or the DOM node is
// not available, so an unrecognised shape degrades to current behaviour instead
// of silently dropping the real dispatch.
const isRaisedOnDraggable = (event, draggableId) => {
  if (draggableId == null) return true;
  const target = event.target;
  if (!target || typeof target.getAttribute !== "function") return true;
  return target.getAttribute(RBD_DRAGGABLE_ID_ATTRIBUTE) === draggableId;
};

export const guardDropAnimation = (draggableProps) => {
  if (!draggableProps) return draggableProps;

  const onTransitionEnd = draggableProps.onTransitionEnd;
  // Null whenever no drop is animating, which is almost always.
  if (typeof onTransitionEnd !== "function") return draggableProps;

  const draggableId = draggableProps[RBD_DRAGGABLE_ID_ATTRIBUTE];

  return {
    ...draggableProps,
    onTransitionEnd: (event) => {
      if (!event || event.propertyName !== "transform") return;
      if (!isRaisedOnDraggable(event, draggableId)) return;

      try {
        onTransitionEnd(event);
      } catch (error) {
        if (error && error.message === RBD_INVARIANT_MESSAGE) return;
        throw error;
      }
    },
  };
};
