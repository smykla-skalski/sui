import { spawn } from 'node:child_process';
import { closeSync, mkdirSync, mkdtempSync, openSync, readFileSync } from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const audits = 'the law audit finds|the page keeps its audit';
const sweeps = 'L-41 and L-96|L-102 an avatar|L-48 and L-52|L-97';
const press = 'L-42 every control';
const clock = 'a clock tick over a list';
const layers = 'layer grows at 60 frames a second';
const navigationLayout = 'a chart|the chart|the detail pane page';
const kitchen = 'tests/browser/kitchen-sink.test.mjs';
const performance = 'tests/browser/timing/performance.test.mjs';

/** @type {Record<string, { file: string; pattern?: string; skip?: string }>} */
export const groups = {
  a11y: { file: 'tests/browser/a11y.test.mjs' },
  forms: { file: 'tests/browser/forms.test.mjs' },
  lists: { file: 'tests/browser/lists.test.mjs' },
  navigation: { file: 'tests/browser/navigation.test.mjs', skip: navigationLayout },
  'navigation-layout': { file: 'tests/browser/navigation.test.mjs', pattern: navigationLayout },
  overlays: { file: 'tests/browser/overlays.test.mjs' },
  words: { file: 'tests/browser/words.test.mjs' },
  offline: { file: 'tests/browser/offline.test.mjs' },
  visual: { file: 'tests/browser/visual.test.mjs' },
  'kitchen-audit': { file: kitchen, pattern: audits },
  'kitchen-sweeps': { file: kitchen, pattern: sweeps },
  'kitchen-press': { file: kitchen, pattern: press },
  kitchen: { file: kitchen, skip: `${audits}|${sweeps}|${press}` },
  performance: { file: performance, skip: `${clock}|${layers}` },
  clock: { file: performance, pattern: clock },
  motion: { file: performance, pattern: layers },
  reload: { file: 'tests/browser/timing/reload.test.mjs' }
};

/** @param {string} name */
export function argumentsFor(name) {
  const group = Object.hasOwn(groups, name) ? groups[name] : undefined;
  if (!group) throw new Error(`Unknown browser test group: ${name}`);
  return [
    '--test',
    '--test-concurrency=1',
    ...('pattern' in group ? [`--test-name-pattern=${group.pattern}`] : []),
    ...('skip' in group ? [`--test-skip-pattern=${group.skip}`] : []),
    group.file
  ];
}

const timing = new Set(['performance', 'clock', 'motion', 'reload']);

/** The groups that take longest alone, which start first so none starts last and runs alone. */
const heaviest = ['a11y', 'kitchen-audit', 'kitchen', 'visual-light', 'visual-dark', 'offline'];

/**
 * Every group on one machine against one build. The groups that only read the page run
 * `SUI_JOBS` at a time (a third of the cores by default, since each drives a browser of its own),
 * heaviest first. Then the groups that time frames run one by one on an otherwise idle machine,
 * since another process taking a core drops their frames; `SUI_TIMING=0` leaves them out. The
 * visual group runs one process per theme. Each group's output goes to its own file in
 * `SUI_LOGS`, or a new temporary folder, and a failed group's tail is printed.
 */
async function runAll() {
  const asked = process.env.SUI_JOBS;
  const jobs = asked ? Number(asked) : Math.max(1, Math.floor(availableParallelism() / 3));
  // No workers would run no group, and an empty run passes.
  if (!Number.isInteger(jobs) || jobs < 1)
    throw new Error(`SUI_JOBS must be a whole number above 0, not ${asked}`);
  const { serveSink } = await import('./sink.mjs');
  const logs = process.env.SUI_LOGS ?? mkdtempSync(join(tmpdir(), 'sui-browser-'));
  mkdirSync(logs, { recursive: true });
  const built = Date.now();
  const { server, url } = await serveSink();
  console.log(`built and served in ${seconds(built)}s, logs in ${logs}`);
  const env = { ...process.env, SUI_LONG: '1', SUI_SINK_URL: url };
  /** @type {Map<string, string[]>} */
  const side = new Map();
  for (const theme of ['light', 'dark'])
    side.set(`visual-${theme}`, ['--test', `--test-name-pattern=in ${theme}$`, groups.visual.file]);
  for (const name of Object.keys(groups))
    if (name !== 'visual' && !timing.has(name)) side.set(name, argumentsFor(name));
  const order = [
    ...heaviest.filter((name) => side.has(name)),
    ...[...side.keys()].filter((name) => !heaviest.includes(name))
  ];
  /** @param {string} name @param {string[]} args @returns {Promise<boolean>} */
  const run = (name, args) =>
    new Promise((resolve) => {
      const started = Date.now();
      const file = join(logs, `${name}.log`);
      const out = openSync(file, 'w');
      const child = spawn(process.execPath, args, { env, stdio: ['ignore', out, out] });
      child.on('exit', (code) => {
        closeSync(out);
        console.log(`${code === 0 ? 'pass' : 'FAIL'} ${name} ${seconds(started)}s`);
        if (code !== 0) console.log(readFileSync(file, 'utf8').split('\n').slice(-40).join('\n'));
        resolve(code === 0);
      });
    });
  const all = Date.now();
  /** @type {boolean[]} */
  const passed = [];
  await Promise.all(
    Array.from({ length: jobs }, async () => {
      for (let name = order.shift(); name; name = order.shift())
        passed.push(await run(name, side.get(name) ?? []));
    })
  );
  console.log(`side by side, ${jobs} at a time: ${seconds(all)}s`);
  if (process.env.SUI_TIMING !== '0')
    for (const name of timing) passed.push(await run(name, argumentsFor(name)));
  await server.close();
  console.log(`all groups: ${seconds(built)}s`);
  return passed.every(Boolean) ? 0 : 1;
}

/** @param {number} since */
const seconds = (since) => ((Date.now() - since) / 1000).toFixed(1);

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === 'all') process.exitCode = await runAll();
  else {
    const child = spawn(process.execPath, argumentsFor(process.argv[2]), {
      env: { ...process.env, SUI_LONG: '1' },
      stdio: 'inherit'
    });
    child.on('error', (error) => {
      console.error(error);
      process.exitCode = 1;
    });
    child.on('exit', (code, signal) => {
      process.exitCode = code ?? 1;
      if (signal) process.kill(process.pid, signal);
    });
  }
}
