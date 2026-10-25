import assert from 'node:assert/strict';
import test from 'node:test';
import { tokenizeShell } from '../src/lib/internal/shell-syntax.ts';

/** @type {Record<string, string>} */
const roles = {
  'tok-head': 'cmd',
  'tok-key': 'var',
  'tok-const': 'opt',
  'tok-str': 'str',
  'tok-com': 'com',
  'tok-pun': 'op'
};

/** Each line's runs written as `[role text]`, after checking that no character was lost. */
const marked = (/** @type {string[]} */ ...lines) =>
  tokenizeShell(lines).map((runs, index) => {
    assert.equal(runs.map((piece) => piece.text).join(''), lines[index]);
    return runs.map(({ cls, text }) => (cls ? `[${roles[cls]} ${text}]` : text)).join('');
  });

test('a command is marked wherever one can start, and its arguments stay plain', () => {
  assert.deepEqual(
    marked('npm run build && npx svelte-package --input src/lib --types | tee log.txt; ls -la'),
    [
      '[cmd npm] run build [op &&] [cmd npx] svelte-package [opt --input] src/lib [opt --types] [op |] [cmd tee] log.txt[op ;] [cmd ls] [opt -la]'
    ]
  );
  assert.deepEqual(marked('$ NODE_ENV=production node app.js --port=8080 2>&1 | grep -v debug'), [
    '[op $] [var NODE_ENV][op =]production [cmd node] app.js [opt --port][op =]8080 [op 2>&1] [op |] [cmd grep] [opt -v] debug'
  ]);
});

test('double quotes expand variables and commands, and single quotes keep them literal', () => {
  assert.deepEqual(marked(`echo "$HOME/\${DIR}: $(git rev-parse HEAD)" '$HOME'`), [
    '[cmd echo] [str "][var $HOME][str /][var ${DIR}][str : ][op $(][cmd git] rev-parse HEAD[op )][str "] [str \'$HOME\']'
  ]);
});

test('a hash starts a comment only at the start of a word', () => {
  assert.deepEqual(marked('curl https://example.com/#top # fetch the page'), [
    '[cmd curl] https://example.com/#top [com # fetch the page]'
  ]);
});

test('a continued line and an open quote carry on to the next line', () => {
  assert.deepEqual(marked('docker run --rm \\', '  ghcr.io/app:1.2 "first', 'second" && echo ok'), [
    '[cmd docker] run [opt --rm] [op \\]',
    '  ghcr.io/app:1.2 [str "first]',
    '[str second"] [op &&] [cmd echo] ok'
  ]);
});

test('time options leave the following command in the command role', () => {
  assert.deepEqual(marked('time -p ls -l && time --verbose pwd'), [
    '[opt time] [opt -p] [cmd ls] [opt -l] [op &&] [opt time] [opt --verbose] [cmd pwd]'
  ]);
});

test('only assignment-position words receive variable and punctuation roles', () => {
  assert.deepEqual(marked('echo FOO=bar; FOO=bar env | grep NAME=value'), [
    '[cmd echo] FOO=bar[op ;] [var FOO][op =]bar [cmd env] [op |] [cmd grep] NAME=value'
  ]);
});

test('multiple heredocs on one line consume their delimiters in order', () => {
  assert.deepEqual(marked("cat <<ONE <<-'TWO'", 'first', 'ONE', '\tsecond', '\tTWO', 'echo done'), [
    "[cmd cat] [op <<ONE] [op <<-'TWO']",
    '[str first]',
    '[op ONE]',
    '[str \tsecond]',
    '[op \tTWO]',
    '[cmd echo] done'
  ]);
});
