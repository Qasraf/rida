> Complete package manual. Install from the registry as shown below. Any source-tree installation or test instructions refer to the package source distribution, not this documentation repository.

# RIDA for Node.js

RIDA means **Range Indexed Data Access**. `rida-format` is the Node.js reader,
builder, and command-line tool for RIDA datasets. It turns JSON records into a
small set of files: one data file holds the values, and an index tells a reader
where each value lives. A reader can then ask an HTTP server or CDN for only the
bytes needed for a lookup.

The npm package name is **`rida-format`**. The package version is shown in
`package.json` and with the command's `--version` option.

## What RIDA does

A normal JSON download usually transfers a whole document or record even when
an app needs one field. RIDA separates the values from their addresses. The
reader uses a local index to find a value's byte range, then reads that range
from the data file.

For a local dataset, the reader opens the data and index files on disk. For a
remote dataset, the data URL must point to a server or CDN that supports HTTP
byte-range requests and returns `206 Partial Content`. RIDA does not upload
files or provide hosting; you choose where the data file is stored and served.

RIDA is useful when an app often needs one or a few fields from a large,
mostly-static collection. The amount saved depends on the size of the requested
values, the number of fields requested, and the host's request and transfer
pricing. A range read still has HTTP request and response headers.

## The dataset files

A build may create up to four files. The data, index, and map are not all sent
to the CDN:

| File | What it contains | Where it is normally kept |
| --- | --- | --- |
| `Name.rida` | Stored record-field values | Server, object storage, or CDN |
| `NameIndex.rida` | Catalog that maps record IDs and field names to byte ranges, plus format metadata and a SHA-256 digest | With the reader; for a remote URL, it can be fetched from the matching URL or supplied separately |
| `NameMap.json` | Human-readable folder names for numbered IDs and a field-name map, when a folder build needs one | With the reader |
| `NameKey.rida` | A generated 256-bit key, only when encryption is enabled | Private; never publish it beside a public data file |

The exact output names follow the chosen data filename. For example, an
encrypted build of the nested multilingual pages shown below produces:

```text
WebsiteData.rida     the stored page values
WebsiteIndex.rida    the catalogue used to locate those values
WebsiteMap.json      the folder names behind numbered record IDs
WebsiteKey.rida      the key used to decrypt the values
```

The key file is created only when the builder generates a new encryption key.
If you supply an existing key, keep that key separately. A map is created when
a numbered folder build has folder names to preserve; datasets with named IDs
or no nested folder paths may not need one.

### What each file does during a lookup

**Data:** `WebsiteData.rida` holds the actual values: the English, Hindi, Urdu,
and Spanish page content, for example. Put this file on your server or CDN.
It can be large because the reader requests only the ranges it needs.

**Catalogue:** `WebsiteIndex.rida` is the index file containing the catalogue.
Given a record ID and a field name, it tells the reader the starting byte and
stored length of that value in the data file. It also identifies the codec and
encryption settings. The catalogue is what makes a direct range lookup possible;
the app does not scan the data file to find a page or language.

**Map:** `WebsiteMap.json` associates numbered folder prefixes with readable
names and lists the field-name mapping. For example, it connects the prefix
`1/1/1/1` with `guides/getting-started/installation/pages`. You can use the map
to resolve that folder path and list its record IDs instead of guessing how
many `1/` components to write. The catalogue supplies the actual record IDs;
the map gives their folder prefixes human-readable names. It does not store
page content or byte locations, and it does not preserve original JSON
filenames as a separate filename list.

**Key:** `WebsiteKey.rida` lets the reader decrypt encrypted field values.
It is not needed for an unencrypted dataset and is not a storage-provider API
key. Keep it private and provide it to an authorised reader. The key does not
choose a record or calculate its byte range; the map and catalogue handle
those jobs.

### Find a record without guessing its numeric path

For the nested pages example, keep the matching map and index beside the local
data file. The reader discovers those companions automatically:

```js
import { RidaReader } from "rida-format";

const reader = await RidaReader.open("./WebsiteData.rida");
try {
  const prefix = reader.resolve("guides", "getting-started", "installation", "pages");
  if (!prefix) throw new Error("The requested folder is not in this map");

  console.log(prefix);                       // "1/1/1/1" for this example
  console.log(reader.recordsUnder(prefix));  // the four page record IDs
  console.log(reader.fields);                // english, hindi, urdu, spanish

  const spanish = await reader.get(
    "guides/getting-started/installation/pages/2",
    "spanish",
  );
  console.log(spanish);
} finally {
  await reader.close();
}
```

This example opens an unencrypted dataset. For an encrypted build, also supply
its key using the `key` option, as shown in [Encryption and keys](#encryption-and-keys).
For a remote data URL, supply the map explicitly; it is not discovered from
the remote URL automatically. Keep the data, catalogue, and map from the same
build together, because rebuilding a changed folder tree can change the IDs
and byte addresses.

The index contains a 72-byte header followed by a compressed catalog. The
header has no text label or descriptive header block; it contains fixed binary
fields used by the reader. The data file contains encoded values, not a copy of
the input JSON document. The map contains folder and field labels; it is not
needed to look up a record by its numeric ID.

## Requirements

- Node.js **20 or newer**.
- npm, which is included with the standard Node.js installers.
- The package dependency `lzma-native`, used to read and write the XZ/LZMA
  compressed catalog. It includes native code. Installation uses a compatible
  prebuilt binary when available; some systems may need native build tools.
- No database, cloud SDK, account, or server process is required by the
  library. Remote reads use Node.js `fetch` and ordinary HTTP requests.

## Install from npm

Install the package in the Node.js project that will use RIDA:

```sh
npm install rida-format
```

To see the command-line help after installation:

```sh
npx rida-format --help
```

To check the installed package version:

```sh
npx rida-format --version
```

The examples below use `npx rida-format`. If you install the package globally,
you can run the command directly as `rida-format --help`.

```sh
npm install -g rida-format
rida-format --help
```

If you are working inside a downloaded copy of the package source instead of
installing it as a dependency, install its dependencies and run its CLI file:

```sh
npm install
npm run start -- --help
```

## Input JSON

The builder accepts either a folder of record files or one large JSON file.

### Folder of JSON records

Use a folder when each record is already saved as its own JSON file. This works
for many kinds of mostly-static JSON data: product catalogues, help articles,
public directories, app configuration snapshots, or archived sensor readings.
The records do not have to describe the same subject as long as your app has a
reason to publish and read them as one dataset.

RIDA reads each visible `.json` file as one record; the filename is not treated
as the record's JSON content. Nested folders are searched too. File extensions
are case-insensitive, and files or folders whose names start with `.` are
skipped.

For example, this folder contains three records:

```text
records/
└── catalogue-export/
    ├── accessories/
    │   ├── SKU-1001.json
    │   └── SKU-1002.json
    └── furniture/
        └── SKU-1001.json
```

Every file must have a JSON object at its top level. The object is one record;
its keys are field names and its values are the field contents. For example,
`records/catalogue-export/accessories/SKU-1001.json` can contain:

```json
{
  "sku": "SKU-1001",
  "name": "Desk lamp",
  "price": 1299,
  "available": true,
  "details": { "colour": "black", "warranty_months": 12 }
}
```

Strings, numbers, booleans, `null`, arrays, and nested objects are all valid
field values. The whole file must be valid JSON: comments, trailing commas,
`NaN`, and `Infinity` are not accepted. An empty file, a top-level array, or a
top-level string is not a record file; use the single-file array format below
if your source is an array of records.

Build the folder like this:

```sh
npx rida-format scan ./records
npx rida-format build ./records --output ./CatalogueData.rida
```

`scan` reports how many records and fields it found and which field names are
available. It only reads the input and does not create output files. `build`
then reads the records and creates the data file, matching index, and map when
the folder names need one. It does not modify the source JSON files, and it
will stop rather than overwrite an output file that already exists.

### Folder names and record IDs

By default, folder records receive numeric IDs derived from their folder path
and their position among files in that folder. For example, records inside
`accessories/` and `furniture/` get distinct IDs even when both contain a file
named `SKU-1001.json`. The map file connects generated folder prefixes back to
their original names and also keeps the field-name mapping. Keep
`CatalogueMap.json` with the app when you want to resolve names; it is not
required for a lookup that already has the numeric record ID.

Treat numbered IDs as positions in the input tree. If you add, remove, rename,
or reorder folders or files, rebuild and distribute the matching index and map
with the data file; old IDs may point to different records. Keep the input tree
unchanged when you need IDs to remain consistent across builds.

If the JSON filenames are already meaningful IDs, use `--named-ids` to use
each filename without its `.json` extension. A product export might look like
this:

```text
named-records/
├── SKU-1001.json
└── SKU-1002.json
```

```sh
npx rida-format build ./named-records --named-ids --output ./CatalogueData.rida
npx rida-format get ./CatalogueData.rida SKU-1001 price
```

If two files have the same basename, RIDA makes the IDs unique by adding a
suffix, such as `1` and `1-2`. Named IDs do not preserve folder names as
lookupable prefixes; choose numbered IDs when the app should navigate by the
folder hierarchy.

### Deeply nested folders: a five-part record ID

Folders can have several levels. A device-data export, for example, might
organise records by region, city, device, and date:

```text
sensor-export/
└── europe/
    └── berlin/
        └── device-001/
            └── 2026-10-01/
                └── 1.json
```

Select the source folder itself with `--records-dir .` to retain this entire
hierarchy beneath that root:

```sh
npx rida-format scan ./sensor-export --records-dir .
npx rida-format build ./sensor-export --records-dir . --output ./SensorsData.rida
```

For this tree, with one child at each level and one record file, the record ID
is `1/1/1/1/1`. The first four numbers identify folders; the last identifies
the record inside the final folder. The source root `sensor-export/` is not
another ID component. Use the ID without a leading slash.

The generated `SensorsMap.json` records the folder names:

```json
{
  "version": 1,
  "records": 1,
  "paths": {
    "1": "europe",
    "1/1": "berlin",
    "1/1/1": "device-001",
    "1/1/1/1": "2026-10-01"
  },
  "fields": {
    "1": "temperature",
    "2": "diagnostics",
    "3": "history"
  }
}
```

Those example field entries correspond to the record shown below. Real IDs
and map entries depend on the folders and files in your actual input. More
folder levels produce longer IDs; five components are an example, not a format
limit. Folder depth does not make a lookup download the surrounding folders
or records: the index still identifies the requested field's range directly.
Normal filesystem path limits and available memory still apply.

The same structure can organise other datasets:

| Use case | Example record path beneath the source root | Field an app might request |
| --- | --- | --- |
| Product catalogue | `region/category/brand/model/1.json` | `price`, `availability`, or `specifications` |
| Help centre | `language/product/version/topic/1.json` | `answer` or `steps` |
| Public directory | `country/state/city/category/1.json` | `address` or `opening_hours` |
| Configuration snapshots | `environment/service/version/region/1.json` | `settings` |
| Archived device readings | `region/city/device/date/1.json` | `temperature` or `diagnostics` |

The subject does not change the lookup: the app supplies a record ID and a
field name. Folder names provide organisation, and the map preserves that
organisation for the reader.

### A field can contain a complete object or array

Deep folders and nested JSON are separate things. Folders determine record
IDs. Within each record, RIDA stores every **top-level field value** as a
separate value, including any nested objects or arrays inside it. For example,
the sensor record above can contain:

```json
{
  "temperature": 24.6,
  "diagnostics": {
    "battery_percent": 82,
    "firmware": "2.4.1",
    "status": "healthy",
    "network": { "signal_dbm": -61, "connected": true }
  },
  "history": [
    { "time": "10:00", "temperature": 24.1 },
    { "time": "10:05", "temperature": 24.6 }
  ]
}
```

Read just the temperature:

```sh
npx rida-format get ./SensorsData.rida 1/1/1/1/1 temperature
```

Read the complete diagnostics object, including its nested `network` object:

```sh
npx rida-format get ./SensorsData.rida 1/1/1/1/1 diagnostics
```

The result contains all the diagnostics shown above. RIDA reads the stored
range for `diagnostics`, decompresses it if needed, decrypts it when a key is
required, and returns the complete JSON value. It does not need to fetch
`temperature` or `history` for that call. The same lookup works against a CDN:

```sh
npx rida-format get https://cdn.example.com/SensorsData.rida 1/1/1/1/1 diagnostics \
  --index ./SensorsIndex.rida
```

A range does not have a fixed tiny size. It contains however many stored bytes
that field needs. A long article, detailed specifications object, or large
history array is returned in full when you ask for that field. Compression may
make its transferred bytes smaller than its decoded JSON; encryption adds
nonce and authentication bytes. A large field still requires a correspondingly
large read, and the current builder must be able to fit one record in memory.

RIDA does not automatically turn nested keys into independent fields. In the
example, `diagnostics.network.signal_dbm` is inside `diagnostics`; it is not a
separately indexed field. If your app often needs only that one value, give it
its own top-level key before building, for example:

```json
{
  "temperature": 24.6,
  "battery_percent": 82,
  "signal_dbm": -61,
  "connected": true
}
```

Now a `get` for `signal_dbm` reads only that field's stored value. A dotted
top-level key such as `"network.signal_dbm"` is also allowed, but it is a literal
field name, not an instruction to traverse a nested object. Choose field
boundaries around what your screens actually need: one whole object when the
screen needs all its details, separate fields when screens need small pieces.

To read several fields or the entire record, use:

```sh
npx rida-format get-many ./SensorsData.rida 1/1/1/1/1 temperature diagnostics
npx rida-format record ./SensorsData.rida 1/1/1/1/1
```

Multi-field reads may merge nearby ranges. A whole-record read returns all
present fields, so its transfer is larger than reading one small field.

### Complete multilingual pages inside nested folders

A documentation site or mobile app can keep each page as one record, with
separate language fields inside that record. For example:

```text
site-content/
└── guides/
    └── getting-started/
        └── installation/
            └── pages/
                ├── 1.json
                ├── 2.json
                ├── 3.json
                └── 4.json
```

Here there are four page records, not sixteen language records. Each file can
contain `english`, `hindi`, `urdu`, and `spanish`. Each language can hold a
complete page object with a title, paragraphs, steps, and other JSON content.
For example, `pages/2.json` could contain:

```json
{
  "english": {
    "title": "Install the application",
    "paragraphs": [
      "Download the installer for your operating system.",
      "Open the installer and follow the instructions."
    ],
    "steps": ["Choose a folder", "Finish installation", "Open the application"]
  },
  "hindi": {
    "title": "ऐप्लिकेशन इंस्टॉल करें",
    "paragraphs": [
      "अपने ऑपरेटिंग सिस्टम के लिए इंस्टॉलर डाउनलोड करें।",
      "इंस्टॉलर खोलें और निर्देशों का पालन करें।"
    ],
    "steps": ["फ़ोल्डर चुनें", "इंस्टॉलेशन पूरा करें", "ऐप्लिकेशन खोलें"]
  },
  "urdu": {
    "title": "ایپلیکیشن انسٹال کریں",
    "paragraphs": [
      "اپنے آپریٹنگ سسٹم کے لیے انسٹالر ڈاؤن لوڈ کریں۔",
      "انسٹالر کھولیں اور ہدایات پر عمل کریں۔"
    ],
    "steps": ["فولڈر منتخب کریں", "انسٹالیشن مکمل کریں", "ایپلیکیشن کھولیں"]
  },
  "spanish": {
    "title": "Instalar la aplicación",
    "paragraphs": [
      "Descarga el instalador para tu sistema operativo.",
      "Abre el instalador y sigue las instrucciones."
    ],
    "steps": ["Elige una carpeta", "Completa la instalación", "Abre la aplicación"]
  }
}
```

The other files use the same language fields for their own page content. Build
all four pages while retaining the folder hierarchy:

```sh
npx rida-format build ./site-content --records-dir . --output ./WebsiteData.rida
```

For this exact tree, the four folder components form the prefix `1/1/1/1`, and
the last component selects a page:

| Source file | Record ID |
| --- | --- |
| `guides/getting-started/installation/pages/1.json` | `1/1/1/1/1` |
| `guides/getting-started/installation/pages/2.json` | `1/1/1/1/2` |
| `guides/getting-started/installation/pages/3.json` | `1/1/1/1/3` |
| `guides/getting-started/installation/pages/4.json` | `1/1/1/1/4` |

Fetch page 2 in Spanish:

```sh
npx rida-format get ./WebsiteData.rida 1/1/1/1/2 spanish
```

This returns the complete Spanish value: its title, both paragraphs, and all
three steps. It reads the stored range for `spanish` from page 2. It does not
need the English, Hindi, or Urdu values, or pages 1, 3, and 4. With the matching
map loaded, a readable folder path also works:

```sh
npx rida-format get ./WebsiteData.rida guides/getting-started/installation/pages/2 spanish
```

Upload `WebsiteData.rida` to your CDN and keep the index with the reader. The
same Spanish lookup then uses the remote data URL:

```sh
npx rida-format get https://cdn.example.com/WebsiteData.rida 1/1/1/1/2 spanish \
  --index ./WebsiteIndex.rida
```

The language field can contain a much longer page than this example. All of
its content will be returned, including nested objects and arrays. The range
size follows the stored Spanish value's size; a long page is not guaranteed
to fit into a few hundred bytes. Folder nesting does not add other pages to
that range.

If a screen needs two languages, request both. If it needs all languages for
the page, read the complete record:

```sh
npx rida-format get-many ./WebsiteData.rida 1/1/1/1/2 english spanish
npx rida-format record ./WebsiteData.rida 1/1/1/1/2
```

The complete-record call returns English, Hindi, Urdu, and Spanish for page 2.
It does not return every page in the `pages` folder. For a screen that needs
only a translated title, give each title its own top-level field, such as
`spanish_title`; otherwise requesting `spanish` also transfers its paragraphs
and steps.

### More than one group in the input folder

When the source folder has JSON files directly inside it and also has
immediate subfolders with JSON records, or when it has multiple immediate
subfolders containing records, RIDA sees separate groups. The Node.js CLI
reports an error and tells you how to select a group or combine groups; it
does not choose for you or silently mix unrelated files.

To build just one group, point `--records-dir` at that folder inside the source:

```text
source/
├── config.json
├── customers/
│   └── C-1001.json
├── orders/
│   └── O-5001.json
└── products/
    └── SKU-1001.json
```

```sh
npx rida-format build ./source --records-dir products \
  --output ./ProductsData.rida
```

`--records-dir` searches the selected folder and all of its nested folders.
It excludes files outside that folder. You can build `customers`, `orders`,
and `products` as separate datasets, or intentionally combine groups using
`--combine-groups`. Combining groups with different fields uses the union of
their fields by default; see [Folder groups](#folder-groups) for how to choose
between union and common fields.

### One JSON object mapping IDs to records

The top-level object can map record IDs to record objects. The IDs must be
strings:

```json
{
  "product-1001": { "name": "Desk lamp", "price": 1299 },
  "product-1002": { "name": "Office chair", "price": 7499 }
}
```

### One JSON array of records

An array needs `--id-key` so the builder knows which field supplies each
record's ID:

```json
[
  { "id": "event-1001", "type": "signup", "source": "web" },
  { "id": "event-1002", "type": "purchase", "source": "mobile" }
]
```

The value of the selected ID field is converted to text. The ID field remains a
regular field in the record too.

The single-file reader processes records one at a time instead of parsing the
entire JSON document into memory at once. The current record and catalog
metadata still need memory, so an individual record must fit in memory.

## Scan before building

`scan` counts records and lists the fields it finds. It is useful for checking
the input and spotting the field names an app can request:

```sh
npx rida-format scan ./records
npx rida-format scan ./records.json
npx rida-format scan ./records-array.json --id-key id
```

For a folder, the command reports the number of records, field names, and the
number of mapped folders. Scanning does not create a RIDA dataset.

## Build a dataset

Build from a folder:

```sh
npx rida-format build ./records --output ./BooksData.rida
```

Build from an object mapping IDs to records:

```sh
npx rida-format build ./records.json --output ./BooksData.rida
```

Build from an array using its `id` field:

```sh
npx rida-format build ./records-array.json --id-key id --output ./BooksData.rida
```

If `--output` is omitted, the output name is based on the source file or folder.
The builder also creates the matching index and any required map or key files.
It refuses to overwrite an output file that already exists; choose a new output
name or move the old files first.

### Folder groups

If the input folder contains JSON files directly and also has immediate
subfolders containing JSON records, the builder treats those as separate
groups. It stops and asks you to choose one of two approaches:

1. Select one group with `--records-dir`.
2. Include the groups together with `--combine-groups`.

For example, to use only the `items` subfolder:

```sh
npx rida-format build ./source --records-dir items --output ./ItemsData.rida
```

`--records-dir` is a folder path inside the source folder. Its JSON files and
subfolders are included.

To combine groups into one dataset:

```sh
npx rida-format build ./source --combine-groups --output ./AllData.rida
```

By default, a combined dataset uses the **union** of fields: every field found
in any group is kept. A record that does not have one of those fields simply
has no value stored for it. To keep only fields present in every group, use the
common schema:

```sh
npx rida-format build ./source --combine-groups --combined-schema common \
  --output ./SharedFieldsData.rida
```

The common schema drops fields that are not shared by all groups. Choose it
only if those fields are not needed. `--combined-schema` accepts `common` or
`union` and applies to combined builds.

## Record IDs and the map

Folder builds use numbered IDs by default. Files in a flat folder receive
sequential IDs such as `1`, `2`, and `3`. Nested folders add a numbered level,
such as `1/1`, `1/2`, or `2/1`. The ordering is deterministic: folders and
filenames are sorted, with numeric filenames ordered numerically.

When nested folders need human-readable names, the build writes `NameMap.json`.
It contains the folder paths and the field names associated with their numeric
IDs. Keep that map with the reader if your application needs those labels.

`--named-ids` uses each file's basename as its record ID instead of numbered
folder paths. If names collide, the builder adds suffixes such as `-2` and
`-3`. This mode does not create the numbered folder map.

For a single JSON object or array, the record IDs come from the object's keys
or `--id-key`; the builder keeps those IDs instead of deriving them from folder
positions.

## Build options

| Option | Meaning | Default |
| --- | --- | --- |
| `--output FILE` | Data file path to create | Name based on the input |
| `--mode auto\|dense\|sparse` | Choose how record-to-field locations are stored in the catalog | `auto` |
| `--codec deflate-per-field\|plain` | Compress each stored value separately, or store its JSON bytes without compression | `deflate-per-field` |
| `--compression 0-9` | XZ compression level for the catalog; this does not set the value codec | `9` |
| `--encrypt` | Generate a new key and encrypt every stored value | Off |
| `--key KEY_OR_FILE` | Encrypt with an existing 32-byte key supplied as text or a file | None |
| `--records-dir FOLDER` | Select a folder inside the input folder | None |
| `--combine-groups` | Combine multiple input groups into one dataset | Off |
| `--combined-schema common\|union` | Keep fields shared by all groups, or all fields found across them | `union` |
| `--id-key FIELD` | ID field for a top-level JSON array | None |
| `--named-ids` | Use JSON file basenames rather than numbered folder IDs | Off |

`auto` selects a catalog layout by comparing the dense and sparse row sizes.
Choose `dense` or `sparse` to force a layout. This setting affects the catalog,
not the field values in the data file.

`deflate-per-field` writes one raw Deflate stream per value. `plain` writes the
compact UTF-8 JSON representation of each value without value compression.
`--compression` controls compression of the catalog stored in the index; it is
separate from the per-value codec.

The command prints progress while scanning records and writing values. It does
not provide a byte-accurate percentage for every internal step.

## Encryption and keys

Use `--encrypt` to create a new random 256-bit AES key and encrypt every value:

```sh
npx rida-format build ./records --output ./PrivateData.rida --encrypt
```

This creates `PrivateDataKey.rida`. The key file contains base64url text. Keep
it private and back it up securely; if it is lost, encrypted values cannot be
read. Do not upload the key with the public data file.

You can also pass an existing 32-byte key as a file or as base64/base64url or
hex text:

```sh
npx rida-format build ./records --output ./PrivateData.rida --key ./my-key.txt
```

Use either `--encrypt` or `--key`, not both. Encryption is applied after the
chosen value codec, so the order is JSON encoding, optional Deflate compression,
then AES-256-GCM encryption. Each encrypted value has a 12-byte nonce and a
16-byte authentication tag in addition to its encoded contents.

Encryption protects values from people who can download the data file but do
not have the key. It does not hide the index's record count, field names, data
length, or catalog structure. An app that receives the key must protect it as
carefully as any other secret; a key embedded in a client app can be extracted
by someone who controls that device.

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

The npm package runs in Node.js, including a Next.js server. Direct decryption
in a browser or mobile app requires a compatible reader for that platform;
installing this Node.js package does not itself supply a browser reader.

## Read a local dataset

The reader finds a sibling `NameIndex.rida` automatically. For a local file it
also loads a sibling `NameMap.json` if one exists. Read one value:

```sh
npx rida-format get ./BooksData.rida 1/1 translation.urdu
```

Read several fields from one record:

```sh
npx rida-format get-many ./BooksData.rida 1/1 title translation.urdu
```

Read all fields present in a record:

```sh
npx rida-format record ./BooksData.rida 1/1
```

Show dataset information and field names:

```sh
npx rida-format info ./BooksData.rida
```

If the files have different names or locations, pass the index and map paths
explicitly:

```sh
npx rida-format get ./BooksData.rida 1/1 translation.urdu \
  --index ./Catalog.rida --map ./Names.json
```

For encrypted values, supply the key file:

```sh
npx rida-format get ./PrivateData.rida 1/1 title --key ./PrivateDataKey.rida
npx rida-format get-many ./PrivateData.rida 1/1 title body --key ./PrivateDataKey.rida
npx rida-format record ./PrivateData.rida 1/1 --key ./PrivateDataKey.rida
```

The CLI prints each result as JSON. A missing record, field, index, or required
key produces an error and a non-zero command exit status.

## Read from an HTTP URL or CDN

Give the reader a direct URL to the data file:

```sh
npx rida-format get https://cdn.example.com/BooksData.rida 1/1 translation.urdu
```

When `--index` is omitted, the reader derives an adjacent index URL by replacing
`Data` in the data filename with `Index`. For example, a data URL ending in
`BooksData.rida` uses `BooksIndex.rida`. If your index is stored elsewhere,
provide it explicitly:

```sh
npx rida-format get https://cdn.example.com/BooksData.rida 1/1 title \
  --index https://app.example.com/catalog/BooksIndex.rida
```

For a remote read, the index is fetched when the reader opens. The map is not
automatically discovered from a remote URL. Provide it with `--map` if the
lookup needs folder names; otherwise use the numbered record ID:

```sh
npx rida-format get https://cdn.example.com/BooksData.rida 1/1/1/5 title \
  --map https://app.example.com/catalog/BooksMap.json
```

The HTTP host must honor the `Range` request and return status `206` with
exactly the requested number of bytes. If the host returns the whole file
instead, the reader stops with an error rather than accepting that response.
RIDA does not add cloud-provider authentication headers; use a publicly
readable URL or a signed URL that allows the request.

One `get` requests one value range. `get-many` and `record` can merge nearby
values into fewer ranges. A whole-record read may transfer gaps between nearby
values as well as the requested values. Every HTTP request also has headers, so
the bytes shown by a CDN may be greater than the requested file-range bytes.

### Put the data file on a CDN

RIDA creates the files; it does not upload or host them. A typical setup is:

1. Build the dataset on your computer.
2. Keep `NameIndex.rida` and, when present, `NameMap.json` with the app or
   reader, or host the index where the reader can fetch it.
3. Upload `NameData.rida` to object storage or a CDN origin. If the reader is
   expected to derive the index URL automatically, upload the matching index
   beside it too.
4. Make the data object readable through a direct HTTPS URL.
5. Open that URL with `RidaReader` or pass it to a CLI read command.

For example, if `BooksData.rida` is at
`https://data.example.com/BooksData.rida`, the reader derives the sibling
`BooksIndex.rida` URL unless `index` is supplied explicitly. Keep the index
available at that derived URL, or pass the actual index URL. A remote map is
not discovered automatically; pass its URL only when the app needs names from
numbered folder IDs.

Before relying on a storage/CDN setup, check that a request with a `Range`
header receives `206 Partial Content`, a matching `Content-Range`, and only the
requested bytes. A host that returns `200 OK` with the entire object cannot be
used for a RIDA range read. Also check that the URL is public or signed for the
app's requests, that cross-origin browser requests allow the needed headers,
and that the CDN cache key and cache rules preserve the requested byte range.
RIDA does not configure any of these provider settings for you.

Any object store or CDN can work if its public file URL supports the required
HTTP range behavior. This can include services such as Bunny, Cloudflare R2,
Amazon S3, Google Cloud Storage, Azure Blob Storage, or Backblaze B2, but the
exact URL, permissions, and CDN configuration matter. This is compatibility
through ordinary HTTP; the package does not include provider-specific upload
or account-management integrations.

The first remote open loads the index; each lookup then requests data ranges.
You can pass an index file bundled with the app, or let the reader fetch the
index from its URL. Keep the encryption key private. A
browser or mobile app that contains the key cannot keep it secret from a device
owner; encryption is useful when the application has a safe way to deliver and
protect that key.

### What a lookup transfers

A single-field lookup requests the byte range for that stored value. It does
not download the whole RIDA data file and does not hash the whole file. A
`get-many` call may combine nearby fields into one range; `getRecord` reads all
fields. When fields are far apart, the reader can make more than one range
request rather than transferring a large unused gap.

The payload size and the CDN's logged or billed byte count can differ. HTTP
headers, TLS and protocol overhead, provider accounting units, and range/cache
handling can add to what the application asks for. In one Bunny test, a 256-byte
range was recorded in the dashboard as about 1.02 kB. Treat the range length as
the requested file payload, not as a promise that every provider will bill
exactly that many bytes.

### Example delivery-cost comparison

For a reference workload of 27,647 records and 34 fields, an average complete
JSON record is about 7.69 KB; an average stored RIDA field value with per-field
Deflate is about 143 bytes. If an application usually asks for one field, this
model estimates roughly 98% fewer data bytes than transferring the whole JSON
record.

The table shows an illustrative one-billion-lookups-per-month estimate. It
compares delivery charges for that workload, not a quote for your account and
not a measured result from every provider. The RIDA estimate assumes one
requested field per lookup and the measured average field size.

| Provider and region | Billing basis in the estimate | Whole JSON | RIDA field read |
| --- | --- | ---: | ---: |
| Bunny CDN Standard, Asia | Per GB delivered | $230.79/mo | $4.29/mo |
| Bunny CDN Volume, first tier | Per GB delivered | $38.46/mo | $0.71/mo |
| AWS CloudFront, US / Europe | Per GB delivered | $653.90/mo | $12.15/mo |
| AWS CloudFront, India | Per GB delivered | $1,307.80/mo | $24.31/mo |
| Google Cloud CDN, US / Europe | Per GB delivered | $615.44/mo | $11.44/mo |
| Google Cloud CDN, Asia | Per GB delivered | $923.16/mo | $17.16/mo |
| Azure CDN, Zone 1 | Per GB delivered | $623.13/mo | $11.58/mo |
| Azure CDN, Zone 2 | Per GB delivered | $1,038.55/mo | $19.30/mo |
| Backblaze B2 + Bunny CDN | Per GB delivered | $76.93/mo | $1.43/mo |
| Cloudflare R2 Class B reads | Per read in this estimate | $356.40/mo | $356.40/mo |

RIDA's smaller response can reduce transfer charges on providers that bill for
GB delivered. It does not automatically reduce a per-request charge: the R2
example stays the same because both cases use one read per lookup in this
model. `get-many` can reduce request count when an app needs several nearby
fields, but it may transfer bytes between those fields too.

These figures cover the modeled delivery workload only. Actual charges depend
on current provider rates, user locations, cache-hit behavior, request count,
minimum charges, taxes, storage size, and how many fields the app asks for.
Storage is an additional line item; in the compared setups, 5 GB was estimated
at roughly $0.02–$0.37 per month and 50 GB at $0.20–$3.70. Any storage
allowance is account-wide and depends on the provider's current plan. Check the
provider's current price and account terms before using these numbers for a
budget. SQL databases also have compute, storage, and query charges that this
delivery table does not compare; compare both systems with the same workload
and service requirements.

### When RIDA can replace repeated database reads

RIDA is designed for data that is built ahead of time and then read many times:
for example, a public reference collection, a catalogue, or records that
change only when the publisher creates a new dataset. The app uses the index
to locate a field and fetches its bytes from the data file.

RIDA is not a general database. It does not provide live writes, transactions,
SQL queries, user-specific filtering, or server-side joins. If an application
needs those features, a database remains necessary. A system can also use both:
keep changing/private application data in a database and serve a large static
read-only collection through RIDA. Whether that costs less depends on the real
read pattern, response sizes, hosting and database plans, and operational needs;
the delivery table above is not a SQL price comparison.

## Inspect and verify

`info` opens the index and prints the record count, field names, codec, catalog
layout, encryption flag, and data length:

```sh
npx rida-format info ./BooksData.rida
```

`verify` reads the entire data file in chunks and checks its SHA-256 digest
against the digest in the index:

```sh
npx rida-format verify ./BooksData.rida
npx rida-format verify https://cdn.example.com/BooksData.rida
```

For a remote URL, verification transfers the complete data file. It is not a
small lookup and can use significant bandwidth and time. A normal `get` reads
only its requested range and does not hash the entire data file.

## Use the JavaScript API

Import the reader from the installed package:

```js
import { RidaReader } from "rida-format";

const reader = await RidaReader.open("./BooksData.rida");
try {
  const value = await reader.get("1/1", "translation.urdu");
  console.log(value);
} finally {
  await reader.close();
}
```

Read a URL in the same way:

```js
import { RidaReader } from "rida-format";

const reader = await RidaReader.open("https://cdn.example.com/BooksData.rida", {
  index: "https://app.example.com/catalog/BooksIndex.rida",
});
try {
  console.log(await reader.get("1/1/1/5", "title"));
} finally {
  await reader.close();
}
```

For an encrypted dataset, pass the key as a string, `Buffer`, or `Uint8Array`:

```js
import { readFile } from "node:fs/promises";
import { RidaReader } from "rida-format";

const key = (await readFile("./BooksKey.rida", "utf8")).trim();
const reader = await RidaReader.open("./BooksData.rida", { key });
try {
  console.log(await reader.get("1/1", "title"));
  console.log(await reader.getMany("1/1", ["title", "translation.urdu"]));
  console.log(await reader.getRecord("1/1"));
} finally {
  await reader.close();
}
```

Reader methods and properties:

| API | Purpose |
| --- | --- |
| `RidaReader.open(data, options)` | Open a local data path or HTTP/HTTPS data URL. Options: `index`, `map`, `key`. |
| `reader.get(recordId, field)` | Read and decode one field value. |
| `reader.getMany(recordId, fields)` | Read several named fields; nearby ranges may be combined. Returns an object keyed by field name. |
| `reader.getRecord(recordId)` | Read every field in the record. |
| `reader.info` | Index metadata, including encryption and digest information. |
| `reader.fields` | List of field names from the catalog. |
| `reader.recordCount` | Number of records in the dataset. |
| `reader.valueCodec` | `deflate-per-field` or `plain`. |
| `reader.mode` | `dense` or `sparse` catalog layout. |
| `reader.verifyData()` | Read all data bytes and compare the SHA-256 digest. |
| `reader.resolve(...folderNames)` | Resolve folder names through a loaded map. |
| `reader.recordsUnder(prefix)` | List record IDs beneath a numbered prefix. |
| `reader.close()` | Close the local file handle. Call it when finished. |

The builder functions are exported from the package's `./builder` subpath:

```js
import { build, scan } from "rida-format/builder";

const report = await scan("./records");
console.log(report.recordCount, report.fields);

const result = await build("./records", "./BooksData.rida", {
  mode: "auto",
  codec: "deflate-per-field",
  compression: 9,
});
console.log(result);
```

`scan(source, options)` returns the source path, record count, field names, and
folder mapping information. `build(source, output, options)` returns the output
paths, record and field counts, selected layout and codec, encryption status,
and data/catalog byte counts. Builder option names use JavaScript camel case:
`idKey`, `recordsDir`, `combineGroups`, `combinedSchema`, `numbered`, `mode`,
`codec`, `compression`, `encrypt`, and `key`.

## Value codec and catalog compression

The **value codec** controls how each field value is stored:

| Codec | What is stored | Use |
| --- | --- | --- |
| `deflate-per-field` | Each value is compact JSON encoded as UTF-8 and compressed in its own raw Deflate stream | Default; often reduces transfer for text and structured values |
| `plain` | Each value is compact JSON encoded as UTF-8 without value compression | Useful when values are tiny or already compressed |

Choose the codec while building:

```sh
npx rida-format build ./records --output ./BooksData.rida --codec plain
```

The **catalog compression** option (`--compression 0` through `--compression
9`) is separate. It controls how the index catalog is compressed with XZ/LZMA;
it does not change the encoding of the data values.

## Format compatibility

The Node.js reader and builder handle the RIDA 0.3.3 data/index format. The
index stores the value codec, encryption flag, data length, SHA-256 digest, and
compressed catalog. The catalog stores field names, record IDs when needed,
record-to-value offsets, and the dense or sparse layout. Values are compact
UTF-8 JSON, optionally raw-Deflate compressed per field, then optionally
encrypted with AES-256-GCM.

Reading a dataset does not convert or rewrite it. The Node.js code can read a
compatible dataset built by the Python RIDA 0.3.3 release. Building a dataset
creates new output files from JSON; it does not edit the source JSON.

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
npx rida-format build ./catalogue --output ./CatalogueData.rida --records-dir .
```

#### Your customer chooses Hindi

Request the hindi field. The reader uses the map to resolve the record and the index to find its byte range. The response contains the complete Hindi value: its title, description, and care instructions. Price, stock, specifications, English content, and image URLs are not selected.

```js
import { RidaReader } from "rida-format";

const reader = await RidaReader.open("./CatalogueData.rida");
try {
  const prefix = reader.resolve("products");
  if (!prefix) throw new Error("Folder not found in the map");
  const recordIds = reader.recordsUnder(prefix);
  // This exact example: 2812.json is the only record.
  const recordId = recordIds[0];
  console.log(await reader.get(recordId, "hindi"));
  console.log(await reader.getMany(recordId, ["price", "hindi"]));
} finally {
  await reader.close();
}
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
npx rida-format build ./help-centre --output ./HelpData.rida --records-dir .
```

#### Your user needs Spanish instructions

Request the spanish field to receive the complete Spanish object, including its nested troubleshooting content. English instructions are not selected. Use the generated map to find the folder prefix rather than guessing a numbered path.

```js
import { RidaReader } from "rida-format";

const reader = await RidaReader.open("./HelpData.rida");
try {
  const prefix = reader.resolve("guides", "account", "recovery", "pages");
  if (!prefix) throw new Error("Folder not found in the map");
  const recordIds = reader.recordsUnder(prefix);
  // This exact example: 3812.json follows 1.json and 2.json.
  const recordId = recordIds[2];
  console.log(await reader.get(recordId, "spanish"));
  console.log(await reader.getMany(recordId, ["title", "category", "spanish"]));
} finally {
  await reader.close();
}
```

Need page metadata too? Request title, category, and spanish together. RIDA selects stored fields, not individual properties inside them. If troubleshooting needs independent reads, store it in a separate top-level field.


A field can contain a complete object or array, not just a short sentence. A long value needs a larger byte range. An encrypted build returns the same selected values after decryption with the key. Encryption and HTTP headers add overhead; responses are not a fixed few bytes. Merged ranges can also include small gaps between selected values.

The filenames are source names, not guaranteed numbered record IDs. The map describes folder prefixes; records_under / recordsUnder lists their record IDs. Keep the chosen ID in your application when selecting a record. For a large catalogue, use your own product identifier field or mapping to associate business IDs with numbered record IDs.

## Current scope and limits

- The CLI commands are `scan`, `build`, `info`, `get`, `get-many`, `record`,
  and `verify`.
- The reader supports local data files and HTTP/HTTPS data URLs with byte-range
  support.
- Opening a remote reader fetches its index; the index is not fetched using a
  byte range. Keep it small enough for the client to load, or pass a suitable
  index explicitly.
- A local map file is discovered beside a local data file. A remote map must be
  passed explicitly with `--map` or the API's `map` option.
- The Node.js reader does not currently provide Python's automatic remote
  index-cache installer, provider-specific upload tools, exact-match search
  indexes, numeric-range search indexes, or full-text search indexes.
- RIDA does not upload, host, cache, or manage billing for your data. Those are
  handled by your storage provider, CDN, and application.
- A single record must fit in memory while it is parsed. The builder does not
  keep the full collection of JSON values in memory, but it keeps record IDs
  and catalog metadata for the build.
- `verify` reads the full data region. Use it when you want a complete file
  integrity check, not for each user lookup.

## License

The included `LICENSE` file governs use of this package. It includes specific
permission for publishing this Node.js edition as the standalone npm package
`rida-format`. Read the complete license before redistributing or embedding the
package in another product.
