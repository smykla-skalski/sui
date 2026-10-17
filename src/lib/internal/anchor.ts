export type Side = 'block-start' | 'block-end' | 'inline-start' | 'inline-end';
export type Align = 'start' | 'center' | 'end';

export type Placement = {
  side?: Side;
  align?: Align;
  /** Distance between the anchor and the floating box, in px. */
  offset?: number;
};

const VIEWPORT_MARGIN = 8;

/**
 * Places a top-layer box beside its anchor, flipping to the other side when the preferred one
 * has less room, and keeping it inside the viewport. `keep` holds the side it already has, for
 * a box that is open and only follows its anchor.
 *
 * The box is absolutely positioned in page coordinates: a top-layer box's containing block is
 * then the page itself, so the browser scrolls it with the page in the same frame as its
 * trigger, where viewport coordinates set from a scroll event would trail a frame behind.
 *
 * CSS anchor positioning would do this declaratively, but it is not yet available in every
 * engine SUI supports, so the coordinates are measured here instead. The available block
 * size and the anchor width are published as `--sui-floating-available-block` and
 * `--sui-floating-anchor-inline` for the floating box's own sizing rules.
 */
export function place(
  floating: HTMLElement,
  anchor: Element,
  placement: Placement = {},
  keep = false
): Side {
  const { align = 'start', offset = 4 } = placement;
  const kept = floating.dataset.side as Side | undefined;
  const side = (keep && kept) || placement.side || 'block-end';
  const a = anchor.getBoundingClientRect();
  // Start and end are the reading direction's, so a right-to-left page hangs a menu from the
  // anchor's right edge and puts an inline-end box on its left.
  const rtl = getComputedStyle(anchor).direction === 'rtl';
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  if (side === 'inline-start' || side === 'inline-end')
    return beside(floating, a, side, align, offset, viewportWidth, viewportHeight, rtl, keep);
  const below = viewportHeight - a.bottom - offset - VIEWPORT_MARGIN;
  const above = a.top - offset - VIEWPORT_MARGIN;

  floating.style.setProperty('--sui-floating-anchor-inline', `${a.width}px`);
  // How tall the box wants to be, past the last placement's cap. Read from its content rather
  // than by lifting the cap, which would drop the box's own scroll position back to the top.
  const look = getComputedStyle(floating);
  const height =
    floating.scrollHeight + parseFloat(look.borderTopWidth) + parseFloat(look.borderBottomWidth);
  const preferred = side === 'block-end' ? below : above;
  const other = side === 'block-end' ? above : below;
  const placed: Side =
    !keep && height > preferred && other > preferred
      ? side === 'block-end'
        ? 'block-start'
        : 'block-end'
      : side;
  const room = placed === 'block-end' ? below : above;
  floating.style.setProperty('--sui-floating-available-block', `${Math.max(0, room)}px`);

  const box = laidOut(floating);
  const top = placed === 'block-end' ? a.bottom + offset : a.top - offset - box.height;
  const leftEdge = a.left;
  const rightEdge = a.right - box.width;
  const start =
    align === 'center'
      ? a.left + (a.width - box.width) / 2
      : (align === 'start') !== rtl
        ? leftEdge
        : rightEdge;
  const left = Math.min(
    Math.max(start, VIEWPORT_MARGIN),
    Math.max(VIEWPORT_MARGIN, viewportWidth - VIEWPORT_MARGIN - box.width)
  );

  pin(floating, left, top, placed);
  return placed;
}

/** Writes viewport coordinates as page ones, which the absolutely positioned box reads. */
function pin(floating: HTMLElement, left: number, top: number, side: Side): void {
  floating.style.top = `${Math.round(top + scrollY)}px`;
  floating.style.left = `${Math.round(left + scrollX)}px`;
  floating.dataset.side = side;
}

/** Where the placed box stands in the viewport, before any transform it is moving through. */
export function placedAt(floating: HTMLElement): { left: number; top: number } | null {
  const left = parseFloat(floating.style.left);
  const top = parseFloat(floating.style.top);
  if (Number.isNaN(left) || Number.isNaN(top)) return null;
  return { left: left - scrollX, top: top - scrollY };
}

/** The inline sides, for a box beside a vertical column such as a rail. Same flip and clamp. */
function beside(
  floating: HTMLElement,
  a: DOMRect,
  side: 'inline-start' | 'inline-end',
  align: Align,
  offset: number,
  viewportWidth: number,
  viewportHeight: number,
  rtl: boolean,
  keep: boolean
): Side {
  const box = laidOut(floating);
  const rightRoom = viewportWidth - a.right - offset - VIEWPORT_MARGIN;
  const leftRoom = a.left - offset - VIEWPORT_MARGIN;
  // The inline end is on the right in a left-to-right page and on the left otherwise.
  const after = rtl ? leftRoom : rightRoom;
  const before = rtl ? rightRoom : leftRoom;
  const preferred = side === 'inline-end' ? after : before;
  const other = side === 'inline-end' ? before : after;
  const placed =
    !keep && box.width > preferred && other > preferred
      ? side === 'inline-end'
        ? 'inline-start'
        : 'inline-end'
      : side;
  const onRight = (placed === 'inline-end') !== rtl;
  const left = onRight ? a.right + offset : a.left - offset - box.width;
  const start =
    align === 'start'
      ? a.top
      : align === 'end'
        ? a.bottom - box.height
        : a.top + (a.height - box.height) / 2;
  const top = Math.min(
    Math.max(start, VIEWPORT_MARGIN),
    Math.max(VIEWPORT_MARGIN, viewportHeight - VIEWPORT_MARGIN - box.height)
  );
  pin(floating, left, top, placed);
  return placed;
}

/** The box's own size, without the transform it may be growing or shrinking through. */
const laidOut = (floating: HTMLElement) => ({
  width: floating.offsetWidth,
  height: floating.offsetHeight
});

/**
 * Keeps an open box on its anchor when the viewport resizes, either box changes size, or a
 * scrolling container around the anchor moves it. The page's own scroll needs nothing, since the
 * box scrolls with the page, and a scroll inside the box is the reader reading it. The box keeps
 * the side it opened on, so it never jumps across its trigger mid-scroll.
 */
export function follow(
  floating: HTMLElement,
  anchor: Element,
  placement: Placement = {}
): () => void {
  let frame = 0;
  const update = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => place(floating, anchor, placement, true));
  };
  // A container's scroll event fires in the frame it moves, so placing at once keeps the box
  // with its trigger in that frame.
  const scrolled = (event: Event) => {
    const source = event.target;
    if (source instanceof Element && source.contains(anchor) && !floating.contains(source))
      place(floating, anchor, placement, true);
  };
  const observer = new ResizeObserver(update);
  observer.observe(floating);
  observer.observe(anchor);
  addEventListener('scroll', scrolled, { capture: true, passive: true });
  addEventListener('resize', update, { passive: true });
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    removeEventListener('scroll', scrolled, { capture: true });
    removeEventListener('resize', update);
  };
}
