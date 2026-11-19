import { describe, expect, it, vi } from "vitest";
import { createSubmissionLock } from "./reportSubmissionLock";

describe("mobile createSubmissionLock", () => {
  it("ignores a second submit while the first report request is in flight", async () => {
    const lock = createSubmissionLock();
    const rpc = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          setTimeout(() => resolve("report-id"), 25);
        }),
    );

    const first = lock.run(rpc);
    const duplicate = lock.run(rpc);

    await expect(duplicate).resolves.toEqual({ status: "ignored" });
    await expect(first).resolves.toEqual({ status: "started", result: "report-id" });
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
