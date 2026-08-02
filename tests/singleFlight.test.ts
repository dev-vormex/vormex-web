import assert from 'node:assert/strict';
import test from 'node:test';
import { createSingleFlightCoordinator } from '../src/lib/api/singleFlight';

test('concurrent session refresh callers share one operation', async () => {
  const coordinator = createSingleFlightCoordinator<number>();
  let calls = 0;
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const task = async () => {
    calls += 1;
    await gate;
    return 42;
  };

  const requests = [coordinator.run(task), coordinator.run(task), coordinator.run(task)];
  assert.equal(calls, 0, 'the task starts in a microtask');
  await Promise.resolve();
  assert.equal(calls, 1);
  release?.();
  assert.deepEqual(await Promise.all(requests), [42, 42, 42]);
});

test('session refresh coordinator resets after success and failure', async () => {
  const coordinator = createSingleFlightCoordinator<number>();
  assert.equal(await coordinator.run(async () => 1), 1);
  await assert.rejects(coordinator.run(async () => {
    throw new Error('refresh failed');
  }), /refresh failed/);
  assert.equal(await coordinator.run(async () => 2), 2);
});
