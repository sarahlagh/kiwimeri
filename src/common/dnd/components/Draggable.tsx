import { useDraggable, UseDraggableArguments } from '@dnd-kit/core';
import { ReactNode } from 'react';

export type DraggableProps = {
  readonly children?: ReactNode;
} & UseDraggableArguments;

const Draggable = (props: DraggableProps) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: props.id,
    disabled: props.disabled
  });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {props.children}
    </div>
  );
};

export default Draggable;
