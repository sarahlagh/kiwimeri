import { APPICONS } from '@/constants';
import { IonButton, IonIcon } from '@ionic/react';
import { IonicReactProps } from '@ionic/react/dist/types/components/IonicReactProps';
import { useLingui } from '@lingui/react/macro';
import React from 'react';
import { useToastContext } from '../context/ToastContext';
import filesystemService from '../services/filesystem.service';

export enum ImportFileRejectReason {
  NotSupported,
  Cancelled
}

export type OnContentReadResponse = {
  confirm: boolean;
  reason?: ImportFileRejectReason;
};

type GenericImportFileButtonProps = {
  label?: string | null;
  icon?: string | null;
  onContentRead?: (
    content: ArrayBuffer,
    file: File
  ) => Promise<OnContentReadResponse>;
  onContentReadAsString?: (
    content: string,
    file: File
  ) => Promise<OnContentReadResponse>;
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
  onContentReadAsString,
  onError
}: GenericImportFileButtonProps) => {
  const { t } = useLingui();
  const { setToast } = useToastContext();
  const errorMessage = t`An error occurred loading the file`;
  const successMessage = t`Success!`;
  const notSupportedMessage = t`File not supported`;
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

      const readContent = (promise: Promise<OnContentReadResponse>) => {
        return promise
          .then(resp => {
            if (resp.confirm === true) {
              setToast(successMessage, 'success');
            } else if (resp.reason === ImportFileRejectReason.NotSupported) {
              setToast(notSupportedMessage, 'warning');
            }
          })
          .catch(async e => {
            console.error(e);
            if (onError) {
              await onError(e);
            }
            setToast(errorMessage, 'danger');
          });
      };

      filesystemService.readFile(file).then(async content => {
        if (onContentRead) {
          await readContent(onContentRead(content, file));
        } else if (onContentReadAsString) {
          await readContent(
            onContentReadAsString(new TextDecoder().decode(content), file)
          );
        }
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
