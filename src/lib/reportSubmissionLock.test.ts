import { describe, expect, it, vi } from "vitest";
import { createSubmissionLock } from "./reportSubmissionLock";

describe("createSubmissionLock", () => {
  it("runs a single in-flight task and ignores overlapping submits", async () => {
    const lock = createSubmissionLock();
    let started = 0;
    let finished = 0;

    const slow = () =>
      new Promise<string>((resolve) => {
        started += 1;
        setTimeout(() => {
          finished += 1;
          resolve("ok");
        }, 30);
      });

    const first = lock.run(slow);
    const second = lock.run(slow);

    await expect(second).resolves.toEqual({ status: "ignored" });
    await expect(first).resolves.toEqual({ status: "started", result: "ok" });
    expect(started).toBe(1);
    expect(finished).toBe(1);
    expect(lock.isInFlight).toBe(false);
  });

  it("allows a new submit after the previous one settles", async () => {
    const lock = createSubmissionLock();
    const task = vi.fn(async () => "done");

    await expect(lock.run(task)).resolves.toEqual({ status: "started", result: "done" });
    await expect(lock.run(task)).resolves.toEqual({ status: "started", result: "done" });
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("releases the lock when the task throws so retries can proceed", async () => {
    const lock = createSubmissionLock();

    await expect(
      lock.run(async () => {
        throw new Error("rpc failed");
      }),
    ).rejects.toThrow("rpc failed");

    expect(lock.isInFlight).toBe(false);
    await expect(lock.run(async () => "recovered")).resolves.toEqual({
      status: "started",
      result: "recovered",
    });
  });
});
