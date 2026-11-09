/**
 * Holds the page still under a drag (L-116): no text is chosen as the pointer sweeps past it,
 * and everything outside the dragged control is `inert`, so no other part takes hover or a
 * press until the drag ends. Returns the release, which puts
 * back what it changed and is safe to call twice.
 */
export function holdForDrag(control: Element): () => void {
  const root = document.documentElement;
  const before = ['user-select', '-webkit-user-select'].map(
    (name) =>
      [name, root.style.getPropertyValue(name), root.style.getPropertyPriority(name)] as const
  );
  for (const [name] of before) root.style.setProperty(name, 'none');
  const stilled: HTMLElement[] = [];
  for (let node: Element = control; node.parentElement; node = node.parentElement)
    for (const sibling of node.parentElement.children)
      if (sibling !== node && sibling instanceof HTMLElement && !sibling.inert) {
        sibling.inert = true;
        stilled.push(sibling);
      }
  let held = true;
  return () => {
    if (!held) return;
    held = false;
    for (const sibling of stilled) sibling.inert = false;
    for (const [name, value, priority] of before) root.style.setProperty(name, value, priority);
  };
}
