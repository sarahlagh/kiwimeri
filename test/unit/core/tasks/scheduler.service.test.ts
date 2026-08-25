import { appConfig } from '@/config';
import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { schedule } from '@/core/tasks/scheduler.service';
import { taskRegistry } from '@/core/tasks/tasks-registry';

const TEST_TASK = 'test-count';
let callbackCount = 0;
let savedInputs: any = undefined;

describe('task scheduler and registry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    callbackCount = 0;
    savedInputs = undefined;
    taskRegistry.register(TEST_TASK, inputs => {
      callbackCount++;
      savedInputs = inputs;
    });
    appConfig.SCHEDULER_INTERVAL = 50;
    schedule['initRecurringTasks'] = function () {}; // don't define log gc & history gc
    schedule.start();
  });
  afterEach(() => {
    vi.useRealTimers();
    schedule.stop();
  });

  test('should schedule an arbitrary task and quietly delete if no callback', () => {
    const taskId = schedule.in(100, 'not-registered');
    expect(taskId).toBeDefined();
    expect(space.hasRow(SpaceTables.Tasks, taskId!)).toBe(true);

    vi.advanceTimersByTime(200);
    expect(space.hasRow(SpaceTables.Tasks, taskId!)).toBe(false);
  });

  test('should schedule a registered task and execute it at its scheduled time', () => {
    const taskId = schedule.in(100, TEST_TASK);
    expect(taskId).toBeDefined();
    expect(space.hasRow(SpaceTables.Tasks, taskId!)).toBe(true);
    expect(callbackCount).toBe(0);
    vi.advanceTimersByTime(90);
    expect(callbackCount).toBe(0);

    vi.advanceTimersByTime(200);
    expect(callbackCount).toBe(1);
    expect(space.hasRow(SpaceTables.Tasks, taskId!)).toBe(false);
  });

  test('should schedule a registered task and execute it at its scheduled time with inputs', () => {
    const taskId = schedule.in(100, TEST_TASK, { docId: '#id' });
    expect(taskId).toBeDefined();
    expect(space.hasRow(SpaceTables.Tasks, taskId!)).toBe(true);
    expect(callbackCount).toBe(0);
    vi.advanceTimersByTime(90);
    expect(callbackCount).toBe(0);
    expect(savedInputs).toBeUndefined();

    vi.advanceTimersByTime(200);
    expect(callbackCount).toBe(1);
    expect(savedInputs).toEqual({ docId: '#id' });
    expect(space.hasRow(SpaceTables.Tasks, taskId!)).toBe(false);
  });

  test('should schedule multiple instances of a registered task without inputs', () => {
    const taskId1 = schedule.in(100, TEST_TASK);
    const taskId2 = schedule.in(150, TEST_TASK);
    expect(taskId1).toBeDefined();
    expect(taskId2).toBeDefined();
    expect(space.hasRow(SpaceTables.Tasks, taskId1!)).toBe(true);
    expect(space.hasRow(SpaceTables.Tasks, taskId2!)).toBe(true);
    expect(callbackCount).toBe(0);
    vi.advanceTimersByTime(90);
    expect(callbackCount).toBe(0);

    vi.advanceTimersByTime(10);
    expect(callbackCount).toBe(1);

    vi.advanceTimersByTime(100);
    expect(callbackCount).toBe(2);
    expect(space.hasRow(SpaceTables.Tasks, taskId1!)).toBe(false);
    expect(space.hasRow(SpaceTables.Tasks, taskId2!)).toBe(false);
  });

  test('should only register one instance of a registered task with inputs', () => {
    const taskId1 = schedule.in(100, TEST_TASK, { docId: '#id' });
    const taskId2 = schedule.in(150, TEST_TASK, { docId: '#id' });
    const taskId3 = schedule.in(200, TEST_TASK, { docId: '#id2' }); // different input, different task
    const taskId4 = schedule.in(200, TEST_TASK); // different input, different task
    expect(taskId1).toBeDefined();
    expect(taskId2).toBe(taskId1);
    expect(taskId3).toBeDefined();
    expect(taskId3).not.toBe(taskId1);
    expect(taskId4).toBeDefined();
    expect(taskId4).not.toBe(taskId1);
    expect(space.getRowCount(SpaceTables.Tasks)).toBe(3);
    expect(callbackCount).toBe(0);
    vi.advanceTimersByTime(90);
    expect(callbackCount).toBe(0);

    vi.advanceTimersByTime(10);
    expect(callbackCount).toBe(1);

    vi.advanceTimersByTime(100);
    expect(callbackCount).toBe(3);
    expect(space.getRowCount(SpaceTables.Tasks)).toBe(0);
  });

  test('should debounce an existing task if exists or create one', () => {
    const now = Date.now();
    const taskId1 = schedule.debounce(100, TEST_TASK, { docId: '#id' });
    vi.advanceTimersByTime(50);
    const taskId2 = schedule.debounce(100, TEST_TASK, { docId: '#id' });
    vi.advanceTimersByTime(50);
    const taskId3 = schedule.debounce(100, TEST_TASK, { docId: '#id' });
    expect(taskId1).toBeDefined();
    expect(taskId1).toBe(taskId2);
    expect(taskId1).toBe(taskId3);
    expect(space.hasRow(SpaceTables.Tasks, taskId1!)).toBe(true);
    expect(space.getCell(SpaceTables.Tasks, taskId1!, 'scheduledAt')).toBe(
      now + 200
    );
    expect(space.getRowCount(SpaceTables.Tasks)).toBe(1);
    vi.advanceTimersByTime(50);
    expect(space.getRowCount(SpaceTables.Tasks)).toBe(1);
    vi.advanceTimersByTime(50);
    expect(callbackCount).toBe(1);
    expect(space.getRowCount(SpaceTables.Tasks)).toBe(0);
  });

  // TODO test recurring
  // TODO test flushByName
  // TODO test cancel
});
