import { resolve } from '$app/paths';
import type { RailItem } from '#lib';

/**
 * The places the rail offers, one route each. A new place is a new route and a tile here. A
 * layout is a whole page with no sink around it, so the browser's back is its way back.
 */
export const places: RailItem[] = [
  { label: 'Kitchen sink', short: 'Sink', icon: 'book', href: resolve('/') },
  {
    label: 'App shell',
    short: 'Shell',
    icon: 'sidebar-expand',
    href: resolve('/layouts/app-shell/[[variant]]', {}) + '/'
  },
  {
    label: 'List detail',
    short: 'List',
    icon: 'repositories',
    href: resolve('/layouts/list-detail/[[run]]', {}) + '/'
  },
  {
    label: 'Detail pane',
    short: 'Detail',
    icon: 'file',
    href: resolve('/layouts/detail-pane/[[state]]', {}) + '/'
  }
];
