let observer: ResizeObserver | undefined;
const attached = new Set<Element>();

/**
 * Rounds a box's height up to an even pixel where CSS cannot, so a control centred beside it
 * lands on the pixel grid (L-95). Without calc-size() the spare pixel is end padding measured
 * from the box's content, which the padding never changes. The padding is written in the next
 * frame, because a box that grows inside the report resizes its holders after the browser has
 * reported them. Where calc-size() works, the box's own `--sui-block-snap-even` rounds it and
 * this does nothing. A box that outlives the attachment, such as a page header's copy once its
 * actions go, gets its own padding back, and a frame queued before that writes nothing to it.
 */
export function evenHeight(node: HTMLElement) {
  if (CSS.supports('block-size', 'calc-size(auto, size)')) return;
  observer ??= new ResizeObserver((entries) => {
    requestAnimationFrame(() => {
      for (const { target, contentBoxSize } of entries) {
        if (!attached.has(target)) continue;
        const height = contentBoxSize[0].blockSize;
        (target as HTMLElement).style.paddingBlockEnd = `${Math.ceil(height / 2) * 2 - height}px`;
      }
    });
  });
  const own = node.style.paddingBlockEnd;
  attached.add(node);
  observer.observe(node);
  return () => {
    attached.delete(node);
    observer?.unobserve(node);
    node.style.paddingBlockEnd = own;
  };
}
