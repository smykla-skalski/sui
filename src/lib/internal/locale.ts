/**
 * The page's language, so built-in formatting follows the document (`<html lang>`) rather than
 * the browser. A server render has no document and formats with the runtime's default.
 */
export const pageLocale = (): string | undefined =>
  (typeof document !== 'undefined' && document.documentElement.lang) || undefined;

const writings = new Map<string, string | undefined>();

// The language and its script, the script filled in where a tag leaves it out, so "sr-RS" is
// Cyrillic and never matches a page in "sr-Latn". A chart formats every value it draws, so each
// tag is read once.
const writingOf = (tag: string): string | undefined => {
  if (writings.has(tag)) return writings.get(tag);
  let writing: string | undefined;
  try {
    const { language, script } = new Intl.Locale(tag).maximize();
    writing = `${language}-${script}`;
  } catch {
    writing = undefined;
  }
  writings.set(tag, writing);
  return writing;
};

/**
 * The locale numbers, dates and times are formatted in: the first of the reader's browser
 * locales in the page's language and script, so a reader in the UK gets day-month dates on an
 * English page, or else the page's language. A format never moves the words into another
 * language or script.
 */
export const formatLocale = (): string | undefined => {
  const page = pageLocale();
  if (page === undefined || typeof navigator === 'undefined') return page;
  const writing = writingOf(page);
  return navigator.languages.find((tag) => writingOf(tag) === writing) ?? page;
};

/** A count in the reader's number format, with its digit grouping. */
export const formatCount = (value: number): string =>
  new Intl.NumberFormat(formatLocale()).format(value);

/** A count drawn in a seat sized for two digits, as a badge or a folded row's count: past 99 it
 * reads "99+", and the name around it still says the whole number. */
export const boundCount = (value: number): string =>
  value > 99 ? `${formatCount(99)}+` : formatCount(value);

/** A count and the unit after it as one atom, so "4\u00a0minutes ago" never breaks between them. */
export const keepUnit = (text: string): string => text.replace(/(\p{Nd}) (?=\p{L})/gu, '$1\u00a0');
