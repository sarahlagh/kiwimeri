import { IonButton } from '@ionic/react';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import { ToolbarElementProps } from './ToolbarElementProps';

type InsertHorizontalRuleButtonProps = ToolbarElementProps;

export default function InsertHorizontalRuleButton({
  editor
}: InsertHorizontalRuleButtonProps) {
  const onClick: React.MouseEventHandler<HTMLIonButtonElement> = () => {
    editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
  };

  return (
    <IonButton color="light" onClick={onClick}>
      hr
    </IonButton>
  );
}
