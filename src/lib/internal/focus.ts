/** What Tab can reach, before drawing, inertness and radio groups are known. */
export const TABBABLE =
  ':is(a[href], button, input, select, textarea, summary, [contenteditable], [tabindex]):not(:disabled, [tabindex^="-"], [contenteditable="false"], [type="hidden"])';

/** The one stop a named radio group has: its checked radio, or its first enabled visible one. */
function radioGroups(elements: HTMLElement[]): Set<HTMLInputElement> {
  const groups: HTMLInputElement[][] = [];
  for (const element of elements) {
    if (!(element instanceof HTMLInputElement) || element.type !== 'radio' || !element.name)
      continue;
    const group = groups.find(
      ([first]) =>
        first.name === element.name &&
        first.form === element.form &&
        first.getRootNode() === element.getRootNode()
    );
    if (group) group.push(element);
    else groups.push([element]);
  }
  return new Set(groups.map((group) => group.find((radio) => radio.checked) ?? group[0]));
}

/**
 * The tab stops inside `container`, in document order. A control folded in a closed `<details>`
 * keeps client rects in Chrome, so drawing is read from `checkVisibility()`, which knows the
 * folded content is skipped.
 */
export function tabStops(container: ParentNode): HTMLElement[] {
  const elements = [...container.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (element) =>
      element.checkVisibility({ visibilityProperty: true }) && !element.closest('[inert]')
  );
  const stops = radioGroups(elements);
  return elements.filter(
    (element) =>
      !(element instanceof HTMLInputElement && element.type === 'radio' && element.name) ||
      stops.has(element)
  );
}
