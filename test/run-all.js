/*
 * Runs every harness test (test/test-*.js) in sequence and reports a summary.
 * Exit code 0 = all passed, 1 = at least one failed. Used by `npm test` / CI.
 *
 * Each test gets its own screenshots/<test-name>/ directory (via IIS_SHOT_DIR)
 * so CI can upload them all as artifacts.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const only = process.argv.slice(2); // optional: run only named tests

const tests = fs.readdirSync(dir)
    .filter((f) => /^test-.*\.js$/.test(f))
    .filter((f) => only.length === 0 || only.includes(f) || only.includes(f.replace(/\.js$/, '')))
    .sort();

if (tests.length === 0) {
    console.error('No tests found' + (only.length ? ' matching: ' + only.join(', ') : '') + '.');
    process.exit(1);
}

console.log(`Running ${tests.length} test file(s):\n  ${tests.join('\n  ')}\n`);

const results = [];
for (const t of tests) {
    console.log(`\n\n########## ${t} ##########`);
    const start = Date.now();
    const shotDir = path.join(dir, 'screenshots', t.replace(/\.js$/, ''));
    const res = spawnSync(process.execPath, [path.join(dir, t)], {
        stdio: 'inherit',
        env: Object.assign({}, process.env, { IIS_SHOT_DIR: shotDir }),
    });
    results.push({ test: t, ok: res.status === 0, ms: Date.now() - start });
}

console.log('\n\n================ SUMMARY ================');
for (const r of results) {
    console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.test}  (${(r.ms / 1000).toFixed(1)}s)`);
}
const passed = results.filter((r) => r.ok).length;
console.log(`----------------------------------------`);
console.log(`${passed}/${results.length} test files passed`);
console.log('========================================');

process.exit(passed === results.length ? 0 : 1);
