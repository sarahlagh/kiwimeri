import { useQueryResults } from '@/core/db/queries-helper';
import { appLevels, AppLogLevel } from '@/core/logs/logs';
import { appLog } from '@/core/logs/logs.service';
import GenericExportFileButton from '@/shared/buttons/GenericExportFileButton';
import { dateToStr } from '@/shared/misc/date-utils';
import {
  IonButton,
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
import { useEffect, useRef, useState } from 'react';
import fetchLogsQuery from '../queries/fetchLogsQuery';

function onRouteEnter() {
  fetchLogsQuery.initQuery();
}
function onRouteLeave() {
  fetchLogsQuery.close();
}

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
  const lastLogRef = useRef<HTMLIonTextElement>(null);
  const [showFilters, setShowFilters] = useState(false);
  const logs = useQueryResults(fetchLogsQuery, 'ts', false).filter(l =>
    filters ? filters.includes(l.longLevelName) : true
  );

  useEffect(() => {
    onRouteEnter();
    return () => {
      onRouteLeave();
    };
  }, []);

  useEffect(() => {
    // scroll to last
    const timeout = setTimeout(() => {
      if (lastLogRef.current) {
        lastLogRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
      return () => clearTimeout(timeout);
    }, 50);
  }, [logs]);

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>
          <Trans>Logs</Trans>
        </IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <IonList style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {logs.map((log, i) => {
            const color = getColor(log.longLevelName);
            if (i === logs.length - 1) {
              return (
                <IonText color={color} key={log.id} ref={lastLogRef}>
                  <p>
                    {dateToStr('time', log.ts)} &nbsp;
                    {log.message}
                  </p>
                </IonText>
              );
            }
            return (
              <IonText color={color} key={log.id}>
                <p>
                  {dateToStr('time', log.ts)} &nbsp;
                  {log.message}
                </p>
              </IonText>
            );
          })}
        </IonList>
      </IonCardContent>
      {showFilters && (
        <IonItem lines="none">
          <IonButtons>
            {appLevels.map(level => (
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
        </IonItem>
      )}
      <IonItem>
        <GenericExportFileButton
          getFileContent={appLog.printLogs(logs)}
          getFileTitle={() => `${dateToStr('iso')}-logs.txt`}
          label={t`Download Logs`}
          icon={null}
          color="primary"
          fill="clear"
        />
        <IonButton
          color="primary"
          fill="clear"
          onClick={() => {
            appLog.gc(true);
          }}
        >
          <Trans>Delete All</Trans>
        </IonButton>
        <IonButton slot="end" onClick={() => setShowFilters(!showFilters)}>
          {showFilters ? (
            <Trans>Hide Filters</Trans>
          ) : (
            <Trans>Show Filters</Trans>
          )}
        </IonButton>
      </IonItem>
    </IonCard>
  );
};
export default LogsCard;
