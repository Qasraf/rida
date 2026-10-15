# RIDA file format

This document is the byte-level specification of the RIDA container as
implemented by RIDA 0.3.3.

A dataset is **four files**, and there is **no header on the data file**:

| File | Holds | Where it lives |
| --- | --- | --- |
| `<name>Data.rida` | field values, and nothing else | anywhere; this is what you upload |
| `<name>Index.rida` | the address catalog and the few facts a reader needs | with the reader |
| `<name>Map.json` | the folder names behind the numbered record IDs | with the reader |
| `<name>Key.rida` | the 256-bit key, only for an encrypted build | private |

The data file's first byte is the first byte of the first stored value. There is
no magic number, no version, no record count, no offset table — a reader that
does not hold the index can learn nothing from it.

The map is not part of either binary file. It is a plain JSON document a reader
loads when it wants to name a record rather than number it, and a dataset whose
record IDs are already its file names has none.

Keeping the index with the reader is what makes a lookup one request: the reader
already knows the offset and length of the value it wants, so it asks the server
for exactly those bytes.

All integers are **big-endian**. Offsets are absolute file offsets in the data
file.

## 1. The data file

The data file is a bare concatenation of value blocks. Nothing separates them;
every boundary comes from the index.

```text
+---------------------------+ offset 0
| value bytes for record 1  |
| value bytes for record 2  |
| ...                       |
+---------------------------+
```

### 1.1 Value encoding

A value is JSON-encoded, then compressed, then optionally encrypted:

```text
JSON bytes  ->  deflate  ->  [ AES-256-GCM ]  ->  stored bytes
```

**Step 1 — JSON.** The value is written as compact JSON with no spaces:
`json.dumps(value, ensure_ascii=False, separators=(",", ":"))`, encoded as
UTF-8. Only standard JSON is permitted; `NaN` and `Infinity` are rejected.

**Step 2 — compression.** With the `deflate-per-field` codec each value becomes
its own **raw deflate stream**: `zlib.compressobj(9, zlib.DEFLATED, -15)`. The
negative window size is what omits the zlib wrapper.

With the `plain` codec the JSON bytes are stored as they are.

**Step 3 — encryption.** When the dataset is encrypted, the compressed bytes are
sealed with AES-256-GCM. Compression runs **first** because ciphertext does not
compress; the other order would throw away the whole benefit of the codec.

```text
+----------------+------------------------+----------------+
| nonce, 12 bytes|     ciphertext         |  tag, 16 bytes |
+----------------+------------------------+----------------+
```

The nonce is generated fresh for every value, so two records holding the same
text produce unrelated bytes. The tag is what a reader checks: a single altered
byte anywhere in the nonce, ciphertext or tag makes decryption fail rather than
return wrong data.

Encryption costs 28 bytes per value. On a dataset with 940,000 values that is
26 MB, and it is the reason a key is the only integrity check RIDA needs.

### 1.2 Why there is no gzip wrapper

A gzip member is the same deflate stream inside an 18-byte wrapper: a magic
number, a method byte, flags, a modification time, an extra length, an OS byte,
and a trailing CRC-32 with the original length.

Every one of those is redundant here. RIDA knows the codec from the index, so
the magic and method say nothing. The modification time is never used. The
CRC-32 would repeat the check AES-GCM already performs — and on an unencrypted
file, a damaged stream still fails to inflate.

Omitting the wrapper saves 18 bytes on **every** value.

## 2. The index file

The index is a fixed 72-byte header followed by one LZMA-compressed catalog.

```text
+--------------------------------+ offset 0
| INDEX_HEADER, 72 bytes         |
+--------------------------------+ offset 72
| LZMA-compressed catalog        |
+--------------------------------+
```

### 2.1 Index header

`struct` format `>8sIIIIIQI32s`:

| Offset | Size | Field | Meaning |
| --- | --- | --- | --- |
| 0 | 8 | `magic` | always `RIDAIDX1` |
| 8 | 4 | `index_version` | `1` |
| 12 | 4 | `catalog_length` | compressed catalog bytes |
| 16 | 4 | `raw_catalog_length` | catalog bytes before LZMA |
| 20 | 4 | `record_count` | records in the file |
| 24 | 8 | `data_length` | exact size of the data file |
| 32 | 4 | `codec_code` | `1` = `deflate-per-field`, `2` = `plain` |
| 36 | 4 | `flags` | bit 0 set means the values are encrypted |
| 40 | 32 | `data_digest` | SHA-256 of the whole data region, all zeros when not computed |

A reader checks `data_length` against the size of the data file before serving
anything, so a truncated or mismatched download fails immediately rather than
part-way through a lookup.

### 2.2 Catalog

The catalog is LZMA-compressed as one block. Decompressed, it is a 44-byte
header followed by four sections back to back.

`struct` format `>8sIIQIIIQ`:

| Offset | Size | Field | Meaning |
| --- | --- | --- | --- |
| 0 | 8 | `magic` | always `RDACAT01` |
| 8 | 4 | `catalog_version` | `1` |
| 12 | 4 | `mode_code` | `1` = dense, `2` = sparse |
| 16 | 8 | `record_count` | must match the index header |
| 24 | 4 | `field_count` | number of distinct field names |
| 28 | 4 | `schema_length` | bytes of the schema section |
| 32 | 4 | `record_ids_length` | bytes of the ID section, `0` when implicit |
| 36 | 8 | `rows_length` | bytes of the row-offset table plus the rows |

Then, in order:

**Schema.** A compact JSON array of the field names, in field-ID order. A field's
ID is its index in this array.

**Record IDs.** A compact JSON array of record IDs, or empty. When it is empty
the IDs are the strings `"1"` through `"record_count"`.

**Row offset table.** `record_count + 1` unsigned 64-bit integers. Row *n* spans
`row_offsets[n]` to `row_offsets[n+1]` within the rows section.

**Rows.** One row per record, whose shape depends on the mode.

### 2.3 Row layouts

**Dense** (`mode_code` 1) — every record gets every field:

```text
row start offset          varint
per field, in schema order:
  length of the value     varint   (0 means the field is absent)
```

A non-zero length is a byte range in the data file. Records are written in ID
order, so the value for record *n* field *f* starts at the running data position.

**Sparse** (`mode_code` 2) — only the fields a record actually has:

```text
row start offset                    varint
number of fields present            varint
per present field:
  gap in field IDs since the last   varint
  length of the value               varint
```

Field IDs must increase within a row, so the first gap is measured from 0.

Varints are unsigned LEB128: seven bits per byte, low bits first, with the top
bit set on every byte but the last.

### 2.4 Finding a value

With the index in hand, a reader resolves one field with no requests at all:

1. read the row offset for the record from the offset table;
2. walk the row to the wanted field, accumulating a position within the row;
3. add that position to where the record's values begin in the data file;
4. the length is right there in the row.

Then it asks the server for exactly that range. That is why a lookup is one
request, and why `get_record` is also one request: several ranges close enough
together are merged into a single range, and the gap is skipped locally.

## 3. The map file

The map is JSON, and it is the only one of the four files that is not binary. It
exists because a numbered record ID means nothing on its own:

```json
{
  "version": 1,
  "records": 479552,
  "paths": {
    "1": "shamela",
    "1/1": "Bukhari",
    "1/1/1": "hadiths"
  },
  "fields": {
    "1": "english",
    "2": "urdu",
    "3": "arabic"
  }
}
```

| Key | Type | Meaning |
| --- | --- | --- |
| `version` | integer | `1`. A reader that does not know the number ignores the file. |
| `records` | integer | The record count, for a sanity check against the index. |
| `paths` | object | Numbered folder prefix to folder name. |
| `fields` | object | Field position, as a decimal string, to field name. |

A record ID has one number per folder level, in order from the input root down,
followed by the record's position in the folder that holds it. Each number is the
child's position among its parent's children, sorted, counting from 1:

```text
shamela/Bukhari/hadiths/1.json   ->  1/1/1/1
```

Positions are unique by construction, so two records can never share an ID, at
any depth, whatever the folders are called. Siblings are compared as text and, for
names that are wholly decimal, as numbers, so `10.json` follows `2.json`.

A reader turns a name into an ID by looking the name up in `paths` and taking the
prefix it holds. A record is then `<that prefix>/<level of the records>/<number>`;
the `hadiths` level in the example above is one of the numbered levels, which is
why `shamela/Bukhari/5` resolves to `1/1/1/5` without the caller naming it.

## 4. What the format guarantees

* **One request per lookup.** Opening a dataset costs nothing, because the index
  is local.
* **A value is either returned whole or refused.** Decryption, or failing that
  decompression, catches damage before any JSON is parsed.
* **No header to keep in step.** The data file has nothing to get out of date.
* **Changing the field set is a rebuild.** The schema is fixed for the life of a
  dataset; that is what lets a lookup be a single range.