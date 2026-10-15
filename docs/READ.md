# Read one field, several fields or a record

## Python

```python
import rida

with rida.RidaFile("ExampleData.rida") as data:
    print(data.get("backpack-2812", "hindi"))
    print(data.get_many("backpack-2812", ["price", "hindi"]))
    print(data.get_record("backpack-2812"))

with rida.RemoteRidaFile(
    "https://data.example.com/ExampleData.rida",
    index="ExampleIndex.rida",
) as data:
    print(data.get("backpack-2812", "hindi"))
```

Python CLI: `inspect`, `fields`, `get`, `folders`, `remote-get` and cache commands are documented in the [Python manual](PYTHON.md). Python uses the local index/cache workflow; a local matching index is not fetched again on every lookup.

## Node.js

```js
import { RidaReader } from "rida-format";
const reader = await RidaReader.open("https://data.example.com/ExampleData.rida", {
  index: "./ExampleIndex.rida",
});
try {
  console.log(await reader.get("backpack-2812", "hindi"));
  console.log(await reader.getMany("backpack-2812", ["price", "hindi"]));
  console.log(await reader.getRecord("backpack-2812"));
} finally {
  await reader.close();
}
```

Node CLI uses `info`, `get`, `get-many`, `record` and `verify`. A remote open can derive/fetch the index URL or use an explicit index. A remote map must be supplied when name resolution needs it. [Complete Node API](NODE.md#use-the-javascript-api).

## Map lookup

Use the generated map to resolve folder labels and the catalogue to list record IDs beneath that prefix. Keep a selected record ID associated with your own business identifier in the application; map files do not make the JSON basename a guaranteed numbered record ID.

## Multi-field reads

`get_many` / `getMany` select several fields. `get_record` / `getRecord` select all fields. Readers may combine adjacent/nearby values into fewer ranges when that is cheaper than another request. Merged ranges can include gaps, and distant values may require several requests. There is no universal one-request or fixed-byte promise for all multi-field workloads.

## HTTP contract

A data URL must support byte ranges and return `206 Partial Content` with the correct range/length. A full `200 OK` response is rejected instead of silently treating the whole file as one value. Keep the index and data from the same build. See [CDN setup](CDN.md) for a sample Range request.

## Integrity and verification

A routine field read does not hash the entire data file. Encrypted values authenticate during decryption. Full verification reads the complete data region and checks its stored SHA-256 digest and length. Node `verifyData()` also supports a remote data URL; it downloads the complete data region and can incur substantial traffic. Python `rida.verify()` and `RidaFile.verify_data()` verify local files; `RemoteRidaFile` does not provide that method.

Use a long-lived reader where appropriate rather than opening a new reader for every lookup. Python remote readers can reuse connections; opening/index loading and first TLS connections differ from warm reads.
