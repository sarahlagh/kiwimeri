import { SID } from '@/core/db/store-constants';
import { SpaceValue } from '@/core/db/store-schema';
import { AnySerializableData, SerializableData } from '@/core/db/types';
import { useSpaceValues } from '@/core/db/ui-hooks';
import { plt } from '@/core/infra/platform';
import { deviceSettings } from '@/domain/device-settings/device-settings.service';
import { syncService } from '@/domain/synchronization/sync.service';
import { ConfigRowType, EditConfigList } from '@/features/settings-ui';
import { IonCard, IonCardHeader, IonCardTitle } from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';

const ConfigCard = () => {
  const { t } = useLingui();
  const spaceValues = useSpaceValues(SID.space);

  const rows: ConfigRowType[] = [
    {
      key: 'enableFastWrite',
      type: 'boolean',
      label: t`Enable Fast Write`
    },
    {
      key: 'fastWriteMode',
      type: 'enum',
      values: [
        {
          val: 'watch',
          label: 'watch'
        },
        {
          val: 'run',
          label: 'run'
        }
      ],
      label: t`Fast Write Mode`
    }
  ];
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

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>
          <Trans>Config</Trans>
        </IonCardTitle>
      </IonCardHeader>

      <EditConfigList
        rows={rows}
        initialState={spaceValues as AnySerializableData}
        onChange={function (key: string, val: SerializableData): void {
          deviceSettings.set(key as SpaceValue, val);
        }}
      />
    </IonCard>
  );
};
export default ConfigCard;
