/** How far a floating bar reaches over a scroller's start or end, in pixels. */
export type Room = { start?: number; end?: number };

type Held = { own: [string, string]; floor: [number, number]; rooms: Map<symbol, Room> };

const holds = new Map<HTMLElement, Held>();

const pixels = (value: string) => (value.endsWith('px') ? parseFloat(value) : 0);

/**
 * Holds scroll padding on `scroller` so a focused control or a fragment jump lands clear of a
 * floating bar (WCAG 2.4.11). Several bars can cover one scroller, such as a shell's bottom bar,
 * a save bar and a toast, so each holds its own room and the scroller pads each edge by the
 * largest, never by less than the padding the page set itself, which comes back once the last
 * bar lets go.
 */
export function clearance(scroller: HTMLElement): { hold(room: Room): void; release(): void } {
  const key = Symbol();
  const style = scroller.style;
  let entry = holds.get(scroller);
  if (!entry) {
    const look = getComputedStyle(scroller);
    entry = {
      own: [style.scrollPaddingBlockStart, style.scrollPaddingBlockEnd],
      floor: [pixels(look.scrollPaddingBlockStart), pixels(look.scrollPaddingBlockEnd)],
      rooms: new Map()
    };
    holds.set(scroller, entry);
  }
  const { own, floor, rooms } = entry;
  const pad = (edge: keyof Room, index: 0 | 1) => {
    const sizes = [...rooms.values()].flatMap((room) => room[edge] ?? []);
    return sizes.length > 0 ? `${Math.max(floor[index], ...sizes)}px` : own[index];
  };
  const apply = () => {
    style.scrollPaddingBlockStart = pad('start', 0);
    style.scrollPaddingBlockEnd = pad('end', 1);
  };
  return {
    hold(room) {
      rooms.set(key, room);
      apply();
    },
    release() {
      rooms.delete(key);
      apply();
      if (rooms.size === 0) holds.delete(scroller);
    }
  };
}
