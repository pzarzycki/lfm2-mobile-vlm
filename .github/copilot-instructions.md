# Copilot Instructions for lfm2-mobile-vlm

These instructions help AI coding agents work effectively in this React Native + Android LEAP bridge project. Keep changes small, verify with builds, and reference the exact files noted below.

## Big picture
- App is a minimal React Native shell that demonstrates a native Android bridge to LEAP (LiquidAI) models.
- JS/TS wrapper lives in `app/src/leap/` and exposes `loadModel`, `unloadModel`, `prepareBundledModel`, and `startStream` which proxy to the native module `RNLeap`.
- Demo UI lives in `app/src/screens/Playground.tsx` and wires a simple flow: copy model asset → load model → pick/take image → stream caption tokens.
- Android native module is linked via `react-native.config.js` pointing to `android/leap` (Kotlin module path). iOS is not implemented yet.

## Primary workflows
- Install deps: `yarn install` (Node >= 20 required in `package.json:engines`).
- Start Metro: `yarn start`.
- Build & run on Android: `yarn android` or `npx react-native run-android --deviceId <ID>`.
- Tests: `yarn test` (Jest; a minimal render smoke test exists in `__tests__/App.test.tsx`).
- Lint: `yarn lint`.

## Models and assets
- Large model bundles are not in Git. See `MODEL_SETUP.md` and README for links.
- Preferred dev path: embed model at `android/app/src/main/assets/models/lfm2-vl-450m.bundle`, then in JS call:
  - `const p = await prepareBundledModel('lfm2-vl-450m.bundle');`
  - `await loadModel(p);`
- Alternative: push to device SD card and pass that absolute path to `loadModel`.
- Changing model assets requires reinstalling the app (Gradle packages assets at build time).

## JS <-> Native contract
- JS entry: `app/src/leap/index.ts` defines the public API and event wiring via `NativeEventEmitter`.
- Message format: `app/src/leap/types.ts` with union `Msg` types: `{ type: 'text', text }` and `{ type: 'image_base64', data, mime? }`.
- Events emitted by native:
  - `leap:chunk` → `{ text }`
  - `leap:reasoning` → `{ text }` (optional for reasoning models)
  - `leap:function_calls` → `{ count }`
  - `leap:done` → `{ tps? }`
  - `leap:error` → `{ error }`
- `startStream(messages, handlers)` returns a function to unsubscribe listeners; caller should call the returned function on completion.

## UI pattern example
- See `app/src/screens/Playground.tsx` for the canonical flow:
  - Buttons: "Load LFM2-VL model (from /Download)", "Ask (pick image)", "From Camera".
  - Uses `react-native-image-picker` to get base64 JPEG from gallery or camera.
  - Builds `Msg[]` with an image + text prompt and calls `startStream` with `{ onChunk, onDone, onError }`.
  - Appends chunks to local state `out`; onDone calls the `stop()` returned by `startStream`.

## Android specifics
- Native module is auto-linked via `react-native.config.js` with custom `leap` dependency mapping to `android/leap`.
- If native code changes (in `android/leap`), you must rebuild the app (`yarn android`). Metro alone won't apply native changes.
- Logs: use `adb logcat` or Android Studio Logcat. Errors from native should surface via `leap:error` and also appear in Logcat.

## Conventions used here
- TypeScript for app code; keep types in `app/src/leap/types.ts` and export only what JS callers need.
- Streaming API returns an unsubscribe function; UI is responsible for not starting overlapping streams (wait for done/error).
- Keep LEAP API surface small and stable in `app/src/leap/index.ts`; add new events or methods here first, then bridge in native.

## Safe changes for agents
- Adding new demo screens should import the stable `leap` API instead of touching native.
- If adding new LEAP events/methods, update `index.ts` and mirror the same event names and payload shapes in Android.
- When adding or moving model assets, also update any code/messages referencing their location (README, `MODEL_SETUP.md`, `Playground.tsx`).

## Quick references
- Entry points: `App.tsx` → `Playground.tsx` → `app/src/leap/*`.
- Scripts: `start`, `android`, `test`, `lint` in `package.json`.
- Docs: `README.md`, `MODEL_SETUP.md`, `InstallDev.md`.

If anything here is unclear or outdated (e.g., event names, asset paths, or native module location), please flag it in your PR and we’ll update this document.