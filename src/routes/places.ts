import { resolve } from '$app/paths';
import type { RailItem } from '#lib';

/** The places the rail offers, one route each. A new place is a new route and a tile here. */
export const places: RailItem[] = [{ label: 'Kitchen sink', icon: 'book', href: resolve('/') }];
