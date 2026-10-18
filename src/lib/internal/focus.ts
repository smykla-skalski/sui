/** What Tab can reach, before drawing and inertness are known. */
export const TABBABLE =
  ':is(a[href], button, input, select, textarea, summary, [contenteditable], [tabindex]):not(:disabled, [tabindex^="-"], [contenteditable="false"], [type="hidden"], [type="radio"]:not(:checked))';

/**
 * The tab stops inside `container`, in document order. A control folded in a closed `<details>`
 * keeps client rects in Chrome, so drawing is read from `checkVisibility()`, which knows the
 * folded content is skipped.
 */
export function tabStops(container: ParentNode): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (element) =>
      element.checkVisibility({ visibilityProperty: true }) && !element.closest('[inert]')
  );
}
