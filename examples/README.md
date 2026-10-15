# Run the examples

These are synthetic product records, not user/customer data. See the repository README for the Python and Node build commands. Build each edition into a separate output directory or use distinct names because existing output files are protected.

- `records.json`: object keyed by stable business IDs; works with the quick starts.
- `read.py`: local Python field, multi-field and whole-record reads.
- `read.mjs`: the same operations in Node.js.
- [Detailed examples](../docs/EXAMPLES.md): nested folders, complete language objects and sensor archives.

Install `rida-format` using pip for Python or npm for Node before running the appropriate reader. The code expects `ExampleData.rida` and its matching companions in the current working directory. A real encrypted dataset additionally requires its private key, which must never be committed.
