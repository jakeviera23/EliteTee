import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({
  supabase: null,
}));

import { cancelIntroductionRequest, fetchIntroductionRequests } from "./introductionRequests";

describe("introductionRequests without Supabase", () => {
  it("returns a configuration error when loading requests", async () => {
    const result = await fetchIntroductionRequests();

    expect(result.data).toBeNull();
    expect(result.error?.message).toMatch(/not configured/i);
  });

  it("returns a configuration error when canceling a request", async () => {
    const result = await cancelIntroductionRequest("request-1");

    expect(result.data).toBeNull();
    expect(result.error?.message).toMatch(/not configured/i);
  });
});
