# Build a dataset

Install [Python](PYTHON.md) or [Node](NODE.md), or use [RIDA Studio](MAC-APP.md). The CLI syntax differs between the Python and Node editions; use the examples for your edition.

## Prepare the input

| Input | Structure | Identifier |
| --- | --- | --- |
| JSON folder | One top-level JSON object in each visible `.json` file; nested folders supported | Numbered folder IDs by default, or named IDs when selected |
| Single JSON object | An object mapping record IDs to record objects | Object keys |
| Single JSON array | An array of record objects | A selected ID field such as `product_id` |

Use valid JSON, not JavaScript object literals. Avoid comments, trailing commas and non-finite numbers. Give each independently readable part a top-level field. Arrays and nested objects are allowed as field values. A file containing an array is not the same as a folder of one-object record files.

For a representative object input see [examples/records.json](../examples/records.json). The [full input examples](NODE.md#input-json) explain repeated filenames, five-level paths and complete multilingual pages.

## Scan before building

```sh
# Python
rida scan examples/records.json
rida build examples/records.json ExampleData.rida --yes

# Node.js
npx rida-format scan examples/records.json
npx rida-format build examples/records.json --output ExampleData.rida
```

A scan reads the source and reports metadata; it does not create a dataset. Source JSON is not modified by a build. Select a new output name/location because existing output files are protected.

## Mixed folders and schemas

Suppose a source contains `catalogue/`, `help/` and `metadata/`. Their field sets may differ. Decide whether those are records you actually intend to include; a scanner does not know that a JSON file is an unwanted configuration file.

| Strategy | Result | Trade-off |
| --- | --- | --- |
| Separate files | Each folder group keeps its own fields and output dataset | More than one output set |
| Shared / common fields | One dataset keeps only fields every group shares | Group-specific fields are omitted |
| All / union fields | One dataset includes all detected fields | Some records have missing fields |
| Select a subfolder | Build only the intended records directory | Other folders excluded |

Python's interactive flow presents group choices. In Node CLI, use a selected `--records-dir` for a group or the combine/common/union options documented in the [Node manual](NODE.md#folder-groups). RIDA Studio provides separate, shared and all modes plus an Auto suggestion popup. Auto analyses the selected source and proposes settings; it never starts a build just because a suggestion was selected.

A mixed layout inside one flat folder is reported as such. Separate-folder outputs do not automatically classify or discard individual records by subject.

## Choose storage settings

- Prefer automatic index layout initially; force dense/sparse only when you have a reason.
- Choose compressed fields for text and structured content, or plain values when appropriate.
- Catalogue compression affects the index separately from stored field values.
- Enable encryption if the values should need a decryption key. Keep the key private and backed up.
- Keep numbered IDs with their map, or choose named identifiers for meaningful unique filenames.

## Large inputs

The folder builder processes records rather than loading the entire source collection of JSON values at once. A record still needs to fit in memory, and IDs/catalogue metadata also consume memory. Do not interpret low-memory processing as a fixed memory limit for every possible input. The library manuals describe large single-file JSON handling and temporary storage.

After a build, keep the complete matching output set. Upload only the intended data and public companions to your host; never publish the decryption key.
