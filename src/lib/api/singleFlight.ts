export interface SingleFlightCoordinator<T> {
  run(task: () => Promise<T>): Promise<T>;
}

/** Share one in-flight operation and reset after either success or failure. */
export function createSingleFlightCoordinator<T>(): SingleFlightCoordinator<T> {
  let active: Promise<T> | null = null;

  return {
    run(task) {
      if (active) return active;

      const next = Promise.resolve().then(task);
      const shared = next.finally(() => {
        if (active === shared) active = null;
      });
      active = shared;
      return shared;
    },
  };
}
