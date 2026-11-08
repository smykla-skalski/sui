<script lang="ts">
  import { setContext, type Snippet } from 'svelte';
  import { Button, Icon, PageHeader, Pill } from '#lib';
  import Findings from '../audit/Findings.svelte';
  import { AuditRun } from '../audit/run.svelte.js';

  let {
    title,
    description,
    eyebrow,
    sourced = false,
    children
  }: {
    title: string;
    description: string;
    eyebrow?: string;
    /** A component's own page: the audit stands at the end of its source row, under the
     * header, and not beside the title, so a phone reaches the first specimen sooner. */
    sourced?: boolean;
    children: Snippet;
  } = $props();

  const audit = new AuditRun();
  const found = $derived(audit.findings?.length ?? 0);

  setContext<Snippet>('sink-audit', runAudit);
</script>

{#snippet runAudit()}
  <Button tone="ghost" loading={audit.running} onclick={() => audit.measure()}>
    {#snippet icon()}<Icon name="refresh" size="base" />{/snippet}
    Run the Law Audit
  </Button>
{/snippet}

<svelte:head>
  <title>{title} · SUI kitchen sink</title>
  <meta name="description" content={description} />
</svelte:head>

<!-- A sink page: its header, a law audit on what the page draws, and its content. The audit
     says its result beside the title and adds a list under the header only when a law breaks, so
     a page that holds draws nothing more. -->
<div class={['sink', { sourced }]}>
  <PageHeader class="head" {eyebrow} {title} {description} actions={sourced ? undefined : runAudit}>
    {#snippet status()}
      {#if audit.running}
        <Pill>Measuring…</Pill>
      {:else if audit.findings && found === 0}
        <Pill tone="success" icon="check">Laws hold</Pill>
      {:else if audit.findings}
        <Pill tone="danger" icon="failure">{found} {found === 1 ? 'finding' : 'findings'}</Pill>
      {/if}
    {/snippet}
  </PageHeader>
  <main id="content" tabindex="-1">
    {#if audit.findings && found > 0}
      <Findings findings={audit.findings} />
    {/if}
    {@render children()}
  </main>
</div>

<style>
  /* The header's band spans the content box, and its words keep the column's inset. */
  .sink {
    --sink-gutter: clamp(var(--sui-space-4), 2.4vw, var(--sui-space-8));
    container-type: inline-size;
  }

  .sink > :global(.head) {
    --sui-local-head-inset: max(
      var(--sink-gutter),
      calc((100cqi - var(--sui-content-max)) / 2 + var(--sink-gutter))
    );

    /* A phone's header stands its side inset from the top and foot as well, on whole pixels so
       the page under it stays on the grid. */
    padding-block: round(min(var(--sink-gutter), var(--sui-rhythm-pane-gutter)), 1px);
  }

  /* On a phone a component page's source row stands closer under the header, so the first
     specimen comes sooner. */
  @media (max-width: 47.9375rem) {
    .sourced > :global(.head) {
      margin-block-end: var(--sui-space-3);
    }
  }

  main {
    box-sizing: border-box;
    margin-inline: auto;
    max-inline-size: var(--sui-content-max);
    min-inline-size: 0;
    padding: 0 var(--sink-gutter) var(--sui-space-8);
  }

  main:focus {
    outline: none;
  }

  main > :global(.laws) {
    margin-block-end: var(--sui-space-8);
  }
</style>
