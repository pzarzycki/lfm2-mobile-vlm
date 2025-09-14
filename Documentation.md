# Project Documentation

This app demonstrates a React Native shell with a native Android bridge to LEAP (LiquidAI) models for scanning receipts and tracking expenses. It now includes a modern UI with a bottom tab bar and persistent CSV storage seeded on first run.

## Architecture

- UI: `App.tsx` renders tabs for `Dashboard`, `Journal`, and `Reports`.
- LEAP JS wrapper: `app/src/leap/` exposes `prepareBundledModel`, `loadModel`, `startStream`, and `unloadModel`; communicates with the native module via `NativeEventEmitter` events (`leap:chunk`, `leap:done`, `leap:error`, etc.).
- Storage: `app/src/storage/files.ts` manages app-private CSV files under `<DocumentDirectory>/data` using `react-native-fs`.
- Parsing: `app/src/storage/csv.ts` provides minimal CSV parsers for receipts and transactions and small helpers for summaries.
- Android native: `react-native.config.js` links the local module in `android/leap`.

## Workflows

- Install deps (Node >= 20): `yarn install`
- Start Metro: `yarn start`
- Build & run Android: `yarn android` (or `npx react-native run-android --deviceId <ID>`)
- Tests: `yarn test`; Lint: `yarn lint`.

## Models and Assets

- Model bundle preferred path for development: `android/app/src/main/assets/models/lfm2-vl-450m.bundle`.
- Load flow in Dashboard scan action: `prepareBundledModel('lfm2-vl-450m.bundle')` → `loadModel()` → `startStream()` with image + prompt.

## Data Seeding and Persistence

- First-run seeding: On first app open, `App.tsx` calls `seedFromAssetsIfMissing('receipts.csv')` and `seedFromAssetsIfMissing('transactions.csv')`.
- Seed source: Android assets in `android/app/src/main/assets/seed/receipts.csv` and `transactions.csv` (copied from repo `data/*mockup.csv`).
- Runtime location: app-private folder `<DocumentDirectory>/data` (no permissions, removed on uninstall). Use `readCsv`, `writeCsv`, `appendCsv` from `app/src/storage/files.ts`.
- For user-visible exports, prefer `RNFS.ExternalDirectoryPath` (still app-scoped on Android) or a share flow.

## UI Overview

- Dashboard: scan card (Camera/Gallery) wired to LEAP, weekly bars, categories tiles.
- Journal: parses and lists receipts with top line items from `data/receipts.csv` + `data/transactions.csv`.
- Reports: computes weekly spend and top categories from transactions and renders simple charts.

## Event Contracts (JS ↔ Native)

- Messages (`app/src/leap/types.ts`): `Msg[]` supports `{ type: 'text', text }` and `{ type: 'image_base64', data, mime? }`.
- Native events: `leap:chunk`, `leap:reasoning`, `leap:function_calls`, `leap:done`, `leap:error`.
- `startStream()` returns a `stop()` unsubscribe; UI should avoid parallel streams.

## Notes

- Changing assets (model, seeds) requires reinstalling the app (`yarn android`)—Metro alone won’t pick new native assets.
- Logs for native errors: `adb logcat` (look for ReactNative/LEAP tags).
