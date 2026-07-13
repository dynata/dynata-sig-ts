import path from "node:path";

const UNRESERVED = /^[A-Za-z0-9\-._~]$/;

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

function hasOpaqueScheme(rawPath: string): boolean {
  const match = rawPath.match(/^([A-Za-z][A-Za-z0-9+.-]*):/);
  if (!match) {
    return false;
  }
  const scheme = match[1] ?? "";
  return !rawPath.startsWith(`${scheme}://`);
}

function splitAbsoluteUrlPath(rawPath: string): { base: string; escapedPath: string } | null {
  const match = rawPath.match(/^([A-Za-z][A-Za-z0-9+.-]*:\/\/[^/]*)(.*)$/);
  if (!match) {
    return null;
  }
  return {
    base: match[1] ?? "",
    escapedPath: match[2] ?? ""
  };
}

function normalizeEscapedPath(escapedPath: string): string {
  if (escapedPath.length === 0) {
    return "";
  }

  const hasTrailingSlash = escapedPath.endsWith("/") && escapedPath !== "/";
  let normalized = path.posix.normalize(escapedPath);

  if (normalized === ".") {
    normalized = "";
  }
  if (escapedPath.startsWith("/") && !normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }
  if (hasTrailingSlash && !normalized.endsWith("/")) {
    normalized += "/";
  }

  return normalized;
}

function decodeQueryComponent(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch (error) {
    throw new Error(`not decodable: ${value}`, { cause: error });
  }
}

function percentEncodeRFC3986(value: string): string {
  if (value.length === 0) {
    return "";
  }

  const bytes = new TextEncoder().encode(value);
  let encoded = "";
  for (const byte of bytes) {
    const char = String.fromCharCode(byte);
    if (UNRESERVED.test(char)) {
      encoded += char;
      continue;
    }
    encoded += `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
  }
  return encoded;
}

function buildCanonicalPath(rawPath: string): string {
  if (hasOpaqueScheme(rawPath)) {
    return rawPath;
  }

  const absoluteParts = splitAbsoluteUrlPath(rawPath);
  if (!absoluteParts) {
    return normalizeEscapedPath(rawPath);
  }

  return absoluteParts.base + normalizeEscapedPath(absoluteParts.escapedPath);
}

function buildCanonicalQueryString(rawQuery: string): string {
  const valuesByKey = new Map<string, string>();
  if (rawQuery.length > 0) {
    for (const pair of rawQuery.split("&")) {
      if (pair.length === 0) {
        continue;
      }
      const eqIndex = pair.indexOf("=");
      const key = eqIndex < 0 ? pair : pair.slice(0, eqIndex);
      const value = eqIndex < 0 ? "" : pair.slice(eqIndex + 1);
      valuesByKey.set(key, value);
    }
  }

  return [...valuesByKey.keys()]
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((key) => {
      const decodedKey = decodeQueryComponent(key);
      const rawValue = valuesByKey.get(key) ?? "";
      const decodedValue = decodeQueryComponent(rawValue);
      return `${percentEncodeRFC3986(decodedKey)}=${percentEncodeRFC3986(decodedValue)}`;
    })
    .join("&");
}

export class URLCanonizer {
  public static buildCanonicalUrl(url: string): string {
    if (isBlank(url)) {
      throw new Error("url must not be blank");
    }

    const separatorIndex = url.indexOf("?");
    const pathPart = separatorIndex >= 0 ? url.slice(0, separatorIndex) : url;
    const queryPart = separatorIndex >= 0 ? url.slice(separatorIndex + 1) : "";

    const canonicalPath = buildCanonicalPath(pathPart);
    const canonicalQuery = buildCanonicalQueryString(queryPart);
    return `${canonicalPath}?${canonicalQuery}`;
  }
}

export function buildCanonicalUrl(url: string): string {
  return URLCanonizer.buildCanonicalUrl(url);
}
