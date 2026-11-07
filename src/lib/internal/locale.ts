/**
 * The page's language, so built-in formatting follows the document (`<html lang>`) rather than
 * the browser. A server render has no document and formats with the runtime's default.
 */
export const pageLocale = (): string | undefined =>
  (typeof document !== 'undefined' && document.documentElement.lang) || undefined;

/** A count in the page's number format, with its digit grouping. */
export const formatCount = (value: number): string =>
  new Intl.NumberFormat(pageLocale()).format(value);

/** A count and the unit after it as one atom, so "4\u00a0minutes ago" never breaks between them. */
export const keepUnit = (text: string): string => text.replace(/(\p{Nd}) (?=\p{L})/gu, '$1\u00a0');
