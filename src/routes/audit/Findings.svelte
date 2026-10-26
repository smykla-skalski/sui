<script lang="ts">
  import { Disclosure } from '#lib';
  import type { Finding } from './audit.js';

  let { findings }: { findings: Finding[] } = $props();

  const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

  const byLaw = $derived(
    Object.entries(
      Object.groupBy(findings, (finding) => finding.law) as Record<string, Finding[]>
    ).sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))
  );

  function reveal(element: Element | undefined) {
    if (!(element instanceof HTMLElement || element instanceof SVGElement)) return;
    element.scrollIntoView({ block: 'center' });
    element.animate(
      [
        { outline: '3px solid var(--sui-danger)', outlineOffset: '2px' },
        { outline: '3px solid transparent', outlineOffset: '2px' }
      ],
      { duration: 1600 }
    );
  }
</script>

<!-- The findings of the last law audit, one disclosure per law; a press on a place shows it. -->
<ul class="laws" data-audit-ignore>
  {#each byLaw as [law, items] (law)}
    <li>
      <Disclosure summary={law} hint={count(items.length, 'finding')}>
        <ul class="items">
          {#each items as finding, index (index)}
            <li>
              <button type="button" onclick={() => reveal(finding.element)}>{finding.where}</button>
              <span class="detail">{finding.detail}</span>
            </li>
          {/each}
        </ul>
      </Disclosure>
    </li>
  {/each}
</ul>

<style>
  .laws,
  .items {
    display: grid;
    gap: var(--sui-space-2);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .items li {
    display: grid;
    gap: var(--sui-space-1);
  }

  .items button {
    background: none;
    border: 0;
    border-radius: var(--sui-radius-pill);
    color: var(--sui-brand-action-text);
    cursor: pointer;
    font: var(--sui-weight-medium) var(--sui-font-size-micro) / var(--sui-leading-micro)
      var(--sui-mono);
    justify-self: start;
    min-block-size: var(--sui-control-height-chip);
    overflow-wrap: anywhere;
    padding: 0;
    text-align: start;
  }

  .items button:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }

  .detail {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
  }
</style>
