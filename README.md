# React Native + LEAP (Android) minimal bridge skeleton

This project provides an Android native bridge for LEAP models and a simple JS demo screen.
iOS can be added later by creating a mirror `RNLeap` Swift module with the same API.

## Prereqs

- Android toolchain installed (Android SDK, Java 17, adb).
- Node.js + yarn or npm.
- A physical Android device (emulator may fail with large model bundles).
- LEAP Android SDK available from Maven.

## Getting the LEAP Model Files

LFM2 LEAP models (*.bundle files) are officially available on Hugging Face:

1. **Browse models**: Visit [LiquidAI/LeapBundles](https://huggingface.co/LiquidAI/LeapBundles/tree/main) to see all available models
2. **Download needed model**: For this project, download [LFM2-VL-450M_8da4w.bundle](https://huggingface.co/LiquidAI/LeapBundles/resolve/main/LFM2-VL-450M_8da4w.bundle) (~385 MB)
3. **Place in project**:
   - For embedding in APK: Save to `android/app/src/main/assets/models/lfm2-vl-450m.bundle`
   - For development: Push to device with `adb push path/to/downloaded/model.bundle /sdcard/Download/`

## Quickstart

```bash

# 1) Clone this repository
git clone [repository-url]
cd LeapRnApp

# 2) Install JavaScript dependencies
yarn install # or npm install

# 3) Run the app
yarn start        # terminal 1 (Metro)
yarn android      # terminal 2 (build+install)

# 4) For a specific device, use the deviceId flag
yarn android --deviceId <DEVICE_ID>
```

## Project Structure

### Key Files

- `react-native.config.js` – links the local `android/leap` module
- `app/src/leap/index.ts`, `app/src/leap/types.ts` – JS wrapper API
- `app/src/screens/Playground.tsx` – simple screen to load model + caption an image
- `android/leap` – Native Android module with LEAP bridge (Kotlin)

### Notes

- To add iOS support, create `ios/RNLeap` with the same method names/events to keep JS unchanged
- For production apps, consider integrating the LEAP model downloader for better user experience

## Running & Debugging (Emulator vs Physical Device)

These steps reflect what we actually used while validating the bridge and bundled model.

### 1. Start Metro

Metro is the JavaScript bundler that comes with React Native. It takes all your JavaScript code and bundles it for the app to use, providing features like hot reloading during development.

In project root (`LeapRnApp`):

```bash
# Using yarn
yarn start

# Or using npm
npm start

# Or directly with React Native CLI
npx react-native start
```

You'll see Metro's output in the terminal, and it will display a QR code for connecting to dev tools. Keep this terminal running while developing.

### 2. List Connected Android Targets

Use `adb` to see emulators + physical devices:

```bash
adb devices
```

Example output (shortened):

```text
List of devices attached
emulator-5554 device
4A091FDAQ000K8 device
```

Copy the exact device ID you want to target.

### 3. Install & Launch on a Specific Device

Use the `--deviceId` flag (works for both emulator and hardware):

```bash
npx react-native run-android --deviceId 4A091FDAQ000K8
```

If you omit `--deviceId` and multiple devices are attached the command will abort and ask you to choose—explicit is faster.

### 4. Emulator Considerations

- Large model bundles can exceed emulator disk space; a physical device was more reliable for the large `lfm2-vl-450m.bundle`.
- If using an emulator anyway, ensure it has sufficient internal storage before copying/loading the bundle.

### 5. Bundled Model Loading Path

Because the model file is placed under `android/app/src/main/assets/models`, we call:

```ts
const localPath = await prepareBundledModel('lfm2-vl-450m.bundle');
await loadModel(localPath);
```

`prepareBundledModel` copies the asset into the app's internal `filesDir` once, then reuses it.

### 6. Streaming Test (Playground Screen)

Open the in‑app playground UI button, pick an image (optional), then press Ask. Events arrive as:

- `leap:chunk` incremental text
- `leap:done` final + optional `tps`

Errors surface via `leap:error` and an alert in the playground.

### 7. Logs & Troubleshooting

- Native load failures: look for `LOAD_FAIL` or stack traces in Android Studio Logcat / `adb logcat` (tag may include `ReactNative` or `LEAP`).
- If you see `NO_MODEL` in JS, ensure `loadModel` resolved before calling `startStream`.
- Asset copy issues (`ASSET_COPY_FAIL`): confirm the file exists at `android/app/src/main/assets/models/<name>` and rebuild (Gradle packages assets at build time).

### 8. Reinstalling After Asset Changes

Changing or adding a model asset requires reinstalling the app so the new asset is packaged:

```bash
npx react-native run-android --deviceId <DEVICE_ID>
```

Metro alone is not enough for new native assets.

### 9. Switching Devices Quickly

- Keep one terminal running `yarn start`.
- Run additional installs with different ids:

```bash
npx react-native run-android --deviceId emulator-5554
npx react-native run-android --deviceId 4A091FDAQ000K8
```

Each command builds (incremental) then installs to that target.

### 10. Unloading (Optional)

You can free model memory without killing the app:

```ts
await unloadModel();
```

### 11. Common Quick Checks

- Model path printed / inspected? (You can `console.log(localPath)` right after `prepareBundledModel`.)
- Multiple presses sending overlapping streams? (Current module does not cancel an in‑flight stream—wait for `leap:done` or `leap:error` before starting another.)

These points stay within what we directly exercised; no speculative optimizations are listed.
 
## Load model in code (official pattern)

From the LEAP Android Quick Start, the model is loaded inside a coroutine (main thread allowed):

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

The React Native bridge wraps this with `RNLeap.loadModel(path)` so in JS you just call:

If you bundle a model inside the app (place it under `android/app/src/main/assets/models/lfm2-vl-450m.bundle`) you can copy it to internal storage then load:

```ts
import { prepareBundledModel, loadModel } from './app/src/leap';

const path = await prepareBundledModel('lfm2-vl-450m.bundle');
await loadModel(path);
```

Then start a streamed generation (text + optional image) via:

```ts
import { startStream } from './app/src/leap';

const stop = await startStream([
    { type: 'text', text: 'Describe this image.' }
], {
    onChunk: t => console.log('chunk', t),
    onDone: s => { console.log('done', s); stop(); }
});
```

Image example (base64):

```ts
{ type: 'image_base64', data: '<BASE64_JPEG>', mime: 'image/jpeg' }
```

Events emitted by native layer:

- `leap:chunk` – partial text
- `leap:reasoning` – reasoning tokens (for reasoning models)
- `leap:function_calls` – model requested function calls
- `leap:done` – completion (with optional `tps`)
- `leap:error` – error message

Remember to unload when leaving screen if desired (optional):

```ts
import { unloadModel } from './app/src/leap';
await unloadModel();
```
