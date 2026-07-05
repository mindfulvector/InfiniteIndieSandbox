/*
 * Runs every harness test (test/test-*.js) and reports a summary.
 * Exit code 0 = all passed, 1 = at least one failed. Used by `npm test` / CI.
 *
 * Tests run in PARALLEL workers by default (each worker owns a distinct
 * IIS_PORT, so the PHP servers and Chromiums never collide) -- this cut the
 * full suite from ~27 minutes sequential to a fraction of that. Control with:
 *   IIS_JOBS=1 node test/run-all.js          # old sequential behaviour
 *   IIS_JOBS=4 node test/run-all.js          # explicit worker count
 *   node test/run-all.js test-combat ...     # run only named tests (any mode)
 *
 * Scheduling is longest-first using timings remembered from previous runs
 * (test/.timings.json, machine-local) so the slowest tests never end up
 * tail-heavy on one worker. Each test's output is buffered and printed whole
 * when it finishes, so logs never interleave.
 *
 * Each test gets its own screenshots/<test-name>/ directory (via IIS_SHOT_DIR)
 * so CI can upload them all as artifacts.
 */

const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const flags = process.argv.slice(2).filter((a) => a.startsWith('--'));
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));

// --core: the curated iteration tier (see core-tests.js) -- the most
// important systems plus regression guards, minutes not half-hours.
// Named tests and --core compose: names win when both are given.
const coreOnly = flags.includes('--core');
const coreList = coreOnly ? require('./core-tests.js') : null;

const tests = fs.readdirSync(dir)
    .filter((f) => /^test-.*\.js$/.test(f))
    .filter((f) => only.length > 0
        ? (only.includes(f) || only.includes(f.replace(/\.js$/, '')))
        : (!coreList || coreList.includes(f.replace(/\.js$/, ''))))
    .sort();

if (tests.length === 0) {
    console.error('No tests found' + (only.length ? ' matching: ' + only.join(', ') : '') + '.');
    process.exit(1);
}

// Worker count. Default is SEQUENTIAL: measurements on this class of box
// showed software-rendered Chromiums divide the same cores, so parallel
// workers mostly just inflate each test's frame times. IIS_JOBS>1 stays
// available for machines with real GPUs / more cores.
const jobs = Math.max(1, Math.min(
    parseInt(process.env.IIS_JOBS, 10) || 1,
    tests.length));

// Longest-first scheduling from remembered timings (missing tests go first,
// assumed slow, so a brand-new heavy test can't tail-end the run).
const timingsFile = path.join(dir, '.timings.json');
let timings = {};
try { timings = JSON.parse(fs.readFileSync(timingsFile, 'utf8')) || {}; } catch (e) {}
const queue = tests.slice().sort((a, b) => (timings[b] || 1e9) - (timings[a] || 1e9));

console.log(`Running ${tests.length} test file(s) on ${jobs} worker(s):\n  ${tests.join('\n  ')}\n`);

const results = [];
const BASE_PORT = 7200;

function runOne(t, port) {
    return new Promise((resolve) => {
        const start = Date.now();
        const shotDir = path.join(dir, 'screenshots', t.replace(/\.js$/, ''));
        const child = spawn(process.execPath, [path.join(dir, t)], {
            env: Object.assign({}, process.env, { IIS_SHOT_DIR: shotDir, IIS_PORT: String(port) }),
        });
        let out = '';
        child.stdout.on('data', (d) => { out += d; });
        child.stderr.on('data', (d) => { out += d; });
        child.on('close', (code) => {
            const ms = Date.now() - start;
            console.log(`\n\n########## ${t} ########## (worker port ${port}, ${(ms / 1000).toFixed(1)}s)`);
            process.stdout.write(out);
            resolve({ test: t, ok: code === 0, ms });
        });
    });
}

async function worker(idx) {
    const port = BASE_PORT + idx;
    for (;;) {
        const t = queue.shift();
        if (!t) return;
        results.push(await runOne(t, port));
    }
}

(async () => {
    const wallStart = Date.now();
    await Promise.all(Array.from({ length: jobs }, (_, i) => worker(i)));

    // Remember durations for next run's longest-first schedule.
    results.forEach((r) => { timings[r.test] = r.ms; });
    try { fs.writeFileSync(timingsFile, JSON.stringify(timings, null, 1)); } catch (e) {}

    console.log('\n\n================ SUMMARY ================');
    results.sort((a, b) => a.test.localeCompare(b.test));
    for (const r of results) {
        console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.test}  (${(r.ms / 1000).toFixed(1)}s)`);
    }
    const passed = results.filter((r) => r.ok).length;
    console.log(`----------------------------------------`);
    console.log(`${passed}/${results.length} test files passed  ` +
        `(wall ${(Date.now() - wallStart) / 1000 | 0}s on ${jobs} workers)`);
    console.log('========================================');
    process.exit(passed === results.length ? 0 : 1);
})();
