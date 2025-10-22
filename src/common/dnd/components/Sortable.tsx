import { ReactNode } from 'react';
import { Arguments, useSortable } from '../hooks/useSortable';

type SortableProps = { readonly children?: ReactNode } & Arguments;

const Sortable = (props: SortableProps) => {
  const { attributes, listeners, setNodeRef } = useSortable({
    id: props.id,
    disabled: props.disabled
  });

  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      {props.children}
    </div>
  );
};

export default Sortable;
