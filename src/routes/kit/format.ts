import { formatCount, pageLocale } from '../../lib/internal/locale.js';

/** A time of day in the page's language, as a sink example says it ("02:00 AM" in English). */
export const clock = (hours: number, minutes = 0): string =>
  new Intl.DateTimeFormat(pageLocale(), { hour: '2-digit', minute: '2-digit' }).format(
    new Date(2026, 0, 1, hours, minutes)
  );

export { formatCount };
