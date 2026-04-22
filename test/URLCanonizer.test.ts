import { describe, expect, it } from "vitest";

import { URLCanonizer } from "../src/URLCanonizer.js";

describe("URLCanonizer", () => {
  it("rejects blank URL", () => {
    expect(() => URLCanonizer.buildCanonicalUrl("   ")).toThrow("url must not be blank");
  });

  it("preserves relative URL", () => {
    expect(URLCanonizer.buildCanonicalUrl("/path/only")).toBe("/path/only?");
  });

  it("sorts query and keeps last duplicate value", () => {
    expect(URLCanonizer.buildCanonicalUrl("https://example.com?b=2&b=1&a=9")).toBe(
      "https://example.com?a=9&b=1"
    );
  });

  it("encodes values and drops flag keys without '='", () => {
    expect(URLCanonizer.buildCanonicalUrl("https://example.com?a[]=1&a[]=2&b=3&empty=&flag")).toBe(
      "https://example.com?a%5B%5D=2&b=3&empty="
    );
  });

  it("matches partner-style canonical vector", () => {
    const url =
      "https://example.dynata.com/?ctx=context123&respondent_id=user123&language=en&expiration=2021-10-19T17:48:36.480Z&access_key=1234&Zeta=encode €xample~v@lue&dupes=1&doubled=this=two&dupes=2&null=&";

    expect(URLCanonizer.buildCanonicalUrl(url)).toBe(
      "https://example.dynata.com/?Zeta=encode%20%E2%82%ACxample~v%40lue&access_key=1234&ctx=context123&doubled=this%3Dtwo&dupes=2&expiration=2021-10-19T17%3A48%3A36.480Z&language=en&null=&respondent_id=user123"
    );
  });

  it("throws for malformed encoded query values", () => {
    expect(() =>
      URLCanonizer.buildCanonicalUrl(
        "https://api.dynata.com/?redirect_uri=https%3A%2F%2Fwww.dynata.com%2F%3Fparam%3D%2TRUE%"
      )
    ).toThrow("not decodable");
  });
});
