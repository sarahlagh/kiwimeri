import { appConfig } from '@/config';
import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { schedule } from '@/core/tasks/scheduler.service';
import { taskRegistry } from '@/core/tasks/tasks-registry';

const T = SpaceTables.Tasks;
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
    expect(space.hasRow(T, taskId!)).toBe(true);

    vi.advanceTimersByTime(200);
    expect(space.hasRow(T, taskId!)).toBe(false);
  });

  test('should schedule a registered task and execute it at its scheduled time', () => {
    const taskId = schedule.in(100, TEST_TASK);
    expect(taskId).toBeDefined();
    expect(space.hasRow(T, taskId!)).toBe(true);
    expect(callbackCount).toBe(0);
    vi.advanceTimersByTime(90);
    expect(callbackCount).toBe(0);

    vi.advanceTimersByTime(200);
    expect(callbackCount).toBe(1);
    expect(space.hasRow(T, taskId!)).toBe(false);
  });

  test('should schedule a registered task and execute it at its scheduled time with inputs', () => {
    const taskId = schedule.in(100, TEST_TASK, { docId: '#id' });
    expect(taskId).toBeDefined();
    expect(space.hasRow(T, taskId!)).toBe(true);
    expect(callbackCount).toBe(0);
    vi.advanceTimersByTime(90);
    expect(callbackCount).toBe(0);
    expect(savedInputs).toBeUndefined();

    vi.advanceTimersByTime(200);
    expect(callbackCount).toBe(1);
    expect(savedInputs).toEqual({ docId: '#id' });
    expect(space.hasRow(T, taskId!)).toBe(false);
  });

  test('should schedule multiple instances of a registered task without inputs', () => {
    const taskId1 = schedule.in(100, TEST_TASK);
    const taskId2 = schedule.in(150, TEST_TASK);
    expect(taskId1).toBeDefined();
    expect(taskId2).toBeDefined();
    expect(space.hasRow(T, taskId1!)).toBe(true);
    expect(space.hasRow(T, taskId2!)).toBe(true);
    expect(callbackCount).toBe(0);
    vi.advanceTimersByTime(90);
    expect(callbackCount).toBe(0);

    vi.advanceTimersByTime(10);
    expect(callbackCount).toBe(1);

    vi.advanceTimersByTime(100);
    expect(callbackCount).toBe(2);
    expect(space.hasRow(T, taskId1!)).toBe(false);
    expect(space.hasRow(T, taskId2!)).toBe(false);
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
    expect(space.getRowCount(T)).toBe(3);
    expect(callbackCount).toBe(0);
    vi.advanceTimersByTime(90);
    expect(callbackCount).toBe(0);

    vi.advanceTimersByTime(10);
    expect(callbackCount).toBe(1);

    vi.advanceTimersByTime(100);
    expect(callbackCount).toBe(3);
    expect(space.getRowCount(T)).toBe(0);
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
    expect(space.hasRow(T, taskId1!)).toBe(true);
    expect(space.getCell(T, taskId1!, 'scheduledAt')).toBe(now + 200);
    expect(space.getRowCount(T)).toBe(1);
    vi.advanceTimersByTime(50);
    expect(space.getRowCount(T)).toBe(1);
    vi.advanceTimersByTime(50);
    expect(callbackCount).toBe(1);
    expect(space.getRowCount(T)).toBe(0);
  });

  test('should cancel an existing task', () => {
    const taskId1 = schedule.debounce(100, TEST_TASK, { docId: '#id' });

    expect(space.getRowCount(T)).toBe(1);
    schedule.cancel(taskId1!);

    expect(space.getRowCount(T)).toBe(0);
    expect(callbackCount).toBe(0);
  });

  test('should flush an existing task', () => {
    const taskId1 = schedule.debounce(100, TEST_TASK, { docId: '#id' });

    expect(space.getRowCount(T)).toBe(1);
    schedule.flushTask(taskId1!);

    expect(space.getRowCount(T)).toBe(0);
    expect(callbackCount).toBe(1);
    expect(savedInputs).toEqual({ docId: '#id' });
  });

  test('calling startRecurring on unregistered task should error', () => {
    expect(() => schedule['startRecurring']('unregistered', 100)).toThrow();
  });

  test('calling startRecurring should only create a new task the first time', () => {
    expect(space.getRowCount(T)).toBe(0);

    schedule['startRecurring'](TEST_TASK, 100);
    expect(space.getRowCount(T)).toBe(1);

    schedule['startRecurring'](TEST_TASK, 100);
    expect(space.getRowCount(T)).toBe(1);
  });

  test('a recurring task should automatically schedule its next occurence after flush', () => {
    const now = Date.now();
    schedule['startRecurring'](TEST_TASK, 100);
    const task1 = schedule['getTasks'](true)[0];
    expect(task1).toBeDefined();

    vi.advanceTimersByTime(150);
    expect(callbackCount).toBe(1);
    const task2 = schedule['getTasks'](true)[0];
    expect(task2).toBeDefined();
    expect(task2.id).not.toBe(task1.id);
    expect(task2.scheduledAt).toBe(now + 200); // interval still ran at now + 100
  });

  test('flushing a recurring task manually should still schedule its next occurence', () => {
    const now = Date.now();
    schedule['startRecurring'](TEST_TASK, 100);
    const task1 = schedule['getTasks'](true)[0];
    expect(task1).toBeDefined();

    schedule.flushTask(task1.id);

    expect(callbackCount).toBe(1);
    const task2 = schedule['getTasks'](true)[0];
    expect(task2).toBeDefined();
    expect(task2.id).not.toBe(task1.id);
    expect(task2.scheduledAt).toBe(now + 100);
  });

  test('cancelling a recurring task instance should still schedule its next occurence', () => {
    const now = Date.now();
    schedule['startRecurring'](TEST_TASK, 100);
    const task1 = schedule['getTasks'](true)[0];
    expect(task1).toBeDefined();

    schedule.cancel(task1.id);

    expect(callbackCount).toBe(0);
    const task2 = schedule['getTasks'](true)[0];
    expect(task2).toBeDefined();
    expect(task2.id).not.toBe(task1.id);
    expect(task2.scheduledAt).toBe(now + 100);
  });

  test('calling flushByName should flush all tasks of the same type', () => {
    schedule.in(100, TEST_TASK, { docId: '#id' });
    schedule.in(150, TEST_TASK, { docId: '#id' });
    schedule.in(200, TEST_TASK, { docId: '#id2' }); // different input, different task
    schedule.in(200, TEST_TASK); // different input, different task

    schedule.flushByName(TEST_TASK);
    expect(callbackCount).toBe(3);
    expect(space.getRowCount(T)).toBe(0);
  });

  test('an error in callback should be caught', () => {
    taskRegistry.register('test-error', () => {
      throw new Error('uh oh');
    });

    schedule.in(100, 'test-error');
    vi.advanceTimersByTime(200);
    const taskId = space.getRowIds(T)[0];
    expect(taskId).toBeDefined();
    expect(space.getCell(T, taskId, 'error')).toContain('"message":"uh oh"');

    // errors don't get returned
    expect(schedule['getTasks'](true)).toHaveLength(0);
    expect(schedule['getTasks'](false)).toHaveLength(0);
  });
});
