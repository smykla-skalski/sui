import { spawn } from 'node:child_process';
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
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
