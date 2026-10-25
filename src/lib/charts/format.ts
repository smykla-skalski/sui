import { pageLocale } from '../internal/locale.js';

const formats = new Map<string, Intl.NumberFormat>();

/** A value in the page language's digits and grouping, with at most two decimals. */
export function formatNumber(value: number): string {
  const locale = pageLocale() ?? '';
  let format = formats.get(locale);
  if (!format) {
    format = new Intl.NumberFormat(locale || undefined, { maximumFractionDigits: 2 });
    formats.set(locale, format);
  }
  return format.format(value);
}

/** Cuts `text` to at most `most` characters as a reader counts them, never inside one. */
export function clip(text: string, most: number): string {
  if (most <= 0) return '';
  const characters = [
    ...new Intl.Segmenter(pageLocale(), { granularity: 'grapheme' }).segment(text)
  ].map((part) => part.segment);
  return characters.length > most ? `${characters.slice(0, most - 1).join('')}…` : text;
}
