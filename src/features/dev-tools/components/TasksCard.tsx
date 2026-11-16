import { APPICONS } from '@/constants';
import { useQueryResults } from '@/core/db/queries-helper';
import { schedule } from '@/core/tasks/scheduler.service';
import { TaskNames } from '@/core/tasks/tasks-registry';
import useIsWideEnough from '@/shared/hooks/useIsWideEnough';
import { dateToStr } from '@/shared/misc/date-utils';
import { defineI18nMap } from '@/shared/misc/i18n-utils';
import AreYouSureAlert from '@/shared/modals/AreYouSureAlert';
import {
  IonAlert,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList
} from '@ionic/react';
import { msg, ph } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect } from 'react';
import fetchTasksQuery from '../queries/fetchTasksQuery';

function onRouteEnter() {
  fetchTasksQuery.initQuery();
}
function onRouteLeave() {
  fetchTasksQuery.close();
}

const tasksLabels = defineI18nMap([
  [TaskNames.NATIVE_STORE_SAVE, msg`Native Storage`],
  [TaskNames.FAST_WRITE, msg`Pending Edits`],
  [`${TaskNames.FAST_WRITE}_description`, msg`A document has pending changes`],
  [TaskNames.HISTORY_SAVE, msg`Pending Document Version`],
  [TaskNames.LOG_GC, msg`Log Maintenance`],
  [TaskNames.HISTORY_GC, msg`History Maintenance`],
  [TaskNames.NOTIFS_GC, msg`Notification Maintenance`],
  [TaskNames.DELETE_NATIVE_BACKUPS, msg`Profile Cleanup`]
]);

const TasksCard = () => {
  useEffect(() => {
    onRouteEnter();
    return () => {
      onRouteLeave();
    };
  }, []);

  const { t, i18n } = useLingui();
  const isWideEnough = useIsWideEnough();
  const tasks = useQueryResults(fetchTasksQuery);
  const noneLabel = t`none`;

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>
          <Trans>Scheduled Tasks</Trans>
        </IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <IonList style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {tasks.length === 0 && (
            <IonItem lines="none">
              <Trans>No pending tasks</Trans>
            </IonItem>
          )}
          {tasks.map(task => (
            <IonItemSliding key={task.id} data-testid={`task-${task.id}`}>
              <IonItem color={task.error ? 'warning' : undefined}>
                {task.error && isWideEnough && (
                  <IonIcon icon={APPICONS.warning} />
                )}
                <IonLabel>
                  <h3>{tasksLabels.get(i18n, task.name)}</h3>
                  <p>
                    {isWideEnough && (
                      <i>
                        {tasksLabels.getOrBlank(
                          i18n,
                          `${task.name}_description`
                        )}
                      </i>
                    )}
                  </p>
                  <p>
                    {!task.error ? (
                      <span>
                        <i>
                          {isWideEnough && <Trans>Scheduled at: &nbsp;</Trans>}
                          {dateToStr('relative', task.scheduledAt)}
                        </i>
                      </span>
                    ) : (
                      <span>
                        <i>
                          <Trans>
                            Ran at: &nbsp;
                            {ph({
                              relativeDate: dateToStr(
                                'relative',
                                task.scheduledAt
                              )
                            })}{' '}
                            with errors
                          </Trans>
                        </i>
                      </span>
                    )}
                  </p>
                </IonLabel>

                <IonButtons slot="end">
                  {(task.inputs || task.error) && (
                    <IonButton
                      id={`info_${task.id}`}
                      aria-label={t`Show details`}
                    >
                      <IonIcon icon={APPICONS.info} />
                    </IonButton>
                  )}
                </IonButtons>
                <IonAlert
                  header={tasksLabels.get(i18n, task.name)}
                  trigger={`info_${task.id}`}
                  message={t`Inputs: ${ph({ inputsStr: task.inputs ? JSON.stringify(task.inputs) : noneLabel })} </br> ${ph({ errorMsg: task.error ? task.error : '' })}`}
                  buttons={[
                    {
                      text: t`close`
                    }
                  ]}
                />
                <AreYouSureAlert
                  message={t`This will execute the task immediately`}
                  trigger={`flush_${task.id}`}
                  onClose={(confirmed: boolean) => {
                    if (confirmed) {
                      schedule.flushTask(task.id);
                    }
                  }}
                />
                <AreYouSureAlert
                  message={t`This will cancel the task`}
                  trigger={`del_${task.id}`}
                  onClose={(confirmed: boolean) => {
                    if (confirmed) {
                      schedule.cancel(task.id);
                    }
                  }}
                />
              </IonItem>
              <IonItemOptions>
                {!task.error && (
                  <IonItemOption color="success">
                    <IonButtons>
                      <IonButton
                        id={`flush_${task.id}`}
                        aria-label={t`Run Now`}
                      >
                        <IonIcon icon={APPICONS.runNow} />
                      </IonButton>
                    </IonButtons>
                  </IonItemOption>
                )}
                <IonItemOption color="danger">
                  <IonButtons>
                    <IonButton
                      id={`del_${task.id}`}
                      aria-label={t`Cancel Task`}
                    >
                      <IonIcon icon={APPICONS.deleteAction} />
                    </IonButton>
                  </IonButtons>
                </IonItemOption>
              </IonItemOptions>
            </IonItemSliding>
          ))}
        </IonList>
      </IonCardContent>
    </IonCard>
  );
};

export default TasksCard;
