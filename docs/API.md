# API and command reference

## Python

```python
import rida
report = rida.scan("examples/records.json")
rida.build("examples/records.json", "ExampleData.rida")
with rida.RidaFile("ExampleData.rida") as data:
    value = data.get("backpack-2812", "hindi")
    several = data.get_many("backpack-2812", ["price", "hindi"])
    record = data.get_record("backpack-2812")
```

| Entry point | Purpose |
| --- | --- |
| `scan` | Inspect input and report/recommend a layout |
| `build` | Create a data file and matching companions |
| `RidaFile` | Local data reader |
| `RemoteRidaFile` | HTTP data reader using its matching local index/cache |
| `get` | Retrieve one top-level field |
| `get_many` | Retrieve selected fields, with range coalescing where appropriate |
| `get_record` | Retrieve the complete record |
| `RidaFile.resolve` / `RidaFile.records_under` | Resolve named folder prefixes and list record IDs with the local reader |
| `rida.verify(path)` / `RidaFile.verify_data()` | Verify a local data file against its index |
| `encryption_available` | Check encryption dependency availability |

Python `RemoteRidaFile` exposes `get`, `get_many`, `get_record` and `close`; it does not expose the local reader's map helpers or `verify_data()`.

The full [Python manual](PYTHON.md) documents arguments, cache operations, build choices and errors. Use `rida --help` and subcommand help for the installed version.

## Node.js

Import `RidaReader` from `rida-format`, or `build` and `scan` from `rida-format/builder`.

| API | Purpose |
| --- | --- |
| `await RidaReader.open(data, options)` | Open a local path or HTTP/HTTPS URL; options include `index`, `map`, `key` |
| `await reader.get(id, field)` | Read one field |
| `await reader.getMany(id, fields)` | Read selected fields |
| `await reader.getRecord(id)` | Read a complete record |
| `reader.info`, `reader.fields`, `reader.recordCount` | Metadata |
| `reader.mode`, `reader.valueCodec` | Layout and codec |
| `reader.resolve(...names)`, `reader.recordsUnder(prefix)` | Folder-map helpers |
| `await reader.verifyData()` | Full-data digest verification |
| `await reader.close()` | Close the file handle |

CLI commands: `scan`, `build`, `info`, `get`, `get-many`, `record`, `verify`.

Builder options include `idKey`, `recordsDir`, `combineGroups`, `combinedSchema`, `numbered`, `mode`, `codec`, `compression`, `encrypt`, `key`. [Full options and defaults](NODE.md#build-options).

## Important edition differences

Python uses positional build output (`rida build INPUT OUTPUT`) while Node uses `--output OUTPUT`. Python uses snake_case methods and Node uses camelCase. Python includes its automatic remote index-cache workflow; Node can derive/fetch an index URL or accept an explicit index. Do not assume every command or extra feature exists identically in both editions.
