# lfm2-mobile-vlm

React Native + Android bridge for running LEAP (LiquidAI) LFM2 models with a demo app for image captioning and receipts/expense workflows.

[![CI](https://img.shields.io/badge/CI-local-blue)](./Documentation.md) [![Platform](https://img.shields.io/badge/platform-Android-green)](./Documentation.md#running--debugging) [![React%20Native](https://img.shields.io/badge/React%20Native-0.73%2B-61dafb)](https://reactnative.dev/) [![License](https://img.shields.io/badge/license-MIT-informational)](#license)

## Overview

This repository showcases a minimal, production-friendly bridge between React Native and the LEAP Android SDK. It includes:

- A native Android module exposing a small, stable JS API
- A TypeScript wrapper with evented streaming generation
- A sample UI with tabs (Dashboard, Journal, Reports) and a simple Playground flow to test the model

Use it as a starting point for mobile apps that run multimodal models on-device.

## Features

- Android-native LEAP bridge (`RNLeap`) with JS wrapper
- Streaming tokens with `onChunk`, `onDone`, `onError` callbacks
- Vision + text prompts (send image base64 + text)
- Demo UI with bottom tab navigation
- App-private CSV storage with first-run seeding (receipts and transactions)
- Works with large LFM2 model bundles (tested with LFM2‑VL‑450M)

## Screenshots

<!-- TODO: Add screenshots of Dashboard, Journal, Reports, Playground -->
<!-- Example: ![Dashboard](docs/img/dashboard.png) -->

## Quick Start

```pwsh
# 1) Clone
git clone <repo-url>
cd LeapRnApp

# 2) Install JS deps (Node 20+ recommended)
yarn install

# 3) Run Metro (terminal 1)
yarn start

# 4) Install & launch on Android (terminal 2)
yarn android

# Optional: pick a specific device
npx react-native run-android --deviceId <DEVICE_ID>
```

To test the model quickly, follow the in‑app Playground: load model → pick/take an image → stream caption.

## Prerequisites

- Android SDK + Java 17 (JDK 17)
- A physical Android device is recommended for large models
- Node.js 20+ and Yarn (or npm)

## Project Structure

- `app/src/leap/` – public JS API: `prepareBundledModel`, `loadModel`, `startStream`, `unloadModel`
- `app/src/screens/` – demo screens: Dashboard, Journal, Reports, Playground
- `android/leap/` – LEAP native module (Kotlin) auto‑linked via `react-native.config.js`
- `data/` – CSV mock data for first-run seeding

## Documentation

- Developer setup, model instructions, and in-depth technical notes have moved to `Documentation.md` and `MODEL_SETUP.md`.
        - `Documentation.md` – architecture, workflows, debugging tips, data storage
        - `MODEL_SETUP.md` – how to download and place the `*.bundle` model files
        - `InstallDev.md` – Windows/PowerShell‑friendly environment setup and troubleshooting

## Usage Highlights

The core happy path in JS:

```ts
import { prepareBundledModel, loadModel, startStream } from 'app/src/leap';

const path = await prepareBundledModel('lfm2-vl-450m.bundle');
await loadModel(path);

const stop = startStream([
    { type: 'text', text: 'Describe this image' },
    // Optionally include an image message:
    // { type: 'image_base64', data: '<BASE64>', mime: 'image/jpeg' }
], {
    onChunk: ({ text }) => console.log(text),
    onDone: (stats) => { console.log('done', stats); stop(); },
    onError: (e) => console.error(e),
});
```

See `app/src/screens/Playground.tsx` for a complete UI example.

## Roadmap

- iOS bridge parity (Swift `RNLeap`)
- Optional on-device downloader for models and updates
- More examples: OCR + structured extraction for receipts

## Contributing

Contributions are welcome. Please open an issue to discuss changes first. Follow the existing TypeScript conventions and keep the LEAP bridge API surface minimal.

## License

MIT. See `LICENSE`.

## Acknowledgements

- LEAP SDK by LiquidAI
- React Native community and libraries used (e.g., `react-native-image-picker`, `react-native-fs`)
