/**
 * The page's language, so built-in formatting follows the document (`<html lang>`) rather than
 * the browser. A server render has no document and formats with the runtime's default.
 */
export const pageLocale = (): string | undefined =>
  (typeof document !== 'undefined' && document.documentElement.lang) || undefined;

const languageOf = (tag: string): string | undefined => {
  try {
    return new Intl.Locale(tag).language;
  } catch {
    return undefined;
  }
};

/**
 * The locale numbers, dates and times are formatted in: the first of the reader's browser
 * locales in the page's language, so a reader in the UK gets day-month dates on an English page,
 * or else the page's language. A format never moves the words into another language.
 */
export const formatLocale = (): string | undefined => {
  const page = pageLocale();
  if (page === undefined || typeof navigator === 'undefined') return page;
  const language = languageOf(page);
  return navigator.languages.find((tag) => languageOf(tag) === language) ?? page;
};

/** A count in the reader's number format, with its digit grouping. */
export const formatCount = (value: number): string =>
  new Intl.NumberFormat(formatLocale()).format(value);

/** A count and the unit after it as one atom, so "4\u00a0minutes ago" never breaks between them. */
export const keepUnit = (text: string): string => text.replace(/(\p{Nd}) (?=\p{L})/gu, '$1\u00a0');
