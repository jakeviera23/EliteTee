import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({
  supabase: null,
}));

import {
  INTRODUCTION_ALREADY_INTRODUCED_ERROR,
  INTRODUCTION_ALREADY_PENDING_ERROR,
  INTRODUCTION_AWAITING_YOUR_RESPONSE_ERROR,
  cancelIntroductionRequest,
  fetchIntroductionRequests,
  isMemberFacingIntroductionError,
  resolveIntroductionRequestConflict,
} from "./introductionRequests";

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

describe("resolveIntroductionRequestConflict", () => {
  const row = (id: string, sender_id: string, receiver_id: string, status: string) => ({
    id,
    sender_id,
    receiver_id,
    status,
  });

  it("allows a first request and a new request after a decline", () => {
    expect(resolveIntroductionRequestConflict("me", "them", [])).toBeNull();
    expect(
      resolveIntroductionRequestConflict("me", "them", [row("1", "me", "them", "declined")]),
    ).toBeNull();
  });

  it("blocks duplicates while a request is pending", () => {
    expect(
      resolveIntroductionRequestConflict("me", "them", [row("1", "me", "them", "pending")]),
    ).toBe(INTRODUCTION_ALREADY_PENDING_ERROR);
  });

  it("points the sender to the reciprocal request awaiting their response", () => {
    expect(
      resolveIntroductionRequestConflict("me", "them", [row("1", "them", "me", "pending")]),
    ).toBe(INTRODUCTION_AWAITING_YOUR_RESPONSE_ERROR);
  });

  it("blocks requests once the pair is already introduced", () => {
    expect(
      resolveIntroductionRequestConflict("me", "them", [row("1", "them", "me", "accepted")]),
    ).toBe(INTRODUCTION_ALREADY_INTRODUCED_ERROR);
  });

  it("ignores rows that do not belong to the pair", () => {
    expect(
      resolveIntroductionRequestConflict("me", "them", [row("1", "x", "y", "pending")]),
    ).toBeNull();
  });
});

describe("isMemberFacingIntroductionError", () => {
  it("passes through module-authored copy and hides raw database errors", () => {
    expect(isMemberFacingIntroductionError(INTRODUCTION_ALREADY_PENDING_ERROR)).toBe(true);
    expect(isMemberFacingIntroductionError(INTRODUCTION_AWAITING_YOUR_RESPONSE_ERROR)).toBe(true);
    expect(
      isMemberFacingIntroductionError('new row violates row-level security policy for table "x"'),
    ).toBe(false);
  });
});
