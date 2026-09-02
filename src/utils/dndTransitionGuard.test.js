import { guardDropAnimation } from "./dndTransitionGuard";

// Shapes taken from react-beautiful-dnd 13.1.1: draggableProps carries an
// onTransitionEnd only while a drop animation is running, and is null otherwise.
const draggableEl = { id: "draggable" };
const childEl = { id: "child" };

describe("guardDropAnimation", () => {
  it("forwards the drop animation's own transitionend", () => {
    const onTransitionEnd = jest.fn();
    const event = { target: draggableEl, currentTarget: draggableEl };

    guardDropAnimation({ onTransitionEnd }).onTransitionEnd(event);

    expect(onTransitionEnd).toHaveBeenCalledWith(event);
  });

  it("swallows a transitionend that bubbled up from a child", () => {
    // TATVAPRACTICE-NQ. An antd child inside the draggable row finishes its own
    // transform transition during the drop window; RBD would read that as its
    // drop animation ending and dispatch DROP_ANIMATION_FINISHED a second time,
    // tripping the reducer assertion ("Invariant failed").
    const onTransitionEnd = jest.fn();
    const event = { target: childEl, currentTarget: draggableEl };

    guardDropAnimation({ onTransitionEnd }).onTransitionEnd(event);

    expect(onTransitionEnd).not.toHaveBeenCalled();
  });

  it("does not throw when RBD supplies no handler", () => {
    // draggableProps.onTransitionEnd is null whenever a drop is not animating,
    // which is the overwhelmingly common case.
    const guarded = guardDropAnimation({ onTransitionEnd: null });

    expect(() =>
      guarded.onTransitionEnd({ target: draggableEl, currentTarget: draggableEl })
    ).not.toThrow();
  });

  it("preserves the rest of draggableProps", () => {
    const props = {
      "data-rbd-draggable-id": "medication-3",
      "data-rbd-draggable-context-id": "0",
      style: { transform: "translate(0px, 12px)" },
      onTransitionEnd: null,
    };

    const guarded = guardDropAnimation(props);

    expect(guarded["data-rbd-draggable-id"]).toBe("medication-3");
    expect(guarded["data-rbd-draggable-context-id"]).toBe("0");
    expect(guarded.style).toEqual({ transform: "translate(0px, 12px)" });
  });

  it("tolerates a missing props object and a malformed event", () => {
    expect(guardDropAnimation(undefined)).toBe(undefined);
    expect(guardDropAnimation(null)).toBe(null);

    const onTransitionEnd = jest.fn();
    expect(() =>
      guardDropAnimation({ onTransitionEnd }).onTransitionEnd(undefined)
    ).not.toThrow();
    expect(onTransitionEnd).not.toHaveBeenCalled();
  });
});
