# Encryption, keys and access control

RIDA supports AES-256-GCM encryption of individual field values after JSON encoding and optional per-field compression. Encryption support is included with the normal Python install; Node uses its runtime cryptography facilities. A generated key is a separate private companion file.

## What encryption protects

A public data URL can serve ciphertext. Someone without the key cannot decrypt the encrypted field values merely by downloading the file. Each encrypted value includes a random nonce and authentication tag, so changed or incorrectly keyed values fail authentication. GCM authentication is distinct from the full data-file SHA-256 verification stored in the index.

Keep the key separate from the data. The catalogue and map can reveal record counts, names, field names and structure. Encryption does not hide a public URL or prevent ciphertext downloads.

## Direct encrypted delivery

```text
Authorised reader with key → CDN encrypted byte range → local decryption
```

If a Worker or backend exists only to validate a token before every read, a trusted reader holding the key may fetch encrypted ranges directly. This can avoid that proxy's per-read execution and network hop. Your login/key-distribution service and your storage/CDN may still cost money.

A key delivered to a browser or mobile application is available to someone controlling that device. A copied key remains usable with the ciphertext encrypted under it. Session expiry does not revoke it. Rotate the key and rebuild encrypted future data to exclude an old key; old downloaded ciphertext remains readable with its old key.

The current npm reader is a Node.js implementation. A browser/mobile client needs a compatible reader; installing the npm package does not automatically provide a browser reader.

## Server-only decryption, including Next.js

```text
User → server checks permission → encrypted CDN range
     → server decrypts → authorised content returned
```

Keep the key in a server-only environment variable named `RIDA_KEY`. Read it only in server code. Never use `NEXT_PUBLIC_`, return the key in an API response, put it in public assets, or import it into client components. This keeps the key out of the browser, but every read uses your server and its running costs remain. Environment variables alone do not enforce permission checks.

A server-side Node reader can accept the value through the `key` option:

```js
const key = process.env.RIDA_KEY;
if (!key) throw new Error("RIDA_KEY is missing from the server environment");
const reader = await RidaReader.open(dataUrl, { index: localIndexPath, key });
```

This excerpt belongs in server-only code after importing `RidaReader` from `rida-format` and defining your data/index paths. Authenticate the caller and check the requested record/field before returning content.

## SQL injection

RIDA's record-and-field lookup does not construct or execute SQL, so that lookup path has no SQL injection surface. That does not secure unrelated SQL queries, your authentication layer, file paths, frontend rendering, hosting credentials or the rest of the application. SQL-backed applications can prevent query-data injection with correctly parameterised queries.

## Key handling

- Generate a key during an encrypted build, or securely supply a matching existing key.
- Keep private keys out of repositories and CDN directories.
- Back up the key securely; losing it can make data unreadable.
- Match keys and index/map/data files to the correct build.
- Verify permissions on your own server and protect returned plaintext appropriately.
- Full verification reads the entire data region; use it deliberately rather than for every lookup.

For implementation examples see [Python encryption](PYTHON.md#encrypt-the-data) and [Node encryption](NODE.md#encryption-and-keys). Report security concerns privately to the project's published contact, `admin@qasra.org`; do not post credentials or private datasets in public issues.
