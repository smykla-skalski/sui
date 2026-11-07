let observer: ResizeObserver | undefined;

/**
 * Rounds a box's height up to an even pixel where CSS cannot, so a control centred beside it
 * lands on the pixel grid (L-95). Without calc-size() the spare pixel is end padding measured
 * from the box's content, which the padding never changes. The padding is written in the next
 * frame, because a box that grows inside the report resizes its holders after the browser has
 * reported them. Where calc-size() works, the box's own `--sui-block-snap-even` rounds it and
 * this does nothing.
 */
export function evenHeight(node: HTMLElement) {
  if (CSS.supports('block-size', 'calc-size(auto, size)')) return;
  observer ??= new ResizeObserver((entries) => {
    requestAnimationFrame(() => {
      for (const { target, contentBoxSize } of entries) {
        const height = contentBoxSize[0].blockSize;
        (target as HTMLElement).style.paddingBlockEnd = `${Math.ceil(height / 2) * 2 - height}px`;
      }
    });
  });
  observer.observe(node);
  return () => observer?.unobserve(node);
}
