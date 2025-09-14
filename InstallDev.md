# InstallDev.md

## How to Set Up and Run This Project (React Native + Android)

### 1### 7. Troubleshooting

- If you get errors about missing SDK components, use `sdkmanager` to install them:
  ```pwsh
  sdkmanager --list  # To see available packages
  sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"
  ```

- If you see permission errors in PowerShell, run as Administrator.

- If Metro bundler fails, try clearing cache:
  ```pwsh
  npm start -- --reset-cache
  ```

- Make sure your Android device is properly connected:
  ```pwsh
  adb devices
  ```

- For LEAP specific errors, check that the model bundle is properly loaded.

---

For more help, see the official [React Native Environment Setup](https://reactnative.dev/docs/environment-setup) and [Android CLI Tools](https://developer.android.com/studio/command-line).e Node.js and npm
- Check your Node.js and npm versions:
  ```pwsh
  node -v
  npm -v
  ```
- If outdated, download the latest Node.js from [nodejs.org](https://nodejs.org/).
- Recommended: Node.js v16+ and npm v8+

### 2. Create a New React Native App and Apply Overlay
- Create a new React Native application:
  ```pwsh
  npx @react-native-community/cli init LeapRnApp
  cd LeapRnApp
  ```
- Copy all files from the `overlay` folder to your new app's root:
  ```pwsh
  # If you're in the leap-rn-bridge folder:
  Copy-Item -Path ".\overlay\*" -Destination "path\to\LeapRnApp\" -Recurse
  ```
- Install dependencies in your new app:
  ```pwsh
  cd path\to\LeapRnApp
  npm install
  npm add react-native-image-picker
  ```

### 3. Configure Android Build Files
- Update Android Gradle settings in your new React Native app:
  
  1. Add the leap module to `android/settings.gradle`:
  ```pwsh
  echo "include ':leap'" >> android/settings.gradle
  echo "project(':leap').projectDir = new File(rootProject.projectDir, 'leap')" >> android/settings.gradle
  ```
  
  2. Add dependency in `android/app/build.gradle`:
  ```
  dependencies {
      // Add this line:
      implementation project(':leap')
      // ... other dependencies
  }
  ```

  3. Update AndroidManifest.xml permissions:
  ```
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
  ```

### 4. Install Java 17 and Android SDK (Command Line Only)
- Check your Java version (Android SDK requires Java 17+):
  ```pwsh
  java -version
  ```

- If you have multiple Java installations or need to install Java 17:
  1. Download and install [Eclipse Temurin JDK 17](https://adoptium.net/temurin/releases/?version=17) (or any JDK 17)
  2. Configure Java environment variables:
  ```pwsh
  [Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Eclipse Adoptium\jdk-17.x.x.x-hotspot", "User")
  [Environment]::SetEnvironmentVariable("Path", $env:Path + ";%JAVA_HOME%\bin", "User")
  ```
  3. Verify Java installation:
  ```pwsh
  java -version  # Should show version 17.x
  ```

- Download the [Android SDK Command line tools](https://developer.android.com/studio#command-tools) (ZIP file)
- Install Android SDK in a user-writable location:
  1. Create directory structure: `C:\Android\Sdk\cmdline-tools` 
  2. Extract the downloaded ZIP contents
  3. Move the extracted files to `C:\Android\Sdk\cmdline-tools\latest` 
     (The structure should be `C:\Android\Sdk\cmdline-tools\latest\bin`, etc.)

- Set Android SDK environment variables:
  ```pwsh
  [Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Android\Sdk", "User")
  [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Android\Sdk\cmdline-tools\latest\bin;C:\Android\Sdk\platform-tools", "User")
  ```
- Open a new PowerShell window to load the new environment variables, and install required SDK packages:
  ```pwsh
  # If you run as admin, you can install directly to Program Files
  sdkmanager --sdk_root="C:\Program Files (x86)\Android\android-sdk" "platform-tools" "platforms;android-33" "build-tools;33.0.0"
  ```
- Accept Android SDK licenses:
  ```pwsh
  sdkmanager --sdk_root="C:\Program Files (x86)\Android\android-sdk" --licenses
  ```

### 5. Transfer LEAP Model Bundle to Device
- Connect Android device via USB and enable USB debugging
- Push model bundle to device:
  ```pwsh
  adb push path\to\your\model.bundle /sdcard/Download/
  ```

### 6. Build and Run the App
- Start Metro bundler in one terminal:
  ```pwsh
  cd path\to\LeapRnApp
  npm start
  ```
- Open another terminal and run:
  ```pwsh
  cd path\to\LeapRnApp
  npm run android
  ```

### 7. Troubleshooting

- If you get sdkmanager errors:
  ```pwsh
  # Always specify the SDK root explicitly
  sdkmanager --sdk_root="C:\Program Files (x86)\Android\android-sdk" --list
  sdkmanager --sdk_root="C:\Program Files (x86)\Android\android-sdk" "platform-tools"
  ```

- If Java version errors occur:
  ```pwsh
  # Check which Java is being used
  where java
  # If needed, specify JAVA_HOME in your current PowerShell session
  $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.x.x.x-hotspot"
  $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
  ```

- If you see permission errors, run your terminal as administrator.

---

For more help, see the official [React Native Environment Setup](https://reactnative.dev/docs/environment-setup) and [Android CLI Tools](https://developer.android.com/studio#command-tools).

# react_native_web
https://www.npmjs.com/package/react-native-web