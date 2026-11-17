# CU BUS Transit — Android App Setup (Capacitor)

This project wraps the existing **CU BUS Transit** Vite/React web application (`dist/`) inside a native Android container using **Capacitor 8**, while preserving the Web/PWA app, Student/Driver/Admin portals, Google Maps modes, and opt-in Device GPS behavior.

- **Android Application ID:** `edu.cuchd.cubustransit`
- **App Name:** `CU BUS Transit`
- **Bundled Web Assets:** `dist/` (served inside Android WebView at `https://localhost`)
- **Distribution:** Private/local builds only (not configured for Play Store publishing)

---

## 1. Prerequisites (Local Developer Machine)

To compile the Android APK locally, install:

1. **Node.js 20+** and **npm 10+**
2. **JDK 21** (required by Gradle 8.14.3 and Android Gradle Plugin for Capacitor 8)
3. **Android Studio** (or Android Command-Line Tools) with:
   - **Android SDK Platform 36** (`compileSdkVersion = 36`, `targetSdkVersion = 36`, `minSdkVersion = 24`)
   - **Android SDK Build-Tools** and **Platform-Tools** (`adb`)
4. Environment variables set in your shell:
   ```bash
   export JAVA_HOME="/path/to/jdk-21"
   export ANDROID_HOME="$HOME/Android/Sdk"
   export PATH="$ANDROID_HOME/platform-tools:$JAVA_HOME/bin:$PATH"
   ```

---

## 2. Configure Environment Variables (Optional, Build-Time Only)

Copy `.env.example` to `.env` (never commit secrets or embed `GEMINI_API_KEY` into the Android bundle):

```env
# Optional: Client-side Maps JS browser key for the interactive Google Maps basemap.
# Omit to use the built-in Google Maps Directions & Search link fallback.
VITE_GOOGLE_MAPS_API_KEY=""

# Optional: Explicit backend origin for server-side Google Maps Grounding (/api/maps-grounding).
# Leave empty on Web/PWA (defaults to same-origin).
# Examples for Android:
#   Android Emulator -> http://10.0.2.2:3000
#   Physical phone on LAN (debug build) -> http://<YOUR_LAN_IP>:3000
#   Private HTTPS server -> https://your-private-backend.example
VITE_API_BASE_URL=""
```

> **Security rule:** Never put `GEMINI_API_KEY` in any `VITE_*` variable. `GEMINI_API_KEY` must exist **only** on the Node/Express backend (`server.ts`).

---

## 3. Build a Debug APK

1. Install dependencies (if not already installed):
   ```bash
   npm install
   ```
2. Build the Vite web assets (`dist/`) and sync them into `android/`:
   ```bash
   npm run android:sync
   ```
3. Compile the debug APK via Gradle:
   ```bash
   ./android/gradlew -p android assembleDebug
   ```
   *(Or run both steps together with `npm run android:build:debug`, or open the project in Android Studio with `npm run android:open` and click **Build → Build Bundle(s) / APK(s) → Build APK(s)**.)*

### Debug APK Output Location

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 4. Install on an Android Device (Private / Local)

- **Via USB + ADB** (enable *Developer Options → USB Debugging* on the phone):
  ```bash
  adb install -r android/app/build/outputs/apk/debug/app-debug.apk
  ```
- **Manual sideload (no Play Store):** Copy `android/app/build/outputs/apk/debug/app-debug.apk` to the Android phone over USB or local network, open it in the device's Files app, and allow installation from that source when prompted.

---

## 5. Google Maps Key & Android WebView Referrer Restrictions

- The app uses the **Google Maps JavaScript API** inside Capacitor's Android WebView (served from `https://localhost`).
- If you configure `VITE_GOOGLE_MAPS_API_KEY` with **HTTP referrer restrictions** in Google Cloud Console, add:
  ```text
  https://localhost/*
  ```
  alongside your web deployment origin(s).
- Ensure the key is restricted to **Maps JavaScript API** only.
- If `VITE_GOOGLE_MAPS_API_KEY` is omitted, restricted, or hits quota, the app stays fully usable via the labeled **Google Maps Directions & Search Fallback** links and the SVG Geographic/Schematic tracker.

---

## 6. Running the Backend for On-Device Maps Grounding

The interactive UI, Student/Driver/Admin portals, route data, SVG tracker, and direct Google Maps links work completely offline/locally in the APK.

Only **Nearby Places / Landmark Lookup** (`POST /api/maps-grounding`) requires the Express backend (`server.ts`):

1. Start the backend on your host machine or private server with `GEMINI_API_KEY` configured in the server environment:
   ```bash
   GEMINI_API_KEY="<your-server-key>" npm run dev
   # or production:
   npm run build && GEMINI_API_KEY="<your-server-key>" NODE_ENV=production npm start
   ```
2. `server.ts` already allows CORS requests from Capacitor Android WebView origins (`https://localhost`, `http://localhost`, `capacitor://localhost`). Add extra origins via `CORS_ALLOWED_ORIGINS` if needed.
3. Rebuild and sync the Android app with `VITE_API_BASE_URL` pointing to that backend (`npm run android:build:debug`).
   - Debug builds include `android/app/src/debug/AndroidManifest.xml` with `usesCleartextTraffic="true"` for local `http://10.0.2.2:3000` / LAN testing. Release builds enforce HTTPS.

---

## 7. Opt-In Driver Device GPS Behavior

- `AndroidManifest.xml` declares `ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION` (plus `android.hardware.location.gps` with `required="false"`).
- **Location is never requested at app launch.**
- Android's runtime location permission prompt appears **only** when a driver opens the Driver Console and explicitly taps **Start Device GPS**.
- Fixes are stored locally in the app's WebView state (no fleet-wide backend broadcast).

---

## 8. Known Limitations

- **No fleet-wide telemetry sync backend:** Driver Device GPS fixes and student/bus edits persist locally in device WebView storage (`localStorage`), not across separate phones.
- **Nearby Places requires reachable backend:** Without `VITE_API_BASE_URL` pointing to a running `server.ts` instance, `Nearby places` displays an actionable configuration message while keeping direct Google Maps search links functional.
- **PWA Service Worker disabled in native shell:** `src/main.tsx` skips registering `/sw.js` inside Capacitor Android (`Capacitor.isNativePlatform()`) so updated APK bundles never conflict with cached web workers. The web PWA install flow remains unchanged in mobile/desktop browsers.
- **Android SDK required for APK compilation:** Gradle APK builds require JDK 21 and Android SDK 36 on the build machine.
