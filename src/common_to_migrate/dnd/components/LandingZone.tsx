import Droppable, { DroppableProps } from './Droppable';

type LandingZoneProps = {
  isOver: boolean;
} & DroppableProps;

const LandingZone = (props: LandingZoneProps) => {
  const isOver = props.isOver;
  return (
    <Droppable {...props}>
      <div
        style={{
          boxShadow: isOver ? '0px 5px 3px 1px var(--ion-color-primary)' : '',
          border: 'none',
          height: '0',
          width: '98%',
          margin: '0px auto',
          zIndex: 10000,
          position: 'relative',
          top: '-5px'
        }}
      ></div>
    </Droppable>
  );
};

export default LandingZone;
