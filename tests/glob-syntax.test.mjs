import assert from 'node:assert/strict';
import test from 'node:test';
import { tokenizeGlob } from '../src/lib/internal/glob-syntax.ts';

/** @type {Record<string, string>} */
const roles = {
  'tok-const': 'any',
  'tok-key': 'not',
  'tok-str': 'lit',
  'tok-pun': 'pun'
};

/** The pattern's runs written as `[role text]`, after checking that no character was lost. */
const marked = (/** @type {string} */ pattern) => {
  const runs = tokenizeGlob(pattern);
  assert.equal(runs.map((piece) => piece.text).join(''), pattern);
  return runs.map(({ cls, text }) => (cls ? `[${roles[cls]} ${text}]` : text)).join('');
};

test('wildcards match and separators part the names, which stay plain', () => {
  assert.equal(marked('src/**/*.test.?s'), 'src[pun /][any **][pun /][any *].test.[any ?]s');
  assert.equal(marked('CHANGELOG.md'), 'CHANGELOG.md');
});

test('a bang negates only at the start of the pattern', () => {
  assert.equal(marked('!docs/draft!.md'), '[not !]docs[pun /]draft!.md');
});

test('a character class lists its members, its range dashes and its own negation', () => {
  assert.equal(
    marked('[!a-z0-9_-].md'),
    '[pun [][not !][lit a][pun -][lit z0][pun -][lit 9_-][pun ]].md'
  );
  assert.equal(marked('[]x]'), '[pun [][lit ]x][pun ]]');
  assert.equal(marked('[[:digit:]]'), '[pun [][lit [:digit:]][pun ]]');
  assert.equal(marked('[abc'), '[abc');
});

test('a brace set lists alternatives, and a brace with none is a literal', () => {
  assert.equal(marked('*.{js,ts}'), '[any *].[pun {][lit js][pun ,][lit ts][pun }]');
  assert.equal(
    marked('{src,lib/{a,b*}}'),
    '[pun {][lit src][pun ,][lit lib][pun /{][lit a][pun ,][lit b][any *][pun }}]'
  );
  assert.equal(marked('v{1..3}'), 'v[pun {][lit 1][pun ..][lit 3][pun }]');
  assert.equal(marked('{a}/{b,c'), '{a}[pun /]{b,c');
});

test('an escape makes the character after it literal', () => {
  assert.equal(marked('a\\*b\\'), 'a[pun \\][lit *]b[pun \\]');
  assert.equal(marked('\\!keep'), '[pun \\][lit !]keep');
});
