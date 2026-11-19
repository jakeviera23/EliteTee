import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ELITETEE_PRIVACY_PATH,
  ELITETEE_TERMS_PATH,
  ELITETEE_TERMS_VERSION,
  TERMS_ACCEPTANCE_REQUIRED_MESSAGE,
} from "./termsOfUse";

describe("termsOfUse", () => {
  it("exports a non-empty versioned terms identifier", () => {
    expect(ELITETEE_TERMS_VERSION.length).toBeGreaterThan(0);
    expect(ELITETEE_TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("points legal links at site paths", () => {
    expect(ELITETEE_TERMS_PATH).toBe("/terms");
    expect(ELITETEE_PRIVACY_PATH).toBe("/privacy");
  });

  it("provides member-facing acceptance copy", () => {
    expect(TERMS_ACCEPTANCE_REQUIRED_MESSAGE.toLowerCase()).toContain("terms of use");
    expect(TERMS_ACCEPTANCE_REQUIRED_MESSAGE.toLowerCase()).toContain("privacy");
  });

  it("stays in sync with the iOS terms version constant", () => {
    const mobileSource = readFileSync(
      resolve(process.cwd(), "mobile/lib/termsOfUse.ts"),
      "utf8",
    );
    expect(mobileSource).toContain(`ELITETEE_TERMS_VERSION = "${ELITETEE_TERMS_VERSION}"`);
  });
});
