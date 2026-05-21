import platformService from '@/common/services/platform.service';
import { appConfig } from '@/config';
import { APPICONS } from '@/constants';
import { store } from '@/core/db/store';
import { StoreValue } from '@/core/db/store-schema';
import remotesService from '@/db/remotes.service';
import { SerializableData } from '@/db/types/store-types';
import {
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCheckbox,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';

const valueConfigMap: { [key in StoreValue]?: string } = {
  internalProxy: 'INTERNAL_HTTP_PROXY'
};

const getValue = (v: StoreValue) => {
  if (valueConfigMap[v]) {
    const val = store.getValue(v);
    return val !== undefined ? val : appConfig[valueConfigMap[v]];
  }
  return store.getValue(v);
};

const getNewValueOrDefault = (v: StoreValue, newValue?: SerializableData) => {
  if (valueConfigMap[v] === undefined) {
    return newValue;
  }
  if (newValue === undefined) {
    return appConfig[valueConfigMap[v]!];
  }
  return newValue;
};

export type ConfigRowType = {
  key: StoreValue;
  type: 'string' | 'number' | 'boolean';
  label: string;
  min?: number;
  max?: number;
  onChange?: () => Promise<void>;
};

const ConfigValue = ({
  row,
  val
}: {
  row: ConfigRowType;
  val: SerializableData;
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
            store.setValue(row.key, newValue);
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
          store.setValue(row.key, newValue);
        }}
      ></IonCheckbox>
    );
  }
  // string
  return (
    <IonInput
      value={val as string}
      onIonChange={e => {
        const newValue = e.detail.value as string;
        store.setValue(row.key, newValue);
      }}
    ></IonInput>
  );
};

const ConfigCard = () => {
  const { t } = useLingui();
  const rows: ConfigRowType[] = [];
  if (platformService.isWeb()) {
    rows.push({
      key: 'internalProxy',
      type: 'string',
      label: t`Internal proxy`,
      onChange: async () => {
        await remotesService.onReinit();
      }
    });
  } else {
    rows.push({
      key: 'maxLogHistory',
      type: 'number',
      label: t`Max log history`,
      min: 0
    });
  }

  const [state, setState] = useState<{
    [key in StoreValue]?: SerializableData;
  }>(() => {
    const initialState: {
      [key in StoreValue]?: SerializableData;
    } = {};
    rows.forEach(row => {
      initialState[row.key] = getValue(row.key);
    });
    return initialState;
  });

  useEffect(() => {
    const listenerId = store.addValuesListener((store, getValueChange) => {
      if (getValueChange) {
        rows.forEach(row => {
          const [changed, , newValue] = getValueChange(row.key);
          if (changed) {
            state[row.key] = getNewValueOrDefault(row.key, newValue);
            setState({ ...state });
            if (row.onChange) {
              setTimeout(row.onChange);
            }
          }
        });
      }
    });
    return () => {
      store.delListener(listenerId);
    };
  });

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>
          <Trans>Config</Trans>
        </IonCardTitle>
      </IonCardHeader>

      <IonList>
        {rows.map(v => (
          <IonItem key={v.key}>
            <IonLabel slot="start">{v.label}</IonLabel>
            <ConfigValue key={v.key} row={v} val={state[v.key]!}></ConfigValue>
            <IonButton
              slot="end"
              fill="clear"
              onClick={() => {
                store.delValue(v.key);
              }}
            >
              <IonIcon icon={APPICONS.resetAction}></IonIcon>
            </IonButton>
          </IonItem>
        ))}
      </IonList>
    </IonCard>
  );
};
export default ConfigCard;
