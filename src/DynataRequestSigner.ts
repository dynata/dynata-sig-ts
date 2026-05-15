import { createHmac } from "node:crypto";

import {
  HeaderDynataAccessKey,
  HeaderDynataExpiration,
  HeaderDynataSignature
} from "./DynataHeaderConstants.js";
import { SigningHeaders } from "./SigningHeaders.js";
import { URLCanonizer } from "./URLCanonizer.js";
import { SigningStringGenerator } from "./SigningStringGenerator.js";

export { HeaderDynataAccessKey, HeaderDynataExpiration, HeaderDynataSignature, SigningHeaders };

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
