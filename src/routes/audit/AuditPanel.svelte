<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { runAudit, type Finding } from './audit.js';
  import './checks.js';

  let findings = $state<Finding[] | null>(null);

  async function rerun() {
    await tick();
    await document.fonts.ready;
    await new Promise(requestAnimationFrame);
    const settling = document
      .getAnimations()
      .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
      .map((animation) => animation.finished);
    await Promise.allSettled(settling);
    findings = runAudit(document);
  }

  function reveal(finding: Finding) {
    const target = finding.element;
    if (!(target instanceof HTMLElement || target instanceof SVGElement)) return;
    target.scrollIntoView({ block: 'center' });
    target.animate(
      [
        { outline: '3px solid var(--sui-danger)', outlineOffset: '2px' },
        { outline: '3px solid transparent', outlineOffset: '2px' }
      ],
      { duration: 1600 }
    );
  }

  const byLaw = $derived(
    Object.entries(
      Object.groupBy(findings ?? [], (finding) => finding.law) as Record<string, Finding[]>
    ).sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))
  );

  onMount(() => {
    (window as unknown as { __suiAudit: () => Promise<Finding[]> }).__suiAudit = async () => {
      await rerun();
      return (findings ?? []).map(({ law, where, detail }) => ({ law, where, detail }));
    };
    void rerun();
    const observer = new MutationObserver(() => void rerun());
    observer.observe(document.documentElement, { attributeFilter: ['data-sui-theme'] });
    const query = matchMedia('(max-width: 47.9375rem)');
    query.addEventListener('change', rerun);
    return () => {
      observer.disconnect();
      query.removeEventListener('change', rerun);
    };
  });
</script>

<section class="audit" aria-labelledby="audit-title" data-audit-ignore>
  <div class="head">
    <h2 id="audit-title">Law audit</h2>
    <p class="summary" role="status">
      {#if findings === null}
        Measuring…
      {:else if findings.length === 0}
        Every law holds on this page
      {:else}
        {findings.length} findings against {byLaw.length} laws
      {/if}
    </p>
  </div>
  {#if findings && findings.length > 0}
    <ul class="laws">
      {#each byLaw as [law, items] (law)}
        <li>
          <details>
            <summary><span class="law">{law}</span> {items.length} findings</summary>
            <ul class="items">
              {#each items as finding, index (index)}
                <li>
                  <button type="button" onclick={() => reveal(finding)}>{finding.where}</button>
                  <span class="detail">{finding.detail}</span>
                </li>
              {/each}
            </ul>
          </details>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .audit {
    background: var(--sui-surface-base);
    border: 1px solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-surface);
    box-sizing: border-box;
    display: grid;
    gap: var(--sui-space-4);
    min-inline-size: 0;
    padding: var(--sui-rhythm-surface-pad);
  }

  .head {
    display: grid;
    gap: var(--sui-row-copy-gap);
  }

  h2 {
    font: 600 var(--sui-font-size-card-title) / var(--sui-leading-title) var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  .summary {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  .laws,
  .items {
    display: grid;
    gap: var(--sui-space-2);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  summary {
    border-radius: var(--sui-radius-control);
    cursor: pointer;
    font: 500 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
    padding: var(--sui-space-1) var(--sui-space-2);
  }

  summary:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  .law {
    font-family: var(--sui-mono);
    font-variant-numeric: tabular-nums;
    font-weight: 500;
  }

  .items {
    padding: var(--sui-space-2) var(--sui-space-2) var(--sui-space-2) var(--sui-space-6);
  }

  .items li {
    display: grid;
    gap: var(--sui-space-1);
  }

  .items button {
    background: none;
    border: 0;
    border-radius: var(--sui-radius-chip);
    color: var(--sui-brand-action-text);
    cursor: pointer;
    font: 500 var(--sui-font-size-micro) / var(--sui-leading-micro) var(--sui-mono);
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
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
  }
</style>
