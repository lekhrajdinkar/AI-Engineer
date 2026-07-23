# Shipping a React application on iOS with Capacitor

This guide assumes React 18+, TypeScript, and iOS 16+. It uses Vite's `dist`
folder in the examples and calls out the one-line changes required for Create
React App (CRA) or a statically exported Next.js application.

!!! important "A web build is the source of truth"
    Do not edit files under `ios/App/App/public`; `npx cap sync ios` replaces
    them. Make changes in React, create a production web build, and sync it.

## 1. Prerequisites and initialization

You need macOS, a current Xcode version that can target iOS 16, Xcode command
line tools, Node.js, npm, and an Apple Developer account for a physical-device
or App Store build. Verify the tools first:

```bash
xcode-select --install
xcodebuild -version
node --version
npm --version
```

From the React project root, install Capacitor. Keep all Capacitor packages on
the same major version and commit the lockfile:

```bash
npm install @capacitor/core
npm install --save-dev @capacitor/cli
npm install @capacitor/ios
npx cap init "Example App" "com.example.app"
npx cap add ios
```

The application ID is a reverse-DNS identifier and should match the bundle ID
registered in the Apple Developer portal. Changing it after signing, push
notification, or in-app-purchase setup creates avoidable migration work.

### Production configuration

Create `capacitor.config.ts` in the project root:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'Example App',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#ffffff',
  },
};

export default config;
```

Use `webDir: 'build'` for CRA. For Next.js, Capacitor must receive a static
client bundle: configure `output: 'export'` in `next.config`, avoid server-only
routes/runtime rendering, and use `webDir: 'out'`. Do **not** point `webDir` at
source files or a development server. Capacitor's `server.url` is useful for
local live reload, but it should never ship in a production config.

Useful package scripts make the ordering explicit:

```json
{
  "scripts": {
    "build": "vite build",
    "ios:sync": "npm run build && cap sync ios",
    "ios:open": "cap open ios",
    "ios:run": "npm run build && cap run ios"
  }
}
```

For client-side routing, configure the server fallback as normal and avoid
absolute filesystem assumptions. Vite applications should usually leave
`base` as `/`; test deep links and OAuth callbacks separately because those
also require Universal Links or a custom URL scheme.

## 2. iOS-quality mobile UX

### Viewport and safe areas

Put the following in the document `<head>`. `viewport-fit=cover` is what lets
the web view extend behind the notch and home indicator:

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, maximum-scale=1,
           user-scalable=no, viewport-fit=cover"
/>
```

Disabling zoom can be appropriate for a tightly controlled native shell, but
it reduces accessibility. Prefer allowing zoom unless product requirements
and an accessibility review justify disabling it. Inputs must use at least a
16px font to avoid iOS focus zoom.

Use CSS environment variables rather than hard-coded device dimensions:

```css
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
}

html,
body,
#root {
  min-height: 100%;
  margin: 0;
  background: #fff;
}

body {
  /* Prevent rubber-band refresh on the page; allow intended inner scrollers. */
  overscroll-behavior-y: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}

.app-shell {
  box-sizing: border-box;
  min-height: 100dvh;
  padding: var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left);
}

.app-header {
  position: sticky;
  top: 0;
  padding-top: var(--safe-top);
}

.bottom-navigation {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 12px max(16px, var(--safe-right))
    max(12px, var(--safe-bottom)) max(16px, var(--safe-left));
}

button,
[role='button'],
.app-chrome {
  -webkit-user-select: none;
  user-select: none;
}

/* Keep real content selectable and accessible. */
input,
textarea,
[contenteditable='true'],
.selectable-content {
  -webkit-user-select: text;
  user-select: text;
  -webkit-touch-callout: default;
}

input,
select,
textarea {
  font-size: 16px;
}
```

Do not apply `user-select: none` globally: users still need to edit inputs,
copy confirmation numbers, and use accessibility features. Prefer Pointer
Events and CSS `touch-action` on a specific gesture surface rather than global
`preventDefault()` touch listeners:

```css
.horizontal-carousel { touch-action: pan-y; }
.map-gesture-surface { touch-action: none; }
.scroll-region {
  overflow: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
```

### Keyboard behavior

Install the keyboard plugin and choose a resize mode deliberately:

```bash
npm install @capacitor/keyboard
npx cap sync ios
```

```ts
// capacitor.config.ts
const config: CapacitorConfig = {
  // ...
  plugins: {
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};
```

`body` resize works well for forms; `native` is a reasonable alternative when
the whole web view should resize. Avoid mixing several manual height hacks with
plugin resizing. For a chat composer, use keyboard events to expose a CSS
variable and always remove listeners:

```tsx
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

export function KeyboardInsets(): null {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const subscriptions = Promise.all([
      Keyboard.addListener('keyboardWillShow', ({ keyboardHeight }) => {
        document.documentElement.style.setProperty(
          '--keyboard-height',
          `${keyboardHeight}px`,
        );
      }),
      Keyboard.addListener('keyboardWillHide', () => {
        document.documentElement.style.setProperty('--keyboard-height', '0px');
      }),
    ]);

    return () => {
      void subscriptions.then((handles) =>
        handles.forEach((handle) => void handle.remove()),
      );
    };
  }, []);

  return null;
}
```

```css
:root { --keyboard-height: 0px; }

.chat-composer {
  bottom: var(--keyboard-height);
  padding-bottom: max(12px, var(--safe-bottom));
}
```

Use the CSS offset only if the selected resize mode does not already move that
element, otherwise the keyboard height is counted twice. Also scroll the
focused field into view after layout settles when using custom modals:

```ts
requestAnimationFrame(() => {
  document.activeElement?.scrollIntoView({ block: 'center', behavior: 'smooth' });
});
```

## 3. Native bridge integrations

Install only the plugins the product uses, then sync so CocoaPods/SPM and the
native project receive them:

```bash
npm install @capacitor/share @capacitor/camera @capacitor/preferences
npx cap sync ios
```

### Platform guards

`Capacitor.isNativePlatform()` distinguishes a native shell from the browser.
`Capacitor.getPlatform()` can distinguish `ios`, `android`, and `web`. Keep a
web fallback where the browser has a good equivalent, and avoid accessing
`window`, `document`, or `localStorage` during SSR:

```ts
import { Capacitor } from '@capacitor/core';

export const isNativeIos =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

export const canUseDom = typeof window !== 'undefined';
```

The plugins themselves commonly provide web implementations, so a guard is
needed only when behavior or support differs—not around every plugin call.

### Native Share with a web fallback

```ts
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

export async function shareArticle(title: string, url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Share.share({
      title,
      text: `Read ${title}`,
      url,
      dialogTitle: 'Share article', // Used by supported platforms.
    });
    return;
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    await navigator.share({ title, url });
    return;
  }

  await navigator.clipboard.writeText(url);
}
```

Treat cancellation as a normal outcome in the UI and call sharing from a user
gesture. Some share targets accept a URL or files, but not both consistently.

### Camera

```tsx
import { useState } from 'react';
import {
  Camera,
  CameraResultType,
  CameraSource,
  type Photo,
} from '@capacitor/camera';

export function ProfilePhotoPicker() {
  const [photo, setPhoto] = useState<Photo>();

  async function choosePhoto() {
    const permissions = await Camera.checkPermissions();
    if (permissions.camera === 'denied' || permissions.photos === 'denied') {
      // Show an explanation and a Settings link/button in production.
      throw new Error('Camera or photo-library access is disabled');
    }

    const result = await Camera.getPhoto({
      source: CameraSource.Prompt,
      resultType: CameraResultType.Uri,
      quality: 85,
      width: 1600,
      correctOrientation: true,
    });
    setPhoto(result);
  }

  return (
    <section>
      <button type="button" onClick={() => void choosePhoto()}>
        Choose profile photo
      </button>
      {photo?.webPath && <img src={photo.webPath} alt="Selected profile" />}
    </section>
  );
}
```

Prefer `Uri` over base64 for large images to avoid doubling memory use. Upload
by fetching `photo.webPath`, converting the response to a `Blob`, and appending
it to `FormData`. The user may cancel the prompt; distinguish cancellation
from a permission or upload error in the presentation layer.

### Preferences (small key/value state)

```ts
import { Preferences } from '@capacitor/preferences';

const SESSION_KEY = 'session.v1';

type Session = { userId: string; accessToken: string };

export async function saveSession(session: Session): Promise<void> {
  await Preferences.set({ key: SESSION_KEY, value: JSON.stringify(session) });
}

export async function loadSession(): Promise<Session | null> {
  const { value } = await Preferences.get({ key: SESSION_KEY });
  if (!value) return null;
  return JSON.parse(value) as Session;
}

export async function clearSession(): Promise<void> {
  await Preferences.remove({ key: SESSION_KEY });
}
```

Preferences is for small, non-relational values—not blobs, an offline database,
or secrets. Store refresh tokens and other high-value credentials in an iOS
Keychain-backed plugin after a security review. Version serialized values and
handle malformed or old data rather than trusting `JSON.parse` in production.

## 4. Build, Xcode, and release pipeline

### Build and sync

The repeatable local workflow is:

```bash
npm ci
npm run build
npx cap sync ios
npx cap open ios
```

`cap copy` copies the web bundle and config only; `cap sync` also updates native
plugins and dependencies. Run `sync` after installing/removing a plugin or
changing native configuration. Open `ios/App/App.xcworkspace` (not the project
file) when the project uses CocoaPods. `npx cap open ios` chooses correctly.

For faster development after the first build:

```bash
npx cap run ios --target "iPhone 16"
```

Use a target name installed on the machine (`xcrun simctl list devices`). A
physical device is mandatory for realistic camera, push notification, Keychain,
performance, and safe-area testing.

### Essential Xcode configuration

In **App target → General / Signing & Capabilities**:

1. Set a unique **Bundle Identifier**, **Team**, version, and build number.
2. Prefer automatic signing initially; make the App Store provisioning profile
   explicit in CI if the release process requires it.
3. Set the deployment target to iOS 16.0 and supported orientations.
4. Add capabilities only when required: Push Notifications, Background Modes,
   Associated Domains, Sign in with Apple, or In-App Purchase. Capabilities must
   also exist on the App ID/profile in the Developer portal.

In `Assets.xcassets`, fill the `AppIcon` set with an opaque 1024×1024 source
icon (no alpha channel). Let Xcode generate required renditions. Keep the launch
screen static and fast: configure `LaunchScreen.storyboard`/the asset catalog,
use branding and a background color, and do not imitate a functional UI.

### Privacy usage descriptions

Add only keys for APIs the app actually uses to `ios/App/App/Info.plist`, with
specific, user-facing reasons:

```xml
<key>NSCameraUsageDescription</key>
<string>Take a profile photo or scan a document.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Select an existing image for your profile.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Save generated images to your photo library.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Show nearby pickup locations while you use the app.</string>
<key>NSMicrophoneUsageDescription</key>
<string>Record audio when capturing a video.</string>
```

Missing a required usage description terminates the app when the protected API
is accessed. Do not add vague boilerplate or request permission on startup;
ask in context, immediately before the feature, and explain how to recover via
Settings after denial. Location in the background needs separate justification,
keys, entitlement/background mode, and App Review scrutiny.

Current App Store submissions also require an accurate privacy manifest and
privacy answers. Inspect each installed plugin and SDK, declare required-reason
API usage in `PrivacyInfo.xcprivacy` where applicable, and re-check Apple's
current requirements before every release. A usage-description key and a
privacy manifest solve different requirements.

### Archive and validate

Before release, select **Any iOS Device (arm64)** and use **Product → Archive**.
In Organizer, Validate, distribute to TestFlight, and test the exact release
archive. A CI pipeline should use a clean checkout, `npm ci`, web build,
`cap sync ios`, and `xcodebuild archive`; never commit signing secrets.

## Common failures and fixes

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| White screen after launch | Wrong `webDir`, missing build, JS runtime error, or incompatible absolute asset path | Run the web build, confirm `dist/index.html`, run `npx cap sync ios`, then inspect Safari → Develop and Xcode logs. |
| `Unable to load contents of file list` / missing Pods | Opening `.xcodeproj`, stale Pods, or an interrupted sync | Close Xcode, run `npx cap sync ios`, and open `.xcworkspace`; only then consider deleting Derived Data and reinstalling Pods. |
| `No such module Capacitor` or plugin not implemented | Plugin package/native dependency was not synced, or Capacitor major versions differ | Align `@capacitor/*` majors, reinstall dependencies, run `npx cap sync ios`, clean build folder, rebuild. |
| Signing requires a development team | No team/profile or mismatched bundle ID | Select the App target, choose the team, enable automatic signing, and verify the bundle ID/App ID and capabilities. |
| Simulator destination unavailable | Requested runtime/device is not installed | Install the runtime in Xcode Settings → Platforms and select a device listed by `xcrun simctl list devices available`. |
| Camera does not work in simulator | Simulator hardware limitations | Test on a signed physical device and keep a photo-library/web fallback. |
| App exits when camera/location opens | Missing `Info.plist` purpose string | Add the exact usage-description key, rebuild, and retest a clean install. |
| Plugin compiles for simulator but not device | Architecture/deployment-target mismatch in a third-party SDK | Update the SDK/plugin, ensure iOS 16 deployment targets align, and use an XCFramework containing device and simulator slices. Do not permanently exclude `arm64` as a shortcut. |
| Changes are absent in iOS | React was not rebuilt or copied | Run `npm run build && npx cap sync ios`; never edit generated `public` files. |
| API calls fail only on device | `localhost`, HTTP transport, ATS, CORS, or certificate issue | Use a reachable HTTPS API and production certificates. Treat ATS exceptions as narrow, temporary exceptions—not the default. |
| Keyboard covers a field | No resize strategy, fixed-height layout, or nested modal | Pick one Keyboard resize mode, use `100dvh`, test orientation changes, and scroll the focused control into view. |
| Push works in development only | Sandbox/production APNs environment, entitlement, profile, or provider key mismatch | Test the TestFlight build, inspect the `aps-environment` entitlement, and verify the provider uses the correct APNs configuration. |

When native state appears corrupted, use progressively stronger remedies rather
than immediately deleting everything:

```bash
npx cap doctor
npx cap sync ios
rm -rf ~/Library/Developer/Xcode/DerivedData/ExampleApp-*
```

Deleting and re-adding `ios` is a last resort because it discards signing,
entitlements, native Swift changes, URL schemes, and Xcode configuration. Keep
native customizations version-controlled and review the diff after every
Capacitor upgrade.

## Release checklist

- [ ] Web tests and production build pass with no console errors.
- [ ] Capacitor packages use one supported major version; lockfile is committed.
- [ ] `webDir` matches the actual artifact and no production `server.url` exists.
- [ ] Safe areas, rotation, Dynamic Type, VoiceOver, zoom policy, dark mode, and
      keyboard behavior are tested on small and notched devices.
- [ ] Permission prompts are contextual; purpose strings and privacy manifests
      match actual code and third-party SDK behavior.
- [ ] Offline, slow network, background/foreground, process termination, and
      interrupted uploads are handled.
- [ ] Deep links, authentication redirects, push notifications, camera, and
      secure storage are tested on a physical device.
- [ ] App icons, launch screen, bundle ID, version/build number, signing,
      entitlements, and App Store privacy answers are correct.
- [ ] The archived Release build—not only a debug simulator build—is exercised
      through TestFlight before phased production rollout.

## Official references

- [Capacitor documentation](https://capacitorjs.com/docs)
- [Capacitor iOS documentation](https://capacitorjs.com/docs/ios)
- [Capacitor configuration reference](https://capacitorjs.com/docs/config)
- [Apple: Protecting the user's privacy](https://developer.apple.com/documentation/uikit/protecting-the-user-s-privacy)
- [Apple: Describing data use in privacy manifests](https://developer.apple.com/documentation/bundleresources/describing-data-use-in-privacy-manifests)
