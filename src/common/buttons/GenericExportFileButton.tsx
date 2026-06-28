import { useToastContext } from '@/app/context/ToastContext';
import { APPICONS } from '@/constants';
import { plt } from '@/core/infra/platform';
import { IonButton, IonIcon } from '@ionic/react';
import { IonicReactProps } from '@ionic/react/dist/types/components/IonicReactProps';
import { useLingui } from '@lingui/react/macro';

type GenericExportFileButtonProps = {
  getFileTitle: string | (() => string);
  getFileContent:
    | string
    | (() => Promise<string | Uint8Array<ArrayBufferLike>>);
  onDone?: () => void;
  confirm?: () => Promise<boolean>;
  getFileMime?: string | (() => string);
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
  confirm,
  getFileMime,
  label,
  icon,
  color,
  fill
}: GenericExportFileButtonProps) => {
  const { t } = useLingui();

  const { setToast } = useToastContext();

  const exportContent = (
    fileTitle: string,
    mime: string,
    content: string | Uint8Array<ArrayBufferLike>
  ) => {
    import('@/common/services/filesystem.service')
      .then(m => m.default.exportToFile(fileTitle, content, mime))
      .then(res => {
        if (res.success && plt.isAndroid()) {
          setToast(t`Success!`, 'success');
        }
      })
      .catch((e: Error) => {
        console.error(`Error writing to file`, e.message);
        setToast(t`Error writing to file`, 'danger');
      })
      .finally(() => {
        if (onDone) {
          onDone();
        }
      });
  };

  const exportFile = async () => {
    if (confirm) {
      const userConfirmed = await confirm();
      if (!userConfirmed) {
        if (onDone) {
          onDone();
        }
        return;
      }
    }
    const fileTitle =
      typeof getFileTitle === 'string' ? getFileTitle : getFileTitle();

    let mime = 'text/plain';
    if (getFileMime) {
      mime = typeof getFileMime === 'string' ? getFileMime : getFileMime();
    }

    if (typeof getFileContent === 'string') {
      exportContent(fileTitle, mime, getFileContent);
    } else {
      getFileContent().then(content => {
        exportContent(fileTitle, mime, content);
      });
    }
  };

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
