import { IonTextarea } from '@ionic/react';

interface WriterProps {
  content: string;
  onIonInput: (event: Event) => void;
}

const Writer = ({ content, onIonInput }: WriterProps) => {
  return (
    <IonTextarea
      class="invisible"
      onIonInput={onIonInput}
      aria-label="document Content"
      autoGrow={true}
      value={content}
    ></IonTextarea>
  );
};
export default Writer;
