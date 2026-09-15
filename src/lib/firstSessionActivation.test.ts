import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { MemberProfileRecord } from "../types/memberProfileRecord";
import {
  FIRST_SESSION_ACTIONS,
  FIRST_SESSION_DISMISS_KEY,
  dismissFirstSessionGettingStarted,
  isFirstSessionGettingStartedDismissed,
  isProfileClearlyIncomplete,
} from "./firstSessionActivation";

function installMemoryLocalStorage() {
  const map = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      get length() {
        return map.size;
      },
      clear() {
        map.clear();
      },
      getItem(key: string) {
        return map.has(key) ? map.get(key)! : null;
      },
      key(index: number) {
        return Array.from(map.keys())[index] ?? null;
      },
      removeItem(key: string) {
        map.delete(key);
      },
      setItem(key: string, value: string) {
        map.set(key, String(value));
      },
    } satisfies Storage,
    configurable: true,
    writable: true,
  });
}

function makeProfile(overrides: Partial<MemberProfileRecord> = {}): MemberProfileRecord {
  return {
    id: "p1",
    user_id: "u1",
    email: "member@example.com",
    full_name: "Member",
    based_in: "Austin, TX",
    primary_club: "Austin CC",
    additional_clubs: [],
    regions: [],
    industry: "",
    profession: "",
    golf_interests: [],
    business_interests: [],
    handicap: "",
    traveling_to: "",
    current_request: "Looking to meet serious golfers.",
    is_verified: false,
    membership_status: "active",
    portal_access_enabled: true,
    founding_member_number: null,
    cover_photo_url: null,
    club_logo_url: null,
    bucket_list_course_ids: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  installMemoryLocalStorage();
});

afterEach(() => {
  localStorage.removeItem(FIRST_SESSION_DISMISS_KEY);
});

describe("firstSessionActivation", () => {
  it("exposes five non-gamified getting-started actions", () => {
    expect(FIRST_SESSION_ACTIONS.map((action) => action.id)).toEqual([
      "complete-profile",
      "discover",
      "request-introduction",
      "share-experience",
      "invite-golfer",
    ]);
  });

  it("persists dismiss in localStorage", () => {
    expect(isFirstSessionGettingStartedDismissed()).toBe(false);
    dismissFirstSessionGettingStarted();
    expect(isFirstSessionGettingStartedDismissed()).toBe(true);
    expect(localStorage.getItem(FIRST_SESSION_DISMISS_KEY)).toBe("1");
  });

  it("treats missing location, club, or about as clearly incomplete", () => {
    expect(isProfileClearlyIncomplete(null)).toBe(true);
    expect(isProfileClearlyIncomplete(makeProfile({ based_in: "" }))).toBe(true);
    expect(isProfileClearlyIncomplete(makeProfile({ primary_club: "Not specified" }))).toBe(true);
    expect(isProfileClearlyIncomplete(makeProfile({ current_request: "" }))).toBe(true);
    expect(isProfileClearlyIncomplete(makeProfile())).toBe(false);
  });
});
