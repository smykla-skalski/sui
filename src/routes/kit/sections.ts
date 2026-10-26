import type { Component } from 'svelte';
import type { SectionMeta } from './Section.svelte';

type SectionModule = { default: Component; section: SectionMeta };

export type SinkSection = {
  id: string;
  meta: SectionMeta;
  /** The section file's own text, which its examples cut their code from. */
  source: string;
  family: string;
  Body: Component;
};

// The one place that orders the sections: each family and its members, in the order the README
// lists them. A section that is not listed here still shows, at the end, so a new section is
// never lost.
const FAMILIES: [string, string[]][] = [
  ['Actions', ['buttons', 'icon-buttons', 'navigation', 'tabs', 'skip-link']],
  [
    'Inputs',
    [
      'text-input',
      'field',
      'textarea',
      'search-field',
      'switch',
      'checkbox',
      'choice-cards',
      'segmented-control',
      'theme-switch',
      'copyable-link-field',
      'color-picker'
    ]
  ],
  [
    'Pickers and editors',
    [
      'select',
      'combobox',
      'action-menu',
      'help-tip',
      'duration-input',
      'pair-entry',
      'pattern-entries',
      'inherit-control',
      'addition-picker',
      'setting-list'
    ]
  ],
  [
    'Overlays',
    ['overlays', 'modal', 'confirm-dialog', 'toaster', 'save-bar', 'service-worker-status']
  ],
  [
    'Surfaces and content',
    [
      'card',
      'plate',
      'callout',
      'disclosure',
      'page-header',
      'section',
      'detail-pane',
      'list-detail',
      'page-toc',
      'code-block',
      'diff-block',
      'data-table',
      'fact-list',
      'fact-line',
      'timeline',
      'link-list'
    ]
  ],
  ['Marks', ['pill', 'chip', 'avatar', 'clipped-label', 'relative-time', 'day-heading', 'icons']],
  ['Lists and states', ['object-list', 'list-toolbar', 'skeleton', 'load-more', 'states']],
  ['Charts', ['charts']],
  ['Shell', ['app-shell']]
];

const modules = import.meta.glob<SectionModule>('../sink/*.svelte', { eager: true });
const texts = import.meta.glob<string>('../sink/*.svelte', {
  eager: true,
  import: 'default',
  query: '?raw'
});

/** Each component's path in the repository, so a section links what it shows to its source. */
export const sources: Record<string, string> = Object.fromEntries(
  Object.keys(
    import.meta.glob([
      '../../lib/components/*.svelte',
      '../../lib/charts/*.svelte',
      '../../lib/icons/*.svelte'
    ])
  ).map((path) => [path.replace(/^.*\/|\.svelte$/g, ''), path.replace(/^(\.\.\/)+/, 'src/')])
);

export const sections: SinkSection[] = Object.entries(modules)
  .map(([path, module]) => {
    const id = path.replace(/^.*\/|\.svelte$/g, '');
    const family = FAMILIES.findIndex(([, ids]) => ids.includes(id));
    const [name, ids] = FAMILIES[family] ?? ['More', []];
    return {
      id,
      meta: module.section,
      source: texts[path] ?? '',
      family: name,
      rank: (family < 0 ? FAMILIES.length : family) * 100 + ids.indexOf(id),
      Body: module.default
    };
  })
  .sort((a, b) => a.rank - b.rank || a.meta.title.localeCompare(b.meta.title));

/** The sections in their families, in order. */
export const families = Object.values(
  Object.groupBy(sections, (section) => section.family) as Record<string, SinkSection[]>
);
