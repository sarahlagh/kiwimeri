import { useToastContext } from '@/app/context/ToastContext';
import { APPICONS } from '@/constants';
import { plt } from '@/core/infra/platform';
import { writer } from '@/domain/document-edits/document-edits.service';
import formatConverter from '@/domain/format-conversion/format-converter.service';
import { IonAlert, IonButton, IonIcon } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import { Id } from 'tinybase/with-schemas';
import { dateToStr } from '../misc/date-utils';

type DebugFastWriteButtonProps = {
  id: Id;
  on: string;
};

const DebugFastWriteButton = ({ id, on }: DebugFastWriteButtonProps) => {
  const { t } = useLingui();
  const { setToast } = useToastContext();

  const edits = writer.getEdits('collection', id);
  const content = writer.getContent(on, id);
  const markdown = formatConverter.toMarkdown(content);
  let reconciledContent = '';
  let reconciledMarkdown = '';
  try {
    reconciledContent = writer.reconcile('collection', id, false);
    reconciledMarkdown = formatConverter.toMarkdown(reconciledContent);
  } catch (e) {
    console.error(e);
    reconciledContent = 'error';
    reconciledMarkdown = 'error';
  }

  return (
    <>
      <IonButton expand="block" id="debug_btn">
        <IonIcon icon={APPICONS.devToolsPage}></IonIcon>
      </IonButton>
      <IonAlert
        trigger={`debug_btn`}
        buttons={[
          {
            text: `export data`,
            handler() {
              const fileContent =
                `${JSON.stringify(edits)}\n\n` +
                `content: ${JSON.stringify(content)}\n\n` +
                `reconciled content: ${JSON.stringify(reconciledContent)}\n\n` +
                `==================================================================================================\n\n` +
                `${markdown}\n\n\n` +
                `==================================================================================================\n\n` +
                `${reconciledMarkdown}\n\n\n`;

              import('@/core/infra/filesystem.service')
                .then(m =>
                  m.default.exportToFile(
                    `debug-fast-write-${on}-${id}-${dateToStr('iso')}.txt`,
                    fileContent,
                    'text/plain'
                  )
                )
                .then(res => {
                  if (res.success && plt.isAndroid()) {
                    setToast(t`Success!`, 'success');
                  }
                })
                .catch((e: Error) => {
                  console.error(`Error writing to file`, e.message);
                  setToast(t`Error writing to file`, 'danger');
                });
            }
          },
          {
            text: `clear edits`,
            role: 'destructive',
            handler() {
              writer.clear('collection', id);
            }
          },
          {
            text: `close`
          }
        ]}
      />
    </>
  );
};
export default DebugFastWriteButton;
