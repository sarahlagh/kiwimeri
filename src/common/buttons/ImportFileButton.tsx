import { ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
import storageService from '@/db/storage.service';
import formatterService from '@/format-conversion/formatter.service';
import GenericImportFileButton from './GenericImportFileButton';

type ImportFileButtonProps = {
  parent: string | null;
};

const ImportFileButton = ({ parent }: ImportFileButtonProps) => {
  const onContentRead = async (content: string, file: File) => {
    const fileName = file.name.replace(/\.(md|MD)$/, '');
    const pages = content.split(formatterService.getPagesSeparator());
    const doc = pages.shift()!;
    const lexical = formatterService.getLexicalFromMarkdown(doc);

    storageService.getSpace().transaction(() => {
      // is there a document with same name?
      const item = collectionService
        .getBrowsableCollectionItems(parent || ROOT_FOLDER)
        .find(item => item.title === fileName);
      if (item) {
        // TODO warn user and ask for confirm (ask to delete existing pages too)
        console.debug('found document with the same file name', parent, item);
        // delete exising pages
        const pages = collectionService.getDocumentPages(item.id);
        pages.forEach(page => {
          collectionService.deleteItem(page.id);
        });
      }
      let itemId = item?.id;
      if (!itemId) {
        itemId = collectionService.addDocument(parent || ROOT_FOLDER);
        collectionService.setItemTitle(itemId, fileName);
      }
      collectionService.setItemLexicalContent(itemId, lexical);

      // won't be able to merge existing pages like this, TODO
      pages.forEach(page => {
        const pageId = collectionService.addPage(itemId);
        const lexical = formatterService.getLexicalFromMarkdown(page);
        collectionService.setItemLexicalContent(pageId, lexical);
      });
    });
  };

  return (
    <GenericImportFileButton
      onContentRead={onContentRead}
    ></GenericImportFileButton>
  );
};
export default ImportFileButton;
