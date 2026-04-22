import { describe, expect, it } from "vitest";

import { SigningStringGenerator } from "../src/SigningStringGenerator.js";
import { URLCanonizer } from "../src/URLCanonizer.js";

const AUTHORIZE_URL = "https://example.dynata.com/authorize";

describe("SigningStringGenerator", () => {
  it("rejects blank method", () => {
    expect(() => SigningStringGenerator.generateSigningString("", AUTHORIZE_URL, "{}")).toThrow(
      "method must not be blank"
    );
  });

  it("rejects blank canonical URL", () => {
    expect(() => SigningStringGenerator.generateSigningString("POST", "", "{}")).toThrow(
      "canonicalUrl must not be blank"
    );
  });

  it("matches standalone golden vector for non-canonical URL input", () => {
    expect(SigningStringGenerator.generateSigningString("POST", AUTHORIZE_URL, "{}")).toBe(
      "fa017074b322870e1d8bd9a6d7d1f2f7433d292323d21673500c6ac0082d9903"
    );
  });

  it("changes with method/body", () => {
    const base = SigningStringGenerator.generateSigningString("POST", AUTHORIZE_URL, "{}");
    const withMethod = SigningStringGenerator.generateSigningString("GET", AUTHORIZE_URL, "{}");
    const withBody = SigningStringGenerator.generateSigningString("POST", AUTHORIZE_URL, "{\"x\":1}");

    expect(base).not.toBe(withMethod);
    expect(base).not.toBe(withBody);
  });

  it("matches signer pipeline digest with canonical URL", () => {
    const canonicalUrl = URLCanonizer.buildCanonicalUrl(AUTHORIZE_URL);
    const digest = SigningStringGenerator.generateSigningString("POST", canonicalUrl, "{}");
    expect(digest).toBe("d37681ab72af483fd0fc4013abb26b8e8884022f1a37d2fe97a1c67c5635b02e");
  });
});
