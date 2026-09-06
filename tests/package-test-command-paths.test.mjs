import assert from 'node:assert/strict';
import { existsSync, globSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

// `node --test` ignores a path argument that names no file and exits 0
// (Node 24.20.0: `node --test ok.test.mjs missing.test.mjs` runs one test
// and passes), so a listed suite that is deleted or renamed leaves CI with no
// signal. A new api/ or src-tauri/ suite that nobody lists never runs at all.
// Both drifts were live on main (#7772 B, C); this file is what keeps them
// closed, and it runs inside test:data on every code PR.

const root = resolve(import.meta.dirname, '..');
const scripts = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).scripts;

const TEST_SCRIPT = /^(?:pre|post)?test(?::|$)/;
// A shell word that names a repo file or glob: unquoted, no expansion, and a
// JavaScript/TypeScript extension. Flags and quoted strings never match, so
// `-g "matches golden…"` is not mistaken for a path.
const FILE_TOKEN = /^[\w@./*[\]{},-]+\.(?:mjs|mts|cjs|js|ts|tsx)$/;
const GLOB = /[*[\]{}]/;
const SUITE_ROOTS = ['api', 'src-tauri', 'scripts'];

function testScripts() {
  return Object.entries(scripts).filter(([name]) => TEST_SCRIPT.test(name));
}

function fileTokens(script) {
  return script.split(/\s+/).filter((token) => !token.startsWith('-') && FILE_TOKEN.test(token));
}

// The files a script runs: explicit tokens plus each glob's matches, resolved
// the way scripts/run-data-tests.mjs and `node --test` resolve them.
function coveredFiles(script) {
  const covered = new Set();
  for (const token of fileTokens(script)) {
    for (const file of GLOB.test(token) ? globSync(token, { cwd: root }) : [token]) {
      covered.add(file.split('\\').join('/'));
    }
  }
  return covered;
}

test('every file a test script names exists on disk', () => {
  const missing = [];
  let tokens = 0;
  for (const [name, script] of testScripts()) {
    for (const token of fileTokens(script)) {
      tokens += 1;
      const path = resolve(root, token);
      const found = GLOB.test(token)
        ? globSync(token, { cwd: root }).length > 0
        : existsSync(path) && statSync(path).isFile();
      if (!found) missing.push(`${name}: ${token}`);
    }
  }
  assert.ok(tokens >= 30, `expected the test scripts to name dozens of files, parsed ${tokens}`);
  assert.deepEqual(
    missing,
    [],
    'node --test exits 0 for a path that names no file, so a deleted or renamed suite silently leaves CI',
  );
});

test('every api/, src-tauri/ and scripts/ suite is run by a test script', () => {
  const suites = globSync(
    SUITE_ROOTS.map((dir) => `${dir}/**/*.test.{mjs,mts,cjs}`),
    { cwd: root, exclude: ['**/node_modules/**', '**/target/**'] },
  ).map((file) => file.split('\\').join('/'));
  assert.ok(suites.length >= 20, `expected the suite discovery glob to find real files, found ${suites.length}`);

  const covered = new Set();
  for (const [, script] of testScripts()) {
    for (const file of coveredFiles(script)) covered.add(file);
  }
  const orphans = suites.filter((suite) => !covered.has(suite)).sort();
  assert.deepEqual(
    orphans,
    [],
    'a suite no npm test script names runs nowhere; add it to test:sidecar (plain node --test) or test:data (tsx loader, sharded)',
  );
});

test('test:sidecar and test:data never run the same file', () => {
  const data = coveredFiles(scripts['test:data']);
  const sidecar = fileTokens(scripts['test:sidecar']);
  assert.ok(sidecar.length >= 10, `expected test:sidecar to list its suites, parsed ${sidecar.length}`);
  assert.deepEqual(
    sidecar.filter((file) => data.has(file)),
    [],
    'both jobs run on every code PR, so a file in both runs twice (#7772 D)',
  );
});
