import { describe, expect, it } from "vitest";
import type { FeedPost } from "../data/portalSocial";
import type { MemberProfileRecord } from "../types/memberProfileRecord";
import {
  buildMemberHomeActivityDigest,
  buildMemberHomeCourseSignals,
  getFoundingMemberEditorialPrompt,
  readMemberHomeExposure,
  recordMemberHomeExposure,
  readMemberHomeLastVisit,
  selectMemberHomeOpportunity,
  selectMemberHomeRecommendation,
  selectMemberHomePulse,
  writeMemberHomeLastVisit,
} from "./memberHome";

function post(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: "post-1",
    postType: "course-review",
    author: {
      id: "member-1",
      name: "Member One",
      handle: "memberone",
      location: "Florida",
      homeCourse: "Seminole",
      bio: "",
      isVerified: true,
      followers: 0,
      following: 0,
      coursesPlayed: 0,
      roundsPosted: 0,
      countriesPlayed: 0,
      favoriteCourses: [],
    },
    authorUserId: "member-1",
    courseName: "Seminole Golf Club",
    courseLocation: "Florida",
    images: ["photo.jpg"],
    imageAlt: "",
    caption: "A memorable morning.",
    likes: 0,
    comments: 0,
    timestamp: "1h ago",
    createdAt: "2026-08-06T14:00:00.000Z",
    ...overrides,
  };
}

function member(overrides: Partial<MemberProfileRecord> = {}): MemberProfileRecord {
  return {
    id: "profile-1",
    user_id: "member-1",
    email: "",
    full_name: "Member One",
    primary_club: "Seminole",
    additional_clubs: [],
    based_in: "Florida",
    regions: ["Florida"],
    industry: "",
    golf_interests: ["Golf travel"],
    business_interests: [],
    current_request: "",
    traveling_to: "",
    handicap: "",
    bucket_list_course_ids: [],
    club_logo_url: null,
    cover_photo_url: null,
    membership_status: "approved",
    is_verified: true,
    founding_member_number: null,
    portal_access_enabled: true,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("member home", () => {
  it("summarizes only activity after the previous visit", () => {
    const digest = buildMemberHomeActivityDigest(
      [post(), post({ id: "older", createdAt: "2026-08-05T10:00:00.000Z" })],
      "2026-08-06T12:00:00.000Z",
    );
    expect(digest.postCount).toBe(1);
    expect(digest.courseCount).toBe(1);
    expect(digest.headline).toContain("since your last visit");
  });

  it("persists visits per member and ignores invalid dates", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    writeMemberHomeLastVisit("viewer", "2026-08-06T12:00:00.000Z", storage);
    expect(readMemberHomeLastVisit("viewer", storage)).toBe(
      "2026-08-06T12:00:00.000Z",
    );
    writeMemberHomeLastVisit("viewer", "not-a-date", storage);
    expect(readMemberHomeLastVisit("viewer", storage)).toBe(
      "2026-08-06T12:00:00.000Z",
    );
  });

  it("recommends a member only when a real match reason exists", () => {
    const viewer = member({ id: "viewer-profile", user_id: "viewer", full_name: "Viewer" });
    const recommendation = selectMemberHomeRecommendation(
      [viewer, member({ user_id: "other", full_name: "Other Member" })],
      viewer,
    );
    expect(recommendation?.member.full_name).toBe("Other Member");
    expect(recommendation?.reason).toBeTruthy();
  });

  it("surfaces genuine opportunities and course activity", () => {
    const opportunity = post({
      id: "travel",
      postType: "golf-travel",
      requestLabel: "Traveling",
      courseName: "Scotland",
    });
    expect(selectMemberHomeOpportunity([opportunity], "viewer")?.id).toBe("travel");
    expect(buildMemberHomeCourseSignals([post(), post({ id: "post-2" })])[0]).toMatchObject({
      name: "Seminole Golf Club",
      mentions: 2,
    });
  });

  it("prioritizes high-intent contributions and rotates previously exposed posts", () => {
    const course = post({ id: "course" });
    const game = post({ id: "game", requestLabel: "Looking for Game", courseName: "Palm Beach" });
    expect(selectMemberHomePulse([course, game], "viewer")?.post.id).toBe("game");
    expect(selectMemberHomePulse([course, game], "viewer", ["game"])?.post.id).toBe("course");
  });

  it("rotates equally relevant member recommendations", () => {
    const viewer = member({ user_id: "viewer", full_name: "Viewer" });
    const first = member({ user_id: "first", full_name: "First" });
    const second = member({ user_id: "second", full_name: "Second" });
    expect(selectMemberHomeRecommendation([viewer, first, second], viewer)?.member.user_id).toBe("first");
    expect(selectMemberHomeRecommendation([viewer, first, second], viewer, ["first"])?.member.user_id).toBe("second");
  });

  it("stores bounded exposure history and rotates editorial prompts by week", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
    recordMemberHomeExposure("viewer", { postId: "post-1", memberId: "member-1" }, storage);
    expect(readMemberHomeExposure("viewer", storage)).toEqual({ postIds: ["post-1"], memberIds: ["member-1"] });
    expect(getFoundingMemberEditorialPrompt(new Date("2026-08-03"))).not.toBe(
      getFoundingMemberEditorialPrompt(new Date("2026-08-10")),
    );
  });
});
