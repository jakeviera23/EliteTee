import { afterEach, describe, expect, it } from "vitest";
import {
  AUTH_CALLBACK_EXPIRED_MESSAGE,
  captureAuthCallbackFromLocation,
  capturedAuthCallbackHasWork,
  clearCapturedAuthCallback,
  getAuthCallbackErrorMessage,
  getCapturedAuthCallback,
  hasAuthCallbackWork,
  isPasswordRecoveryCallback,
  parseAuthCallbackParams,
} from "./authCallbackParams";

afterEach(() => {
  clearCapturedAuthCallback();
});

describe("parseAuthCallbackParams", () => {
  it("reads implicit grant tokens from the URL hash", () => {
    const params = parseAuthCallbackParams(
      "https://www.elitetee.club/#access_token=abc&refresh_token=def&token_type=bearer&type=signup",
    );

    expect(params.accessToken).toBe("abc");
    expect(params.refreshToken).toBe("def");
    expect(params.type).toBe("signup");
    expect(hasAuthCallbackWork(params)).toBe(true);
  });

  it("reads token_hash confirmation links from the query string", () => {
    const params = parseAuthCallbackParams(
      "https://www.elitetee.club/auth/callback?token_hash=hash123&type=email",
    );

    expect(params.tokenHash).toBe("hash123");
    expect(params.type).toBe("email");
  });

  it("reads PKCE codes from the query string", () => {
    const params = parseAuthCallbackParams("https://www.elitetee.club/auth/callback?code=pkce-code");
    expect(params.code).toBe("pkce-code");
  });

  it("classifies recovery callbacks", () => {
    const params = parseAuthCallbackParams(
      "https://www.elitetee.club/login?recovery=1#access_token=abc&type=recovery",
    );
    expect(isPasswordRecoveryCallback(params)).toBe(true);
  });

  it("maps expired confirmation errors to a recoverable login message", () => {
    const params = parseAuthCallbackParams(
      "https://www.elitetee.club/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
    );

    expect(getAuthCallbackErrorMessage(params)).toBe(AUTH_CALLBACK_EXPIRED_MESSAGE);
  });
});

describe("captured auth callback consume", () => {
  it("clears sticky recovery capture so hasWork becomes false", () => {
    captureAuthCallbackFromLocation(
      "https://www.elitetee.club/auth/callback#access_token=abc&type=recovery",
    );

    expect(capturedAuthCallbackHasWork()).toBe(true);
    expect(getCapturedAuthCallback()?.type).toBe("recovery");

    clearCapturedAuthCallback();

    expect(capturedAuthCallbackHasWork()).toBe(false);
    expect(getCapturedAuthCallback()).toBeNull();
  });
});
