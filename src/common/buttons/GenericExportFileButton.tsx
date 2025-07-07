import { APPICONS } from '@/constants';
import { IonButton, IonIcon } from '@ionic/react';
import { IonicReactProps } from '@ionic/react/dist/types/components/IonicReactProps';
import { useLingui } from '@lingui/react/macro';
import { useToastContext } from '../context/ToastContext';
import filesystemService from '../services/filesystem.service';
import platformService from '../services/platform.service';

type GenericExportFileButtonProps = {
  getFileTitle: () => string;
  getFileContent: () => string;
  onDone?: () => void;
  fileMime?: string;
  label?: string | null;
  icon?: string | null;
  fill?: 'clear' | 'outline' | 'solid' | 'default' | undefined;
} & IonicReactProps &
  React.HTMLAttributes<HTMLIonButtonElement> &
  React.HTMLAttributes<HTMLIonIconElement>;

const GenericExportFileButton = ({
  getFileTitle,
  getFileContent,
  onDone,
  fileMime,
  label,
  icon,
  color,
  fill
}: GenericExportFileButtonProps) => {
  const { t } = useLingui();

  const { setToast } = useToastContext();

  function exportFile() {
    const fileTitle = getFileTitle();
    const content = getFileContent();
    const mime = fileMime || 'text/plain';
    filesystemService.exportToFile(fileTitle, content, mime).then(() => {
      if (platformService.isAndroid()) {
        setToast(t`Success!`, 'success');
      }
      if (onDone) {
        onDone();
      }
    });
  }

  return (
    <IonButton
      expand="block"
      fill={fill}
      color={color}
      onClick={() => {
        exportFile();
      }}
    >
      {label !== null && label}
      {icon !== null && <IonIcon icon={icon || APPICONS.export}></IonIcon>}
    </IonButton>
  );
};
export default GenericExportFileButton;
