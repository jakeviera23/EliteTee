import { beforeEach, describe, expect, it, vi } from "vitest";

const createSignedUrlMock = vi.fn();

type QueryState = {
  table: string;
  filters: Record<string, unknown>;
};

const { queryStates, nextQueryResults } = vi.hoisted(() => {
  const queryStates: QueryState[] = [];
  const nextQueryResults: unknown[][] = [];

  return { queryStates, nextQueryResults };
});

function buildQueryChain(table: string) {
  const state: QueryState = { table, filters: {} };
  queryStates.push(state);

  const chain = {
    select: vi.fn(() => chain),
    in: vi.fn((column: string, values: unknown) => {
      state.filters[`in:${column}`] = values;
      return chain;
    }),
    eq: vi.fn((column: string, value: unknown) => {
      state.filters[`eq:${column}`] = value;
      return chain;
    }),
    is: vi.fn((column: string, value: unknown) => {
      state.filters[`is:${column}`] = value;
      return chain;
    }),
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

import { fetchListCoverPhotosForRoundIds } from "./memberCourseRoundPhotos";

function photoRow(overrides: Record<string, unknown>) {
  return {
    id: "photo-a",
    member_course_round_id: "round-1",
    user_id: "user-1",
    golf_course_id: null,
    storage_path: "user/round/a.jpg",
    caption: null,
    sort_order: 0,
    width: null,
    height: null,
    file_size_bytes: null,
    mime_type: "image/jpeg",
    is_featured: false,
    moderation_status: "active",
    hidden_at: null,
    hidden_reason: null,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("fetchListCoverPhotosForRoundIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryStates.length = 0;
    nextQueryResults.length = 0;
    createSignedUrlMock.mockImplementation(async (path: string) => ({
      data: { signedUrl: `https://signed.example/${path}` },
      error: null,
    }));
  });

  it("signs at most one photo per round and prefers explicit cover ids", async () => {
    nextQueryResults.push(
      [{ data: [{ id: "round-1", cover_photo_id: "photo-b" }], error: null }],
      [
        {
          data: [
            photoRow({
              id: "photo-b",
              storage_path: "user/round/b.jpg",
              sort_order: 1,
            }),
          ],
          error: null,
        },
      ],
    );

    const { data, error } = await fetchListCoverPhotosForRoundIds(["round-1"]);

    expect(error).toBeNull();
    expect(createSignedUrlMock).toHaveBeenCalledTimes(1);
    expect(createSignedUrlMock).toHaveBeenCalledWith("user/round/b.jpg", 3600);
    expect(data?.get("round-1")).toHaveLength(1);
    expect(data?.get("round-1")?.[0]?.id).toBe("photo-b");
  });

  it("falls back to the first sorted active photo when no cover exists", async () => {
    nextQueryResults.push(
      [{ data: [{ id: "round-2", cover_photo_id: null }], error: null }],
      [
        {
          data: [
            photoRow({
              id: "photo-first",
              member_course_round_id: "round-2",
              storage_path: "user/round/first.jpg",
              sort_order: 0,
            }),
            photoRow({
              id: "photo-second",
              member_course_round_id: "round-2",
              storage_path: "user/round/second.jpg",
              sort_order: 1,
            }),
          ],
          error: null,
        },
      ],
    );

    const { data, error } = await fetchListCoverPhotosForRoundIds(["round-2"]);

    expect(error).toBeNull();
    expect(createSignedUrlMock).toHaveBeenCalledTimes(1);
    expect(createSignedUrlMock).toHaveBeenCalledWith("user/round/first.jpg", 3600);
    expect(data?.get("round-2")?.[0]?.id).toBe("photo-first");
  });

  it("returns empty arrays for rounds without photos", async () => {
    nextQueryResults.push(
      [{ data: [{ id: "round-empty", cover_photo_id: null }], error: null }],
      [{ data: [], error: null }],
    );

    const { data, error } = await fetchListCoverPhotosForRoundIds(["round-empty"]);

    expect(error).toBeNull();
    expect(createSignedUrlMock).not.toHaveBeenCalled();
    expect(data?.get("round-empty")).toEqual([]);
  });
});
