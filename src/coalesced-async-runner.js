export function createCoalescedAsyncRunner(task) {
  let activePromise = null;
  let replayRequested = false;
  let disposed = false;

  async function drain() {
    do {
      replayRequested = false;
      await task();
    } while (replayRequested && !disposed);
  }

  return {
    request() {
      if (disposed) return Promise.resolve();
      if (activePromise) {
        replayRequested = true;
        return activePromise;
      }
      activePromise = drain().finally(() => {
        activePromise = null;
      });
      return activePromise;
    },
    dispose() {
      disposed = true;
      replayRequested = false;
    },
  };
}
