# Project Documentation

This app demonstrates a React Native shell with a native Android bridge to LEAP (LiquidAI) models for scanning receipts and tracking expenses. It includes a modern UI with a bottom tab bar and persistent CSV storage seeded on first run.

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

## Running & Debugging

These steps reflect what we exercised while validating the bridge and bundled model.

1. Start Metro (JavaScript bundler)

```pwsh
yarn start
# or
npm start
# or
npx react-native start
```

2. List connected Android targets

```pwsh
adb devices
```

Example:

```text
List of devices attached
emulator-5554 device
4A091FDAQ000K8 device
```

3. Install & launch on a specific device

```pwsh
npx react-native run-android --deviceId <DEVICE_ID>
```

4. Emulator considerations

- Large model bundles can exceed emulator disk space; a physical device is more reliable for large `*.bundle` assets.
- If using an emulator, ensure sufficient internal storage before copying/loading the bundle.

5. Logs & troubleshooting

- Native load failures: look for errors in Android Studio Logcat or `adb logcat` (tags often include `ReactNative` or `LEAP`).
- If you see `NO_MODEL` in JS, ensure `loadModel` resolved before calling `startStream`.
- Asset copy issues (`ASSET_COPY_FAIL`): confirm the file exists at `android/app/src/main/assets/models/<name>` and reinstall the app (Gradle packages assets at build time).

6. Reinstall after asset changes

Changing or adding a model asset requires reinstalling the app so the new asset is packaged:

```pwsh
npx react-native run-android --deviceId <DEVICE_ID>
```

7. Switching devices quickly

- Keep one terminal running `yarn start`.
- Run additional installs with different ids:

```pwsh
npx react-native run-android --deviceId emulator-5554
npx react-native run-android --deviceId 4A091FDAQ000K8
```

8. Unloading (optional)

```ts
import { unloadModel } from './app/src/leap';
await unloadModel();
```

## Models and Assets

- Preferred development path: embed a model under `android/app/src/main/assets/models/lfm2-vl-450m.bundle`.
- Load flow in UI (e.g., Dashboard): `prepareBundledModel('lfm2-vl-450m.bundle')` → `loadModel()` → `startStream()` with image + prompt.

### Getting the LEAP Model Files

LFM2 LEAP models (`*.bundle`) are available on Hugging Face:

1. Browse models: [LiquidAI/LeapBundles](https://huggingface.co/LiquidAI/LeapBundles/tree/main)
2. Download the model used by this project: [LFM2-VL-450M_8da4w.bundle](https://huggingface.co/LiquidAI/LeapBundles/resolve/main/LFM2-VL-450M_8da4w.bundle) (~385 MB)
3. Place the file in the project (rename if desired):

```plaintext
android/app/src/main/assets/models/lfm2-vl-450m.bundle
```

4. Verify the file was copied correctly (PowerShell):

```pwsh
Get-ChildItem android/app/src/main/assets/models/lfm2-vl-450m.bundle
```

Alternative: push to device external storage for development:

```pwsh
adb push path\to\model.bundle /sdcard/Download/
```

### Bundled vs External Storage

- Bundled: ships in the APK under `assets/` (requires reinstall to update assets).
- External: copy to `/sdcard/Download/` (or app-private storage) and pass the absolute path to `loadModel`.

### Loading in Code (official pattern)

From the LEAP Android Quick Start, a model can be loaded inside a coroutine:

```kotlin
// Kotlin (Activity / Application scope)
import ai.liquid.leap.LeapClient
import ai.liquid.leap.LeapModelLoadingException
import kotlinx.coroutines.launch
import androidx.lifecycle.lifecycleScope

private var runner: ai.liquid.leap.ModelRunner? = null

lifecycleScope.launch {
	try {
		runner = LeapClient.loadModel("/sdcard/Download/lfm2-vl-450m.bundle")
	} catch (e: LeapModelLoadingException) {
		android.util.Log.e("LEAP", "Failed to load: ${e.message}")
	}
}
```

The React Native bridge wraps this with `RNLeap.loadModel(path)`, so in JS you typically do:

```ts
import { prepareBundledModel, loadModel, startStream, unloadModel } from 'app/src/leap';

const path = await prepareBundledModel('lfm2-vl-450m.bundle');
await loadModel(path);

const stop = await startStream([
	{ type: 'text', text: 'Describe this image.' }
], {
	onChunk: t => console.log('chunk', t),
	onDone: s => { console.log('done', s); stop(); },
	onError: e => console.error('error', e),
});
```

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
- Avoid parallel streams; wait for `leap:done` or `leap:error` before starting another stream.
