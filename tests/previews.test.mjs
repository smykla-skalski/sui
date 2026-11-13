import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { previewOptions, previewUrl } from '../src/routes/(sink)/previews.ts';

const script = new URL('../preview/previews.sh', import.meta.url).pathname;
const entry = (/** @type {number} */ pr) => ({ number: pr, title: `"Title" of ${pr}` });
/** An open pull request as the workflow passes it: its number and its picker entry in base64. */
const open = (/** @type {number} */ pr) =>
  `${pr}:${Buffer.from(JSON.stringify(entry(pr))).toString('base64')}`;

test('installs the piped preview, removes those of closed pull requests and lists the rest', (t) => {
  const data = mkdtempSync(join(tmpdir(), 'sui-previews-'));
  t.after(() => rmSync(data, { recursive: true, force: true }));
  for (const pr of [1, 10, 12]) mkdirSync(join(data, 'previews', `pr-${pr}`), { recursive: true });
  const site = join(data, 'site');
  mkdirSync(site);
  writeFileSync(join(site, 'index.html'), 'pr 3');

  // pr-1 is closed, and must not survive on the strength of 10 being open. 15 is open with no
  // preview, as a pull request that never changed the look.
  execFileSync('sh', [script, '3', ...[3, 10, 12, 15].flatMap((pr) => [String(pr), open(pr)])], {
    input: execFileSync('tar', ['-cz', '-C', site, '.']),
    env: { ...process.env, PREVIEWS_DATA: data }
  });

  assert.deepEqual(readdirSync(join(data, 'previews')).sort(), [
    'pr-10',
    'pr-12',
    'pr-3',
    'previews.json'
  ]);
  assert.equal(readFileSync(join(data, 'previews', 'pr-3', 'index.html'), 'utf8'), 'pr 3');
  assert.deepEqual(
    new Set(JSON.parse(readFileSync(join(data, 'previews', 'previews.json'), 'utf8'))),
    new Set([entry(3), entry(10), entry(12)])
  );
});

test('replaces the previous main at the root and keeps the open previews', (t) => {
  const data = mkdtempSync(join(tmpdir(), 'sui-previews-'));
  t.after(() => rmSync(data, { recursive: true, force: true }));
  const previews = join(data, 'previews');
  for (const pr of [1, 3]) mkdirSync(join(previews, `pr-${pr}`), { recursive: true });
  mkdirSync(join(previews, '_app', 'old'), { recursive: true });
  writeFileSync(join(previews, 'index.html'), 'old main');
  const site = join(data, 'site');
  mkdirSync(join(site, '_app', 'new'), { recursive: true });
  writeFileSync(join(site, 'index.html'), 'new main');

  // A branch older than the picker passes bare numbers.
  execFileSync('sh', [script, 'main', '3'], {
    input: execFileSync('tar', ['-cz', '-C', site, '.']),
    env: { ...process.env, PREVIEWS_DATA: data }
  });

  assert.deepEqual(readdirSync(previews).sort(), ['_app', 'index.html', 'pr-3', 'previews.json']);
  assert.equal(readFileSync(join(previews, 'previews.json'), 'utf8'), '[]\n');
  assert.deepEqual(readdirSync(join(previews, '_app')), ['new']);
  assert.equal(readFileSync(join(previews, 'index.html'), 'utf8'), 'new main');
});

test('the picker offers main and the previews, newest first, while any pull request has one', () => {
  assert.deepEqual(previewOptions([]), []);
  assert.deepEqual(previewOptions([{ number: 4, title: 'four' }]), [
    { value: '', label: 'main' },
    { value: '/pr-4', label: '#4 four' }
  ]);
  assert.deepEqual(
    previewOptions([
      { number: 4, title: 'four' },
      { number: 12, title: 'twelve' }
    ]),
    [
      { value: '', label: 'main' },
      { value: '/pr-12', label: '#12 twelve' },
      { value: '/pr-4', label: '#4 four' }
    ]
  );
});

test('a switch keeps the page, its query and its section', () => {
  const at = (pathname = '/', search = '', hash = '') => ({ pathname, search, hash });
  assert.equal(
    previewUrl('/pr-7', at('/select/', '?state=open', '#sizes')),
    '/pr-7/select/?state=open#sizes'
  );
  assert.equal(previewUrl('', at('/pr-7/all/', '', '#select')), '/all/#select');
  assert.equal(previewUrl('/pr-9', at('/pr-7/')), '/pr-9/');
  // A page whose own name starts like a preview is still main's.
  assert.equal(previewUrl('/pr-9', at('/pr-7x/')), '/pr-9/pr-7x/');
});
