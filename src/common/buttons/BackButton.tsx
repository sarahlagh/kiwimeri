import { IonIcon } from '@ionic/react';
import { arrowBackOutline } from 'ionicons/icons';
import { Link } from 'react-router-dom';

const BackButton = () => {
  return (
    <Link to="/collection">
      <IonIcon
        aria-hidden="true"
        slot="start"
        ios={arrowBackOutline}
        md={arrowBackOutline}
      />
    </Link>
  );
};
export default BackButton;
