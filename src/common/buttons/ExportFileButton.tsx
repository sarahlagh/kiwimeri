import { CollectionItemType } from '@/collection/collection';
import collectionService from '@/db/collection.service';
import formatterService from '@/format-conversion/formatter.service';
import { Id } from 'tinybase/with-schemas';
import { unminimizeContentFromStorage } from '../wysiwyg/compress-file-content';
import GenericExportFileButton from './GenericExportFileButton';

type ExportFileButtonProps = {
  id: Id;
  onClose: (role?: string) => void;
};

const ExportFileButton = ({ id, onClose }: ExportFileButtonProps) => {
  function getContentAsMd(storedJson: string) {
    const content = storedJson.startsWith('{"root":{')
      ? storedJson
      : unminimizeContentFromStorage(storedJson);
    return formatterService.getMarkdownFromLexical(content);
  }

  const getFileTitle = () => {
    const type = collectionService.getItemType(id);
    if (type === CollectionItemType.page) {
      return 'page.md';
    }
    const fileTitle = collectionService.getItemTitle(id);
    return `${fileTitle}.md`;
  };
  const getFileContent = () => {
    const pages = collectionService.getDocumentPages(id);
    const json = collectionService.getItemContent(id) || '';
    let content: string;
    content = getContentAsMd(json);
    pages.forEach(page => {
      content += formatterService.getPagesSeparator();
      content += getContentAsMd(
        collectionService.getItemContent(page.id) || ''
      );
    });
    return content;
  };
  return (
    <GenericExportFileButton
      getFileTitle={getFileTitle}
      getFileContent={getFileContent}
      fileMime={'text/markdown'}
      onDone={onClose}
    />
  );
};
export default ExportFileButton;
