import { appConfig } from '@/config';
import { APPICONS } from '@/constants';
import { space } from '@/core/db/store';
import { SpaceValue } from '@/core/db/store-schema';
import { plt } from '@/core/infra/platform';
import { SerializableData } from '@/db/types/store-types';
import { syncService } from '@/domain/replication/sync.service';
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

const valueConfigMap: { [key in SpaceValue]?: string } = {
  internalProxy: 'INTERNAL_HTTP_PROXY'
};

const getValue = (v: SpaceValue) => {
  if (valueConfigMap[v]) {
    const val = space.getValue(v);
    return val !== undefined ? val : appConfig[valueConfigMap[v]];
  }
  return space.getValue(v);
};

const getNewValueOrDefault = (v: SpaceValue, newValue?: SerializableData) => {
  if (valueConfigMap[v] === undefined) {
    return newValue;
  }
  if (newValue === undefined) {
    return appConfig[valueConfigMap[v]!];
  }
  return newValue;
};

export type ConfigRowType = {
  key: SpaceValue;
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
            space.setValue(row.key, newValue);
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
          space.setValue(row.key, newValue);
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
        space.setValue(row.key, newValue);
      }}
    ></IonInput>
  );
};

const ConfigCard = () => {
  const { t } = useLingui();
  const rows: ConfigRowType[] = [];
  if (plt.isWeb()) {
    rows.push({
      key: 'internalProxy',
      type: 'string',
      label: t`Internal proxy`,
      onChange: async () => {
        await syncService.reinit();
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
    [key in SpaceValue]?: SerializableData;
  }>(() => {
    const initialState: {
      [key in SpaceValue]?: SerializableData;
    } = {};
    rows.forEach(row => {
      initialState[row.key] = getValue(row.key);
    });
    return initialState;
  });

  useEffect(() => {
    const listenerId = space.addValuesListener((space, getValueChange) => {
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
      space.delListener(listenerId);
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
                space.delValue(v.key);
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
