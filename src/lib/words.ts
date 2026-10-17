/**
 * The words every component draws or announces, replaced app-wide in one place.
 *
 * Each built-in word is also a prop with an English default; a word set here replaces that
 * default everywhere, and a prop given to one instance still wins. Keys are the component and
 * the prop, such as `CopyableLinkField.copyLabel` or `LoadMore.arrivedLabel`, and a word that
 * depends on a count is a function of that count, so a language applies its own plural rules.
 * Call it once, before the first component renders.
 */
type Word = string | ((...values: never[]) => string);

let words: Record<string, Word> = {};

export function setWords(next: Record<string, Word>): void {
  words = { ...words, ...next };
}

/** The word the app set for `key`, else the component's English default. */
export function word<T extends Word>(key: string, fallback: T): T {
  return key in words ? (words[key] as T) : fallback;
}
