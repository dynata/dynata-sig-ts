import { createHash } from "node:crypto";

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

export class SigningStringGenerator {
  public static generateSigningString(method: string, canonicalUrl: string, rawBody: string = ""): string {
    if (isBlank(method)) {
      throw new Error("method must not be blank");
    }
    if (isBlank(canonicalUrl)) {
      throw new Error("canonicalUrl must not be blank");
    }

    return createHash("sha256")
      .update(`${method}${canonicalUrl}${rawBody}`, "utf8")
      .digest("hex");
  }
}

export function generateSigningString(method: string, canonicalUrl: string, rawBody: string = ""): string {
  return SigningStringGenerator.generateSigningString(method, canonicalUrl, rawBody);
}
