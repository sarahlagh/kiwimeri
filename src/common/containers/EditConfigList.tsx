import { APPICONS } from '@/constants';
import { AnySerializableData } from '@/db/types/store-types';
import {
  IonButton,
  IonCheckbox,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption
} from '@ionic/react';

export type ConfigRowType = {
  key: string;
  type: 'string' | 'enum' | 'number' | 'boolean';
  label: string;
  min?: number;
  max?: number;
  values?: { val: string; label: string }[];
};

const ConfigValue = ({
  row,
  val,
  onChange
}: {
  row: ConfigRowType;
  val: string | number | boolean;
  onChange: (key: string, val: string | number | boolean) => void;
}) => {
  if (row.type === 'number') {
    return (
      <IonInput
        type="number"
        value={val as number}
        min={row.min}
        max={row.max}
        onIonChange={e => {
          if (e.detail.value) {
            const newValue = parseInt(e.detail.value);
            onChange(row.key, newValue);
          }
        }}
      ></IonInput>
    );
  }
  if (row.type === 'boolean') {
    return (
      <IonCheckbox
        checked={val as boolean}
        onIonChange={e => {
          const newValue = e.detail.checked;
          onChange(row.key, newValue);
        }}
      ></IonCheckbox>
    );
  }
  if (row.type === 'enum' && row.values) {
    const label = row.values.find(v => v.val === val)?.label || '';
    return (
      <IonSelect
        placeholder={label}
        value={val}
        onIonChange={e => {
          const newValue = e.detail.value as string;
          onChange(row.key, newValue);
        }}
      >
        {row.values.map(opt => (
          <IonSelectOption key={opt.val} value={opt.val}>
            {opt.label}
          </IonSelectOption>
        ))}
      </IonSelect>
    );
  }
  // string
  return (
    <IonInput
      value={val as string}
      onIonChange={e => {
        const newValue = e.detail.value as string;
        onChange(row.key, newValue);
      }}
    ></IonInput>
  );
};

type EditConfigListProps = {
  rows: ConfigRowType[];
  initialState: AnySerializableData;
  onChange: (key: string, val: string | number | boolean) => void;
  onClear?: (key: string) => void;
};
const EditConfigList = ({
  rows,
  initialState,
  onChange,
  onClear
}: EditConfigListProps) => {
  return (
    <IonList>
      {rows.map(v => (
        <IonItem key={v.key}>
          <IonLabel slot="start">{v.label}</IonLabel>
          <ConfigValue
            key={v.key}
            row={v}
            val={initialState[v.key]!}
            onChange={onChange}
          ></ConfigValue>
          {onClear && (
            <IonButton
              slot="end"
              fill="clear"
              onClick={() => {
                onClear(v.key);
              }}
            >
              <IonIcon icon={APPICONS.resetAction}></IonIcon>
            </IonButton>
          )}
        </IonItem>
      ))}
    </IonList>
  );
};
export default EditConfigList;
