# How RIDA works

RIDA turns JSON records into addressable stored field values. A lookup starts with a known record ID and top-level field name. The local catalogue returns the offset and stored length. The reader reads that region from disk or asks an HTTP host for it, then decrypts and decodes the value as needed.

## One lookup, step by step

1. Build the data, matching index, and any map/key companions.
2. Open the reader with its matching index. Python uses a local index or its local URL-index cache. Node can open an adjacent local index, a provided index, or the derived remote index URL.
3. Resolve the folder path if your app uses the generated map.
4. Find the record and field in the catalogue.
5. Read the stored byte range. For HTTP the host must return `206 Partial Content` and the requested range.
6. Authenticate/decrypt encrypted values, decompress Deflate values, and parse the JSON value.

A local index means opening does not need an index network request. A remote index download is an additional request. A single-field HTTP read selects one stored value range; multiple fields may use one or more merged ranges.

## The map and the catalogue

The **catalogue**, inside `Index.rida`, contains field names, record IDs/layout information, byte locations and other metadata. It answers where a value lives.

The **map** associates readable folder names with numbered prefixes and keeps field-name mappings. It answers which prefix belongs to a named folder. It does not contain the record values or the byte offsets and is not a separate content index.

Use `resolve(...)` and `records_under(...)` in Python, or `resolve(...)` and `recordsUnder(...)` in Node, rather than guessing a numeric path. Record numbering is derived from the scanned tree; changing the tree can change IDs. The original filename is not guaranteed to equal the generated record number.

## Deep folders

```text
sensor-export/
└── europe/
    └── berlin/
        └── device-001/
            └── 2026-10-01/
                └── reading.json
```

When this exact tree is included from its root, four folder components and one record component can produce `1/1/1/1/1`. The map explains the folder names. Source filenames do not have to be sequential numbers.

## Value size and field boundaries

A field value can be a string, number, boolean, null, array or complete nested object. Reading a selected field returns that entire stored value. A 100 KB page needs its corresponding stored range; RIDA does not turn every response into a few bytes. Split JSON into top-level fields according to the parts the app needs independently.

## Codecs and index layouts

- `deflate-per-field`: compact UTF-8 JSON compressed as an independent raw Deflate stream per value.
- `plain`: compact UTF-8 JSON without per-value compression.
- Dense and sparse modes affect catalogue addressing, not the field contents.
- Automatic layout compares dense and sparse index row sizes.
- Catalogue compression uses XZ/LZMA. Its compression level is separate from the value codec.
- AES-256-GCM, when enabled, runs after compression and adds a 12-byte nonce and 16-byte authentication tag per value.

The data is headerless. The index contains a fixed binary metadata header and compressed catalogue. [Complete binary specification](FORMAT.md).

## Updating a collection

Rebuild changed collections and distribute the matching data, index and map as one release. Do not serve an old index against new data. Versioned filenames or URLs help keep caches consistent. RIDA does not provide live in-place database writes or transactions.

[Build](BUILD.md) · [Read](READ.md) · [Security](SECURITY.md)
