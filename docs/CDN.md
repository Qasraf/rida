# Host RIDA on your storage or CDN

RIDA uses ordinary HTTP; it does not upload files, operate a CDN, manage provider accounts or sell storage plans. A provider's direct HTTPS object URL must satisfy the range-read contract.

## Deployment steps

1. Build a versioned dataset and retain its matching index/map/key files.
2. Upload `NameData.rida` to your selected object storage or origin.
3. Put a CDN in front of it if your workload benefits from edge caching.
4. Make the data URL readable by the application. Use a public or suitably signed URL as needed.
5. Keep the index and map with the reader, or configure the index location supported by your edition. Never upload a private key alongside the data.
6. Read one field through the real public URL and compare the returned bytes and provider accounting with your expected workload.

## Check the HTTP range contract

```sh
curl -i --range 0-99 https://data.example.com/ExampleData.rida
```

A suitable response is `206 Partial Content` with `Content-Range: bytes 0-99/TOTAL` and 100 body bytes for this example. Do not apply transport compression or transformations that change the byte positions expected by the index. Configure cache rules, range handling and object permissions for your chosen provider. Browser readers also need appropriate CORS headers.

## Common arrangements

| Arrangement | What you configure | Costs and limits to consider |
| --- | --- | --- |
| Bunny Storage + Bunny CDN Standard | Storage origin, pull zone and public data URL | Storage, regional delivery and provider minimums |
| Bunny Storage + Bunny CDN Volume | Storage origin and the selected CDN network | Delivery tier, geographic coverage and minimums |
| Bunny Storage + Cloudflare CDN | Bunny origin plus Cloudflare route/cache configuration | Bunny origin transfer charges must be checked; storage-only figures are not a complete bill |
| Backblaze B2 + Cloudflare CDN | Bucket/origin, custom domain and cache configuration | Storage allowances are shared per account; verify current partner-transfer eligibility and cache rules |
| Cloudflare R2 | Bucket, custom public URL and optional cache layer | Storage and operation counts; egress-free pricing does not mean requests/storage are free |
| Your own Nginx/Caddy server, S3, Azure, GCS, MinIO or another host | Public HTTPS file delivery with range support | Host bandwidth limits, storage, operations and caching |

Compatibility comes from HTTP behavior; RIDA does not include a provider-specific integration or configure your account.

## Cloudflare cache considerations

A readable range is not proof that the complete origin object is cacheable. Cloudflare object-size limits and plan rules can differ. A multi-gigabyte file may be served without being cached under a particular plan. The discussed 500 MB object limit is a provider-plan consideration, not a RIDA format limit. Check current provider documentation before choosing object sizes. RIDA Studio does not automatically split datasets into 500 MB pieces.

Keep URLs versioned when rebuilding, so an old cached index cannot address a new data object. A cold cache may read more origin bytes than the viewer requested, depending on the CDN.

## Public ciphertext, private key

An encrypted data URL may be public while its values require a key. Direct client decryption requires the client to have that key. Server-only decryption keeps the key off the client but retains server execution costs. [Security and the two architectures](SECURITY.md).

## Cost model

Count storage, viewer delivery, origin transfer, provider operations, cold-cache requests, HTTP overhead, minimum charges and taxes. RIDA can reduce selected payload bytes; it cannot remove every line item. [Reference calculations](BENCHMARKS.md).
