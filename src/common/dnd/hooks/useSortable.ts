import {
  useDraggable,
  UseDraggableArguments,
  useDroppable
} from '@dnd-kit/core';
import { useCombinedRefs } from '@dnd-kit/utilities';

// very simplified version of @dnd-kit/sortable

export interface Disabled {
  draggable?: boolean;
  droppable?: boolean;
}

export interface Arguments extends Omit<UseDraggableArguments, 'disabled'> {
  disabled?: boolean | Disabled;
}

export function useSortable({
  attributes: userDefinedAttributes,
  disabled: localDisabled,
  id,
  data
}: Arguments) {
  const disabled: Disabled = normalizeLocalDisabled(localDisabled);

  const {
    rect,
    node,
    isOver,
    setNodeRef: setDroppableNodeRef
  } = useDroppable({
    id,
    data,
    disabled: disabled.droppable
  });
  const {
    active,
    attributes,
    setNodeRef: setDraggableNodeRef,
    listeners,
    isDragging,
    over,
    setActivatorNodeRef
  } = useDraggable({
    id,
    data,
    attributes: {
      ...userDefinedAttributes
    },
    disabled: disabled.draggable
  });
  const setNodeRef = useCombinedRefs(setDroppableNodeRef, setDraggableNodeRef);

  return {
    active,
    attributes,
    data,
    rect,
    isOver,
    isDragging,
    listeners,
    node,
    over,
    setNodeRef,
    setActivatorNodeRef,
    setDroppableNodeRef,
    setDraggableNodeRef
  };
}

function normalizeLocalDisabled(localDisabled: Arguments['disabled']) {
  if (typeof localDisabled === 'boolean') {
    return {
      draggable: localDisabled,
      droppable: false
    };
  }

  return {
    draggable: localDisabled?.draggable ?? false,
    droppable: localDisabled?.droppable ?? false
  };
}
