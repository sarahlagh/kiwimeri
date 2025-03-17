import { IonButton } from '@ionic/react';
import { $createHeadingNode, HeadingTagType } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { $getSelection } from 'lexical';
import { ToolbarElementProps } from './ToolbarElementProps';

interface HeaderButtonProps extends ToolbarElementProps {
  tag: HeadingTagType;
}

export default function HeaderButton({ editor, tag }: HeaderButtonProps) {
  const onClick: React.MouseEventHandler<HTMLIonButtonElement> = () => {
    editor.update(() => {
      const selection = $getSelection();
      $setBlocksType(selection, () => $createHeadingNode(tag));
    });
  };

  return (
    <>
      <IonButton onClick={onClick}>{tag.toUpperCase()}</IonButton>
    </>
  );
}
