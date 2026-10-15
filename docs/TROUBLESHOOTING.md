# Troubleshooting

| Symptom | What to check |
| --- | --- |
| `pip` or `rida` is not found | Python installation, the active environment and its executable search path; use `python -m pip` or `py -m pip` if your platform requires it |
| npm / npx is missing | Install a supported Node.js distribution with npm |
| Node dependency installation fails | `lzma-native` needs a compatible native binary or suitable build tools; consult the installation error for your platform |
| Python encryption fails to import | Check that the standard package installation completed, including `cryptography`; encryption is included in the normal install |
| Folder record is rejected | Each `.json` file in folder mode must be a JSON object, not an array/string; use single-file array input with an ID key where appropriate |
| A configuration JSON is included as a record | Select the intended records subfolder or prepare a clean records-only tree |
| Groups have different fields | Choose separate outputs, shared fields, union fields or a selected subfolder deliberately |
| A numbered record cannot be found | Use the matching map/catalogue, resolve folder names and list record IDs; do not infer the ID from its filename |
| Output already exists | Choose a new name/location; do not overwrite files belonging to another matching output set |
| Remote reader returns a range error | Verify HTTP 206, Content-Range, response length, permissions and absence of byte-changing transformations |
| Remote Node lookup needs folder names | Supply its matching map explicitly; remote map discovery is not automatic |
| Python remote index is unavailable | Provide the matching local index or install/check the URL-index cache described in the Python manual |
| Decryption/authentication fails | Check the matching key, unmodified encrypted bytes and matching data/index build |
| CDN dashboard bytes exceed a tiny range | HTTP/protocol headers, provider accounting and cache/origin behavior add overhead |
| Verification uses lots of bandwidth | Full verification reads the complete data region by design |
| DMG does not run on an Intel Mac | The current Mac release is arm64 for Apple Silicon |
| Windows desktop installer requested | No official Windows desktop installer is provided here; Python/Node package installation is separate and Windows behavior has not been verified by this Mac release |

Include package edition/version, OS, the exact command and a minimal generic JSON reproduction when reporting an issue. Never post real keys, tokens, private data or environment files.
