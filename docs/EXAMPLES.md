# Detailed use cases

The data can describe any domain. These examples use products, help pages and archived device records. They are not limited to books or short text.

## A product with a complete Hindi description

[examples/records.json](../examples/records.json) contains a `backpack-2812` record with price, specifications and language-specific objects. The Hindi field includes a title, description and a list of care instructions.

Build it using either edition's quick start in the main README. Then request `hindi` to get the complete Hindi object. The English text, price and specifications are not selected. Request `price` and `hindi` together when the screen needs both.

```python
with rida.RidaFile("ExampleData.rida") as data:
    hindi = data.get("backpack-2812", "hindi")
    card = data.get_many("backpack-2812", ["price", "hindi"])
```

```js
const hindi = await reader.get("backpack-2812", "hindi");
const card = await reader.getMany("backpack-2812", ["price", "hindi"]);
```

The complete examples in [Python](PYTHON.md#detailed-application-examples) and [Node](NODE.md#detailed-application-examples) include the full record, build commands and cleanup/close handling.

## Nested help pages in four languages

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

A record can hold `english`, `hindi`, `urdu` and `spanish`, each a complete object containing headings, paragraphs, steps and troubleshooting. Reading `spanish` returns the whole Spanish object. It does not download the other language values.

Use the generated map to resolve `guides/account/recovery/pages`, then list the actual record IDs. Do not guess the generated ID from `3812.json`; filenames do not have to be numbered sequentially. In this exact example the file follows the other two, but the application should retain the ID selected from the catalogue.

Python uses `resolve` and `records_under`; Node uses `resolve` and `recordsUnder`. A remote reader needs its matching index and any map required for readable paths. Rebuilding after changes can change numbered IDs.

The full manuals contain a second complete multilingual pages example with `pages/1`, `pages/2`, `pages/3`, `pages/4` and a Spanish lookup, plus a five-component `1/1/1/1/1` folder example.

## Archived sensor readings

Organise records under region/city/device/date. A record might store temperature, calibration, raw observations and a diagnostic summary. A dashboard needing `diagnostics` reads that field's complete value without retrieving unrelated calibration/raw data. This suits snapshots and archives; continuous transactional updates require a separate write system and new dataset releases.

## Other fits

- Reference directories: address, opening hours and multilingual descriptions as separate fields.
- Documentation: full localised pages, with independently readable code samples or troubleshooting if stored separately.
- App configuration snapshots: fetch the selected configuration section instead of every section.
- Product specifications: retrieve one nested object for a product-detail screen.
- Precomputed AI-related records: retrieve a known vector or metadata field by ID; RIDA does not itself provide nearest-neighbour/vector search.

## Shape fields around actual reads

If a page puts every language inside one top-level `translations` field, reading that field returns all languages. If languages are separate top-level fields, the reader can request only Spanish. Large values are supported, but a large value still needs its own stored bytes. RIDA is not a nested JSON query engine.
