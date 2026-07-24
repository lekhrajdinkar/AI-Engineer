# Run Daymark on an iPhone

This directory contains the native iOS project for the root-level **Daymark**
React and Capacitor application.

> [!IMPORTANT]
> The recent `src/y2026/youtube_agent_2/frontend` updates are included in the
> feature branch history, but that application is not currently connected to
> the Daymark mobile interface.

## Requirements

Building and signing an iOS application requires a Mac. Windows can prepare and
edit the React source, but it cannot build or sign the native iPhone app.

Install the following on the Mac:

- Xcode from the Mac App Store
- Node.js 22, or Node.js 20.19 or newer
- CocoaPods
- Git

For example, with Homebrew:

```bash
brew install node@22 cocoapods
sudo xcode-select --switch /Applications/Xcode.app
```

Open Xcode once and allow it to install any required iOS platform components.

## 1. Clone the feature branch

```bash
git clone --branch feature/capacitor-ios-app \
  https://github.com/lekhrajdinkar/AI-Engineer.git

cd AI-Engineer
node --version
```

Vite 8 requires Node.js 20.19 or newer. Node.js 22 is recommended.

## 2. Set a unique application ID

Open `capacitor.config.ts` in the repository root and replace the example ID:

```ts
appId: 'com.example.daymark',
```

with a unique reverse-domain value:

```ts
appId: 'com.lekhrajdinkar.daymark',
```

Use the same value as the Bundle Identifier in Xcode.

## 3. Install, build, and synchronize

Run these commands from the repository root:

```bash
npm ci
npm run ios:sync
npm run ios:open
```

These commands:

1. Install the locked JavaScript dependencies.
2. Build the React application into `dist`.
3. Copy the web bundle into the native project.
4. Synchronize the Capacitor plugins and native dependencies.
5. Open the correct Xcode workspace.

If CocoaPods reports outdated specifications, run:

```bash
pod repo update
npm run ios:sync
```

When opening the project manually, open:

```text
ios/App/App.xcworkspace
```

Do not open `App.xcodeproj` when the project is using CocoaPods.

## 4. Configure signing in Xcode

In Xcode:

1. Select the blue **App** project in the Project navigator.
2. Select **TARGETS → App**.
3. Open **Signing & Capabilities**.
4. Enable **Automatically manage signing**.
5. Select your Apple Account under **Team**.
6. Set **Bundle Identifier** to the same unique value used in
   `capacitor.config.ts`.

If the account is missing, add it under **Xcode → Settings → Accounts**.

A free Apple Account can use an Xcode **Personal Team** for testing on personal
devices. Personal Team provisioning expires after seven days, so the app may
need to be rebuilt and installed again. TestFlight and App Store distribution
require Apple Developer Program membership.

## 5. Connect and prepare the iPhone

1. Connect and unlock the iPhone using USB.
2. Tap **Trust** if the iPhone asks whether to trust the Mac.
3. In Xcode, select the connected iPhone as the run destination.
4. If prompted, open **Settings → Privacy & Security → Developer Mode** on the
   iPhone.
5. Enable Developer Mode and tap **Restart**.
6. After the phone restarts, confirm Developer Mode and enter the device
   passcode.

Developer Mode may not appear until the device has first been paired with
Xcode.

## 6. Build, install, and run

In Xcode, select the **App** scheme and the connected iPhone, then click the
**Run** button or press:

```text
⌘R
```

Xcode will build, sign, install, and launch Daymark on the iPhone. Keep the
phone unlocked during the first installation.

Camera behavior should be tested on a physical phone because the simulator
does not reproduce all device hardware behavior.

## Install subsequent React changes

After changing the root React application, run:

```bash
git pull
npm run ios:sync
npm run ios:open
```

Then select the iPhone and press `⌘R` in Xcode again.

Run `npm ci` again when `package.json` or `package-lock.json` changes.

Do not edit `ios/App/App/public` directly. Capacitor regenerates that directory
from the React `dist` output.

## Common problems

### Node.js version error

If Vite reports an unsupported Node.js version, install Node.js 22 or upgrade
to Node.js 20.19 or newer:

```bash
node --version
```

### Signing requires a development team

Open **App target → Signing & Capabilities**, select a Team, enable automatic
signing, and confirm that the Bundle Identifier is unique.

### No such module `Capacitor` or a plugin is unavailable

Close Xcode and run:

```bash
npm ci
npm run ios:sync
npm run ios:open
```

### Missing Pods or file-list errors

Make sure `ios/App/App.xcworkspace` is open. Then run:

```bash
cd ios/App
pod install
cd ../..
npm run ios:open
```

### React changes do not appear on the phone

Rebuild and synchronize the web application:

```bash
npm run ios:sync
```

Then rebuild the application in Xcode.

### The iPhone does not appear in Xcode

- Unlock the iPhone.
- Reconnect the USB cable.
- Confirm the **Trust This Computer** prompt.
- Open Xcode's device manager and complete pairing.
- Confirm that the installed Xcode version supports the iPhone's iOS version.

## Official references

- [Capacitor documentation](https://capacitorjs.com/docs)
- [Apple: Running an app on a device](https://developer.apple.com/documentation/xcode/running-your-app-on-simulated-or-physical-devices)
- [Apple: Enabling Developer Mode](https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device)
- [Apple Developer membership comparison](https://developer.apple.com/support/compare-memberships/)

For the complete Capacitor architecture, security, testing, and release guide,
see
[`docs/2026/99_Misc/06_react_capacitor_ios.md`](../docs/2026/99_Misc/06_react_capacitor_ios.md).
