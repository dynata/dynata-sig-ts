import { createHmac } from "node:crypto";

import { URLCanonizer } from "./URLCanonizer.js";
import { SigningStringGenerator } from "./SigningStringGenerator.js";

export const HeaderDynataAccessKey = "dynata-access-key";
export const HeaderDynataSignature = "dynata-signature";
export const HeaderDynataExpiration = "dynata-expiration";

type HeaderCarrier =
  | Headers
  | { set(name: string, value: string): unknown }
  | { setHeader(name: string, value: string): unknown }
  | Record<string, string>;

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

function hmacSha256Hex(key: string, message: string): string {
  return createHmac("sha256", Buffer.from(key, "utf8"))
    .update(message, "utf8")
    .digest("hex");
}

function formatUtcMillis(value: Date): string {
  return value.toISOString().replace(/\.\d{3}Z$/, (match) => match.toUpperCase());
}

export class SigningHeaders {
  public readonly dynataExpiration: string;
  public readonly dynataAccessKey: string;
  public readonly dynataSignature: string;
  public readonly dynataSigningString: string;

  public constructor(input: {
    dynataExpiration: string;
    dynataAccessKey: string;
    dynataSignature: string;
    dynataSigningString: string;
  }) {
    this.dynataExpiration = input.dynataExpiration;
    this.dynataAccessKey = input.dynataAccessKey;
    this.dynataSignature = input.dynataSignature;
    this.dynataSigningString = input.dynataSigningString;
  }

  public applyHeaders(target: HeaderCarrier): void {
    if (!target) {
      throw new Error("target must not be nil");
    }

    if ("set" in target && typeof target.set === "function") {
      target.set(HeaderDynataAccessKey, this.dynataAccessKey);
      target.set(HeaderDynataSignature, this.dynataSignature);
      target.set(HeaderDynataExpiration, this.dynataExpiration);
      return;
    }

    if ("setHeader" in target && typeof target.setHeader === "function") {
      target.setHeader(HeaderDynataAccessKey, this.dynataAccessKey);
      target.setHeader(HeaderDynataSignature, this.dynataSignature);
      target.setHeader(HeaderDynataExpiration, this.dynataExpiration);
      return;
    }

    const recordTarget = target as Record<string, string>;
    recordTarget[HeaderDynataAccessKey] = this.dynataAccessKey;
    recordTarget[HeaderDynataSignature] = this.dynataSignature;
    recordTarget[HeaderDynataExpiration] = this.dynataExpiration;
  }

  public toObject(): Record<string, string> {
    return {
      [HeaderDynataAccessKey]: this.dynataAccessKey,
      [HeaderDynataSignature]: this.dynataSignature,
      [HeaderDynataExpiration]: this.dynataExpiration
    };
  }
}

export class DynataRequestSigner {
  private readonly accessKey: string;
  private readonly secretKey: string;

  public constructor(accessKey: string, secretKey: string) {
    if (isBlank(accessKey)) {
      throw new Error("accessKey must not be blank");
    }
    if (isBlank(secretKey)) {
      throw new Error("secretKey must not be blank");
    }
    this.accessKey = accessKey;
    this.secretKey = secretKey;
  }

  public generateSigningHeaders(
    method: string,
    url: string,
    rawBody: string | Uint8Array,
    expiration: string
  ): SigningHeaders {
    if (isBlank(method)) {
      throw new Error("method must not be blank");
    }
    if (isBlank(url)) {
      throw new Error("url must not be blank");
    }
    if (isBlank(expiration)) {
      throw new Error("expiration must not be blank");
    }

    const body = rawBody instanceof Uint8Array ? Buffer.from(rawBody).toString("utf8") : rawBody ?? "";
    const canonicalUrl = URLCanonizer.buildCanonicalUrl(url);
    const signingString = SigningStringGenerator.generateSigningString(method, canonicalUrl, body);
    const signature = this.computeSignature(signingString, expiration);

    return new SigningHeaders({
      dynataExpiration: expiration,
      dynataAccessKey: this.accessKey,
      dynataSignature: signature,
      dynataSigningString: signingString
    });
  }

  public generateSigningHeadersBytes(
    method: string,
    url: string,
    rawBody: Uint8Array,
    expiration: string
  ): SigningHeaders {
    return this.generateSigningHeaders(method, url, rawBody, expiration);
  }

  public generateSigningHeadersWithDefaultExpiration(
    method: string,
    url: string,
    rawBody: string | Uint8Array
  ): SigningHeaders {
    const expiration = formatUtcMillis(new Date(Date.now() + 5_000));
    return this.generateSigningHeaders(method, url, rawBody, expiration);
  }

  private computeSignature(signingString: string, expiration: string): string {
    const first = hmacSha256Hex(expiration, signingString);
    const second = hmacSha256Hex(this.accessKey, first);
    return hmacSha256Hex(this.secretKey, second);
  }
}
