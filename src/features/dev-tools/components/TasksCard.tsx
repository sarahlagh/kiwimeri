import { APPICONS } from '@/constants';
import { useQueryResults } from '@/core/db/queries-helper';
import { schedule } from '@/core/tasks/scheduler.service';
import { TaskNames } from '@/core/tasks/tasks-registry';
import useIsWideEnough from '@/shared/hooks/useIsWideEnough';
import { dateToStr } from '@/shared/misc/date-utils';
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
  IonList
} from '@ionic/react';
import { i18n, MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect } from 'react';
import fetchTasksQuery from '../queries/fetchTasksQuery';

function onRouteEnter() {
  fetchTasksQuery.initQuery();
}
function onRouteLeave() {
  fetchTasksQuery.close();
}

const TASKS_MSG: { [key: string]: MessageDescriptor } = {};
TASKS_MSG[TaskNames.FAST_WRITE] = msg`Document edits`;
TASKS_MSG[`${TaskNames.FAST_WRITE}_description`] =
  msg`A document has pending changes`;
TASKS_MSG[TaskNames.LOG_GC] = msg`Log Maintenance`;

const TasksCard = () => {
  useEffect(() => {
    onRouteEnter();
    return () => {
      onRouteLeave();
    };
  }, []);

  const { t } = useLingui();
  const isWideEnough = useIsWideEnough();
  const tasks = useQueryResults(fetchTasksQuery);

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
                {TASKS_MSG[task.name]
                  ? i18n._(TASKS_MSG[task.name])
                  : task.name}{' '}
                &nbsp;
                {isWideEnough && (
                  <i>
                    {TASKS_MSG[`${task.name}_description`]
                      ? i18n._(TASKS_MSG[`${task.name}_description`])
                      : ''}
                  </i>
                )}
                {!task.error ? (
                  <span slot="end">
                    <i>
                      {isWideEnough && <Trans>Scheduled at: &nbsp;</Trans>}
                      {dateToStr('relative', task.scheduledAt)}
                    </i>
                  </span>
                ) : (
                  <span slot="end">
                    <i>
                      <Trans>
                        Ran at: &nbsp;
                        {dateToStr('relative', task.scheduledAt)} with errors
                      </Trans>
                    </i>
                  </span>
                )}
                <IonButtons slot="end">
                  {task.error && (
                    <IonButton
                      id={`info_${task.id}`}
                      aria-label={t`Show error details`}
                    >
                      <IonIcon icon={APPICONS.info} />
                    </IonButton>
                  )}
                </IonButtons>
                <IonAlert
                  header={t`Error Details`}
                  trigger={`info_${task.id}`}
                  message={task.error}
                  buttons={[
                    {
                      text: t`close`
                    }
                  ]}
                />
                <AreYouSureAlert
                  trigger={`del_${task.id}`}
                  onClose={(confirmed: boolean) => {
                    if (confirmed) {
                      schedule.cancel(task.id);
                    }
                  }}
                />
              </IonItem>
              <IonItemOptions>
                <IonItemOption color="danger" id={`task-actions-${task.id}`}>
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
