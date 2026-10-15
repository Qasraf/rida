# Reference measurements and hosting estimates

These are the project's reported reference measurements and modeled costs, not a new benchmark run for this repository and not a current provider quote. The reference workload uses **27,647 records and 34 fields**. Actual behavior depends on content, compression, access patterns, hardware, network, cache state and provider pricing.

## Payload and latency

| Metric | Reference result |
| --- | ---: |
| Average complete JSON record | About 7.69 KB |
| Average stored RIDA field | About 143 bytes |
| Modeled single-field payload reduction | About 98% |
| Warm Bunny CDN lookup with connection reuse | 25.9 ms average |
| Earlier comparison without connection reuse | 89.0 ms average |
| Reported response-header overhead | About 660 bytes |
| Raw-Deflate wrapper saving over roughly 940,000 gzip members | About 15.4 MB |

The reported data/build comparison on the website lists plain data at 110.9 MB before versus 95.5 MB after, encrypted data at 134.9 MB versus 119.5 MB, plain build time at 29.3 s versus 13.9 s, and encrypted build time at 34.7 s versus 34.3 s. These describe that reference comparison, not guaranteed times or sizes for the current Mac installer or every edition.

An average field is not a guaranteed response size. Encryption adds per-value bytes; long objects/pages can be much larger. Multi-field merging may include gaps. HTTP, TLS and provider accounting add overhead. In one Bunny observation, a 256-byte range appeared as about 1.02 kB in dashboard accounting.

## One billion lookups per month: illustrative delivery model

This model compares one complete JSON record with one average stored field per lookup. Values below reproduce the reference calculation rather than live tariffs. Storage, origin transfer, request charges, provider minimums, taxes and additional services can add to the bill.

| Provider / region | Whole JSON | RIDA field |
| --- | ---: | ---: |
| Bunny CDN Standard, Asia | $230.79 | $4.29 |
| Bunny CDN Volume | $38.46 | $0.71 |
| AWS CloudFront, US / Europe | $653.90 | $12.15 |
| AWS CloudFront, India | $1,307.80 | $24.31 |
| Google Cloud CDN, US / Europe | $615.44 | $11.44 |
| Google Cloud CDN, Asia | $923.16 | $17.16 |
| Azure CDN, Zone 1 | $623.13 | $11.58 |
| Azure CDN, Zone 2 | $1,038.55 | $19.30 |
| Backblaze B2 + Bunny CDN | $76.93 | $1.43 |
| Cloudflare R2 Class B reads in the package's per-request model | $356.40 | $356.40 |

RIDA can reduce byte-based delivery fees. A per-request charge need not fall when both approaches still make one request per lookup, as the R2 row illustrates. A fixed-price VPS bill also does not automatically fall with the payload. Its included bandwidth and resource limits still matter. See the full [Node cost explanation](NODE.md#example-delivery-cost-comparison).

## RIDA versus SQL/database reads

| Concern | SQL-backed application | RIDA known record + field lookup |
| --- | --- | --- |
| Retrieval | A query such as `SELECT field FROM records WHERE id = ?` uses the database's query/index machinery | The catalogue supplies a stored byte offset and length |
| Overfetch | `SELECT * FROM records WHERE id = ?` returns every selected column; selecting specific columns can reduce it | A selected field's stored bytes are retrieved; the complete selected field is returned |
| SQL injection | Unsafe string-built queries can be injected; correctly parameterised queries separate data from SQL | No SQL is parsed or executed on this lookup path |
| Scanning | Unindexed predicates can scan rows; suitable indexes can avoid full scans | A known record/field uses catalogue addressing without scanning the complete data file |
| Runtime | Database and application execution depend on architecture/provider | Direct compatible-client reads can bypass an application proxy; server-only decryption still uses a server |
| Billing | Can include operations, scanned rows, compute, storage and transfer | Can include storage, operations, origin traffic, CDN delivery and any remaining backend |
| Data changes | Suitable for live writes, transactions, joins and queries | Build ahead of time, distribute matching static outputs, rebuild to update |
| Portability | Engines and providers have their own clients/features | Any compatible HTTP range host can serve the data file |

RIDA is useful when the application already knows which record and field it needs. It does not replace full-text search, arbitrary filters, relational joins, transactions or a live write database. Smaller stored reads can avoid repeated database work for static collections, but the public measurements above do not establish a universal database latency or price advantage.

## Make your own comparison

Use the same records, requested fields, traffic volume, region and security requirements. Compare cold and warm reads, whole-record and multi-field access, viewer and origin bytes, full provider billing and required backend work. Verify both correctness and costs for your workload. [Hosting guide](CDN.md).
