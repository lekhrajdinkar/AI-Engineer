# Run YouTube Learning on an iPhone

The native project in this directory packages the React application at:

```text
src/y2026/youtube_agent_2/frontend
```

It connects to the deployed Render gateway:

```text
https://youtube-learning-gateway.onrender.com
```

The gateway routes requests to the deployed YouTube and Plans services. Do not
put those downstream service URLs in the React application.

## Requirements

Building and signing an iOS application requires a Mac with:

- Xcode
- Node.js 20.19 or newer; Node.js 22 is recommended
- CocoaPods
- Git
- An Apple Account added to Xcode
- An iPhone running iOS 16 or newer

With Homebrew:

```bash
brew install node@22 cocoapods
sudo xcode-select --switch /Applications/Xcode.app
```

Open Xcode once and install any requested iOS platform components.

## 1. Clone the mobile branch

```bash
git clone --branch feature/capacitor-ios-app \
  https://github.com/lekhrajdinkar/AI-Engineer.git

cd AI-Engineer
node --version
```

## 2. Configure the YouTube Learning frontend

The mobile build uses:

```text
src/y2026/youtube_agent_2/frontend/.env.mobile
```

That file already points `VITE_API_BASE_URL` at the Render gateway. Firebase
client values still need to be supplied locally. Create:

```text
src/y2026/youtube_agent_2/frontend/.env.local
```

with the existing Firebase web-app configuration:

```dotenv
VITE_FIREBASE_API_KEY=your-firebase-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=agent-2026-d3f51.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=agent-2026-d3f51
VITE_FIREBASE_APP_ID=your-firebase-web-app-id
```

Do not commit `.env.local`.

## 3. Register the iOS app in Firebase

Native Google sign-in requires an iOS Firebase app:

1. Open the existing Firebase project.
2. Add an **iOS app**.
3. Use this bundle ID:

   ```text
   com.lekhrajdinkar.youtubelearning
   ```

4. Download `GoogleService-Info.plist`.
5. Place it at:

   ```text
   ios/App/App/GoogleService-Info.plist
   ```

6. Drag the file into the **App** group in Xcode, enable **Copy items if
   needed**, and ensure the **App** target is checked.
7. In Firebase Authentication, confirm that Google is enabled as a sign-in
   provider.

The bundle ID must match `capacitor.config.ts` and the Xcode App target.

## 4. Install dependencies and synchronize iOS

From the repository root:

```bash
npm ci
npm run frontend:install
npm run ios:sync
npm run ios:open
```

This installs the native and frontend dependencies separately, builds the
YouTube Learning UI in mobile mode, copies it into the iOS project, installs
the native plugins, and opens the Xcode workspace.

If CocoaPods specifications are stale:

```bash
pod repo update
npm run ios:sync
```

When opening the project manually, open:

```text
ios/App/App.xcworkspace
```

Do not open `App.xcodeproj` when using CocoaPods.

## 5. Add the Google URL scheme

Open `GoogleService-Info.plist` and copy the value of:

```text
REVERSED_CLIENT_ID
```

Then in Xcode:

1. Select **TARGETS → App → Info**.
2. Expand **URL Types**.
3. Add a URL Type.
4. Paste `REVERSED_CLIENT_ID` into **URL Schemes**.

This allows Google to return to the app after native sign-in.

## 6. Configure Xcode signing

In Xcode:

1. Select the blue **App** project.
2. Select **TARGETS → App**.
3. Open **Signing & Capabilities**.
4. Enable **Automatically manage signing**.
5. Select your Apple Account under **Team**.
6. Confirm the Bundle Identifier is:

   ```text
   com.lekhrajdinkar.youtubelearning
   ```

If the account is missing, add it under **Xcode → Settings → Accounts**.

A free Personal Team supports testing on your own iPhone, but its provisioning
expires after seven days. TestFlight and App Store distribution require paid
Apple Developer Program membership.

## 7. Connect and prepare the iPhone

1. Connect and unlock the iPhone using USB.
2. Tap **Trust** if prompted.
3. Select the iPhone as the Xcode run destination.
4. On the iPhone, enable **Settings → Privacy & Security → Developer Mode** when
   prompted.
5. Restart the phone and confirm Developer Mode.

Developer Mode may not appear until the phone has been paired with Xcode.

## 8. Install and run

Select the **App** scheme and the connected iPhone, then click **Run** or press:

```text
⌘R
```

Xcode builds, signs, installs, and launches **YouTube Learning**.

## Sign in and connect YouTube

- **Continue with Google** uses the native Firebase Google sign-in flow.
- **Connect YouTube** opens Google authorization in the system browser.
- After YouTube authorization finishes, return to the app. The connection
  status refreshes when the app becomes active.

The phone must have internet access. Render's free services may take time to
wake up after inactivity, so the first request can be slower.

## Install frontend updates

After changing `src/y2026/youtube_agent_2/frontend`:

```bash
git pull
npm run ios:sync
npm run ios:open
```

Press `⌘R` in Xcode again.

Run these commands again if dependencies changed:

```bash
npm ci
npm run frontend:install
```

Do not edit `ios/App/App/public`; Capacitor regenerates it from the frontend
`dist` directory.

## Common problems

### Firebase is not configured

Create the frontend `.env.local` file described above, confirm it contains all
four Firebase values, then run `npm run ios:sync` again.

### Google sign-in fails immediately

Confirm:

- `GoogleService-Info.plist` belongs to the correct Firebase project.
- Its bundle ID is `com.lekhrajdinkar.youtubelearning`.
- Google is enabled in Firebase Authentication.
- The `REVERSED_CLIENT_ID` URL scheme is present in Xcode.
- `npm run ios:sync` completed after installing the authentication plugin.

### API calls fail

Confirm the gateway is healthy:

```text
https://youtube-learning-gateway.onrender.com/health
```

The mobile build must use the HTTPS gateway, not `127.0.0.1`.

### Missing Pods or `No such module Capacitor`

Close Xcode and run:

```bash
npm ci
npm run frontend:install
npm run ios:sync
npm run ios:open
```

### Frontend changes do not appear

Run:

```bash
npm run ios:sync
```

Then rebuild from Xcode.

## Official references

- [Capacitor documentation](https://capacitorjs.com/docs)
- [Capawesome Firebase Authentication](https://capawesome.io/docs/plugins/firebase/authentication/)
- [Apple: Run an app on a device](https://developer.apple.com/documentation/xcode/running-your-app-on-simulated-or-physical-devices)
- [Apple: Enable Developer Mode](https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device)
