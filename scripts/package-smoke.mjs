// Installs the packed package into a fresh project and checks that it works there the way a
// consumer uses it: ESM `import`, CommonJS `require()`, and TypeScript types.
// Run `npm run build` first. Needs network access to the npm registry for dependencies.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const work = mkdtempSync(join(tmpdir(), 'qafundix-smoke-'));
// Run everything through `node` directly, without a shell, so paths with spaces work on every OS.
// `npm run` sets npm_execpath to npm's own CLI script.
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this script with `npm run test:package`.');
const node = (args, cwd) =>
  execFileSync(process.execPath, args, { cwd, stdio: 'pipe', encoding: 'utf8' });
const npm = (args, cwd) => node([npmCli, ...args], cwd);

try {
  const packed = JSON.parse(npm(['pack', '--json', '--pack-destination', work], root));
  const tarball = join(work, packed[0].filename);
  const { name } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

  const app = join(work, 'consumer');
  mkdirSync(app);
  writeFileSync(
    join(app, 'package.json'),
    JSON.stringify({ name: 'consumer', private: true, type: 'module' }),
  );
  npm(['install', '--no-audit', '--no-fund', tarball, 'typescript', '@types/node'], app);

  writeFileSync(
    join(app, 'esm.mjs'),
    `import { retry, toCamelCase, ERROR_CODES, isFrameworkError } from '${name}';
const value = await retry(async () => toCamelCase('smoke test'), { attempts: 1 });
if (value !== 'smokeTest' || ERROR_CODES.RETRY_EXHAUSTED !== 'RETRY_EXHAUSTED' || isFrameworkError(new Error())) process.exit(1);
console.log('ESM import ok');`,
  );
  writeFileSync(
    join(app, 'cjs.cjs'),
    `const core = require('${name}');
if (typeof core.Logger !== 'function' || typeof core.EnvironmentManager !== 'function') process.exit(1);
console.log('CommonJS require ok');`,
  );
  writeFileSync(
    join(app, 'types.ts'),
    `import { EnvironmentManager, Logger, retry, type RetryOptions } from '${name}';
const env = new EnvironmentManager({ PORT: '8080' });
const port: number = env.getNumber('PORT', 3000);
const options: RetryOptions = { attempts: 2, delayMs: 10 };
new Logger({ level: 'silent' }).info('typed', { port });
void retry(async () => port, options);`,
  );
  writeFileSync(
    join(app, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        noEmit: true,
        types: ['node'],
      },
      files: ['types.ts'],
    }),
  );

  console.log(node(['esm.mjs'], app).trim());
  console.log(node(['cjs.cjs'], app).trim());
  node([join(app, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tsconfig.json'], app);
  console.log('TypeScript types ok');
  console.log(`Package smoke test passed for ${packed[0].filename}`);
} catch (error) {
  console.error(error.stdout ?? '', error.stderr ?? '', error.message);
  process.exitCode = 1;
} finally {
  rmSync(work, { recursive: true, force: true });
}
