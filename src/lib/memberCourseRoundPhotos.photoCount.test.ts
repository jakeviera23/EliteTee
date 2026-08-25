import { beforeEach, describe, expect, it, vi } from "vitest";

const createSignedUrlMock = vi.fn();

const { nextQueryResults } = vi.hoisted(() => ({
  nextQueryResults: [] as unknown[][],
}));

function buildQueryChain(_table: string) {
  const chain = {
    select: vi.fn(() => chain),
    in: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    order: vi.fn(() => chain),
    then: undefined as unknown,
  };

  Object.defineProperty(chain, "then", {
    configurable: true,
    get() {
      const result = nextQueryResults.shift() ?? [{ data: [], error: null }];
      return (resolve: (value: unknown) => void) => resolve(result[0]);
    },
  });

  return chain;
}

vi.mock("./supabase", () => ({
  supabase: {
    from: (table: string) => buildQueryChain(table),
    storage: {
      from: () => ({
        createSignedUrl: createSignedUrlMock,
      }),
    },
  },
}));

import { fetchActivePhotoCountsForRoundIds } from "./memberCourseRoundPhotos";

describe("fetchActivePhotoCountsForRoundIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nextQueryResults.length = 0;
  });

  it("counts active photos from id metadata without signing storage urls", async () => {
    nextQueryResults.push([
      {
        data: [
          { id: "p1", member_course_round_id: "round-1" },
          { id: "p2", member_course_round_id: "round-1" },
          { id: "p3", member_course_round_id: "round-2" },
        ],
        error: null,
      },
    ]);

    const { data, error } = await fetchActivePhotoCountsForRoundIds(["round-1", "round-2"]);

    expect(error).toBeNull();
    expect(createSignedUrlMock).not.toHaveBeenCalled();
    expect(data?.get("round-1")).toBe(2);
    expect(data?.get("round-2")).toBe(1);
  });

  it("returns zero for rounds with no active photos", async () => {
    nextQueryResults.push([{ data: [], error: null }]);

    const { data, error } = await fetchActivePhotoCountsForRoundIds(["round-empty"]);

    expect(error).toBeNull();
    expect(data?.get("round-empty")).toBe(0);
  });
});
