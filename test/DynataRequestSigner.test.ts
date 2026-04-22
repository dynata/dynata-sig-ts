import { describe, expect, it } from "vitest";

import {
  DynataRequestSigner,
  HeaderDynataAccessKey,
  HeaderDynataExpiration,
  HeaderDynataSignature
} from "../src/DynataRequestSigner.js";

const ACCESS_KEY = "Z0122D3555DDF9D8FA6780055C27FB8BE520B13U";
const SECRET_KEY = "test_secret_key_32_chars_long";
const AUTHORIZE_URL = "https://example.dynata.com/authorize";
const EXP_2025 = "2025-12-31T23:59:59.000Z";
const EXP_2026 = "2026-01-01T00:00:00.000Z";

describe("DynataRequestSigner", () => {
  it("rejects blank constructor inputs", () => {
    expect(() => new DynataRequestSigner("", SECRET_KEY)).toThrow("accessKey must not be blank");
    expect(() => new DynataRequestSigner(ACCESS_KEY, "")).toThrow("secretKey must not be blank");
  });

  it("rejects blank method, URL, and expiration", () => {
    const signer = new DynataRequestSigner(ACCESS_KEY, SECRET_KEY);
    expect(() => signer.generateSigningHeaders("", AUTHORIZE_URL, "{}", EXP_2025)).toThrow(
      "method must not be blank"
    );
    expect(() => signer.generateSigningHeaders("POST", "", "{}", EXP_2025)).toThrow(
      "url must not be blank"
    );
    expect(() => signer.generateSigningHeaders("POST", AUTHORIZE_URL, "{}", "   ")).toThrow(
      "expiration must not be blank"
    );
  });

  it("produces expected signer golden vector", () => {
    const signer = new DynataRequestSigner(ACCESS_KEY, SECRET_KEY);
    const headers = signer.generateSigningHeaders("POST", AUTHORIZE_URL, "{}", EXP_2025);

    expect(headers.dynataExpiration).toBe(EXP_2025);
    expect(headers.dynataSigningString).toBe(
      "d37681ab72af483fd0fc4013abb26b8e8884022f1a37d2fe97a1c67c5635b02e"
    );
    expect(headers.dynataSignature).toBe(
      "74e939fe58af15c9f18ae659b22e0b48fa0519c6338c755a1162c20d702f9492"
    );
  });

  it("changes signature when expiration changes", () => {
    const signer = new DynataRequestSigner(ACCESS_KEY, SECRET_KEY);
    const a = signer.generateSigningHeaders("POST", AUTHORIZE_URL, "{}", EXP_2025);
    const b = signer.generateSigningHeaders("POST", AUTHORIZE_URL, "{}", EXP_2026);
    expect(a.dynataSignature).not.toBe(b.dynataSignature);
  });

  it("matches bytes and string body versions", () => {
    const signer = new DynataRequestSigner(ACCESS_KEY, SECRET_KEY);
    const body = "{\"test\":true}";
    const fromString = signer.generateSigningHeaders("POST", AUTHORIZE_URL, body, EXP_2025);
    const fromBytes = signer.generateSigningHeadersBytes(
      "POST",
      AUTHORIZE_URL,
      Buffer.from(body, "utf8"),
      EXP_2025
    );
    expect(fromString.dynataSignature).toBe(fromBytes.dynataSignature);
  });

  it("applies headers to request-style object", () => {
    const signer = new DynataRequestSigner(ACCESS_KEY, SECRET_KEY);
    const signed = signer.generateSigningHeaders("POST", AUTHORIZE_URL, "{}", EXP_2025);

    const target: Record<string, string> = {};
    signed.applyHeaders(target);

    expect(target[HeaderDynataAccessKey]).toBe(ACCESS_KEY);
    expect(target[HeaderDynataSignature]).toBe(signed.dynataSignature);
    expect(target[HeaderDynataExpiration]).toBe(EXP_2025);
  });

  it("rejects nil apply target", () => {
    const signer = new DynataRequestSigner(ACCESS_KEY, SECRET_KEY);
    const signed = signer.generateSigningHeaders("POST", AUTHORIZE_URL, "{}", EXP_2025);
    expect(() => signed.applyHeaders(undefined as unknown as Record<string, string>)).toThrow(
      "target must not be nil"
    );
  });

  it("uses utc now plus five seconds by default", () => {
    const signer = new DynataRequestSigner(ACCESS_KEY, SECRET_KEY);
    const signed = signer.generateSigningHeadersWithDefaultExpiration("POST", AUTHORIZE_URL, "{}");
    const expirationMs = Date.parse(signed.dynataExpiration);
    const diff = expirationMs - Date.now();

    expect(Number.isNaN(expirationMs)).toBe(false);
    expect(diff).toBeGreaterThanOrEqual(3_000);
    expect(diff).toBeLessThanOrEqual(7_000);
  });
});
