# RIDA Studio for Mac

**Version 2.0.2** · **Apple Silicon arm64** · **macOS 12.0 or later**

[Download RIDA.dmg](https://github.com/Qasraf/rida/releases/download/studio-v2.0.2/RIDA.dmg) · [Release page](https://github.com/Qasraf/rida/releases/tag/studio-v2.0.2)

The DMG is approximately 118.9 MB (118,914,547 bytes at publication). RIDA Studio includes Electron/Chromium, Node.js and native dependencies so users do not have to install Python or Node separately. The installer is therefore larger than either command-line library.

## Supported Macs

This release targets Apple Silicon M-series Macs, including compatible MacBook Air, MacBook Pro, iMac, Mac mini, Mac Studio and Mac Pro models. It is not an Intel x64 build. Meeting the architecture/minimum-OS requirement is distinct from testing every Mac model; the release was prepared on an Apple Silicon Mac.

The app is signed with Developer ID and notarized by Apple. The approval ticket is attached. Notarization checks software for Apple's distribution security requirements; it is not an App Store publication or a guarantee of software correctness.

## Install

1. Download `RIDA.dmg` and open it.
2. Drag **RIDA Studio** into **Applications**.
3. Eject the disk image.
4. Open **RIDA Studio** from Applications.

A DMG is an installation disk image, not the application itself. The installed application has its bundled rounded RIDA icon. The outer DMG file's Finder icon is metadata and may appear generic after a browser download. A ZIP alternative on the release page preserves that file-icon metadata when extracted with macOS tools.

## Build workflow

1. **Choose source:** pick a JSON folder or a single JSON collection. For an array, supply its record ID field. Select a records subfolder when needed.
2. **Scan source:** review records, fields and mapped folders.
3. **Auto setup:** run a scan and show suggested settings, per-group counts and field layouts in a popup. Close the popup or choose separate/shared/all fields and apply the choice. Applying settings does not build anything.
4. **Build settings:** select automatic/dense/sparse index layout, compressed/plain values, catalogue compression, numbered/named identifiers and optional encryption/new or reused private key.
5. **Output location:** choose a new name and destination. Press **Build dataset** to create files.
6. Review progress and output paths. Data, index and map are created; a generated encryption key adds its private key file.

## Group choices

- **Separate files:** one output dataset per detected folder group, keeping its own fields.
- **Shared fields:** a combined dataset containing only fields common to every group.
- **All fields:** a combined dataset containing every detected field.
- **Auto setup:** scan and recommendation; the user chooses and applies a strategy.

One unusual JSON file inside a folder is not automatically discarded. Mixed layouts are reported, and separate outputs follow folder groups rather than inferring semantic categories. Keep configuration files out of your records folder or select the correct subfolder.

## Read and inspect

Open local data, or specify an HTTPS data URL and matching local index. Select companion map/key files if required. Read one field, selected fields or a complete record; inspect dataset metadata or run full verification. Full remote verification reads the complete data region and uses bandwidth.

## Privacy and scope

JSON processing happens locally. The app does not require an account or upload source JSON/keys. Choosing a remote URL causes the requested network reads. The app does not manage CDN accounts, perform billing, automatically split 500 MB objects, or provide database transactions.

There is no Windows `.exe` in this release. Python and Node package installations are separate options; do not treat this Mac release as validation of every Windows environment.
