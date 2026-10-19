<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { Button, Disclosure, Icon, Pill } from '#lib';
  import { checkCount, runAudit, type Finding } from './audit.js';
  import { cutSides, ringReach } from './checks.js';

  /** What a run found and where it was measured, kept per page so a reload never re-runs it. */
  type Kept = { findings: Finding[]; at: string; width: number; theme: string };

  let findings = $state<Finding[] | null>(null);
  let measured = $state<Omit<Kept, 'findings'> | null>(null);
  let running = $state(false);

  const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

  // One record per address and path, so each preview of the sink keeps its own.
  const key = () => `sui:audit:${location.origin}${location.pathname}`;

  function recall(): Kept | null {
    try {
      const kept = JSON.parse(localStorage.getItem(key()) ?? 'null') as Kept | null;
      return kept && Array.isArray(kept.findings) ? kept : null;
    } catch {
      return null;
    }
  }

  function keep(result: Finding[]) {
    const theme =
      document.documentElement.dataset.suiTheme ??
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const kept: Kept = {
      findings: result.map(({ law, where, detail }) => ({ law, where, detail })),
      at: new Date().toISOString(),
      width: innerWidth,
      theme
    };
    measured = { at: kept.at, width: kept.width, theme: kept.theme };
    try {
      localStorage.setItem(key(), JSON.stringify(kept));
    } catch {
      // A page that cannot store simply runs again on the next press.
    }
  }

  // Only the newest run reports.
  let runs = 0;

  async function rerun() {
    const run = ++runs;
    await tick();
    await document.fonts.ready;
    await new Promise(requestAnimationFrame);
    const settling = document
      .getAnimations()
      // Only time-based animations settle; a scroll-driven one finishes when the reader scrolls.
      .filter(
        (animation) =>
          animation.timeline instanceof DocumentTimeline &&
          animation.effect?.getTiming().iterations !== Infinity
      )
      .map((animation) => animation.finished);
    await Promise.allSettled(settling);
    const result = await runAudit(document, () => run !== runs);
    if (result) findings = result;
    return result;
  }

  async function measure() {
    running = true;
    const result = await rerun();
    if (result) keep(result);
    running = false;
  }

  function reveal(finding: Finding) {
    let target: Element | null | undefined = finding.element;
    // A kept finding lost its element with the page it was measured on, so its path finds it.
    try {
      target ??= document.querySelector(finding.where);
    } catch {
      target = null;
    }
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
      let result = await rerun();
      while (!result) result = await rerun();
      return result.map(({ law, where, detail }) => ({ law, where, detail }));
    };
    // A browser test weighs each focus ring it tabs to with the ring check's own measure.
    Object.assign(window, {
      __suiRingCut: (element: Element, look: CSSStyleDeclaration) =>
        cutSides(element, ringReach(look))
    });
    // The whole page is measured once; after that the kept result shows until the reader asks
    // for another run, so a reload never pays for the audit again. A browser test asks for the
    // audit when it needs one, so its presses never wait behind a run it did not ask for.
    const kept = recall();
    if (kept) {
      findings = kept.findings;
      measured = { at: kept.at, width: kept.width, theme: kept.theme };
    } else if (new URLSearchParams(location.search).get('audit') !== 'manual') void measure();
  });

  const when = (at: string) =>
    new Intl.DateTimeFormat(document.documentElement.lang || undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(at));
</script>

<section class="audit" aria-labelledby="audit-title" data-audit-ignore>
  <div class="head">
    <div class="title-row">
      <h2 id="audit-title">Law audit</h2>
      <!-- Until the panel reads the kept run itself, the page's first script has read it and
           names it on the root (src/app.html), so the first frame already draws it in words this
           script will draw too, and the panel never changes when it starts. -->
      <span class="badge">
        {#if findings === null}
          <span class="kept pass"><Pill tone="success" icon="check">Passing</Pill></span>
          <span class="kept fail"
            ><Pill tone="danger" icon="failure"><span class="kept-found"></span></Pill></span
          >
        {:else if findings.length === 0}
          <Pill tone="success" icon="check">Passing</Pill>
        {:else}
          <Pill tone="danger" icon="failure">{count(findings.length, 'finding')}</Pill>
        {/if}
      </span>
    </div>
    <p class="summary" role="status">
      {#if running}
        Measuring…
      {:else if findings === null}
        <span class="kept none">Measuring…</span><span class="kept pass"
          >Every law holds on this page</span
        ><span class="kept fail kept-summary"></span>
      {:else if findings.length === 0}
        Every law holds on this page
      {:else}
        {count(findings.length, 'finding')} against {count(byLaw.length, 'law')}
      {/if}
    </p>
    <!-- A kept result is read only once the page runs, so every line the panel shows from the
         first paint keeps its words, and the result's details wait behind a press: nothing
         below the panel moves when a result arrives. The spinner takes the icon's place, so a
         run keeps the button's width. -->
    <div class="scope-row">
      <p class="scope">{checkCount()} rendered checks</p>
      <Button loading={running} onclick={measure}>
        {#snippet icon()}<Icon name="refresh" size="sm" />{/snippet}
        Run the audit again
      </Button>
    </div>
  </div>
  <Disclosure summary="Details of the run">
    <div class="result-body">
      <p class="scope">
        {#if measured}
          Measured {when(measured.at)} at {measured.width}px in {measured.theme}
        {:else}
          Not measured yet
        {/if}
      </p>
      {#if findings && findings.length > 0}
        <ul class="laws">
          {#each byLaw as [law, items] (law)}
            <li>
              <Disclosure summary={law} hint={count(items.length, 'finding')}>
                <ul class="items">
                  {#each items as finding, index (index)}
                    <li>
                      <button type="button" onclick={() => reveal(finding)}>{finding.where}</button>
                      <span class="detail">{finding.detail}</span>
                    </li>
                  {/each}
                </ul>
              </Disclosure>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </Disclosure>
</section>

<style>
  .audit {
    background: var(--sui-surface-base);
    border: var(--sui-stroke) solid var(--sui-border-subtle);
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
    align-content: center;
    block-size: var(--sui-block-snap);
    font: var(--sui-weight-bold) var(--sui-font-size-dialog-title) / var(--sui-leading-title)
      var(--sui-sans);
    letter-spacing: -0.015em;
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  .title-row {
    align-items: center;
    display: flex;
    gap: var(--sui-space-3);
  }

  /* One title cap tall in the title's face, so the pill centres on the title without
     raising its row. */
  .badge {
    align-items: center;
    block-size: 1cap;
    display: flex;
    font: var(--sui-weight-bold) var(--sui-font-size-dialog-title) / var(--sui-leading-title)
      var(--sui-sans);
  }

  .scope-row {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-3);
    justify-content: space-between;
  }

  .scope {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  .kept {
    display: none;
  }

  :global(:root:not([data-sui-audit])) .kept.none,
  :global(:root[data-sui-audit='pass']) .kept.pass,
  :global(:root[data-sui-audit='fail']) .kept.fail {
    display: contents;
  }

  .kept-found::before {
    content: var(--sink-audit-found);
  }

  .kept-summary::before {
    content: var(--sink-audit-summary);
  }

  .summary {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  .result-body {
    display: grid;
    gap: var(--sui-space-3);
  }

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
