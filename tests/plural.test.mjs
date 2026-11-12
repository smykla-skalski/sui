import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PLURAL_SAMPLES } from '../src/lib/internal/plural.ts';

// Every language with more than the one/other pair, and a few with only that pair.
const LANGUAGES = [
  'ar',
  'ast',
  'be',
  'br',
  'bs',
  'ca',
  'cs',
  'cy',
  'dsb',
  'en',
  'es',
  'fil',
  'fr',
  'ga',
  'gd',
  'gv',
  'he',
  'hr',
  'hsb',
  'is',
  'it',
  'iu',
  'ksh',
  'kw',
  'lag',
  'lt',
  'lv',
  'mk',
  'mt',
  'naq',
  'pl',
  'pt',
  'pt-PT',
  'ro',
  'ru',
  'se',
  'shi',
  'sk',
  'sl',
  'sma',
  'smj',
  'smn',
  'sms',
  'sr',
  'tzm',
  'uk',
  'zh'
];

test('the plural samples fall in every cardinal category of every language', () => {
  const missed = [];
  for (const language of LANGUAGES) {
    const rules = new Intl.PluralRules(language);
    const hit = new Set(PLURAL_SAMPLES.map((amount) => rules.select(amount)));
    for (const category of rules.resolvedOptions().pluralCategories)
      if (!hit.has(category)) missed.push(`${language} ${category}`);
  }
  assert.deepEqual(missed, []);
});
