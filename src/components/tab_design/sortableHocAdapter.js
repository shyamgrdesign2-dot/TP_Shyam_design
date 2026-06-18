import React, { createContext, useContext, useMemo } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SortableHocContext = createContext(null);
const itemIds = new WeakMap();
let fallbackId = 0;

function getSortableId(item, index) {
  if (item && typeof item === "object") {
    const stableId =
      item.unique_id ||
      item.objectID ||
      item.id ||
      item.tmm_id ||
      item.tds_id ||
      item.tcm_id ||
      item.tpm_id ||
      item.key;

    if (stableId !== undefined && stableId !== null) {
      return String(stableId);
    }

    if (!itemIds.has(item)) {
      fallbackId += 1;
      itemIds.set(item, `sortable-item-${fallbackId}`);
    }

    return itemIds.get(item);
  }

  return `sortable-index-${index}`;
}

export function SortableElement(WrappedComponent) {
  return function DndSortableElement(props) {
    const context = useContext(SortableHocContext);
    const id = context?.ids?.[props.index] ?? `sortable-index-${props.index}`;
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id });

    const child = <WrappedComponent {...props} />;
    const style = {
      ...child.props?.style,
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 10000 : child.props?.style?.zIndex,
      touchAction: "manipulation",
    };

    return React.cloneElement(child, {
      ref: setNodeRef,
      style,
      ...attributes,
      ...listeners,
    });
  };
}

export function SortableContainer(WrappedComponent) {
  return function DndSortableContainer({
    items = [],
    onSortEnd,
    pressDelay = 0,
    ...props
  }) {
    const ids = useMemo(
      () => items.map((item, index) => getSortableId(item, index)),
      [items]
    );
    const sensors = useSensors(
      useSensor(MouseSensor, {
        activationConstraint: { delay: pressDelay, tolerance: 5 },
      }),
      useSensor(TouchSensor, {
        activationConstraint: { delay: pressDelay, tolerance: 5 },
      }),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      })
    );

    const handleDragEnd = ({ active, over }) => {
      if (!over || active.id === over.id) return;

      const oldIndex = ids.indexOf(active.id);
      const newIndex = ids.indexOf(over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      onSortEnd?.({ oldIndex, newIndex });
    };

    return (
      <SortableHocContext.Provider value={{ ids }}>
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          sensors={sensors}
        >
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <WrappedComponent items={items} {...props} />
          </SortableContext>
        </DndContext>
      </SortableHocContext.Provider>
    );
  };
}
