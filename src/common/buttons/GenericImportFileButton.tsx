import { APPICONS } from '@/constants';
import { IonButton, IonIcon } from '@ionic/react';
import { IonicReactProps } from '@ionic/react/dist/types/components/IonicReactProps';
import { useLingui } from '@lingui/react/macro';
import React from 'react';
import { useToastContext } from '../context/ToastContext';
import filesystemService from '../services/filesystem.service';

type GenericImportFileButtonProps = {
  label?: string | null;
  icon?: string | null;
  onContentRead: (content: string, file: File) => Promise<boolean>;
  onError?: (e: Error) => Promise<void>;
  fill?: 'clear' | 'outline' | 'solid' | 'default' | undefined;
} & IonicReactProps &
  React.HTMLAttributes<HTMLIonButtonElement> &
  React.HTMLAttributes<HTMLIonIconElement>;

const GenericImportFileButton = ({
  label,
  icon,
  fill,
  color,
  onContentRead,
  onError
}: GenericImportFileButtonProps) => {
  const { t } = useLingui();
  const { setToast } = useToastContext();
  const errorMessage = t`An error occurred loading the file`;
  const successMessage = t`Success!`;
  const importElement = React.useRef(null);

  function importFile() {
    if (importElement.current) {
      const current = importElement.current as HTMLInputElement;
      current.click();
    }
  }

  // read the selected file
  const onImportFileRead: React.ChangeEventHandler<
    HTMLInputElement
  > = event => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];

      filesystemService.readFile(file).then(async content => {
        onContentRead(content, file)
          .then(confirm => {
            if (confirm === true) {
              setToast(successMessage, 'success');
            }
          })
          .catch(async e => {
            console.error(e);
            if (onError) {
              await onError(e);
            }
            setToast(errorMessage, 'warning');
          });
      });
    }
  };

  return (
    <IonButton
      expand="block"
      fill={fill}
      color={color}
      onClick={() => {
        importFile();
      }}
    >
      {label !== null && label}
      {icon !== null && <IonIcon icon={icon || APPICONS.import}></IonIcon>}
      <input
        ref={importElement}
        onChange={onImportFileRead}
        type="file"
        className="ion-hide"
      />
    </IonButton>
  );
};
export default GenericImportFileButton;
