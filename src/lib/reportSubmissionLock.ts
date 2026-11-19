/**
 * Single-flight guard for report (and similar) async submits.
 * Prevents duplicate RPC calls when the user double-clicks or the UI re-renders mid-request.
 */
export type SubmissionLockResult<T> =
  | { status: "started"; result: T }
  | { status: "ignored" };

export function createSubmissionLock() {
  let inFlight = false;

  return {
    get isInFlight() {
      return inFlight;
    },
    async run<T>(task: () => Promise<T>): Promise<SubmissionLockResult<T>> {
      if (inFlight) {
        return { status: "ignored" };
      }
      inFlight = true;
      try {
        const result = await task();
        return { status: "started", result };
      } finally {
        inFlight = false;
      }
    },
  };
}
