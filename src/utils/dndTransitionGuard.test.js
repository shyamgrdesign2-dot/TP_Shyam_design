import { guardDropAnimation } from "./dndTransitionGuard";

// Shapes taken from react-beautiful-dnd 13.1.1. draggableProps carries an
// onTransitionEnd only while a drop is animating, and always carries the
// draggable's id.
const DRAGGABLE_ID = "medication-3";

const dropping = (onTransitionEnd, id = DRAGGABLE_ID) => ({
  "data-rbd-draggable-id": id,
  "data-rbd-draggable-context-id": "0",
  style: { transform: "translate(0px, 12px)" },
  onTransitionEnd,
});

const idle = (id = DRAGGABLE_ID) => ({
  "data-rbd-draggable-id": id,
  "data-rbd-draggable-context-id": "0",
  style: {},
  onTransitionEnd: null,
});

// The draggable row: the element RBD stamps with the id attribute.
const rowElement = (id = DRAGGABLE_ID) => ({
  getAttribute: (name) => (name === "data-rbd-draggable-id" ? id : null),
});

// Anything inside the row carries no such attribute.
const childElement = () => ({ getAttribute: () => null });

const transitionEnd = (target, propertyName = "transform") => ({
  propertyName,
  target,
  // React 18 delegates at the root container, so currentTarget is not the row.
  currentTarget: { id: "root" },
});

const rbdInvariant = () => {
  const error = new Error("Invariant failed");
  return error;
};

describe("guardDropAnimation", () => {
  it("forwards a transform transitionend raised on the draggable itself", () => {
    const inner = jest.fn();
    const event = transitionEnd(rowElement());

    guardDropAnimation(dropping(inner)).onTransitionEnd(event);

    expect(inner).toHaveBeenCalledWith(event);
  });

  it("swallows RBD's duplicate-dispatch assertion", () => {
    // TATVAPRACTICE-NQ. The first dispatch completes the drop; a second one
    // reaches the reducer after the phase has moved on and trips its assertion,
    // which a production build throws with no message beyond the prefix.
    const inner = jest.fn(() => {
      throw rbdInvariant();
    });

    expect(() =>
      guardDropAnimation(dropping(inner)).onTransitionEnd(
        transitionEnd(rowElement()),
      ),
    ).not.toThrow();
    expect(inner).toHaveBeenCalledTimes(1);
  });

  it("rethrows anything that is not that assertion", () => {
    // The catch is narrow on purpose — a real bug inside the drop handler must
    // still reach the error boundary and Sentry.
    const inner = jest.fn(() => {
      throw new TypeError("Cannot read properties of null (reading 'foo')");
    });

    expect(() =>
      guardDropAnimation(dropping(inner)).onTransitionEnd(
        transitionEnd(rowElement()),
      ),
    ).toThrow("Cannot read properties of null (reading 'foo')");
  });

  it("ignores a transition raised on a descendant of the draggable", () => {
    // A child animating transform would otherwise be forwarded, and RBD would
    // finish the drop animation early while the phase is still DROP_ANIMATING —
    // no throw, but a visibly truncated animation.
    const inner = jest.fn();

    guardDropAnimation(dropping(inner)).onTransitionEnd(
      transitionEnd(childElement()),
    );

    expect(inner).not.toHaveBeenCalled();
  });

  it("does not confuse two draggables that share an id", () => {
    // AdviceBox, TabAdviceBox and TabAdviceSearch all emit `advice-${index}`,
    // so the same id string exists in more than one DragDropContext. Each
    // guard only ever forwards events from its own element, and holds no
    // shared state, so one cannot suppress the other.
    const listA = jest.fn();
    const listB = jest.fn();

    guardDropAnimation(dropping(listA, "advice-0")).onTransitionEnd(
      transitionEnd(rowElement("advice-0")),
    );
    guardDropAnimation(dropping(listB, "advice-0")).onTransitionEnd(
      transitionEnd(rowElement("advice-0")),
    );

    expect(listA).toHaveBeenCalledTimes(1);
    expect(listB).toHaveBeenCalledTimes(1);
  });

  it("forwards every drop, however fast they follow each other", () => {
    // Keyboard dragging can complete two drops of the same row inside a second.
    // Both must dispatch; suppressing the second would leave RBD's store stuck
    // in DROP_ANIMATING.
    const first = jest.fn();
    const second = jest.fn();

    guardDropAnimation(dropping(first)).onTransitionEnd(
      transitionEnd(rowElement()),
    );
    guardDropAnimation(dropping(second)).onTransitionEnd(
      transitionEnd(rowElement()),
    );

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("ignores transitions of other properties", () => {
    const inner = jest.fn();
    const guarded = guardDropAnimation(dropping(inner));

    guarded.onTransitionEnd(transitionEnd(rowElement(), "opacity"));
    expect(inner).not.toHaveBeenCalled();

    guarded.onTransitionEnd(transitionEnd(rowElement()));
    expect(inner).toHaveBeenCalledTimes(1);
  });

  it("leaves props untouched when no drop is animating", () => {
    const props = idle();

    expect(guardDropAnimation(props)).toBe(props);
  });

  it("forwards when the target cannot be identified", () => {
    // An unrecognised event shape degrades to previous behaviour rather than
    // silently swallowing the drop's real dispatch.
    const inner = jest.fn();
    const guarded = guardDropAnimation(dropping(inner));

    guarded.onTransitionEnd({ propertyName: "transform", target: null });
    guarded.onTransitionEnd({ propertyName: "transform" });

    expect(inner).toHaveBeenCalledTimes(2);
  });

  it("forwards when RBD supplies no draggable id", () => {
    const inner = jest.fn();
    const props = dropping(inner);
    delete props["data-rbd-draggable-id"];

    guardDropAnimation(props).onTransitionEnd(transitionEnd(childElement()));

    expect(inner).toHaveBeenCalledTimes(1);
  });

  it("tolerates a missing props object and a malformed event", () => {
    expect(guardDropAnimation(undefined)).toBe(undefined);
    expect(guardDropAnimation(null)).toBe(null);

    const inner = jest.fn();
    expect(() =>
      guardDropAnimation(dropping(inner)).onTransitionEnd(undefined),
    ).not.toThrow();
    expect(inner).not.toHaveBeenCalled();
  });

  it("passes the rest of draggableProps through untouched", () => {
    const guarded = guardDropAnimation(dropping(jest.fn()));

    expect(guarded["data-rbd-draggable-id"]).toBe(DRAGGABLE_ID);
    expect(guarded["data-rbd-draggable-context-id"]).toBe("0");
    expect(guarded.style).toEqual({ transform: "translate(0px, 12px)" });
  });
});
