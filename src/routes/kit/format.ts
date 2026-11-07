import { formatCount, formatLocale } from '../../lib/internal/locale.js';

/** A time of day in the reader's format, as a sink example says it ("02:00 AM" in US English). */
export const clock = (hours: number, minutes = 0): string =>
  new Intl.DateTimeFormat(formatLocale(), { hour: '2-digit', minute: '2-digit' }).format(
    new Date(2026, 0, 1, hours, minutes)
  );

/** A calendar day in the reader's format, "17 October 2026" in British English. */
export const day = (year: number, month: number, date: number): string =>
  new Intl.DateTimeFormat(formatLocale(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(year, month - 1, date));

/** An amount and its unit as one atom, in the reader's number format. */
export const amount = (value: number, unit: string): string =>
  `${new Intl.NumberFormat(formatLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}\u00a0${unit}`;

export { formatCount };
