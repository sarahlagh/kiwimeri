import { getGlobalTrans } from '@/config';
import {
  APPICONS,
  APPICONS_PER_TYPE,
  ARIA_DESCRIPTIONS_PER_TYPE,
  ROOT_COLLECTION
} from '@/constants';
import collectionService from '@/db/collection.service';
import {
  InputCustomEvent,
  IonButton,
  IonButtons,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToggle,
  IonToolbar
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import React, { useEffect, useState } from 'react';
import {
  importService,
  ZipMergeOptions,
  ZipMergeResult,
  ZipParsedData,
  ZipParseError
} from '../services/import.service';

export type ConfirmMultipleImportModalParams = {
  zipData: ZipParsedData;
} & ZipMergeOptions;

export type ConfirmMultipleImportModalProps = {
  params: ConfirmMultipleImportModalParams;
  parent: string;
  onClose: (confirm: boolean, zipMerge?: ZipMergeResult) => void;
} & React.HTMLAttributes<HTMLIonModalElement>;

const ConfirmMultipleImportModal = ({
  params,
  parent,
  onClose
}: ConfirmMultipleImportModalProps) => {
  const { t } = useLingui();
  const parentName =
    collectionService.getItemTitle(parent) || getGlobalTrans().homeTitle;

  const [createNewFolder, setCreateNewFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string | undefined>();
  const [removeFirstFolder, setRemoveFirstFolder] = useState<boolean>(false);
  const [overwrite, setOverwrite] = useState<boolean>(false);
  const [zipMerge, setZipMerge] = useState<ZipMergeResult | null | undefined>();

  const isEmpty = params.zipData.items.length === 0;
  const disableConfirm = params.zipData.errors.length > 0 || isEmpty;
  const hasOneFolder = params.zipData.hasOneFolder;
  const effectiveParent = params.createNotebook ? ROOT_COLLECTION : parent;
  const itemsInCollection =
    collectionService.getBrowsableCollectionItems(effectiveParent);
  const newFirstLevel = [
    ...itemsInCollection.filter(
      item => !zipMerge?.firstLevel.find(i => i.id === item.id)
    ),
    ...(zipMerge?.firstLevel || [])
  ].sort((i1, i2) => i1.created - i2.created); // TODO adjust according to setting

  useEffect(() => {
    setZipMerge(
      importService.mergeZipItems(effectiveParent, params.zipData, {
        createNotebook: params.createNotebook,
        createNewFolder,
        overwrite,
        newFolderName,
        removeFirstFolder
      })
    );
  }, [createNewFolder, newFolderName, removeFirstFolder, overwrite]);

  const getErrorLabel = (e: ZipParseError) => {
    switch (e.family) {
      case 'incorrect_meta':
        return t`Incorrect Metadata`;
      case 'parse_error':
      default:
        return t`Parsing Error`;
    }
  };

  const getStatusLabel = (status: 'new' | 'merged') => {
    return status === 'new' ? t`new` : t`merged`;
  };

  return (
    <>
      <IonHeader>
        <IonToolbar>
          {!params.createNotebook && (
            <IonTitle data-testid="modal-title">
              <Trans>Import zip content in folder {parentName}</Trans>
            </IonTitle>
          )}
          {params.createNotebook && (
            <IonTitle data-testid="modal-title">
              <Trans>Import zip content in a new Notebook</Trans>
            </IonTitle>
          )}
          <IonButtons slot="end">
            <IonButton onClick={() => onClose(false)}>
              <IonIcon icon={APPICONS.closeAction} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonList lines="none">
        {params.zipData.hasMetadata && (
          <IonItem data-testid="item-metadata-info" color="primary">
            <IonIcon
              className="slim"
              icon={APPICONS.info}
              slot="start"
            ></IonIcon>
            <Trans>Metadata found in the archive</Trans>
          </IonItem>
        )}
        {isEmpty && (
          <IonItem data-testid="item-archive-empty-warning" color="warning">
            <IonIcon
              icon={APPICONS.warning}
              className="slim"
              slot="start"
            ></IonIcon>
            <Trans>Archive is empty</Trans>
          </IonItem>
        )}
        {params.zipData.errors.length > 0 && (
          <IonItem data-testid="item-archive-malformed-warning" color="danger">
            <IonIcon
              icon={APPICONS.warning}
              className="slim"
              slot="start"
            ></IonIcon>
            <Trans>Errors have been detected on the following files:</Trans>
          </IonItem>
        )}
        {!disableConfirm && (
          <>
            {!hasOneFolder && !params.createNotebook && (
              <IonItem data-testid="item-question-create-new-folder">
                <IonLabel color={'secondary'}>
                  <Trans>
                    Do you want to import your content inside a new folder?
                  </Trans>
                </IonLabel>
                <IonToggle
                  slot="end"
                  checked={createNewFolder}
                  onIonChange={e => {
                    setCreateNewFolder(e.detail.checked);
                    if (!e.detail.checked) {
                      setOverwrite(false);
                    } else {
                      setRemoveFirstFolder(false);
                    }
                  }}
                ></IonToggle>
              </IonItem>
            )}
            {createNewFolder && !params.createNotebook && (
              <IonItem
                style={{ padding: 10 }}
                data-testid="item-new-folder-name-input"
              >
                <IonInput
                  id="new-folder-name"
                  label={t`New folder name: `}
                  class="invisible"
                  value={newFolderName}
                  onIonChange={(e: InputCustomEvent) => {
                    if (e.detail.value) {
                      setNewFolderName(e.detail.value);
                    }
                  }}
                ></IonInput>
              </IonItem>
            )}
            {params.createNotebook && (
              <IonItem
                style={{ padding: 10 }}
                data-testid="item-new-notebook-name-input"
              >
                <IonInput
                  id="new-notebook-name"
                  label={t`New notebook name: `}
                  class="invisible"
                  value={newFolderName}
                  onIonChange={(e: InputCustomEvent) => {
                    if (e.detail.value) {
                      setNewFolderName(e.detail.value);
                    }
                  }}
                ></IonInput>
              </IonItem>
            )}
            {hasOneFolder && !params.createNotebook && !createNewFolder && (
              <IonItem data-testid="item-question-single-folder-detected">
                <IonLabel color={'secondary'}>
                  <Trans>
                    A single folder has been detected inside your archive, would
                    you like to remove it and only import its content?
                  </Trans>
                </IonLabel>
                <IonToggle
                  slot="end"
                  checked={removeFirstFolder}
                  onIonChange={e => {
                    setRemoveFirstFolder(e.detail.checked);
                  }}
                ></IonToggle>
              </IonItem>
            )}
            {(zipMerge?.duplicates.length || 0) > 0 && (
              <IonItem data-testid="item-question-merge-duplicates">
                <IonLabel color={'secondary'}>
                  <Trans>
                    Would you like to merge the content of your archive with
                    your existing collection? If yes, folders will be merged,
                    and documents will be overwritten. If no, new items will be
                    created.
                  </Trans>
                </IonLabel>
                <IonToggle
                  slot="end"
                  checked={overwrite}
                  onIonChange={e => {
                    setOverwrite(e.detail.checked);
                  }}
                ></IonToggle>
              </IonItem>
            )}
          </>
        )}
      </IonList>

      <IonList
        style={{ maxHeight: '400px', overflowY: 'auto' }}
        id="preview-list"
      >
        {!disableConfirm &&
          newFirstLevel.map(item => {
            const color =
              'status' in item
                ? item.status === 'new'
                  ? 'secondary'
                  : 'warning'
                : '';
            return (
              <IonItem key={item.id}>
                <IonIcon
                  slot="start"
                  className="slim"
                  color={color}
                  aria-description={ARIA_DESCRIPTIONS_PER_TYPE.get(item.type)}
                  icon={APPICONS_PER_TYPE.get(item.type)}
                />
                <IonLabel color={color}>{item.title}</IonLabel>
                {'status' in item && (
                  <IonLabel slot="end" color={color}>
                    ({getStatusLabel(item.status)})
                  </IonLabel>
                )}
              </IonItem>
            );
          })}

        {disableConfirm &&
          params.zipData.errors.map(e => (
            <IonItem key={`${e.family}${e.path}`} lines={'none'}>
              <IonItem
                className="inner-item-slim"
                style={{ minWidth: 120 }}
                slot="start"
                lines={'none'}
              >
                <IonIcon
                  className="slim"
                  icon={APPICONS.info}
                  color="warning"
                  slot="start"
                ></IonIcon>
                <IonLabel color="warning">{getErrorLabel(e)}</IonLabel>
              </IonItem>
              {/* <IonIcon
                icon={APPICONS.info}
                color="warning"
                slot="start"
              ></IonIcon>
              <IonLabel color="warning">{getErrorLabel(e)}</IonLabel> */}
              <IonLabel>{e.path}</IonLabel>
            </IonItem>
          ))}
      </IonList>

      <IonFooter>
        <IonToolbar>
          <IonButtons slot="end">
            <IonButton onClick={() => onClose(false)}>
              <Trans>Cancel</Trans>
            </IonButton>
            <IonButton
              onClick={() => onClose(true, zipMerge || undefined)}
              disabled={disableConfirm}
            >
              <Trans>Confirm</Trans>
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonFooter>
    </>
  );
};
export default ConfirmMultipleImportModal;
