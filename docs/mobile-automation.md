# Mobile automation — Appium + WebdriverIO

You need **Node.js 22.18+**, [access to Core](getting-started.md#option-a-install-from-github-packages) (a GitHub token in `NODE_AUTH_TOKEN` and a `.npmrc` file), and your app file.

| Platform | Also needed                                                                                                                                                                                     |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Android  | [Android Studio](https://developer.android.com/studio), `ANDROID_HOME` and `JAVA_HOME` set, an emulator or phone listed by `adb devices`, an `.apk`                                             |
| iOS      | **macOS with Xcode** and a simulator, an `.app` simulator build. Real iPhones need [extra signing setup](https://appium.github.io/appium-xcuitest-driver/latest/getting-started/device-setup/). |

## 1. Create the project

```bash
mkdir my-mobile-tests
cd my-mobile-tests
npm init -y
npm pkg set type=module
npm install @martirosyan0017/qafundix-core
npm install --save-dev @wdio/cli @wdio/local-runner @wdio/mocha-framework @wdio/spec-reporter @wdio/appium-service @wdio/globals appium typescript @types/node
npx appium driver install uiautomator2
npx appium driver doctor uiautomator2
```

For iOS, use `xcuitest` instead of `uiautomator2` in the last two commands. The doctor lists anything missing on your machine.

## 2. Add the files

```text
my-mobile-tests/
├── apps/                  your .apk or .app
├── support/core.ts
├── test/specs/app.e2e.ts
├── .env
├── tsconfig.json
└── wdio.conf.ts
```

```dotenv
# .env
LOG_LEVEL=info
PLATFORM=Android
DEVICE_NAME=Android Emulator
APP_PATH=./apps/app-debug.apk
```

For iOS: `PLATFORM=iOS`, `DEVICE_NAME=iPhone 16` (a simulator from `xcrun simctl list devices`), `APP_PATH=./apps/MyApp.app`.

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

Add `.env` to `.gitignore`.

## 3. Run

Start the emulator or simulator, then:

```bash
npx wdio run wdio.conf.ts
```

Appium starts automatically. You should see `Spec Files: 1 passed`.

## Problems?

| Error                                            | Fix                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `E401` when installing Core                      | Set `NODE_AUTH_TOKEN` again in this terminal.                      |
| `Neither ANDROID_HOME nor ANDROID_SDK_ROOT ...`  | Set `ANDROID_HOME` to the Android SDK folder, open a new terminal. |
| `Could not find a driver for automationName ...` | Run `npx appium driver install uiautomator2` (or `xcuitest`).      |
| `MISSING_ENVIRONMENT_VARIABLE`                   | Add the named variable to `.env`.                                  |

More: [Troubleshooting](troubleshooting.md) · Next: [Configuration](configuration.md), [Logging](logging.md)
