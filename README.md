# dynata-sig-ts

JavaScript library for Dynata request-signing primitives. It provides the following:

- URL canonicalization for signing
- Signing-string generation (`SHA256` lowercase hex of `METHOD + canonical_url + body`)
- Signature generation via the 3-step `HMAC-SHA256` chain

It does not include an HTTP client integration layer.

## Getting Started

### Credentials

Before sending signed requests you will need credentials for Dynata APIs. These consist of:

- **Access key**: used locally to compute the `dynata-signature` and also sent in the `dynata-access-key` request header.
- **Secret key**: never sent as a header; used locally to compute the `dynata-signature`.

### Installation

`npm install @dynata/dynata-sig-ts`

## Usage (ESM)

```ts
import { DynataRequestSigner } from "@dynata/dynata-sig-ts";

const signer = new DynataRequestSigner("YOUR_ACCESS_KEY", "YOUR_SECRET_KEY");

const body = JSON.stringify({ identifier: "jrn:iam:user:test" });
const headers = signer.generateSigningHeaders(
  "POST",
  "https://example.dynata.com/authorize",
  body,
  "2025-12-31T23:59:59.000Z"
);

const requestHeaders: Record<string, string> = {};
headers.applyHeaders(requestHeaders);
```

## Usage (CommonJS)

```js
const { DynataRequestSigner } = require("@dynata/dynata-sig-ts");

const signer = new DynataRequestSigner("YOUR_ACCESS_KEY", "YOUR_SECRET_KEY");
const headers = signer.generateSigningHeadersWithDefaultExpiration(
  "POST",
  "https://example.dynata.com/authorize",
  "{}"
);
```

### Emitted Headers

- `dynata-access-key`
- `dynata-signature`
- `dynata-expiration`


## Algorithm

### Generating Signing Strings

Each Dynata signature starts from a signing string, which is built from:

`{METHOD}{URI}{BODY}`

with no delimiter between segments, then hashed as SHA-256 and encoded as lowercase hex.

### Method

Use the exact HTTP method sent on the wire (`GET`, `POST`, `DELETE`, etc.).

### URI

Use the URI (`scheme + host + path + query`) in canonical form.

- Scheme: advertised scheme of the receiving application.
- Host: domain name only (do not include port).
- Path: target resource path, including the leading `/`.
- Query: use a canonical query string.

Canonical query construction:

1. Sort parameter names by character code point ascending.
2. URI-encode each name and value using RFC 3986 rules.
3. Do not encode unreserved characters: `A-Z`, `a-z`, `0-9`, `-`, `_`, `.`, `~`.
4. Percent-encode all other characters as uppercase hex (`%XY`).
5. Encode spaces as `%20` (never `+`).
6. Build pairs as `name=value`, then join with `&`.
7. Use an empty string when a parameter has no value.

### Body

Use the exact body text/bytes sent with the request. Whitespace, ordering, and encoding must be preserved exactly.

### Signature Computation

After generating the signing string, compute the signature using a three-step HMAC-SHA256 chain:

1. HMAC with expiration timestamp as key and signing string as message.
2. HMAC with access key as key and step 1 output as message.
3. HMAC with secret key as key and step 2 output as message.

Implementation notes:

- The final signing string digest is always a 64-character lowercase SHA-256 hex value.
- If there is no body, use an empty body segment.
- Use UTF-8 for all key and message conversions.
- Use lowercase hex output for each HMAC digest.
- Reuse the exact RFC3339 expiration value from the `dynata-expiration` header.

## Contribution Notes

## Testing

```bash
npm test
```
