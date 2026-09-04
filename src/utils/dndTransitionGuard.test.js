import { guardDropAnimation } from "./dndTransitionGuard";

// Shapes taken from react-beautiful-dnd 13.1.1. draggableProps carries an
// onTransitionEnd only while a drop is animating, and always carries the
// draggable's id.
const dropping = (onTransitionEnd, id = "medication-3") => ({
  "data-rbd-draggable-id": id,
  "data-rbd-draggable-context-id": "0",
  style: { transform: "translate(0px, 12px)" },
  onTransitionEnd,
});

const idle = (id = "medication-3") => ({
  "data-rbd-draggable-id": id,
  "data-rbd-draggable-context-id": "0",
  style: {},
  onTransitionEnd: null,
});

const transformEnd = (target = { id: "row" }) => ({
  propertyName: "transform",
  target,
  currentTarget: target,
});

describe("guardDropAnimation", () => {
  it("forwards the drop animation's first transform transitionend", () => {
    const inner = jest.fn();
    const event = transformEnd();

    guardDropAnimation(dropping(inner, "first-forward")).onTransitionEnd(event);

    expect(inner).toHaveBeenCalledWith(event);
  });

  it("swallows a second transform transitionend in the same drop", () => {
    // TATVAPRACTICE-NQ. The first dispatch moves the store out of
    // DROP_ANIMATING; a second one trips the reducer assertion and throws
    // "Invariant failed".
    const inner = jest.fn();
    const guarded = guardDropAnimation(dropping(inner, "second-swallowed"));

    guarded.onTransitionEnd(transformEnd());
    guarded.onTransitionEnd(transformEnd());
    guarded.onTransitionEnd(transformEnd());

    expect(inner).toHaveBeenCalledTimes(1);
  });

  it("swallows the second event even across re-renders of the same drop", () => {
    // RBD's onMoveEnd identity changes during a drop (its useCallback lists
    // `mapped`), so the latch cannot key on the function — this is the case
    // that a function-identity latch would miss.
    const first = jest.fn();
    const second = jest.fn();

    guardDropAnimation(dropping(first, "across-renders")).onTransitionEnd(transformEnd());
    guardDropAnimation(dropping(second, "across-renders")).onTransitionEnd(transformEnd());

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it("re-arms once the drop finishes and RBD drops the handler", () => {
    const firstDrop = jest.fn();
    const secondDrop = jest.fn();

    guardDropAnimation(dropping(firstDrop, "re-arm")).onTransitionEnd(transformEnd());
    // Drop over: RBD re-renders with onTransitionEnd: null.
    guardDropAnimation(idle("re-arm"));
    guardDropAnimation(dropping(secondDrop, "re-arm")).onTransitionEnd(transformEnd());

    expect(firstDrop).toHaveBeenCalledTimes(1);
    expect(secondDrop).toHaveBeenCalledTimes(1);
  });

  it("keeps drops on different rows independent", () => {
    const rowA = jest.fn();
    const rowB = jest.fn();

    guardDropAnimation(dropping(rowA, "medication-1")).onTransitionEnd(
      transformEnd(),
    );
    guardDropAnimation(dropping(rowB, "medication-2")).onTransitionEnd(
      transformEnd(),
    );

    expect(rowA).toHaveBeenCalledTimes(1);
    expect(rowB).toHaveBeenCalledTimes(1);
  });

  it("ignores transitions of other properties", () => {
    // An opacity or border-color transition must not consume the drop's single
    // dispatch, or the real one would be swallowed.
    const inner = jest.fn();
    const guarded = guardDropAnimation(dropping(inner, "other-props"));

    guarded.onTransitionEnd({ propertyName: "opacity", target: {} });
    expect(inner).not.toHaveBeenCalled();

    guarded.onTransitionEnd(transformEnd());
    expect(inner).toHaveBeenCalledTimes(1);
  });

  it("forwards an event raised on the row itself", () => {
    // The regression that PR #4031 got wrong: the captured events show target
    // IS the draggable row, so a target/currentTarget equality check does not
    // filter anything.
    const inner = jest.fn();
    const row = { id: "taper-dose-row" };

    guardDropAnimation(dropping(inner, "row-itself")).onTransitionEnd({
      propertyName: "transform",
      target: row,
      currentTarget: row,
    });

    expect(inner).toHaveBeenCalledTimes(1);
  });

  it("tolerates a missing props object and a malformed event", () => {
    expect(guardDropAnimation(undefined)).toBe(undefined);
    expect(guardDropAnimation(null)).toBe(null);

    const inner = jest.fn();
    expect(() =>
      guardDropAnimation(dropping(inner, "malformed")).onTransitionEnd(undefined),
    ).not.toThrow();
    expect(inner).not.toHaveBeenCalled();
  });

  it("passes the rest of draggableProps through untouched", () => {
    const props = dropping(jest.fn());
    const guarded = guardDropAnimation(props);

    expect(guarded["data-rbd-draggable-id"]).toBe("medication-3");
    expect(guarded["data-rbd-draggable-context-id"]).toBe("0");
    expect(guarded.style).toEqual({ transform: "translate(0px, 12px)" });
  });
});
