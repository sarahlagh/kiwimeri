import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import HeaderButton from './toolbar/HeaderButton';

export default function KiwimeriToolbarPlugin() {
  const [editor] = useLexicalComposerContext();

  return (
    <>
      <HeaderButton editor={editor} tag={'h1'}></HeaderButton>
      <HeaderButton editor={editor} tag={'h2'}></HeaderButton>
      <HeaderButton editor={editor} tag={'h3'}></HeaderButton>
    </>
  );
}
