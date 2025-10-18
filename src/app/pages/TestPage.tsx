import {
  closestCenter,
  DndContext,
  DragCancelEvent,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  UniqueIdentifier,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonItem,
  IonLabel,
  IonList
} from '@ionic/react';
import { Fragment, useState } from 'react';
import TemplateMainPage from './TemplateMainPage';

interface Item {
  id: string;
  order: number;
  isContainer: boolean;
  hasItems: number;
  clicked: boolean;
}

function Droppable(props) {
  const { setNodeRef } = useDroppable({
    id: props.id,
    disabled: props.disabled
  });

  return <div ref={setNodeRef}>{props.children}</div>;
}

function Draggable(props) {
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
}

const initialItems: Item[] = [
  {
    id: 'a',
    order: 0,
    hasItems: 0,
    isContainer: false,
    clicked: false
  },
  {
    id: 'B',
    order: 1,
    hasItems: 0,
    isContainer: true,
    clicked: false
  },
  {
    id: 'C',
    order: 2,
    hasItems: 0,
    isContainer: true,
    clicked: false
  },
  {
    id: 'd',
    order: 3,
    hasItems: 0,
    isContainer: false,
    clicked: false
  },
  {
    id: 'e',
    order: 4,
    isDropped: false,
    hasItems: 0,
    isContainer: false,
    clicked: false
  },
  {
    id: 'F',
    order: 5,
    isDropped: false,
    hasItems: 0,
    isContainer: true,
    clicked: false
  }
];

function DroppableLandingZone(props) {
  const dividerId = props.id;
  const isDraggingOverZone = props.isDraggingOverZone;
  const isDragging = props.isDragging;
  const disabled = props.disabled;
  return (
    <Droppable id={dividerId} disabled={disabled}>
      {/* <div
        style={{
          color: 'grey',
          background: isDraggingOverZone ? 'cyan' : undefined
        }}
      >
        {dividerId}
      </div> */}
      <hr
        style={{
          background: isDraggingOverZone ? 'cyan' : undefined,
          // : !disabled
          //   ? 'grey'
          //   : undefined,
          margin: '0',
          height: isDragging ? '3px' : '0px'
        }}
      />
    </Droppable>
  );
}

// move to utils
function genericReorder(
  items: Item[],
  from: number,
  to: number,
  cb: (idx: number, order: number) => void
) {
  const upperLimit = to < items.length - 1 ? to + 1 : items.length;
  if (from < to) {
    for (let i = from + 1; i < upperLimit; i++) {
      cb(i, i - 1);
    }
  } else {
    for (let i = to; i < from; i++) {
      cb(i, i + 1);
    }
  }
  cb(from < items.length ? from : items.length - 1, to);
}

function reorder(items: Item[], from: number, to: number) {
  genericReorder(items, from, to, (i, order) => {
    items[i].order = order;
  });
  items.sort((i1, i2) => i1.order - i2.order);
}

// DONE restrict droppable to only items with isContainer
// DONE apply style on drag over
// DONE reorder list
//      DONE missing a landing zone above first obj
//      DONE hide or style the separators
//      DONE between two containers drag zone is hard to catch
//      DONE once dragging, can't cancel
// DONE only works if there are no holes in the order?
// DONE tested on android
// TODO still getting items[i] is undefined sometimes... but hard to reproduce
// now on the click thing...
// DONE if click only, don't activate the drag overlay
// DONE tell difference between click and cancelled / invalid drop
// DONE click works but changing state within the onClick doesn't work
// TODO don't hide the active item - smoother transition

// DONE advantage of useSortable?
// DONE with sortable: click
// DONE with sortable: drag on item AND between... not supported?

const TestManual = props => {
  const disabled = props.disabled;
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5
      }
    }),
    useSensor(KeyboardSensor)
  );
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeOrder, setActiveOrder] = useState<number | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const [items, setItems] = useState<Item[]>(structuredClone(initialItems));

  function reset() {
    setItems(structuredClone(initialItems));
    setActiveId(null);
    setActiveOrder(null);
    setOverId(null);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id);
    setActiveOrder(items.find(i => i.id === event.active.id)!.order);
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    setOverId(over ? over.id : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over) {
      // dragged
      console.debug(`obj ${active.id} has been dropped on ${over.id}`);
      const isLandingZone = over.id.toString().startsWith('landing_');
      const landingId = isLandingZone
        ? over.id.toString().replace('landing_', '')
        : over.id.toString();

      if (!isLandingZone) {
        // drop into container
        const idx = items.findIndex(i => i.id === active.id);
        if (idx >= 0) {
          items.find(i => i.id === landingId)!.hasItems++;
          items.splice(idx, 1);
        }
      } else {
        // if on landing id, must move the item, not drop into it
        const from = activeOrder!;
        const to = parseInt(landingId);
        console.debug('landing zone', from, to);
        reorder(items, from, to);
      }
      setItems([...items]);
    }
    setActiveId(null);
    setActiveOrder(null);
    setOverId(null);
  }

  function handleDragCancel(event: DragCancelEvent) {
    console.debug('handleDragCancel', event);
  }

  return (
    <>
      <IonList>
        <IonItem>
          <IonButton
            onClick={() => {
              reset();
            }}
          >
            Reset items
          </IonButton>
        </IonItem>
      </IonList>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        collisionDetection={closestCenter}
      >
        <IonList>
          {items
            .filter(item => item.id !== activeId)
            .map((item, idx) => {
              const dividerId = `landing_${idx}`;
              const isDraggingOverZone = dividerId === overId;
              return (
                <Fragment key={item.id}>
                  <DroppableLandingZone
                    id={dividerId}
                    isDraggingOverZone={isDraggingOverZone}
                    isDragging={activeId !== null}
                  />
                  <Droppable id={item.id} disabled={!item.isContainer}>
                    <Draggable id={item.id} disabled={disabled}>
                      <IonItem
                        button
                        color={item.id === overId ? 'primary' : undefined}
                        onClick={() => {
                          item.clicked = !item.clicked;
                          setItems([...items]);
                        }}
                      >
                        #{item.order} &nbsp; item {item.id}
                        {item.hasItems > 0 ? `+${item.hasItems}` : null}
                        {item.clicked && (
                          <IonLabel slot="end">clicked</IonLabel>
                        )}
                      </IonItem>
                    </Draggable>
                  </Droppable>
                </Fragment>
              );
            })}

          <DroppableLandingZone
            id={`landing_${items.length}`}
            isDraggingOverZone={`landing_${items.length}` === overId}
            isDragging={activeId !== null}
          />
        </IonList>

        <DragOverlay style={{ opacity: 0.7 }}>
          {activeId ? <IonItem>item {activeId}</IonItem> : null}
        </DragOverlay>
      </DndContext>
    </>
  );
};

function SortableItem(props) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: props.id
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
}

const TestSortable = props => {
  const disabled = props.disabled;
  const [items, setItems] = useState(structuredClone(initialItems));
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  function handleDragStart(event: DragStartEvent) {
    console.debug('===========================', event);
  }
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems(items => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        const newArr = arrayMove(items, oldIndex, newIndex);
        newArr.forEach((item, idx) => (item.order = idx));
        return newArr;
      });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items}
        strategy={verticalListSortingStrategy}
        // strategy={customSortingStrategy}
        disabled={disabled}
      >
        <IonList>
          {items.map(item => (
            <SortableItem key={item.id} id={item.id}>
              <IonItem
                button
                onClick={() => {
                  item.clicked = !item.clicked;
                  setItems([...items]);
                }}
              >
                {/* <Droppable id={item.id}>drop me</Droppable> */}#{item.order}{' '}
                &nbsp; item {item.id}
                {item.hasItems > 0 ? `+${item.hasItems}` : null}
                {item.clicked && <IonLabel slot="end">clicked</IonLabel>}
              </IonItem>
            </SortableItem>
          ))}
        </IonList>
      </SortableContext>
    </DndContext>
  );
};

function SortableItem2(props) {
  const dragDisabled = props.dragDisabled;
  const dropDisabled = props.dropDisabled;
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: props.id,
      disabled: {
        draggable: dragDisabled,
        droppable: dropDisabled
      }
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
}

function DroppableLandingZone2(props) {
  const dividerId = props.id;
  const isDraggingOverZone = props.isDraggingOverZone;
  const isDragging = props.isDragging;
  const disabled = props.disabled;
  return (
    <Droppable id={dividerId} disabled={disabled}>
      {/* <div
        style={{
          color: 'grey',
          background: isDraggingOverZone ? 'cyan' : undefined
        }}
      >
        {dividerId}
      </div> */}
      <hr
        style={{
          background: isDraggingOverZone ? 'cyan' : undefined,
          // : !disabled
          //   ? 'grey'
          //   : undefined,
          margin: '0',
          height: isDragging ? '3px' : '0px'
        }}
      />
    </Droppable>
  );
}

const TestMix = props => {
  const disabled = props.disabled;
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5
      }
    }),
    useSensor(KeyboardSensor)
  );
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeOrder, setActiveOrder] = useState<number | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const [items, setItems] = useState<Item[]>(structuredClone(initialItems));

  function reset() {
    setItems(structuredClone(initialItems));
    setActiveId(null);
    setActiveOrder(null);
    setOverId(null);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id);
    setActiveOrder(items.find(i => i.id === event.active.id)!.order);
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    setOverId(over ? over.id : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      // dragged
      console.debug(`obj ${active.id} has been dropped on ${over.id}`);
      const isLandingZone = over.id.toString().startsWith('landing_');
      const landingId = isLandingZone
        ? over.id.toString().replace('landing_', '')
        : over.id.toString();

      if (!isLandingZone) {
        // drop into container
        const idx = items.findIndex(i => i.id === active.id);
        if (idx >= 0) {
          items.find(i => i.id === landingId)!.hasItems++;
          items.splice(idx, 1);
        }
        setItems([...items]);
      } else {
        // if on landing id, must move the item, not drop into it
        const from = activeOrder!;
        let to = parseInt(landingId);
        if (to > from) {
          to--;
        }
        console.debug('landing zone', from, to);

        const newArr = arrayMove(items, from, to);
        newArr.forEach((item, idx) => (item.order = idx));
        // reorder(items, from, to);
        setItems(newArr);
      }

      console.debug(items);
    }
    setActiveId(null);
    setActiveOrder(null);
    setOverId(null);
  }

  return (
    <>
      <IonList>
        <IonItem>
          <IonButton
            onClick={() => {
              reset();
            }}
          >
            Reset items
          </IonButton>
        </IonItem>
      </IonList>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        collisionDetection={closestCenter}
      >
        {/* <SortableContext
          items={items}
          strategy={verticalListSortingStrategy}
          // strategy={customSortingStrategy}
          disabled={disabled}
        > */}
        <IonList>
          {items
            // .filter(item => item.id !== activeId)
            .map((item, idx) => {
              const dividerId = `landing_${idx}`;
              const isDraggingOverZone = dividerId === overId;
              return (
                <Fragment key={item.id}>
                  <DroppableLandingZone2
                    id={dividerId}
                    isDraggingOverZone={isDraggingOverZone}
                    isDragging={activeId !== null}
                  />
                  <SortableItem2
                    id={item.id}
                    dragDisabled={disabled}
                    dropDisabled={!item.isContainer || item.id === activeId}
                    // strategy={verticalListSortingStrategy}
                  >
                    <IonItem
                      button
                      color={item.id === overId ? 'primary' : undefined}
                      onClick={() => {
                        item.clicked = !item.clicked;
                        setItems([...items]);
                      }}
                    >
                      #{item.order} &nbsp; item {item.id}
                      {item.hasItems > 0 ? `+${item.hasItems}` : null}
                      {item.clicked && <IonLabel slot="end">clicked</IonLabel>}
                    </IonItem>
                  </SortableItem2>
                </Fragment>
              );
            })}

          <DroppableLandingZone2
            id={`landing_${items.length}`}
            isDraggingOverZone={`landing_${items.length}` === overId}
            isDragging={activeId !== null}
          />
        </IonList>
        {/* </SortableContext> */}

        <DragOverlay style={{ opacity: 0.7 }}>
          {activeId ? <IonItem>item {activeId}</IonItem> : null}
        </DragOverlay>
      </DndContext>
    </>
  );
};

const TestPage = () => {
  const [disabled, setDisabled] = useState(false);
  return (
    <TemplateMainPage title={'Test'}>
      <IonContent>
        <IonList>
          <IonItem>
            <IonCheckbox
              checked={disabled}
              onIonChange={() => {
                setDisabled(!disabled);
              }}
            ></IonCheckbox>
            <IonLabel>Disable drag</IonLabel>
          </IonItem>
        </IonList>

        <hr style={{ background: 'blue' }} />
        <TestMix disabled={disabled} />

        {/* <hr style={{ background: 'blue' }} />
        <TestManual disabled={disabled} /> */}

        <hr style={{ background: 'blue' }} />
        <TestSortable disabled={disabled} />
      </IonContent>
    </TemplateMainPage>
  );
};

export default TestPage;
