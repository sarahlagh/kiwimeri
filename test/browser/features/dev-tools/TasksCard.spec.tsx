import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { schedule } from '@/core/tasks/scheduler.service';
import { TaskNames } from '@/core/tasks/tasks-registry';
import TasksCard from '@/features/dev-tools/components/TasksCard';
import fetchTasksQuery, {
  TaskResult
} from '@/features/dev-tools/queries/fetchTasksQuery';
import { dateToStr } from '@/shared/misc/date-utils';
import { describe, expect, test } from 'vitest';
import { render, RenderResult } from 'vitest-browser-react';
import { TestingProvider } from '../../TestingProvider';
import {
  getAreYouSureConfirm,
  getCancelTaskButton,
  getCardTitle,
  getConfirmDeletionBtn,
  getErrorDetailsButton,
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
    .element(getErrorDetailsButton(screen, task.id))
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
  await expect
    .element(getErrorDetailsButton(screen, task.id))
    .toBeInTheDocument();
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

  test('click on info button shows error description', async () => {
    const errorId = schedule.in(-1000, TaskNames.FAST_WRITE)!;
    space.setCell(SpaceTables.Tasks, errorId, 'error', 'error description');

    const tasks = fetchTasksQuery.getResults({});
    const screen = await render(<TasksCard />, {
      wrapper: TestingProvider
    });

    const button = getErrorDetailsButton(screen, tasks[0].id);
    await expect.element(button).toBeVisible();

    await button.click();

    await expect
      .element(screen.locator.getByText(`error description`))
      .toBeVisible();
    await expect.element(screen.locator.getByText(`close`)).toBeVisible();
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
    schedule.in(3600000, TaskNames.FAST_WRITE);

    const tasks = fetchTasksQuery.getResults({});
    const screen = await render(<TasksCard />, {
      wrapper: TestingProvider
    });

    await slideOpen(screen, tasks[0].id);

    const cancelTaskBtn = getCancelTaskButton(screen, tasks[0].id);
    await expect.element(cancelTaskBtn).toBeInTheDocument();

    // click on one
    await cancelTaskBtn!.click();

    await expect.element(getAreYouSureConfirm(screen)).toBeVisible();

    const confirmBtn = getConfirmDeletionBtn(screen);
    await expect.element(confirmBtn).toBeVisible();
    await confirmBtn.click();

    await expect.element(getAreYouSureConfirm(screen)).not.toBeVisible();
    expect(space.hasRow(SpaceTables.Tasks, tasks[0].id)).toBeFalsy();
  });
});
