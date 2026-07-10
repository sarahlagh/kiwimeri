import { IonSpinner } from '@ionic/react';

const Loading = ({
  left = '50%',
  top = '45vh'
}: {
  left?: string;
  top?: string;
}) => {
  return <IonSpinner name="circular" style={{ left, top }}></IonSpinner>;
};
export default Loading;
