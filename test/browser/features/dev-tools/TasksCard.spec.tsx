import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { schedule } from '@/core/tasks/scheduler.service';
import { TaskNames, taskRegistry } from '@/core/tasks/tasks-registry';
import TasksCard from '@/features/dev-tools/components/TasksCard';
import fetchTasksQuery, {
  TaskResult
} from '@/features/dev-tools/queries/fetchTasksQuery';
import { dateToStr } from '@/shared/misc/date-utils';
import { describe, expect, test } from 'vitest';
import { render, RenderResult } from 'vitest-browser-react';
import { TestingProvider } from '../../TestingProvider';
import {
  getCancelTaskButton,
  getCardTitle,
  getConfirmAlertBtn,
  getErrorDetailsButton as getDetailsButton,
  getFlushTaskButton,
  getListItem,
  slideOpen
} from './TasksCard.locators';

async function expectChangeInList(screen: RenderResult, tasks: TaskResult[]) {
  await expect.element(getCardTitle(screen)).toBeInTheDocument();
  for (const task of tasks)
    await expect.element(getListItem(screen, task.id)).toBeInTheDocument();
}

async function expectItemIsOK(screen: RenderResult, task: TaskResult) {
  await expect
    .element(
      getListItem(screen, task.id).getByText(
        dateToStr('time', task.scheduledAt)
      )
    )
    .toBeInTheDocument();
  await expect
    .element(getListItem(screen, task.id).getByText('with errors'))
    .not.toBeInTheDocument();
  await expect
    .element(getDetailsButton(screen, task.id))
    .not.toBeInTheDocument();
}

async function expectItemHasErrors(screen: RenderResult, task: TaskResult) {
  await expect
    .element(getListItem(screen, task.id).getByText('Ran at'))
    .toBeInTheDocument();
  await expect
    .element(
      getListItem(screen, task.id).getByText(
        dateToStr('time', task.scheduledAt)
      )
    )
    .toBeInTheDocument();
  await expect
    .element(getListItem(screen, task.id).getByText('with errors'))
    .toBeInTheDocument();
  await expect.element(getDetailsButton(screen, task.id)).toBeInTheDocument();
}

describe('TasksCard', () => {
  test('renders an empty card', async () => {
    const screen = await render(<TasksCard />, {
      wrapper: TestingProvider
    });
    await expect.element(getCardTitle(screen)).toBeInTheDocument();
    await expect
      .element(screen.locator.getByText(`No pending tasks`))
      .toBeInTheDocument();
  });

  test('renders a card with scheduled tasks in the future', async () => {
    schedule.in(3600000, TaskNames.FAST_WRITE);
    schedule.in(1800000, TaskNames.FAST_WRITE);
    schedule.in(900000, TaskNames.FAST_WRITE);
    const tasks = fetchTasksQuery.getResults({});

    const screen = await render(<TasksCard />, {
      wrapper: TestingProvider
    });
    await expect.element(getCardTitle(screen)).toBeInTheDocument();
    await expectChangeInList(screen, tasks);

    for (let i = 0; i < 3; i++) await expectItemIsOK(screen, tasks[i]);
  });

  test('renders a card with scheduled tasks in errors', async () => {
    schedule.in(3600000, TaskNames.FAST_WRITE);
    const errorId = schedule.in(-1000, TaskNames.FAST_WRITE)!;
    space.setCell(SpaceTables.Tasks, errorId, 'error', 'error description');

    const tasks = fetchTasksQuery.getResults({});

    const screen = await render(<TasksCard />, {
      wrapper: TestingProvider
    });
    await expect.element(getCardTitle(screen)).toBeInTheDocument();
    await expectChangeInList(screen, tasks);

    await expectItemHasErrors(screen, tasks[0]);
    await expectItemIsOK(screen, tasks[1]);
  });

  test('click on info button shows inputs', async () => {
    schedule.in(-1000, TaskNames.FAST_WRITE, { docId: '#id' })!;

    const tasks = fetchTasksQuery.getResults({});
    const screen = await render(<TasksCard />, {
      wrapper: TestingProvider
    });

    const button = getDetailsButton(screen, tasks[0].id);
    await expect.element(button).toBeVisible();

    await button.click();

    await expect.element(screen.locator.getByText(`#id`)).toBeVisible();
    await expect.element(screen.locator.getByText(`close`)).toBeVisible();
  });

  test('click on info button shows error description', async () => {
    const errorId = schedule.in(-1000, TaskNames.FAST_WRITE)!;
    space.setCell(SpaceTables.Tasks, errorId, 'error', 'error description');

    const tasks = fetchTasksQuery.getResults({});
    const screen = await render(<TasksCard />, {
      wrapper: TestingProvider
    });

    const button = getDetailsButton(screen, tasks[0].id);
    await expect.element(button).toBeVisible();

    await button.click();

    await expect
      .element(screen.locator.getByText(`error description`))
      .toBeVisible();
    await expect.element(screen.locator.getByText(`close`)).toBeVisible();
  });

  test('rows without error have the flush task button in sliding element', async () => {
    schedule.in(3600000, TaskNames.FAST_WRITE);
    const errorId = schedule.in(-1000, TaskNames.FAST_WRITE)!;
    space.setCell(SpaceTables.Tasks, errorId, 'error', 'error description');

    const tasks = fetchTasksQuery.getResults({});
    const screen = await render(<TasksCard />, {
      wrapper: TestingProvider
    });

    // button is not visible for errors
    expect(tasks[0].error).toBeDefined();
    await slideOpen(screen, tasks[0].id);
    const flushTaskBtn0 = getFlushTaskButton(screen, tasks[0].id);
    await expect.element(flushTaskBtn0).not.toBeInTheDocument();
    // but it is for the others
    await slideOpen(screen, tasks[1].id);
    const flushTaskBtn = getFlushTaskButton(screen, tasks[1].id);
    await expect.element(flushTaskBtn).toBeVisible();
  });

  test('all rows have cancel task button in sliding element', async () => {
    schedule.in(3600000, TaskNames.FAST_WRITE);
    const errorId = schedule.in(-1000, TaskNames.FAST_WRITE)!;
    space.setCell(SpaceTables.Tasks, errorId, 'error', 'error description');

    const tasks = fetchTasksQuery.getResults({});
    const screen = await render(<TasksCard />, {
      wrapper: TestingProvider
    });

    // button is visible for all
    for (let i = 0; i < tasks.length; i++) {
      await slideOpen(screen, tasks[i].id);

      const cancelTaskBtn = getCancelTaskButton(screen, tasks[i].id);
      await expect.element(cancelTaskBtn).toBeVisible();
    }
  });

  test('click on delete button cancels task', async () => {
    let executed = false;
    taskRegistry.register('test', () => {
      executed = true;
    });
    schedule.in(3600000, 'test');

    const tasks = fetchTasksQuery.getResults({});
    const screen = await render(<TasksCard />, {
      wrapper: TestingProvider
    });

    await slideOpen(screen, tasks[0].id);

    const cancelTaskBtn = getCancelTaskButton(screen, tasks[0].id);
    await expect.element(cancelTaskBtn).toBeInTheDocument();

    // click on one
    await cancelTaskBtn!.click();

    const confirmBtn = getConfirmAlertBtn(screen);
    await expect.element(confirmBtn).toBeVisible();
    await confirmBtn.click();

    await expect.element(confirmBtn).not.toBeInTheDocument();
    expect(space.hasRow(SpaceTables.Tasks, tasks[0].id)).toBeFalsy();
    expect(executed).toBe(false);
  });

  test('click on flush button executes task', async () => {
    let executed = false;
    taskRegistry.register('test', () => {
      executed = true;
    });
    schedule.in(3600000, 'test');

    const tasks = fetchTasksQuery.getResults({});
    const screen = await render(<TasksCard />, {
      wrapper: TestingProvider
    });

    await slideOpen(screen, tasks[0].id);

    const flushTaskBtn = getFlushTaskButton(screen, tasks[0].id);
    await expect.element(flushTaskBtn).toBeInTheDocument();

    // click on one
    await flushTaskBtn!.click();

    const confirmBtn = getConfirmAlertBtn(screen);
    await expect.element(confirmBtn).toBeVisible();
    await confirmBtn.click();

    await expect.element(confirmBtn).not.toBeInTheDocument();
    expect(space.hasRow(SpaceTables.Tasks, tasks[0].id)).toBeFalsy();
    expect(executed).toBe(true);
  });
});
