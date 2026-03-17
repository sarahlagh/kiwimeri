import { APPICONS } from '@/constants';
import { AnySerializableData, SerializableData } from '@/db/types/store-types';
import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPopover,
  IonSelect,
  IonSelectOption
} from '@ionic/react';
import { useMediaQueryMatch } from '../hooks/useMediaQueryMatch';

export type ConfigRowType = {
  key: string;
  type: 'string' | 'enum' | 'number' | 'boolean';
  label: string;
  description?: string;
  min?: number;
  max?: number;
  values?: { val: string; label: string }[];
  if?: (state: AnySerializableData) => boolean;
};

const ConfigValue = ({
  row,
  val,
  disabled,
  small,
  onChange
}: {
  row: ConfigRowType;
  val: SerializableData;
  disabled: boolean;
  small: boolean;
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
        label={small ? row.label : undefined}
        labelPlacement={small ? 'stacked' : undefined}
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
        labelPlacement={small ? 'start' : undefined}
        onIonChange={e => {
          const newValue = e.detail.checked;
          onChange(row.key, newValue);
        }}
      >
        {small ? row.label : ''}
      </IonCheckbox>
    );
  }
  if (row.type === 'enum' && row.values) {
    const label = row.values.find(v => v.val === val)?.label || '';
    return (
      <IonSelect
        placeholder={label}
        disabled={disabled}
        label={small ? row.label : undefined}
        labelPlacement={small ? 'stacked' : undefined}
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

const InfoBtn = ({ v }: { v: ConfigRowType }) => {
  return (
    <>
      {v.description && (
        <>
          <IonButton id={`trigger-${v.key}`} fill="clear">
            <IonIcon icon={APPICONS.info}></IonIcon>
          </IonButton>
          <IonPopover trigger={`trigger-${v.key}`} triggerAction="click">
            <IonContent class="ion-padding">{v.description}</IonContent>
          </IonPopover>
        </>
      )}{' '}
    </>
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
  const mqm = useMediaQueryMatch('sm');
  return (
    <IonList>
      {rows.map(v => {
        const disabled = v.if ? v.if(initialState) : false;
        return (
          <IonItem
            key={v.key}
            className={disabled ? 'item-interactive-disabled' : undefined}
          >
            <IonLabel
              class="ion-hide-sm-down"
              slot="start"
              style={{ lineHeight: '30px', maxHeight: '30px', display: 'flex' }}
            >
              {v.label}
              <InfoBtn v={v} />
            </IonLabel>
            <ConfigValue
              key={v.key}
              row={v}
              val={initialState[v.key]!}
              small={!mqm}
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
