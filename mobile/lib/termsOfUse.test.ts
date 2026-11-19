import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ELITETEE_MIN_MEMBER_AGE,
  ELITETEE_TERMS_VERSION,
} from "./termsOfUse";

describe("mobile termsOfUse", () => {
  it("matches the web terms version and minimum age", () => {
    const webSource = readFileSync(
      resolve(process.cwd(), "src/lib/termsOfUse.ts"),
      "utf8",
    );
    expect(webSource).toContain(`ELITETEE_TERMS_VERSION = "${ELITETEE_TERMS_VERSION}"`);
    expect(webSource).toContain(`ELITETEE_MIN_MEMBER_AGE = ${ELITETEE_MIN_MEMBER_AGE}`);
    expect(ELITETEE_MIN_MEMBER_AGE).toBe(18);
  });
});
