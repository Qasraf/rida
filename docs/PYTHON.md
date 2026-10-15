> Complete package manual. Install from the registry as shown below. Any source-tree installation or test instructions refer to the package source distribution, not this documentation repository.

# RIDA Python library — 2.0.2

RIDA means **Range Indexed Data Access**. It is an installable Python library
and terminal tool that builds a RIDA dataset from a collection of JSON records.

A build creates a data file and index, with map and key companion files when applicable. The data file is headerless; the index contains a fixed binary metadata header followed by its compressed catalogue:

| File | Holds | Where it goes |
|---|---|---|
| `NameData.rida` | field values, and nothing else | the publisher's server or CDN |
| `NameIndex.rida` | the address catalog plus record count, value codec, data length, flags and one digest | with the reader |
| `NameMap.json` | the folder names behind the numbered record IDs and fields | with the reader |
| `NameKey.rida` | the 256-bit key, written only for an encrypted build | kept private |

The data file is the only thing served. The index and the map travel with the
reader, so opening a dataset costs **no request at all** and every lookup costs
exactly **one** — the range of bytes holding that value.

The map is what lets a reader ask for a record by a name a person recognises, as
`apparel/jackets/5`, rather than by its number. A dataset whose record names are
already unique has no map, and needs none.

Every stored value is its own deflate stream, so a reader fetches one range and
inflates one member. On RIDA's reference dataset (27,647 records, 34 fields) the
data region drops from 191,378,148 to 95,476,203 bytes, which is 18 bytes per
value less than a gzip member would take.

With `--encrypt` each value is sealed with AES-256-GCM after compression, which
costs 28 bytes per value (a 12-byte nonce and a 16-byte tag) and keeps one value
per request. On the reference dataset the data file grows from 106.3 MB to
128.7 MB and the build takes 34.7 s instead of 29.3 s.

The figures in this document that say "the reference dataset" all come from that
one measured file. It is the dataset RIDA was built against; it is not a special
case, and any JSON collection of the same shape behaves the same way.

## Install locally

From this project folder:

```sh
pip install .
```

After that, the `rida` command is available in the same Python environment.
JSON, compression and HTTP use Python standard-library modules. The default install also includes cryptography for encryption. No database, cloud account or server process is required.

Install the published package with:

```sh
pip install rida-format
```

The PyPI package name is `rida-format`. After installation, the terminal
command and Python import name are both `rida`. Check the installed version with:

```sh
rida --version
```

### Library project files

Keep the source project in one folder, for example `rida/`:

```text
rida/
├── pyproject.toml           package name and install command
├── MANIFEST.in              files included in the public source archive
├── RIDA-README.md           usage instructions
├── RIDA-FORMAT.md           byte-level file format specification
├── CHANGELOG.md             release history
├── LICENSE                  RIDA license
├── docs/
│   └── rida-metadata.html   optional local metadata helper
├── tests/
│   ├── test_rida.py         test suite
│   ├── make_fixtures.py     regenerates the RIDA 1 golden fixtures
│   └── fixtures/            RIDA 1 files written by the 0.1.1 library
└── src/
    └── rida/
        ├── __init__.py      RIDA builder and reader library
        └── __main__.py      enables: python -m rida
```

`src/rida/` is internal library code. After installation, Python copies it into
its own `site-packages/rida/` location. A developer never needs to run an
individual `.py` file: they use `import rida`, `rida ...`, or `python -m rida`.

## Requirements and downloads

- Python **3.10 or newer** and `pip` are required.
- A single `pip install rida-format` installs RIDA and its `cryptography`
  dependency. Building and reading encrypted datasets is included; there is
  no separate encryption install or extra to choose.
- JSON, compression, hashing, and HTTP reads use Python's standard modules.
  `rida.encryption_available()` reports whether the installed encryption
  dependency can be imported in the current environment.
- The `rida` command has its own progress display for loading, scanning, value
  writing, catalog compression, and final file writing. It does not require
  `tqdm`.
- It does not install or require AWS SDK, Cloudflare SDK, SQLite, Node.js,
  Rust, a database server, or a Worker.
- When installing this source project, `pip` may temporarily download
  `setuptools` (version 77.0.3 or newer) to build the package. It is an install
  tool, not a RIDA runtime dependency.
- Official Python installers for macOS and Windows include the required `lzma`
  support. On an unusually minimal Linux Python build, install the operating
  system's `python3-lzma` package before using RIDA.

## Build

Scan first. It reports the field density and recommends dense or sparse mode:

```sh
rida scan users.json
```

Build a RIDA file. The command asks for confirmation unless `--yes` is supplied:

```sh
rida build users.json UsersData.rida \
  --url https://data.example.org/UsersData.rida \
  --yes
```

During a build, the terminal shows RIDA's own progress, for example:

```text
Scanning field names: starting…
Scanning field names: 1,000 files [00:01, 900 files/s]
Scanning field names: 100%|██████████████████████████████| 479,552/479,552 [...]
Measuring values: 100%|██████████████████████████████| 479,552/479,552 [...]
Compressing catalog: 1/1 (100%)
Writing RIDA data: 100%|██████████████████████████████| 217,221,288/217,221,288 [...]
```

For large inputs, progress reports the record count as it reads. When the total
is not known in advance, updates appear every 1,000 records.

Input can be:

- an object that maps IDs to JSON record objects;
- an array of JSON record objects, with `--id-key`; or
- a folder containing individual JSON record files. Filenames become IDs.

```sh
rida build records/ RecordsData.rida --yes
rida build users-array.json UsersData.rida --id-key id --yes
```

`--url` records where the data file will be served from. The index is then
written next to the data file **and** installed in the reader cache folder, so a
reader on the same machine finds it with no setup.

If the input folder has JSON files in more than one place, RIDA lists the
groups and asks which folder contains the records. For example, if a folder
has `config.json` at its top level and thousands of record files inside
`items/`, choose the `items/` group. For a command that runs without a
prompt, select it explicitly:

```sh
rida scan "./my-data" --records-dir items
rida build "./my-data" my-data.rida --records-dir items --yes
```

`--records-dir` is a folder inside the input folder. RIDA searches that folder
and its subfolders for `.json` files; it does not mix separate groups unless
they are all inside the selected folder. The scan prints the number of records
before a build starts.

#### When several groups should be one file

A folder holding several groups — `apparel/`, `electronics/`, `furniture/`, say — may hold
one dataset that was split across folders, or several separate ones. RIDA
settles it by comparing a sample of each group's field names, and prints what it
found:

```text
JSON groups found: 3
Distinct fields across all groups: 34
Fields shared by every group: 28

group                           records   fields   not shared
-------------------------------------------------------------
apparel                             300       34            6
electronics                         300       28            0
furniture                           300       34            6

  field 'f28': not in electronics
```

It then lays out the three ways to build, each with a size:

```text
Three ways to build this folder (900 records in all)

  1) one file for each group, each keeping its own schema
       group                      records  fields         data      catalog
       apparel                        300      34     135.7 KB      33.1 KB
       electronics                    300      28     111.3 KB      27.7 KB
       furniture                      300      34     135.7 KB      33.1 KB
       in all                         900             382.7 KB      93.9 KB

  2) one file, on the fields every group shares
     only the 28 fields every group has; the rest are not stored
     900 records, 28 fields, dense, data about 333.8 KB, catalog about 82.8 KB
     6 field(s) would not be stored: 'f28', 'f29', 'f30', 'f31', 'f32', 'f33'
     Field density would be 100.0%.

  3) one file, widened to every field any group uses
     all 34 fields any group uses; a record that lacks one stores nothing for it
     900 records, 34 fields, dense, data about 382.7 KB, catalog about 98.7 KB
     Field density would be 94.1%.
```

Option 2 keeps only the fields every group has, so a group's own fields are not
stored at all: the smallest file, at the cost of data. Option 3 keeps every
field, so a record that lacks one stores nothing for it and the density drops.
Which is better depends on whether those extra fields matter, which is why both
are measured rather than assumed.

Non-interactively:

```sh
rida build "./old" union.rida  --combine-groups --yes
rida build "./old" common.rida --combine-groups --combined-schema common --yes
```

Only a few hundred records per group are read to compare the schemas, so the
answer arrives before a build commits to anything.

A combined build numbers its records, so the four files it writes are:

```text
old.rida          the values, which go to the CDN
oldIndex.rida     the catalog, which stays with the reader
oldMap.json       the folder names behind the numbers
oldKey.rida       the key, when the values are encrypted
```

That is the whole deliverable. Where the four files live afterwards is the
publisher's choice: a CDN, a web server, a laptop. RIDA reads a data file over
HTTP byte ranges and does not care who serves it.

#### Record IDs

Different product categories may each number their records from `1`. Three folders holding `1.json` therefore
produce three records called `1`, and no file name can tell them apart:

```text
apparel/jackets/pages/1.json       ->  "1"
electronics/phones/pages/1.json    ->  "1"
furniture/chairs/pages/1.json      ->  "1"
```

RIDA identifies a record by where it sits rather than what it is called. Each
folder's children are numbered from 1 in sorted order, so an ID has one number
per level:

```text
apparel/jackets/pages/1.json       ->  1/1/1/1
electronics/phones/pages/1.json    ->  2/1/1/1
furniture/chairs/pages/1.json      ->  3/1/1/1
```

Positions cannot repeat. The same ID can never be produced twice, at any depth,
whatever the folders are called and however many there are -- three folders or
ten crore.

##### The map file

The numbers mean nothing on their own, so a build writes a fourth file beside the
data and index:

```json
{
  "version": 1,
  "records": 479552,
  "paths": {
    "1": "apparel",
    "1/1": "jackets",
    "1/1/1": "pages"
  },
  "fields": {
    "1": "english",
    "2": "urdu",
    "3": "arabic"
  }
}
```

`paths` turns a numbered prefix back into the folder names it stands for, so a
reader can find a record by the name a person knows:

```python
data.get("1/1/1/5", "english")             # by number
data.get("apparel/jackets/5", "english")   # by name, using the map

data.resolve("apparel", "jackets")   # -> "1/1"
data.records_under("1/1")            # -> ["1/1/1/1", "1/1/1/2", ...]
data.folders()                       # -> every numbered prefix and its name
```

The name form does not need the `pages` level: `apparel/jackets/5` finds
`1/1/1/5`. Naming only a folder, `apparel/jackets`, gives that folder's first
record.

The map is optional. A file whose IDs are already its record names reads without
one, and a reader that cannot find a map simply expects numbers.

##### Keeping the plain names

`--id-scheme named` keeps the old behaviour: the file name is the ID, and repeats
are numbered `1-2`, `1-3`. No map is written. Use it when the names are already
meaningful and unique, such as `jackets_1.json` and `phones_1.json`.

| | `numbered` (default) | `named` |
| --- | --- | --- |
| ID | `1/1/1/1` | `1`, `1-2` |
| Map file | written | not written |
| Lookup by name | yes | no |
| Collisions | impossible | handled with a suffix |

Records are ordered numerically rather than alphabetically, so `10.json` is the
third record and not the second.

Use `--mode dense` or `--mode sparse` to override the recommendation. The
builder does not overwrite an existing output file.

### Choosing a value codec

`--value-codec` selects the stored value layout:

| Value | Header | Stored value | When to use it |
| --- | --- | --- | --- |
| `deflate-per-field` (default) | one raw deflate stream per value | Normal use. Cuts file size and per-lookup transfer when values are large enough. |
| `plain` | plain UTF-8 JSON | Small values or already-compressed values. |

```sh
rida build users.json UsersData.rida --value-codec plain --yes
```

The stream is raw deflate, without the gzip wrapper. That wrapper would add 18
bytes to every value: a magic number and modification time that say nothing
(the codec is already in the index), and a CRC-32 that would repeat the check
AES-256-GCM already performs. Values that are only a few bytes long can still be
larger when compressed; `scan` measures the real stored size for the codec you
select, so its estimates and recommendation match the file you are about to write.

## Building large inputs

RIDA processes one JSON record at a time, so it does not load the whole
collection into RAM. For one JSON file, supported layouts are an object mapping
IDs to record objects, or an array of record objects with `--id-key`. For a
folder, RIDA reads one record file at a time. The current record and the address
catalog still use RAM, so an individual record must fit in memory.

```sh
rida build records.json RecordsData.rida --id-key id --yes
rida build records/ RecordsData.rida --yes
```

When you pass an explicit `--mode dense` or `--mode sparse`, the builder stages
only that index layout instead of both, which lowers its peak catalog memory
and CPU.

If the input folder contains separate JSON groups, RIDA asks which group to
use. For non-interactive commands, pass `--records-dir`, for example:

```sh
rida build "./my-data" MyDataData.rida \
  --records-dir items --yes
```

## Read locally

```sh
rida inspect UsersData.rida
rida fields UsersData.rida
rida get UsersData.rida ali city
```

`inspect` prints the index as JSON: record count, codec, lengths and field
names. `get` prints one value and exits with status 1 and a one-line message if
the record ID or field name does not exist.

A numbered dataset takes either form of record ID. The name form needs the map
beside the data file; the number form does not:

```sh
rida get old.rida 1/1/1/5 english --key "$(cat oldKey.rida)"
rida get old.rida apparel/jackets/5 english --key "$(cat oldKey.rida)"
```

To see what a numbered dataset holds, ask it for the folder names:

```sh
rida folders old.rida
```

`fields` answers "which key do I ask for?" — the field names live in the index,
so nothing has to be guessed or documented separately:

```text
$ rida fields UsersData.rida
Records: 27,647
Fields: 34
   1  id
   2  name
   3  city
   4  joined
   ...
```

It also accepts an http(s) URL, and `--json` prints just the array.

## Check a file for damage

Reading one field never hashes the whole data region, so a normal lookup trusts
the transport. `verify` is the explicit, slower check: it streams every data byte
and compares it with the digest recorded in the index.

```sh
rida verify UsersData.rida
```

```json
{
  "file": "UsersData.rida",
  "format_version": 3,
  "value_codec": "deflate-per-field",
  "record_count": 27647,
  "data_bytes": 110924973,
  "actual_bytes": 110924973,
  "size_ok": true,
  "catalog_ok": true,
  "data_ok": true,
  "encrypted": false,
  "ok": true
}
```

`verify` exits with status 1 when `ok` is false. For an encrypted dataset pass
`--key`. From Python, use `rida.verify("UsersData.rida")`, or
`RidaFile.verify_data()` on an already open file.

## Where RIDA can read data

RIDA 2.0.2 can read a data file from the local computer or from a direct
HTTP/HTTPS file URL. For remote reads, RIDA sends ordinary HTTP byte-range
requests; it does not use a cloud-provider SDK. This makes it compatible with
object storage that returns the requested bytes as HTTP `206 Partial Content`
and includes the matching `Content-Range` header.

Examples expected to work because their object APIs support byte-range reads
include Cloudflare R2, Amazon S3, Google Cloud Storage, Azure Blob Storage,
Backblaze B2, and Bunny.net through a Pull Zone. See their docs: [R2](https://developers.cloudflare.com/r2/api/s3/api/),
[S3](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html),
[Google Cloud Storage](https://docs.cloud.google.com/storage/docs/downloading-objects),
[Azure Blob Storage](https://learn.microsoft.com/en-us/rest/api/storageservices/get-blob),
[Backblaze B2](https://www.backblaze.com/apidocs/b2-download-file-by-id), and
[Bunny.net](https://bunny.net/faq/).
This is protocol-based expected compatibility, not a separate integration
with each provider. The exact URL, permissions, and any CDN in front of a
bucket still need to allow byte-range responses; the providers have not all
been individually tested with this RIDA release.

The current reader sends a `Range` header and a `rida/<version>` User-Agent, but
does not add provider-specific authentication headers. Use a public object URL
or a signed URL that permits the range request. RIDA does not upload files to
cloud storage: upload the data file with that provider, then give RIDA the URL.

## Read from R2 or another HTTP URL

Upload only the data file. The index stays with your app:

```sh
rida remote-get https://data.example.com/UsersData.rida ali city \
  --index UsersIndex.rida
```

The reader never fetches the index. It checks that the server returns HTTP `206`
and the correct `Content-Range`; if the server sends the whole file instead, RIDA
stops with an error rather than silently downloading it all.

### The index

The index is found in this order: the `index=` argument, then the reader cache
folder keyed by URL. Building with `--url` fills the cache folder for you, so on
the machine that built the dataset no options are needed at all.

```sh
rida remote-get https://data.example.com/UsersData.rida ali city
rida remote-get https://data.example.com/UsersData.rida ali city --no-cache --index UsersIndex.rida
rida remote-get https://data.example.com/UsersData.rida ali city --timeout 10
rida cache            # show the cache folder and size
rida cache --clear    # delete cached catalogs
```

The cache lives in the user cache folder (`~/.cache/rida` on Linux and macOS).
Set `RIDA_CACHE_DIR`, or pass `--cache-dir`, or pass `cache_dir=` to
`rida.RemoteRidaFile`, to move it. The reader does not automatically detect a
changed remote data object or fetch a replacement index. Publish versioned URLs
and supply the index from the same build. With `--no-cache`, pass `--index`
explicitly because the cached index is not used.

Network reads fail after `--timeout` seconds (default 30) instead of hanging.

### Connection reuse

A range request sent over a fresh TLS connection pays a full handshake, which on
a CDN costs several times more than the lookup itself. The remote reader
therefore keeps one HTTP(S) connection open per reading thread and reuses it, so
a warm lookup spends its time on the value, not on the handshake.

Measured against Bunny CDN on the reference dataset:

| | average | median |
| --- | ---: | ---: |
| 0.2.1 with connection reuse (default) | **25.9 ms** | 20.9 ms |
| 0.2.0, fresh connection per lookup | 89.0 ms | 76.9 ms |

Use `--no-keepalive`, or `keepalive=False` in Python, to get the old behaviour.

### Asking for several fields at once

A request header costs more than a small payload. Measured against Bunny, every
response carries about **660 bytes of headers**, while a stored field value in
the reference dataset averages a few hundred bytes. Many small single-field
lookups therefore spend most of their bytes on headers.

Because a record's values are stored next to each other, `get_many` and
`get_record` fetch several fields in one range request:

| | Requests | Bunny bill |
| --- | ---: | ---: |
| A whole 34-field record, field by field | 34 | ~26,800 B |
| The same record with `get_record()` | **1** | ~5,000 B |

Two fields are merged into one request when the bytes between them are cheaper
than the request header they save (`MERGE_GAP_LIMIT`, 660 bytes), and stay
separate otherwise — a field asked on its own is still exactly one request.

### Cost at scale

RIDA's main payoff is the size of the delivered response: the reference dataset
averages about **7.69 KB** per complete record but only about **143 bytes** per
stored RIDA field value. When the CDN bills per GB transferred, every lookup
that asks for one field instead of the whole record saves roughly **98 %** of
the delivery bytes.

The table shows a 1-billion-lookup month on the reference dataset. A file of the
same shape and size with a different subject would cost the same.

| Provider | Billing | Normal JSON (1B lookups) | RIDA field-deflate (1B lookups) |
| --- | --- | ---: | ---: |
| Bunny CDN — Standard (Asia) | per GB delivered | **$230.79**/mo | **$4.29**/mo |
| Bunny CDN — Volume (first tier) | per GB delivered | **$38.46**/mo | **$0.71**/mo |
| AWS CloudFront — US / Europe | per GB delivered | **$653.90**/mo | **$12.15**/mo |
| AWS CloudFront — India | per GB delivered | **$1,307.80**/mo | **$24.31**/mo |
| Google Cloud CDN — US / Europe | per GB delivered | **$615.44**/mo | **$11.44**/mo |
| Google Cloud CDN — Asia | per GB delivered | **$923.16**/mo | **$17.16**/mo |
| Azure CDN — Zone 1 (US / EU) | per GB delivered | **$623.13**/mo | **$11.58**/mo |
| Azure CDN — Zone 2 (India / Asia) | per GB delivered | **$1,038.55**/mo | **$19.30**/mo |
| Backblaze B2 + Bunny CDN | per GB delivered | **$76.93**/mo | **$1.43**/mo |
| Cloudflare R2 | per read (Class B) | **$356.40**/mo | **$356.40**/mo |

Cloudflare R2 costs the same either way because it bills per read, not per GB,
and its egress is free. CDN providers that bill per GB all show the same 98 %
reduction — a result of the file format, not of the provider.

This is a planning estimate, not a provider quote. Provider rates, regional mix,
caching, taxes, and account plans change the final bill. Storage adds roughly
$0.02–$0.37/mo for a 5 GB file and $0.20–$3.70/mo for a 50 GB file across the
providers listed (Cloudflare R2 gives the first 10 GB-month free).

## Encrypt the data

A data file that is served from a CDN is public. Encrypting it means a scraper
that downloads the file gets bytes it cannot read.

```sh
# Encryption support is included in pip install rida-format
rida build ./my-data ItemsData.rida --encrypt
```

Three files come out:

| File | What it is |
|---|---|
| `ItemsData.rida` | Field values, each deflate-compressed and then sealed with AES-256-GCM. |
| `ItemsIndex.rida` | The address catalog. Plain, and it stays with your app. |
| `ItemsKey.rida` | The 256-bit AES key, URL-safe base64 (44 characters). Keep it private. |

Read it back by passing the key — from a string, or straight from the file:

```python
import rida
from pathlib import Path

key = Path("ItemsKey.rida").read_text().strip()

with rida.RidaFile("ItemsData.rida", key=key) as data:
    print(data.get("ali", "city"))

# The same works over HTTP with byte ranges.
with rida.RemoteRidaFile("https://cdn.example.com/ItemsData.rida", key=key) as data:
    print(data.get_record("ali"))
```

And from the command line:

```sh
rida get ItemsData.rida ali city --key "$(cat ItemsKey.rida)"
rida fields ItemsData.rida --key "$(cat ItemsKey.rida)"
rida remote-get https://cdn.example.com/ItemsData.rida ali city --key "$(cat ItemsKey.rida)"
```

### Why compression runs before AES

Encrypted bytes do not compress. Sealing first would throw away the whole
benefit of the codec, so every value is compressed and then sealed. Encryption
costs 28 bytes per value — a 12-byte nonce and a 16-byte tag — and adds about
8.6 microseconds per value to a build.

### The key is the checksum

No separate checksum is needed. If a single byte of the data changes, the GCM
tag no longer verifies and the value fails to decrypt. `verify()` therefore
checks the data length, the digest stored in the index and that the catalog
decodes; the key does the real work.

### What encryption does and does not do

It stops anyone who does not hold the key from reading any value. It does not
protect you from a reader who already has the key: the key has to reach your
client somehow, and a client that holds a key can be studied. Looking after the
key is the publisher's job, exactly like a password.

For access control tied to a user account on every read, keep the key on your
server, check permission there, and return decrypted content rather than the key. `rida.encryption_available()` tells you whether the encryption
dependency is present before you promise encryption to a caller.

### Encrypted data directly from your CDN

You can host an encrypted RIDA data file at a public CDN URL while keeping its
contents unreadable without the decryption key. The reader uses its index to
find the requested value, downloads that encrypted byte range, and decrypts it
where the reader runs. You do not need to download the whole dataset first.

```text
Reader with a key → CDN byte-range request → encrypted value → local decryption
```

For example, a page record can contain separate `english`, `hindi`, `urdu`, and
`spanish` fields. Requesting page 2's `spanish` field downloads the stored bytes
for that field, including encryption overhead. If Spanish contains a complete
object with a title, paragraphs, and steps, you receive that complete object.
A larger value needs a larger range: RIDA does not make every response a fixed
number of bytes. HTTP headers and network overhead are additional to the value.

#### Option 1: give the authorized reader the key

Your application can authorize a user and provide the key to a compatible
reader. Subsequent reads can go directly to the CDN, with decryption on the
user's device. Keep the index and map with the reader so it can find the correct
record and field without guessing paths.

If your Worker or backend would otherwise exist only to validate a token on
**every data request**, this arrangement can avoid that proxy's execution and
extra network hop for those reads. RIDA itself adds no encryption subscription
fee. Storage, CDN delivery, your authorization service, and other hosting
services can still have charges; this is not a promise that every CDN security
feature or paid plan becomes unnecessary.

The trade-off is that a user who holds the key can copy it and read the values
encrypted with it. A public URL lets anyone download ciphertext; encryption
protects the contents, not access to that URL. The index and map can also reveal
record names, field names, and dataset structure.

Expiring a session or token does **not** revoke a copied key. To exclude that
key from future data, use a new key and newly encrypted data. Previously
downloaded data remains readable with its original key. Choose this approach
when your application accepts these limits.

#### Option 2: keep the key on your Next.js server

Store the key in a server-only environment variable such as `RIDA_KEY`. Never
use a `NEXT_PUBLIC_` variable for it, import it into client code, or return the
key in an API response. Keep the key file out of public assets as well.

```text
User → your server checks access → CDN encrypted range
     → server decrypts → permitted content returned to the user
```

Your server checks the user's permission, fetches the requested encrypted range,
decrypts it, and returns the permitted content. The key stays on the server,
but reads now pass through your backend and its running costs remain. Keeping a
key in an environment variable does not by itself give a browser direct reads:
the browser needs the key to decrypt locally, or the server must decrypt for it.

Use this option when each read needs an account permission check. Encryption
and per-request authorization solve different problems; choose where decryption
happens according to the access rules your application needs.

The Python reader can perform these reads in a Python application or backend.
A browser or mobile app needs a compatible reader for its own platform. A
Next.js server can use the Node.js `rida-format` package for server-side reads;
the Python package is not browser JavaScript.

## Use from Python

```python
import rida

# Scan first if you want to show the publisher the recommendation.
report = rida.scan("users.json")
print(report.recommended_mode)  # "dense" or "sparse"

# Build once. The source JSON stays unchanged.
rida.build("users.json", "UsersData.rida", url="https://data.example.org/UsersData.rida")

# Read only one stored value from a local RIDA file.
with rida.RidaFile("UsersData.rida") as data:
    print(data.get("ali", "city"))

# Read several fields, or the whole record. Remote ranges may be coalesced.
with rida.RidaFile("UsersData.rida") as data:
    print(data.get_many("ali", ["name", "city"]))
    print(data.get_record("ali"))

# Check the data file against its index.
print(rida.verify("UsersData.rida")["ok"])

# The same lookups work against a public URL with Range support.
remote = rida.RemoteRidaFile(
    "https://data.example.org/UsersData.rida", index="UsersIndex.rida"
)
print(remote.get("fatima", "languages"))
print(remote.get_many("fatima", ["languages", "city"]))
```

`get_many` raises `KeyError` for a field name the file does not have, so a typo
never passes silently. A field the file has but this record lacks is simply left
out of the returned dictionary.

### Reading a collection that numbers its records

A folder whose books all number their records from `1` gets numbered IDs, and a
map beside the data file turns a name into one:

```python
with rida.RidaFile("old.rida", key=open("oldKey.rida").read().strip()) as data:
    # By name, the way a person would say it.
    print(data.get("apparel/jackets/5", "english"))

    # By number, which needs no map and works from a bare index.
    print(data.get("1/1/1/5", "english"))

    # What does this file hold?
    for prefix, name in data.folders().items():
        print(prefix, name)

    # Everything under one book.
    for record_id in data.records_under(data.resolve("apparel", "jackets")):
        print(record_id, data.get(record_id, "english"))
```

An operator who does not know the names yet can ask the file:

```sh
rida folders old.rida
```

A desktop app or another Python program can show the same stages in its own
interface by passing a callback:

```python
def progress(stage, completed, total):
    print(f"{stage}: {completed}/{total}")

rida.build("users.json", "UsersData.rida", progress=progress)
```

Useful names:

| Name | Purpose |
| --- | --- |
| `rida.build`, `rida.scan` | Build or analyse input; `value_codec=` selects the stored value layout |
| `rida.open_reader` | Open a local path or an http(s) URL with one call |
| `rida.RidaFile` | Local reader: `get`, `get_many`, `get_record`, `verify_data()`, `folders()`, `resolve()`, `records_under()`; `index=` to name the index file |
| `rida.RemoteRidaFile` | HTTP byte-range reader: `get`, `get_many`, `get_record`, `close()`; options include `index=`, `timeout=`, `cache_dir=`, `keepalive=`. Folder-map helpers and `verify_data()` are local-reader features. |
| `rida.verify` | Integrity report for a local data file |
| `rida.inspect_metadata` | The index contents as a dictionary |
| `rida.MERGE_GAP_LIMIT` | How many skipped bytes still beat a request header (660) |
| `rida.VALUE_CODECS` | `("deflate-per-field", "plain")` |
| `rida.clear_remote_cache`, `rida.remote_cache_directory` | Manage the index cache folder |
| `rida.read_map_folders` | The numbered folders beside a data file, without opening it |
| `rida.ID_SEPARATOR` | The separator between numbered levels (`"/"`) |

## Run the tests

```sh
python3 -m unittest discover -s tests -v
```

The suite needs no third-party packages and does not use the network. It starts
its own local range server for the remote tests. `tests/fixtures` freezes one
build; the suite checks that this version still reads it and still reproduces its
catalog and data bytes. Regenerate it with `tests/make_fixtures.py` whenever the
layout changes.

## Detailed application examples

These examples use numbered record IDs and the generated map. Build each example folder as its own dataset. The IDs shown apply only to these exact folder trees; adding or rearranging records can change numbered positions.

### One product. Only the description your customer needs.

Your product catalogue can contain thousands of records. Each product may have a price, specifications, images, stock information, and descriptions in several languages.

```text
catalogue/
└── products/
    └── 2812.json
```

Example record:

```json
{
  "name": "Travel Backpack",
  "price": 49,
  "stock": 120,
  "specifications": {
    "capacity": "30 litres",
    "weight": "900 grams"
  },
  "english": {
    "title": "Ready for everyday travel",
    "description": "A lightweight backpack with a padded laptop compartment."
  },
  "hindi": {
    "title": "Roz ke safar ke liye",
    "description": "Halka backpack, laptop ke liye alag padded jagah ke saath.",
    "care": [
      "Haath se saaf karein",
      "Chhaon mein sukhayein"
    ]
  },
  "images": [
    "front.webp",
    "back.webp"
  ]
}
```

Build the example:

```sh
rida build ./catalogue ./CatalogueData.rida --records-dir .
```

#### Your customer chooses Hindi

Request the hindi field. The reader uses the map to resolve the record and the index to find its byte range. The response contains the complete Hindi value: its title, description, and care instructions. Price, stock, specifications, English content, and image URLs are not selected.

```python
import rida

with rida.RidaFile("CatalogueData.rida") as data:
    prefix = data.resolve("products")
    if not prefix:
        raise ValueError("Folder not found in the map")
    record_ids = data.records_under(prefix)
    # This exact example: 2812.json is the only record.
    record_id = record_ids[0]
    print(data.get(record_id, "hindi"))
    print(data.get_many(record_id, ["price", "hindi"]))
```

Need the price too? Request price and hindi together with a multi-field read. Nearby ranges can be combined; the number of HTTP requests depends on their positions in the data file.


### A complete help page. In the selected language.

A help centre can organise complete multilingual instructions inside deeply nested folders. Each language can contain a heading, introduction, steps, and troubleshooting.

```text
help-centre/
└── guides/
    └── account/
        └── recovery/
            └── pages/
                ├── 1.json
                ├── 2.json
                └── 3812.json
```

Example record:

```json
{
  "title": "Recover your account",
  "category": "Account access",
  "english": {
    "heading": "Reset your password",
    "steps": [
      "Open account recovery",
      "Enter your email",
      "Follow the reset link"
    ]
  },
  "spanish": {
    "heading": "Restablece tu contraseña",
    "introduction": "Sigue estos pasos para recuperar el acceso a tu cuenta.",
    "steps": [
      "Abre la página de recuperación",
      "Introduce tu correo electrónico",
      "Sigue el enlace para restablecer la contraseña"
    ],
    "troubleshooting": {
      "email_missing": "Revisa la carpeta de correo no deseado.",
      "link_expired": "Solicita un nuevo enlace."
    }
  }
}
```

Build the example:

```sh
rida build ./help-centre ./HelpData.rida --records-dir .
```

#### Your user needs Spanish instructions

Request the spanish field to receive the complete Spanish object, including its nested troubleshooting content. English instructions are not selected. Use the generated map to find the folder prefix rather than guessing a numbered path.

```python
import rida

with rida.RidaFile("HelpData.rida") as data:
    prefix = data.resolve("guides", "account", "recovery", "pages")
    if not prefix:
        raise ValueError("Folder not found in the map")
    record_ids = data.records_under(prefix)
    # This exact example: 3812.json follows 1.json and 2.json.
    record_id = record_ids[2]
    print(data.get(record_id, "spanish"))
    print(data.get_many(record_id, ["title", "category", "spanish"]))
```

Need page metadata too? Request title, category, and spanish together. RIDA selects stored fields, not individual properties inside them. If troubleshooting needs independent reads, store it in a separate top-level field.


A field can contain a complete object or array, not just a short sentence. A long value needs a larger byte range. An encrypted build returns the same selected values after decryption with the key. Encryption and HTTP headers add overhead; responses are not a fixed few bytes. Merged ranges can also include small gaps between selected values.

The filenames are source names, not guaranteed numbered record IDs. The map describes folder prefixes; records_under / recordsUnder lists their record IDs. Keep the chosen ID in your application when selecting a record. For a large catalogue, use your own product identifier field or mapping to associate business IDs with numbered record IDs.

## Current scope

RIDA 2.0.2 implements primary lookup — `record ID + field name → value` — plus
multi-field reads (`get_many`, `get_record`), numbered folder IDs with a map that
turns a name into one, a data-file integrity check, and optional AES-256-GCM
encryption of every stored value. Optional exact-match,
numeric-range, and Unicode full-text search indexes are not part of this release,
and neither is a JavaScript reader.

## License

RIDA is distributed under the RIDA Proprietary License in the `LICENSE` file.
You may download and modify RIDA, and use it in free or paid applications.
You may not sell or redistribute RIDA as a standalone package or library.
Applications that include RIDA must show the attribution notice specified in
the license.
