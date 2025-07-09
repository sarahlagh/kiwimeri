import {
  CollectionItem,
  CollectionItemResult,
  CollectionItemType
} from '@/collection/collection';
import { ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
import storageService from '@/db/storage.service';
import formatterService from '@/format-conversion/formatter.service';
import { OverlayEventDetail } from '@ionic/core/components';
import { useIonModal } from '@ionic/react';
import { strFromU8, unzip, Unzipped } from 'fflate';
import { SerializedEditorState, SerializedLexicalNode } from 'lexical';
import { useState } from 'react';
import { useHistory } from 'react-router';
import ConfirmImportModal from '../modals/ConfirmImportModal';
import { GET_ITEM_ROUTE } from '../routes';
import GenericImportFileButton from './GenericImportFileButton';

type ImportItemsButtonProps = {
  parent: string | null;
};

const ImportItemsButton = ({ parent }: ImportItemsButtonProps) => {
  const history = useHistory();
  const [items, setItems] = useState<CollectionItemResult[]>([]);
  const [present, dismiss] = useIonModal(ConfirmImportModal, {
    folder: parent || ROOT_FOLDER,
    items,
    onClose: (confirm: boolean, item?: CollectionItemResult) => {
      dismiss({ confirm, item });
    }
  });

  const getLexicalFromContent = (content: string) => {
    const pagesFormatted = content.split(formatterService.getPagesSeparator());
    const doc = pagesFormatted.shift()!;
    const lexical = formatterService.getLexicalFromMarkdown(doc);
    const pages: SerializedEditorState<SerializedLexicalNode>[] = [];
    pagesFormatted.forEach(page => {
      pages.push(formatterService.getLexicalFromMarkdown(page));
    });
    return { doc: lexical, pages };
  };

  const onContentReadConfirm = (
    lexical: SerializedEditorState<SerializedLexicalNode>,
    pages: SerializedEditorState<SerializedLexicalNode>[],
    fileName: string,
    item?: CollectionItemResult
  ) => {
    let itemId = item?.id;
    storageService.getSpace().transaction(() => {
      // is there a document with same name?
      if (itemId) {
        console.debug(
          'overwriting document with the same file name',
          parent,
          itemId
        );
        // delete exising pages
        const pages = collectionService.getDocumentPages(itemId);
        pages.forEach(page => {
          collectionService.deleteItem(page.id);
        });
      } else {
        itemId = collectionService.addDocument(parent || ROOT_FOLDER);
        collectionService.setItemTitle(itemId, fileName);
      }
      collectionService.setItemLexicalContent(itemId, lexical);

      pages.forEach(page => {
        const pageId = collectionService.addPage(itemId!);
        collectionService.setItemLexicalContent(pageId, page);
      });
    });
    history.push(GET_ITEM_ROUTE(parent || ROOT_FOLDER, itemId));
  };

  const onSingleDocumentRead = async (content: string, file: File) => {
    const fileName = file.name.replace(/\.(md|MD)$/, '');
    const { doc, pages } = getLexicalFromContent(content);

    const items = collectionService
      .getBrowsableCollectionItems(parent || ROOT_FOLDER)
      .filter(item => item.type === CollectionItemType.document)
      .filter(item => item.title === fileName);

    if (items.length > 0) {
      setItems(items);
      return new Promise<boolean>(function (resolve) {
        present({
          cssClass: 'auto-height',
          onWillDismiss: (event: CustomEvent<OverlayEventDetail>) => {
            if (event.detail.data?.confirm === true) {
              onContentReadConfirm(
                doc,
                pages,
                fileName,
                event.detail.data.item
              );
            }
            resolve(event.detail.data?.confirm === true);
          }
        });
      });
    } else {
      onContentReadConfirm(doc, pages, fileName);
      return true;
    }
  };

  const parseZipData = (unzipped: Unzipped) => {
    // TODO option to create notebooks, but how? right now, notebooks aren't nested, but they will be
    // only possible with meta json files included,
    // must warn user "if you export without metadata", you won't be able to reimport notebooks"
    const items: { [key: string]: CollectionItem } = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fileTree: any = {}; // object that represents the item in tree structure
    Object.keys(unzipped).forEach(key => {
      const isFolder = key.endsWith('/');
      const fKey = key;
      if (isFolder) {
        key = key.substring(0, key.length - 1);
      }
      let currentParent = parent;
      let parentKey = '';
      const names = key.split('/');
      let node = fileTree;
      const currentName = names.pop()!;
      names.forEach(name => {
        parentKey += name + '/';
        node[name] = {
          type: CollectionItemType.folder,
          id: items[parentKey].id
        };
        node = node[name];
      });
      if (parentKey.length > 0 && items[parentKey]) {
        currentParent = items[parentKey].id!;
      }
      if (!items[fKey]) {
        const { item, id } = isFolder
          ? collectionService.getNewFolderObj(currentParent || ROOT_FOLDER)
          : collectionService.getNewDocumentObj(currentParent || ROOT_FOLDER);

        let content: string | undefined = undefined;
        node[currentName] = {
          type: isFolder
            ? CollectionItemType.folder
            : CollectionItemType.document,
          id
        };
        if (!isFolder) {
          content = strFromU8(unzipped[key]);
          const { doc, pages } = getLexicalFromContent(content);
          collectionService.setUnsavedItemLexicalContent(item, doc);
          pages.forEach((page, idx) => {
            const { item: pItem, id: pId } =
              collectionService.getNewPageObj(id);
            node[currentName][idx] = {
              type: CollectionItemType.page,
              id: pId
            };
            items[key + idx] = { ...pItem, id: pId, title: '', title_meta: '' };
            collectionService.setUnsavedItemLexicalContent(
              items[key + idx],
              page
            );
          });
        }
        items[fKey] = {
          ...item,
          id,
          // remove duplicate identifiers from the name
          title: currentName.replace(/(.*?)( \(\d*\))?\.[A-z]{1,3}$/g, '$1')
        };
      }
    });
    return { items: Object.values(items), fileTree };
  };

  const onZipFileRead = async (content: ArrayBuffer, file: File) => {
    const fileName = file.name.replace(/(.*)\.(zip|ZIP)$/g, '$1');
    console.debug('content', fileName, content);
    const zipData = new Uint8Array(content);

    return new Promise<boolean>((resolve, reject) => {
      unzip(zipData, {}, (err, unzipped) => {
        if (err) {
          console.error('error unzipping data', err);
          return reject(false);
        }
        const { items, fileTree } = parseZipData(unzipped);
        const hasOneFolder =
          Object.keys(fileTree).length === 1 &&
          fileTree[Object.keys(fileTree)[0]].type === CollectionItemType.folder;
        console.debug('unzipped', unzipped);
        console.debug('items', items);
        console.debug('fileTree', fileTree, hasOneFolder);

        const itemsInCollection = collectionService.getBrowsableCollectionItems(
          parent || ROOT_FOLDER
        );
        console.debug('parent', parent, itemsInCollection);

        collectionService.saveItems(items, parent ? parent : undefined);
        resolve(true);
        // const duplicates = itemsInCollection.filter(
        //   item => item.title === fileName
        // );
        // Object.keys(fileTree).forEach(key => {
        //   const itemId = fileTree[key].id;
        //   const itemTitle = items.find(f => f.id === itemId)?.title;
        //   const duplItem = duplicates.find(dupl => dupl.id === itemId);
        //   if (!duplItem && itemTitle) {
        //     const itemInCollection = itemsInCollection.find(
        //       i => i.title === itemTitle
        //     );
        //     if (itemInCollection) {
        //       duplicates.push(itemInCollection);
        //     }
        //   }
        // });
        // if (hasOneFolder) {
        //   const folderId = fileTree[Object.keys(fileTree)[0]].id;
        //   const folderItem = items.find(f => f.id === folderId);
        //   const duplItem = duplicates.find(dupl => dupl.id === folderId);
        //   if (!duplItem && folderItem) {
        //     duplicates.push(folderItem as CollectionItemResult);
        //   }
        // }
        // setItems(duplicates);
        // console.debug('duplicates', duplicates);

        // TODO check duplicates for each first row, folders or documents

        // TODO ask if overwrite everytime - create new modal tho'?
        // TODO if overwrite must loop over items and replace the ids or create a new array
        // TODO THEN save items
        // TODO don't let user select which to overwrite - overwrite all or none?
        // if (hasOneFolder || duplicates) {
        //   present({
        //     cssClass: 'auto-height',
        //     onWillDismiss: (event: CustomEvent<OverlayEventDetail>) => {
        //       console.debug('modal event', event.detail);
        //       // const folder = event.detail.data?.item;
        //       resolve(event.detail.data?.confirm === true);
        //     }
        //   });
        // } else {
        //   resolve(true);
        // }
      });
    });
  };

  const onContentRead = async (content: ArrayBuffer, file: File) => {
    // TODO handle type and return error if not supported
    if (
      file.name.toLowerCase().endsWith('.md') ||
      file.name.toLowerCase().endsWith('.txt')
    ) {
      return onSingleDocumentRead(new TextDecoder().decode(content), file);
    }
    if (file.name.toLowerCase().endsWith('.zip')) {
      return onZipFileRead(content, file);
    }
    return false;
  };

  return (
    <GenericImportFileButton
      onContentRead={onContentRead}
    ></GenericImportFileButton>
  );
};
export default ImportItemsButton;
