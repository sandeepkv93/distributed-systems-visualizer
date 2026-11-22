import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const repoRoot = process.cwd();
const tscPath = require.resolve('typescript/bin/tsc');
const aliasHook = path.join(repoRoot, 'scripts', 'register-test-aliases.cjs');

const baseTmp = process.env.TEST_TMPDIR || os.tmpdir();
const outDir = fs.mkdtempSync(path.join(baseTmp, 'dsv-test-dist-'));

function collectTestFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTestFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
      results.push(full);
    }
  }
  return results.sort();
}

try {
  // Compile TypeScript test suite into isolated temp directory (Bazel sandbox safe)
  execFileSync(
    process.execPath,
    [tscPath, '-p', path.join(repoRoot, 'tsconfig.test.json'), '--outDir', outDir],
    { stdio: 'inherit', cwd: repoRoot }
  );

  const testFiles = collectTestFiles(path.join(outDir, 'tests'));
  if (testFiles.length === 0) {
    console.error('No compiled test files found.');
    process.exit(1);
  }

  execFileSync(
    process.execPath,
    ['--test', '--require', aliasHook, ...testFiles],
    {
      stdio: 'inherit',
      cwd: repoRoot,
      env: {
        ...process.env,
        TEST_DIST_DIR: outDir,
        REPO_ROOT: repoRoot,
      },
    }
  );
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}
