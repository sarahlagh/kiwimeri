import GenericExportFileButton from '@/common/buttons/GenericExportFileButton';
import { appLog, AppLogLevel } from '@/log';
import {
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

  // TODO select log levels
  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>
          <IonItem lines="none">
            <Trans>Logs</Trans>
            <IonText slot="end">
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
            </IonText>
          </IonItem>
        </IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <IonList style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {appLog.getLogs(filters).map(log => {
            const color = getColor(log.level);
            return (
              <IonText color={color} key={log.key}>
                <p>
                  {new Date(log.ts).toLocaleTimeString()} &nbsp;
                  {log.message}
                </p>
              </IonText>
            );
          })}
        </IonList>
      </IonCardContent>
      <GenericExportFileButton
        getFileContent={appLog.printLogs(filters)}
        getFileTitle={() =>
          `${new Date().toISOString().substring(0, 19).replaceAll(/[:T]/g, '-')}-logs.txt`
        }
        label={t`Download Logs`}
        icon={null}
        fill="clear"
      />
    </IonCard>
  );
};
export default LogsCard;
