import { APPICONS } from '@/constants';
import { plt } from '@/core/infra/platform';
import { IonButton, IonIcon } from '@ionic/react';

type SearchButtonProps = {
  onSearch: () => void;
};

const SearchButton = ({ onSearch }: SearchButtonProps) => {
  return (
    <>
      {plt.hasHighlightSupport() && (
        <IonButton onClick={onSearch}>
          <IonIcon icon={APPICONS.search}></IonIcon>
        </IonButton>
      )}
    </>
  );
};

export default SearchButton;
