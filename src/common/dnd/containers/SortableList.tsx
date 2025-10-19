import { AnyData } from '@/db/types/store-types';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  UniqueIdentifier
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { JSX } from '@ionic/core/components';
import { IonItem, IonList } from '@ionic/react';
import { StyleReactProps } from '@ionic/react/dist/types/components/react-component-lib/interfaces';
import React, {
  Fragment,
  ReactElement,
  ReactNode,
  useMemo,
  useState
} from 'react';
import LandingZone from '../components/LandingZone';
import Sortable from '../components/Sortable';
import useSensorsGlobal from '../hooks/useSensorsGlobal';

export type SortableItem =
  | ({
      id: UniqueIdentifier;
    } & AnyData)
  | UniqueIdentifier;

type DndContextProps = {
  handleDragStart?: (event: DragStartEvent, activeId: UniqueIdentifier) => void;
  handleDragOver?: (
    event: DragOverEvent,
    activeId: UniqueIdentifier,
    overId?: UniqueIdentifier
  ) => void;
};

type SortableIonListProps = JSX.IonList &
  StyleReactProps &
  Omit<React.HTMLAttributes<HTMLIonListElement>, 'style'> & {
    readonly children?: ReactNode;
  } & DndContextProps & {
    items: SortableItem[];
    disabled?: boolean;
    isContainer?: (item: SortableItem) => boolean;
    onContainerDrop?: (item: SortableItem) => Promise<void> | void;
    onItemMove?: (
      event: DragEndEvent,
      items: SortableItem[]
    ) => Promise<void> | void;
    overlay?: (item: SortableItem) => ReactNode;
    applyStyle?: (isOver: boolean, isActive: boolean) => AnyData;
  };

const getIterableNodes = (children?: ReactNode) => {
  if (!children) return [];
  const obj = children as unknown as object;
  if (Symbol.iterator in obj) {
    return children as ReactNode[];
  }
  return [children];
};

const isContainer = (item: SortableItem, props: SortableIonListProps) => {
  if (props.isContainer) {
    return props.isContainer(item);
  }
  return false;
};

const landingPrefix = '__landing_';

type IdIdx = {
  id: UniqueIdentifier;
  idx: number;
};

const SortableList = (props: SortableIonListProps) => {
  const sensors = useSensorsGlobal();
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const [active, setActive] = useState<IdIdx | null>(null);

  const disabled = props.disabled;
  const items = props.items;
  const iterables = getIterableNodes(props.children);
  if (iterables.length !== props.items.length) {
    throw new Error('incoherent state between react children and items');
  }

  const overlay = useMemo(
    () =>
      props.overlay && active ? (
        props.overlay(items[active.idx])
      ) : (
        <IonItem>{active?.id}</IonItem>
      ),
    [active]
  );

  function getId(idx: number) {
    const item = items[idx];
    if (typeof item === 'string' || typeof item === 'number') {
      return item as UniqueIdentifier;
    }
    return item.id;
  }

  function handleDragStart(event: DragStartEvent) {
    setActive({
      id: event.active.id,
      idx: items.findIndex((_, idx) => getId(idx) === event.active.id)
    });
    if (props.handleDragStart) {
      props.handleDragStart(event, event.active.id);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    setOverId(over ? over.id : null);
    if (props.handleDragOver) {
      props.handleDragOver(event, active!.id, over?.id);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { over } = event;
    let newItems = [...items];
    if (active && over && active.id !== over.id) {
      // dragged
      const isLandingZone = over.id.toString().startsWith(landingPrefix);
      const landingId = isLandingZone
        ? over.id.toString().replace(landingPrefix, '')
        : over.id.toString();

      if (!isLandingZone) {
        // drop into container
        if (props.onContainerDrop) {
          console.debug('dropping into container', active.idx);
          await props.onContainerDrop(items[active.idx]);
        }
      } else {
        // if on landing id, must move the item, not drop into it
        const from = active.idx;
        let to = parseInt(landingId);
        if (to > from) {
          to--;
        }
        console.debug('move to landing zone', from, to);
        // TODO use method genericReorder with call back to avoid double loop with order
        newItems = arrayMove(items, from, to);
        if (props.onItemMove) {
          await props.onItemMove(event, newItems);
        }
      }
    }
    setActive(null);
    setOverId(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <IonList {...props}>
        {iterables.map((child, idx) => {
          const item = items[idx];
          const id = getId(idx);
          const dividerId = `${landingPrefix}${idx}`;
          const isOverLandingZone = dividerId === overId;

          const additionalStyle = props.applyStyle
            ? props.applyStyle(id === overId, id === active?.id)
            : {};
          const el = child as ReactElement;
          const itemNode = {
            ...el,
            props: { ...el.props, ...additionalStyle }
          };
          return (
            <Fragment key={id}>
              <LandingZone id={dividerId} isOver={isOverLandingZone} />
              <Sortable
                id={id}
                disabled={{
                  draggable: disabled,
                  droppable: !isContainer(item, props) || id === active?.id
                }}
              >
                {itemNode}
              </Sortable>
            </Fragment>
          );
        })}
        <LandingZone
          id={`${landingPrefix}${items.length}`}
          isOver={`${landingPrefix}${items.length}` === overId}
        />
      </IonList>
      <DragOverlay style={{ opacity: 0.7 }}>
        {active ? overlay : null}
      </DragOverlay>
    </DndContext>
  );
};

export default SortableList;
