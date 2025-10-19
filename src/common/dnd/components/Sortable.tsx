import { useSortable } from '@dnd-kit/sortable';
import { Arguments } from '@dnd-kit/sortable/dist/hooks/useSortable';
import { CSS } from '@dnd-kit/utilities';
import { ReactNode } from 'react';

type SortableProps = { readonly children?: ReactNode } & Arguments;

const Sortable = (props: SortableProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: props.id,
      disabled: props.disabled
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {props.children}
    </div>
  );
};

export default Sortable;
