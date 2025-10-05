import GenericExportFileButton from '@/common/buttons/GenericExportFileButton';
import platformService from '@/common/services/platform.service';
import { APPICONS } from '@/constants';
import { appLog, AppLogLevel } from '@/log';
import {
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonItem,
  IonList,
  IonText
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';

const LogsCard = () => {
  const { t } = useLingui();
  const [stateMap, setStateMap] = useState<{ [key in AppLogLevel]: boolean }>({
    trace: false,
    debug: true,
    info: true,
    warn: true,
    error: true
  });
  const filters = Object.keys(stateMap).filter(
    k => stateMap[k as AppLogLevel]
  ) as AppLogLevel[];
  const levels: AppLogLevel[] = ['trace', 'debug', 'info', 'warn', 'error'];
  const isWideEnough = platformService.isWideEnough();
  const logs = appLog.useLogs(filters);

  function getColor(
    level: AppLogLevel
  ): (import('@ionic/core').Color & string) | undefined {
    switch (level) {
      case 'error':
        return 'danger';
      case 'warn':
        return 'warning';
      case 'debug':
        return 'tertiary';
      case 'trace':
        return 'dark';
    }
    return undefined;
  }

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>
          <Trans>Logs</Trans>
        </IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <IonList style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {logs.map(log => {
            const color = getColor(log.longLevelName);
            return (
              <IonText color={color} key={log.id}>
                <p>
                  {new Date(log.ts).toLocaleTimeString()} &nbsp;
                  {log.message}
                </p>
              </IonText>
            );
          })}
        </IonList>
      </IonCardContent>
      <IonItem>
        <IonButtons slot="end">
          {levels.map(level => (
            <IonChip
              key={level}
              color={getColor(level)}
              outline={stateMap[level]}
              onClick={() => {
                const newState = { ...stateMap };
                newState[level] = !newState[level];
                setStateMap(newState);
              }}
            >
              {level}
            </IonChip>
          ))}
        </IonButtons>
        <GenericExportFileButton
          getFileContent={appLog.printLogs(filters)}
          getFileTitle={() =>
            `${new Date().toISOString().substring(0, 19).replaceAll(/[:T]/g, '-')}-logs.txt`
          }
          label={isWideEnough ? t`Download Logs` : undefined}
          icon={isWideEnough ? null : APPICONS.export}
          color="primary"
          fill="clear"
        />
      </IonItem>
    </IonCard>
  );
};
export default LogsCard;
