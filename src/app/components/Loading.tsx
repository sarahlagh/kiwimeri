import { IonSpinner } from '@ionic/react';

const Loading = () => {
  return (
    <IonSpinner
      name="circular"
      style={{ left: '50%', top: '45vh' }}
    ></IonSpinner>
  );
};
export default Loading;
