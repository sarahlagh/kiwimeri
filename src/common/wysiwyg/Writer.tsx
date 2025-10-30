import collectionService from '@/db/collection.service';
import React, { useState } from 'react';
import KiwimeriEditor from './lexical/KiwimeriEditor';
import CollectionPagesBrowser, {
  CollectionPagesBrowserProps
} from './pages-browser/CollectionPagesBrowser';

type WriterProps = {
  content: string;
  docPreview: string;
} & CollectionPagesBrowserProps;

const Writer = (
  props: WriterProps,
  ref: React.LegacyRef<HTMLDivElement> | undefined
) => {
  const { id, content, pages } = props;
  const [openPageBrowser, setOpenPageBrowser] = useState(false);

  return (
    <KiwimeriEditor
      ref={ref}
      content={content}
      onChange={editorState => {
        collectionService.setItemLexicalContent(id, editorState.toJSON());
      }}
      enablePageBrowser={true}
      pageBrowserButtonHighlighted={(pages?.length || 0) > 0}
      openPageBrowser={openPageBrowser}
      setOpenPageBrowser={setOpenPageBrowser}
    >
      {openPageBrowser && <CollectionPagesBrowser {...props} />}
    </KiwimeriEditor>
  );
};
export default React.forwardRef(Writer);
