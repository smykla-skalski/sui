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
 * Places a top-layer box beside its anchor with fixed coordinates, flipping to the other
 * side when the preferred one has less room, and keeping it inside the viewport.
 *
 * CSS anchor positioning would do this declaratively, but it is not yet available in every
 * engine SUI supports, so the coordinates are measured here instead. The available block
 * size and the anchor width are published as `--sui-floating-available-block` and
 * `--sui-floating-anchor-inline` for the floating box's own sizing rules.
 */
export function place(floating: HTMLElement, anchor: Element, placement: Placement = {}): Side {
  const { side = 'block-end', align = 'start', offset = 4 } = placement;
  const a = anchor.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  if (side === 'inline-start' || side === 'inline-end')
    return beside(floating, a, side, align, offset, viewportWidth, viewportHeight);
  const below = viewportHeight - a.bottom - offset - VIEWPORT_MARGIN;
  const above = a.top - offset - VIEWPORT_MARGIN;

  floating.style.setProperty('--sui-floating-anchor-inline', `${a.width}px`);
  const height = floating.offsetHeight;
  const preferred = side === 'block-end' ? below : above;
  const other = side === 'block-end' ? above : below;
  const placed: Side =
    height > preferred && other > preferred
      ? side === 'block-end'
        ? 'block-start'
        : 'block-end'
      : side;
  const room = placed === 'block-end' ? below : above;
  floating.style.setProperty('--sui-floating-available-block', `${Math.max(0, room)}px`);

  const box = floating.getBoundingClientRect();
  const top = placed === 'block-end' ? a.bottom + offset : a.top - offset - box.height;
  const start =
    align === 'start'
      ? a.left
      : align === 'end'
        ? a.right - box.width
        : a.left + (a.width - box.width) / 2;
  const left = Math.min(
    Math.max(start, VIEWPORT_MARGIN),
    Math.max(VIEWPORT_MARGIN, viewportWidth - VIEWPORT_MARGIN - box.width)
  );

  floating.style.top = `${Math.round(top)}px`;
  floating.style.left = `${Math.round(left)}px`;
  floating.dataset.side = placed;
  return placed;
}

/** The inline sides, for a box beside a vertical column such as a rail. Same flip and clamp. */
function beside(
  floating: HTMLElement,
  a: DOMRect,
  side: 'inline-start' | 'inline-end',
  align: Align,
  offset: number,
  viewportWidth: number,
  viewportHeight: number
): Side {
  const box = floating.getBoundingClientRect();
  const after = viewportWidth - a.right - offset - VIEWPORT_MARGIN;
  const before = a.left - offset - VIEWPORT_MARGIN;
  const preferred = side === 'inline-end' ? after : before;
  const other = side === 'inline-end' ? before : after;
  const placed =
    box.width > preferred && other > preferred
      ? side === 'inline-end'
        ? 'inline-start'
        : 'inline-end'
      : side;
  const left = placed === 'inline-end' ? a.right + offset : a.left - offset - box.width;
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
  floating.style.top = `${Math.round(top)}px`;
  floating.style.left = `${Math.round(left)}px`;
  floating.dataset.side = placed;
  return placed;
}

/** Re-places the box whenever the page scrolls, the viewport resizes or either box changes size. */
export function follow(
  floating: HTMLElement,
  anchor: Element,
  placement: Placement = {}
): () => void {
  let frame = 0;
  const update = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => place(floating, anchor, placement));
  };
  const observer = new ResizeObserver(update);
  observer.observe(floating);
  observer.observe(anchor);
  addEventListener('scroll', update, { capture: true, passive: true });
  addEventListener('resize', update, { passive: true });
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    removeEventListener('scroll', update, { capture: true });
    removeEventListener('resize', update);
  };
}
