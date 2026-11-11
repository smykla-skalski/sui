/**
 * Scrolls `list` alone, never the page, until `row` stands inside it clear of the list's scroll
 * padding, such as the foot a scroll fade covers (L-107). It measures in layout, not on screen,
 * so a list still scaling in as it opens reveals the row it will show.
 */
export function revealRow(list: HTMLElement, row: HTMLElement): void {
  const look = getComputedStyle(list);
  const before = parseFloat(look.scrollPaddingBlockStart) || 0;
  const after = parseFloat(look.scrollPaddingBlockEnd) || 0;
  const base = row.offsetParent === list ? 0 : list.offsetTop + list.clientTop;
  const top = row.offsetTop - base;
  const bottom = top + row.offsetHeight;
  if (top - before < list.scrollTop) list.scrollTop = top - before;
  else if (bottom + after > list.scrollTop + list.clientHeight)
    list.scrollTop = bottom + after - list.clientHeight;
}
