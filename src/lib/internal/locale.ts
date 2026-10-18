/**
 * The page's language, so built-in formatting follows the document (`<html lang>`) rather than
 * the browser. A server render has no document and formats with the runtime's default.
 */
export const pageLocale = (): string | undefined =>
  (typeof document !== 'undefined' && document.documentElement.lang) || undefined;

/** A count in the page's number format, with its digit grouping. */
export const formatCount = (value: number): string =>
  new Intl.NumberFormat(pageLocale()).format(value);
