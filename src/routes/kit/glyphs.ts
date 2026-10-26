import { createRawSnippet } from 'svelte';

/*
 * One symbol per sink page, drawn in the icon set's family (L-67): a 24-unit grid, a 1.75
 * stroke, round caps and joins, ink kept inside 3 to 21. They name pages of the sink, not
 * anything an app draws, so they stay here and the icon set's closed list stays as it is.
 */
const DRAWN: Record<string, string> = {
  all: '<path d="M12 3.5 3.5 8 12 12.5 20.5 8z"/><path d="m3.5 12 8.5 4.5 8.5-4.5"/><path d="m3.5 16 8.5 4.5 8.5-4.5"/>',

  buttons: '<rect x="3" y="7" width="18" height="10" rx="3"/><path d="M8 12h8"/>',
  'icon-buttons': '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/>',
  navigation: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  tabs: '<path d="M3.5 19V6.5A1.5 1.5 0 0 1 5 5h4.5A1.5 1.5 0 0 1 11 6.5V9h8a1.5 1.5 0 0 1 1.5 1.5V19z"/><path d="M11 9V6.5A1.5 1.5 0 0 1 12.5 5h3A1.5 1.5 0 0 1 17 6.5V9"/>',
  'skip-link': '<path d="M6 5.5v6a4 4 0 0 0 4 4h8"/><path d="m15 12 3.5 3.5L15 19"/>',

  'text-input': '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7.5 9.5v5"/>',
  field: '<path d="M4 5h7"/><rect x="3.5" y="9" width="17" height="10" rx="2"/>',
  textarea:
    '<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M7 8.5h10M7 12h7"/><path d="m14 17 3-3"/>',
  'search-field': '<circle cx="10" cy="10" r="5.5"/><path d="m14 14 5.5 5.5"/>',
  switch: '<rect x="2.5" y="7" width="19" height="10" rx="5"/><circle cx="16.5" cy="12" r="2.5"/>',
  checkbox: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="m8 12.5 3 3 5-6"/>',
  'choice-cards':
    '<rect x="3.5" y="3.5" width="17" height="7.5" rx="2"/><rect x="3.5" y="13" width="17" height="7.5" rx="2"/><circle cx="7.5" cy="7.25" r="1.25"/><circle cx="7.5" cy="16.75" r="1.25"/>',
  'segmented-control':
    '<rect x="2.5" y="7" width="19" height="10" rx="2.5"/><path d="M9 7v10M15 7v10"/>',
  'theme-switch':
    '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>',
  'copyable-link-field':
    '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  'color-picker': '<path d="M12 3.5s6 6.2 6 10.5a6 6 0 0 1-12 0c0-4.3 6-10.5 6-10.5z"/>',

  select: '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="m13 10.75 2.5 2.5 2.5-2.5"/>',
  combobox: '<rect x="3" y="4.5" width="18" height="7" rx="2"/><path d="M5 15.5h14M5 19.5h10"/>',
  'action-menu':
    '<circle cx="12" cy="5.5" r="1.25"/><circle cx="12" cy="12" r="1.25"/><circle cx="12" cy="18.5" r="1.25"/>',
  'help-tip':
    '<circle cx="12" cy="12" r="8.5"/><path d="M9.75 9.5a2.25 2.25 0 1 1 3.3 2c-.6.35-1.05.9-1.05 1.6v.4"/><path d="M12 16.5h.01"/>',
  'duration-input':
    '<path d="M7 3.5h10M7 20.5h10"/><path d="M8 3.5V6a4 4 0 0 0 8 0V3.5"/><path d="M8 20.5V18a4 4 0 0 1 8 0v2.5"/>',
  'pair-entry':
    '<rect x="2.5" y="8" width="8" height="8" rx="2"/><rect x="13.5" y="8" width="8" height="8" rx="2"/><path d="M10.5 12h3"/>',
  'pattern-entries': '<path d="M12 4v16M5.1 8l13.8 8M5.1 16l13.8-8"/>',
  'inherit-control': '<path d="M4 4.5h16"/><path d="M12 8v11.5"/><path d="m8 15.5 4 4 4-4"/>',
  'addition-picker':
    '<rect x="3.5" y="3.5" width="17" height="17" rx="4" stroke-dasharray="3 2.5"/><path d="M12 8.5v7M8.5 12h7"/>',
  'setting-list':
    '<path d="M4 7h7M4 17h7"/><rect x="14" y="4.5" width="6.5" height="5" rx="2.5"/><rect x="14" y="14.5" width="6.5" height="5" rx="2.5"/>',

  overlays:
    '<path d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-5l-2 3-2-3H5A1.5 1.5 0 0 1 3.5 15V6A1.5 1.5 0 0 1 5 4.5z"/>',
  modal:
    '<rect x="2.5" y="3.5" width="19" height="17" rx="2"/><rect x="7" y="8" width="10" height="8" rx="1.5"/>',
  'confirm-dialog':
    '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M12 8.5V13"/><path d="M12 16h.01"/>',
  toaster: '<rect x="4" y="11" width="16" height="8" rx="2"/><path d="M6 7.5h12M8 4.5h8"/>',
  'save-bar':
    '<path d="M5.5 3.5H16l4 4v11.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19V5a1.5 1.5 0 0 1 1.5-1.5z"/><path d="M8 3.5V8h7V3.5"/><path d="M8 20.5v-6h8v6"/>',
  'service-worker-status':
    '<path d="M2.5 9a14 14 0 0 1 19 0"/><path d="M5.5 12.5a9.5 9.5 0 0 1 13 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><path d="M12 19.5h.01"/>',

  card: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M7 9h7M7 13h10"/>',
  plate:
    '<rect x="3.5" y="3.5" width="14" height="14" rx="2.5"/><path d="M20.5 7v11a2.5 2.5 0 0 1-2.5 2.5H7"/>',
  callout: '<path d="M4.5 10v4h3l7 4V6l-7 4z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
  disclosure: '<path d="m4.5 6.5 3 3 3-3"/><path d="M13 9.5h7"/><path d="M8 14h12M8 18h9"/>',
  'page-header':
    '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M3.5 9.5h17"/><path d="M6.5 6.5h5"/>',
  section: '<path d="M4 5.5h9"/><path d="M4 10.5h16M4 14.5h16M4 18.5h10"/>',
  'detail-pane':
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/><path d="M6 8h6M6 12h4"/>',
  'list-detail':
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9.5 4v16"/><path d="M5.5 8h1.5M5.5 12h1.5M5.5 16h1.5"/>',
  'page-toc': '<path d="M9 6h11M9 12h11M9 18h8"/><path d="M4.5 9.5v5"/>',
  'code-block': '<path d="m8 7-5 5 5 5"/><path d="m16 7 5 5-5 5"/><path d="m13.5 5-3 14"/>',
  'diff-block': '<path d="M12 6v6M9 9h6"/><path d="M9 18h6"/>',
  'data-table':
    '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M10 9.5v10"/>',
  'fact-list': '<path d="M4 7h5M12 7h8M4 12h5M12 12h6M4 17h5M12 17h8"/>',
  'fact-line': '<path d="M3 12h5.5M15.5 12H21"/><path d="M12 12h.01" stroke-width="3"/>',
  timeline: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
  'link-list':
    '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',

  pill: '<rect x="3" y="8" width="18" height="8" rx="4"/><path d="M7.5 12h.01" stroke-width="3"/><path d="M11 12h6"/>',
  chip: '<rect x="2.5" y="7.5" width="19" height="9" rx="4.5"/><path d="M6.5 12h5"/><path d="m15 10.5 3 3m0-3-3 3"/>',
  avatar:
    '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="10" r="3"/><path d="M6.5 18a6 6 0 0 1 11 0"/>',
  'clipped-label':
    '<path d="M3.5 12h7"/><path d="M14 12h.01M17 12h.01M20 12h.01" stroke-width="2.75"/>',
  'relative-time':
    '<path d="M4 12a8 8 0 1 0 2.5-5.8"/><path d="M4 4v4h4"/><path d="M12 8v4l2.5 1.5"/>',
  'day-heading':
    '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  icons:
    '<circle cx="7.5" cy="7.5" r="3.5"/><rect x="13" y="4" width="7" height="7" rx="1"/><path d="m7.5 13.5 4 6.5h-8z"/><path d="M16.5 13v7M13 16.5h7"/>',

  'object-list':
    '<circle cx="5.5" cy="6.5" r="1.5"/><circle cx="5.5" cy="12" r="1.5"/><circle cx="5.5" cy="17.5" r="1.5"/><path d="M10 6.5h10M10 12h10M10 17.5h10"/>',
  'list-toolbar': '<path d="M4 5h16l-6 7.5V19l-4-2v-4.5z"/>',
  skeleton: '<path d="M5 7h14M5 12h10M5 17h12" stroke-width="3.5"/>',
  'load-more': '<path d="m7 6.5 5 5 5-5M7 12.5l5 5 5-5"/>',
  states:
    '<path d="M3.5 13.5 6 5.5h12l2.5 8V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z"/><path d="M3.5 13.5H8l1.5 2.5h5l1.5-2.5h4.5"/>',

  charts: '<path d="M4 4v16h16"/><path d="m8 15 3.5-4 3 2.5L19.5 8"/>',

  'app-shell': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8.5 4v16M8.5 8.5H21"/>'
};

/** A page's symbol as markup, at a tier of the icon scale. An unknown page draws a dashed circle. */
export function glyph(id: string, size: 'base' | 'md' = 'base'): string {
  const drawn = DRAWN[id] ?? '<circle cx="12" cy="12" r="8.5" stroke-dasharray="3 3"/>';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display: block; flex: none; inline-size: var(--sui-icon-${size}); block-size: var(--sui-icon-${size})">${drawn}</svg>`;
}

/** A page's symbol as a snippet, for a navigation row or a card. */
export const glyphSnippet = (id: string, size: 'base' | 'md' = 'base') =>
  createRawSnippet(() => ({ render: () => glyph(id, size) }));
