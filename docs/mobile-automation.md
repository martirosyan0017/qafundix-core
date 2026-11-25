# Mobile automation with Appium and WebdriverIO

[← Back to README](../README.md)

## 1. What you will build

A WebdriverIO project that tests a native mobile app through Appium, on Android or iOS. QAFundix Core reads the device and app settings from a `.env` file and gives the tests a logger. At the end you will run one test that starts your app and reads its first screen.

How the pieces fit together:

- **Appium** is a server that controls the device. A _driver_ adds support for one platform: UiAutomator2 for Android, XCUITest for iOS.
- **WebdriverIO** runs your tests and sends commands to Appium. Its Appium service starts the Appium server for you.
- **Mocha** provides `describe` and `it`, the blocks your tests are written in.

## 2. Prerequisites

Everyone needs:

| You need       | How to check                                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| Node.js 22.18+ | `node -v` prints `v22.18.0` or higher. Install the LTS version from [nodejs.org](https://nodejs.org/).               |
| npm            | `npm -v` prints a version. npm comes with Node.js.                                                                   |
| A GitHub token | A personal access token (classic) with `read:packages`. Created in [step 5](#5-install-and-configure-qafundix-core). |
| Your app       | An `.apk` file for Android, or an `.app` simulator build for iOS.                                                    |

### Android

Android tests run on Windows, macOS or Linux.

1. Install [Android Studio](https://developer.android.com/studio). It includes the Android SDK and a Java runtime (JDK).
2. Set two environment variables, then open a new terminal:
   - `ANDROID_HOME` to the SDK folder (shown in Android Studio under **Settings → Languages & Frameworks → Android SDK**).
   - `JAVA_HOME` to a JDK folder, for example the `jbr` folder inside the Android Studio installation.
3. Start an emulator from Android Studio's **Device Manager**, or connect a phone with USB debugging enabled.
4. Check that the device is visible: `adb devices` must list it. `adb` is in `ANDROID_HOME/platform-tools`.

### iOS

iOS tests require **macOS with Xcode**. They cannot run on Windows or Linux.

1. Install Xcode from the Mac App Store and open it once to finish the installation.
2. Install an iOS simulator in Xcode (**Settings → Components**).
3. Build your app for the simulator, which produces an `.app` folder.

This guide uses a simulator. A real iPhone additionally needs WebDriverAgent signed with a provisioning profile; see the XCUITest driver's [device preparation guide](https://appium.github.io/appium-xcuitest-driver/latest/getting-started/device-setup/).

## 3. Create a new project

Open a terminal in the folder where you keep your projects and run:

```bash
mkdir my-mobile-tests
cd my-mobile-tests
npm init -y
npm pkg set type=module
```

`npm init -y` creates `package.json`. `type=module` tells Node.js to use modern `import` syntax, which Core and these examples use.

All following commands run inside `my-mobile-tests`.

## 4. Install dependencies

```bash
npm install --save-dev @wdio/cli @wdio/local-runner @wdio/mocha-framework @wdio/spec-reporter @wdio/appium-service @wdio/globals appium typescript @types/node
```

This installs WebdriverIO with Mocha and a readable console reporter, the Appium service, Appium itself, and TypeScript.

Then install the Appium driver for your platform.

Android:

```bash
npx appium driver install uiautomator2
```

iOS (on macOS):

```bash
npx appium driver install xcuitest
```

Check the machine with Appium's doctor. It lists anything missing, such as `ANDROID_HOME` or `JAVA_HOME`, and explains how to fix it:

```bash
npx appium driver doctor uiautomator2
```

For iOS, run `npx appium driver doctor xcuitest`. Required fixes must be resolved; optional ones can be skipped.

## 5. Install and configure QAFundix Core

Core is published to GitHub Packages, which requires a token even for reading.

1. Create a token on GitHub: **Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token (classic)**. Tick only **`read:packages`** and copy the token.
2. Put the token into the `NODE_AUTH_TOKEN` environment variable of your current terminal. It is not stored anywhere and must be set again in a new terminal.

   Windows PowerShell (the token is hidden while you type):

   ```powershell
   $secureToken = Read-Host 'GitHub token' -AsSecureString
   $env:NODE_AUTH_TOKEN = [System.Net.NetworkCredential]::new('', $secureToken).Password
   ```

   macOS or Linux:

   ```bash
   read -rsp 'GitHub token: ' NODE_AUTH_TOKEN && export NODE_AUTH_TOKEN && echo
   ```

3. Create a file named `.npmrc` in the project folder with these two lines. It contains no secret and can be committed:

   ```ini
   @martirosyan0017:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
   ```

4. Install Core:

   ```bash
   npm install @martirosyan0017/qafundix-core
   ```

Never paste the token into `.npmrc`, code, or chat. No token yet, or no version published? Use a [local package file](getting-started.md#option-b-install-from-a-local-package-file) instead.

## 6. Recommended folder structure

```text
my-mobile-tests/
├── apps/                    your .apk or .app files
├── support/
│   └── core.ts              creates env, logger and platform once
├── test/
│   └── specs/
│       └── app.e2e.ts       the first test
├── .env                     device and app settings (not committed)
├── .gitignore
├── .npmrc
├── package.json
├── tsconfig.json            TypeScript settings
└── wdio.conf.ts             WebdriverIO and Appium settings
```

Copy your app into `apps/`.

## 7. Required configuration files

**`.env`** describes the device and the app. Use the block for your platform.

Android:

```dotenv
# .env
LOG_LEVEL=info
PLATFORM=Android
DEVICE_NAME=Android Emulator
APP_PATH=./apps/app-debug.apk
```

iOS:

```dotenv
LOG_LEVEL=info
PLATFORM=iOS
DEVICE_NAME=iPhone 16
APP_PATH=./apps/MyApp.app
```

For iOS, `DEVICE_NAME` must match a simulator installed in Xcode; `xcrun simctl list devices` lists them. For Android, any name works when one device is connected.

Create **`.gitignore`**:

```text
node_modules/
.env
```

**`tsconfig.json`** tells TypeScript about WebdriverIO's global types such as `driver`, `describe` and `it`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["node", "@wdio/globals/types", "@wdio/mocha-framework"]
  }
}
```

**`support/core.ts`** reads `.env`, creates the logger, and validates the platform name:

```ts
// support/core.ts
import { EnvironmentManager, Logger } from '@martirosyan0017/qafundix-core';

export const env = new EnvironmentManager();
export const logger = new Logger({
  name: 'mobile-tests',
  level: env.oneOf('LOG_LEVEL', ['trace', 'debug', 'info', 'warn', 'error'], 'info'),
});
export const platform = env.oneOf('PLATFORM', ['Android', 'iOS'], 'Android');
```

**`wdio.conf.ts`** builds the Appium capabilities from `.env`, so the same file works for Android and iOS:

```ts
// wdio.conf.ts
import { resolve } from 'node:path';
import { env, logger, platform } from './support/core.js';

export const config: WebdriverIO.Config = {
  runner: 'local',
  specs: ['./test/specs/**/*.ts'],
  maxInstances: 1,
  services: ['appium'],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: { timeout: 120_000 },
  capabilities: [
    {
      platformName: platform,
      'appium:automationName': platform === 'Android' ? 'UiAutomator2' : 'XCUITest',
      'appium:deviceName': env.require('DEVICE_NAME'),
      'appium:app': resolve(env.require('APP_PATH')),
    },
  ],
  onPrepare() {
    logger.info('Mobile run starting', { platform });
  },
};
```

`env.require` stops the run with `MISSING_ENVIRONMENT_VARIABLE` if `DEVICE_NAME` or `APP_PATH` is missing. `resolve` turns the relative app path into the absolute path Appium needs. Imports between your own files end in `.js`; WebdriverIO resolves them to the `.ts` files.

## 8. First working automated test

**`test/specs/app.e2e.ts`** starts the app (WebdriverIO does this before the first test) and checks that the first screen has content:

```ts
// test/specs/app.e2e.ts
import { driver, expect } from '@wdio/globals';
import { logger, platform } from '../../support/core.js';

describe('App launch', () => {
  it('shows the first screen', async () => {
    const log = logger.child({ test: 'app launch', platform });
    const screen = await driver.getPageSource();
    log.info('First screen loaded', { characters: screen.length });
    expect(screen.length).toBeGreaterThan(0);
  });
});
```

`driver.getPageSource()` returns the current screen as XML. Once this works, replace the check with real interactions, for example finding an element with `$('~login-button')` (by accessibility ID) and calling `.click()`.

## 9. How to execute tests

1. Start the emulator or simulator, or connect the device.
2. Run:

   ```bash
   npx wdio run wdio.conf.ts
   ```

The Appium service starts and stops the Appium server automatically. To switch platform, change `PLATFORM`, `DEVICE_NAME` and `APP_PATH` in `.env`.

## 10. Expected result

The app opens on the device, the console shows a `Mobile run starting` log line from Core and the spec reporter output, and the run ends with a summary line like:

```text
Spec Files: 1 passed, 1 total (100% completed)
```

## 11. Common problems and solutions

| Problem                                                                       | Solution                                                                      |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `npm error code E401` while installing Core                                   | `NODE_AUTH_TOKEN` is not set in this terminal. Repeat step 5.2.               |
| `Neither ANDROID_HOME nor ANDROID_SDK_ROOT environment variable was exported` | Set `ANDROID_HOME` to the Android SDK folder and open a new terminal.         |
| `npx appium driver doctor` reports `JAVA_HOME` is not set                     | Set `JAVA_HOME` to a JDK folder and open a new terminal.                      |
| `Could not find a driver for automationName 'UiAutomator2'` (or `'XCUITest'`) | Install the driver: `npx appium driver install uiautomator2` (or `xcuitest`). |
| `MISSING_ENVIRONMENT_VARIABLE` for `DEVICE_NAME` or `APP_PATH`                | Add the variable to `.env`.                                                   |
| The emulator is not used                                                      | `adb devices` must list it as `device`. Start it before running the tests.    |
| iOS commands fail on Windows or Linux                                         | iOS automation needs macOS and Xcode.                                         |

Run `npx appium driver doctor uiautomator2` (or `xcuitest`) whenever the device setup seems wrong. More installation problems: [Troubleshooting](troubleshooting.md).

## Next steps

- Read more settings from `.env`: [Configuration and environment variables](configuration.md)
- Log useful data without leaking secrets: [Logging](logging.md)
- Retry backend setup calls that your tests depend on: [Retry](retry.md)
