import { APPICONS } from '@/constants';
import { AnySerializableData, SerializableData } from '@/db/types/store-types';
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
  if?: (state: AnySerializableData) => boolean;
};

const ConfigValue = ({
  row,
  val,
  disabled,
  onChange
}: {
  row: ConfigRowType;
  val: SerializableData;
  disabled: boolean;
  onChange: (key: string, val: SerializableData) => void;
}) => {
  if (row.type === 'number') {
    return (
      <IonInput
        type="number"
        value={val as number}
        min={row.min}
        max={row.max}
        disabled={disabled}
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
        disabled={disabled}
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
        disabled={disabled}
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
      disabled={disabled}
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
  onChange: (key: string, val: SerializableData) => void;
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
      {rows.map(v => {
        const disabled = v.if ? v.if(initialState) : false;
        return (
          <IonItem
            key={v.key}
            className={disabled ? 'item-interactive-disabled' : undefined}
          >
            <IonLabel slot="start">{v.label}</IonLabel>
            <ConfigValue
              key={v.key}
              row={v}
              val={initialState[v.key]!}
              onChange={onChange}
              disabled={disabled}
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
        );
      })}
    </IonList>
  );
};
export default EditConfigList;
