import assert from 'node:assert/strict';
import test from 'node:test';
import { mark, setWords, word } from '../src/lib/words.ts';

test('K9 a word set for the app replaces the English default, and others keep theirs', () => {
  setWords({
    'CopyableLinkField.copyLabel': 'Kopiuj link',
    'LoadMore.endLabel': (/** @type {string} */ shown) => `Wszystkie ${shown} widoczne`
  });
  assert.equal(word('CopyableLinkField.copyLabel', 'Copy link'), 'Kopiuj link');
  assert.equal(
    word('LoadMore.endLabel', (/** @type {string} */ shown) => `All ${shown} shown`)('12'),
    'Wszystkie 12 widoczne'
  );
  assert.equal(word('PairEntry.addLabel', 'Add a pair'), 'Add a pair');
});

test('K9 the marks that join words follow the language set for the app', () => {
  assert.equal(mark('colon'), ': ');
  setWords({ 'marks.comma': '、', 'marks.colon': '：' });
  assert.equal(mark('comma'), '、');
  assert.equal(mark('colon'), '：');
  assert.equal(mark('stop'), '. ');
});
