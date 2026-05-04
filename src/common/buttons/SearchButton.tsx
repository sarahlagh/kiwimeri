import { APPICONS } from '@/constants';
import { IonButton, IonIcon } from '@ionic/react';
import platformService from '../services/platform.service';

type SearchButtonProps = {
  onSearch: () => void;
};

const SearchButton = ({ onSearch }: SearchButtonProps) => {
  return (
    <>
      {platformService.hasHighlightSupport() && (
        <IonButton onClick={onSearch}>
          <IonIcon icon={APPICONS.search}></IonIcon>
        </IonButton>
      )}
    </>
  );
};

export default SearchButton;
