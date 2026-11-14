<script module lang="ts">
  export const section = {
    title: 'Icon',
    lead: 'A glyph from one closed set, hidden from assistive technology because the words beside it carry the meaning. An icon-only control is an IconButton.',
    components: ['Icon']
  };
</script>

<script lang="ts">
  import { Icon, VisuallyHidden, iconNames, type IconName } from '#lib';
  import Example from '../kit/Example.svelte';
  import Variants from '../kit/Variants.svelte';

  /* The set by what a glyph stands for, so a reader looking for a status or a person scans a
     short run, not the whole set. A glyph no group names still shows, under Other. */
  const named: [string, IconName[]][] = [
    [
      'Direction',
      [
        'arrow-up-right',
        'chevron-down',
        'chevron-left',
        'chevron-right',
        'chevron-up',
        'chevrons-up-down',
        'sidebar-collapse',
        'sidebar-expand',
        'sort',
        'more',
        'undo',
        'sign-out',
        'link',
        'link-off'
      ]
    ],
    [
      'Actions',
      [
        'plus',
        'close',
        'search',
        'filter',
        'refresh',
        'history',
        'trash',
        'sliders',
        'settings',
        'gear',
        'mail'
      ]
    ],
    [
      'Status',
      [
        'check',
        'success',
        'failure',
        'warning',
        'alert',
        'info',
        'help',
        'pending',
        'circle-dashed',
        'circle-slash',
        'minus-circle',
        'ban',
        'no-access',
        'notifications'
      ]
    ],
    [
      'Files and Data',
      [
        'file',
        'file-valid',
        'file-invalid',
        'file-missing',
        'file-bypassed',
        'repositories',
        'branch',
        'tag',
        'book',
        'database',
        'server',
        'gauge',
        'plan',
        'calendar'
      ]
    ],
    [
      'People and Access',
      [
        'user',
        'user-plus',
        'users',
        'organization',
        'owner',
        'admin',
        'editor',
        'viewer',
        'lock',
        'shield',
        'shield-slash'
      ]
    ],
    ['Theme and Brand', ['sun', 'moon', 'sun-moon', 'system', 'globe', 'github']]
  ];
  const grouped = new Set(named.flatMap(([, names]) => names));
  const rest = iconNames.filter((name) => !grouped.has(name));
  const groups = rest.length ? [...named, ['Other', rest] as [string, IconName[]]] : named;

  const directional = [
    'chevron-left',
    'chevron-right',
    'arrow-up-right',
    'undo',
    'settings'
  ] as const;

  const directions = ['ltr', 'rtl'] as const;

  const glyphs = ['settings', 'refresh', 'check'] as const;
  const sizes = ['micro', 'xs', 'sm', 'base', 'md'] as const;

  /* Each tier beside the words it stands with in the kit: a link's arrow, a pill's or chip's
     glyph, a plate's, a control's and a dialog title's. */
  const beside = {
    micro: 'micro',
    xs: 'compact',
    sm: 'caption',
    base: 'control',
    md: 'title'
  } as const;
  const words = { settings: 'Settings', refresh: 'Refresh', check: 'Check' } as const;
</script>

<Example
  title="Set"
  note="One outline family on a 24-unit grid with a 2 stroke, each glyph by its name"
>
  <div class="groups">
    {#each groups as [group, names], index (group)}
      <section aria-labelledby="sink-icons-group-{index}">
        <h4 id="sink-icons-group-{index}" class="group">{group}</h4>
        <ul class="grid" role="list">
          {#each names as name (name)}
            <li>
              <Icon {name} size="md" />
              <span class="name" translate="no">{name}</span>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
</Example>

<Example
  title="Sizes"
  note="5 tiers from 10 to 18 px at the default text size, each beside the words it stands with, growing with the reader’s own text size"
>
  <Variants rows={glyphs} columns={sizes} axis="name" rowLabel={(name) => `"${name}"`}>
    {#snippet cell(name, size)}
      <span class="pair" style:font-size="var(--sui-font-size-{beside[size]})"
        ><Icon {name} {size} /><span>{words[name]}</span></span
      >
    {/snippet}
  </Variants>
</Example>

<Example
  title="Direction"
  note="Directional glyphs face the reading direction, so a right-to-left page mirrors them and keeps the rest"
>
  <!-- Each glyph stands over its mirror in one 32px column, so a pair reads at a glance at
       every width and the two directions take two short lines. The names head the columns
       for assistive technology; the set above shows them to the eye. -->
  <table class="facings">
    <thead>
      <tr>
        <td></td>
        {#each directional as name (name)}
          <th scope="col"><VisuallyHidden>{name}</VisuallyHidden></th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each directions as direction (direction)}
        <tr>
          <th scope="row">{direction === 'ltr' ? 'Left to right' : 'Right to left'}</th>
          {#each directional as name (name)}
            <td><span class="facing" dir={direction}><Icon {name} size="md" /></span></td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</Example>

<style>
  .facings {
    border-collapse: collapse;
  }

  .facings :is(th, td) {
    padding: 0;
  }

  .facings tbody th {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-medium) var(--sui-font-size-caption) / var(--sui-leading-compact)
      var(--sui-sans);
    padding-inline-end: var(--sui-space-4);
    text-align: start;
    white-space: nowrap;
  }

  .facings tbody td {
    block-size: var(--sui-space-8);
    inline-size: var(--sui-space-8);
    text-align: center;
    vertical-align: middle;
  }

  /* A block of its own, so the glyph centres in its cell and never rides on a line's baseline
     above the label's capitals. */
  .facing {
    color: var(--sui-text-primary);
    display: flex;
    justify-content: center;
  }

  .pair {
    align-items: center;
    color: var(--sui-text-primary);
    display: inline-flex;
    font-weight: var(--sui-weight-medium);
    gap: var(--sui-space-2);
    line-height: var(--sui-leading-compact);
    white-space: nowrap;
  }

  .groups {
    display: grid;
    gap: var(--sui-space-6);
    inline-size: 100%;
  }

  .group {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-medium) var(--sui-font-size-caption) / var(--sui-leading-compact)
      var(--sui-sans);
    margin: 0 0 var(--sui-space-2);
  }

  .grid {
    display: grid;
    gap: var(--sui-space-2);
    grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
    list-style: none;
    margin: 0;
    padding: 0;
  }

  li {
    align-items: center;
    color: var(--sui-text-primary);
    display: flex;
    gap: var(--sui-space-2);
    min-block-size: var(--sui-control-height-chip);
    min-inline-size: 0;
  }

  /* A glyph's name in the glyph's own ink, the ink of the words an icon stands beside. */
  .name {
    color: var(--sui-text-primary);
    font: var(--sui-weight-regular) var(--sui-font-size-caption) / var(--sui-leading-note)
      var(--sui-mono);
    overflow-wrap: anywhere;
  }
</style>
