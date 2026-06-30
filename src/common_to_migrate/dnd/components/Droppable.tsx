import { useDroppable, UseDroppableArguments } from '@dnd-kit/core';
import { ReactNode } from 'react';

export type DroppableProps = {
  readonly children?: ReactNode;
} & UseDroppableArguments;

const Droppable = (props: DroppableProps) => {
  const { setNodeRef } = useDroppable({
    id: props.id,
    disabled: props.disabled
  });

  return <div ref={setNodeRef}>{props.children}</div>;
};

export default Droppable;
