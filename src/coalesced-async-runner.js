export function createCoalescedAsyncRunner(task) {
  let activePromise = null;
  let replayRequested = false;
  let disposed = false;

  async function drain() {
    let firstError = null;
    let lastResult;
    do {
      replayRequested = false;
      try {
        lastResult = await task();
      } catch (error) {
        firstError ||= error;
      }
    } while (replayRequested && !disposed);
    if (firstError) throw firstError;
    return lastResult;
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
