import { describe, expect, it, vi } from "vitest";

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));

vi.mock("./supabase", () => ({
  supabase: { rpc: rpcMock },
}));

// Import after mocking supabase.
import { fetchGolfCourseBySlug } from "./golfCourses";

describe("fetchGolfCourseBySlug", () => {
  it("returns null data when RPC returns no row", async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });

    const result = await fetchGolfCourseBySlug("does-not-exist");
    expect(result).toEqual({ data: null, error: null });
  });

  it("returns error when RPC fails", async () => {
    const error = new Error("RPC failed");
    rpcMock.mockResolvedValueOnce({ data: null, error });

    const result = await fetchGolfCourseBySlug("pine-valley-golf-club");
    expect(result.data).toBeNull();
    expect(result.error).toBe(error);
  });
});

