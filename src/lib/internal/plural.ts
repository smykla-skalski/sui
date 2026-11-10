/**
 * Amounts that between them fall in every CLDR cardinal plural category of every language:
 * the whole numbers to 20, where the rules part one, two, few and many (Irish's many runs 7 to
 * 10, Arabic's from 11), the tens and hundreds some rules read, a million for the "many" of
 * French and its kin, and fractions, which several languages name apart. A label that changes
 * with its amount can be measured in all its forms by naming each of these.
 */
export const PLURAL_SAMPLES: readonly number[] = [
  ...Array.from({ length: 21 }, (_, amount) => amount),
  21,
  100,
  1_000_000,
  0.5,
  1.5
];
