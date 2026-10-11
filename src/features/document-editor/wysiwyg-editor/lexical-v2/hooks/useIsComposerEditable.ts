import { useEditorContext } from '../RichTextEditor';

const useIsComposerEditable = () => {
  const { isComposerEditable } = useEditorContext();
  return isComposerEditable;
};
export default useIsComposerEditable;
