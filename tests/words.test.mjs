import assert from 'node:assert/strict';
import test from 'node:test';
import { formatLocale } from '../src/lib/internal/locale.ts';
import { mark, setWords, word } from '../src/lib/words.ts';

test('K9 a word set for the app replaces the English default, and others keep theirs', () => {
  setWords({
    'CopyableLinkField.copyLabel': 'Kopiuj link',
    'LoadMore.endLabel': (/** @type {number} */ count, /** @type {string} */ shown) =>
      `Wszystkie ${shown} widoczne`
  });
  assert.equal(word('CopyableLinkField.copyLabel', 'Copy link'), 'Kopiuj link');
  assert.equal(
    word(
      'LoadMore.endLabel',
      (/** @type {number} */ count, /** @type {string} */ shown) => `All ${shown} shown`
    )(12, '12'),
    'Wszystkie 12 widoczne'
  );
  assert.equal(word('PairEntry.addLabel', 'Add a Pair'), 'Add a Pair');
});

test('K9 the marks that join words follow the language set for the app', () => {
  assert.equal(mark('colon'), ': ');
  setWords({ 'marks.comma': '、', 'marks.colon': '：' });
  assert.equal(mark('comma'), '、');
  assert.equal(mark('colon'), '：');
  assert.equal(mark('stop'), '. ');
});

test("a number or date takes the reader's own region of the page's language, never another language", () => {
  const browser = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const reads = (/** @type {string} */ lang, /** @type {string[]} */ languages) => {
    Object.assign(globalThis, { document: { documentElement: { lang } } });
    Object.defineProperty(globalThis, 'navigator', { value: { languages }, configurable: true });
    return formatLocale();
  };
  try {
    assert.equal(reads('en', ['de-DE', 'en-GB', 'en-US']), 'en-GB');
    assert.equal(reads('en', ['de-DE']), 'en');
    assert.equal(reads('pl', ['en-US', 'pl-PL']), 'pl-PL');
  } finally {
    Reflect.deleteProperty(globalThis, 'document');
    if (browser) Object.defineProperty(globalThis, 'navigator', browser);
  }
});
