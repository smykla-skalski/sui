<script lang="ts">
  import type { Snippet } from 'svelte';
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
    /** A component's own page: the audit stands under its examples with its result, and not
     * over them, so nothing competes with the first specimen. */
    sourced?: boolean;
    children: Snippet;
  } = $props();

  const audit = new AuditRun();
  const found = $derived(audit.findings?.length ?? 0);
</script>

{#snippet runAudit()}
  <Button tone="ghost" loading={audit.running} onclick={() => audit.measure()}>
    {#snippet icon()}<Icon name="refresh" size="base" />{/snippet}
    Run the Law Audit
  </Button>
{/snippet}

{#snippet result()}
  {#if audit.running}
    <Pill>Measuring…</Pill>
  {:else if audit.findings && found === 0}
    <Pill tone="success" icon="check">Laws hold</Pill>
  {:else if audit.findings}
    <Pill tone="danger" icon="failure">{found} {found === 1 ? 'finding' : 'findings'}</Pill>
  {/if}
{/snippet}

<svelte:head>
  <title>{title} · SUI kitchen sink</title>
  <meta name="description" content={description} />
</svelte:head>

<!-- A sink page: its header, a law audit on what the page draws, and its content. The audit
     says its result beside its action and adds a list only when a law breaks, so a page that
     holds draws nothing more: in the header on an overview, under the examples on a component's
     own page. -->
<div class={['sink', { sourced }]}>
  <PageHeader
    class="head"
    {eyebrow}
    {title}
    {description}
    actions={sourced ? undefined : runAudit}
    status={sourced ? undefined : result}
  />
  <main id="content" tabindex="-1">
    {#if !sourced && audit.findings && found > 0}
      <Findings findings={audit.findings} />
    {/if}
    {@render children()}
    {#if sourced}
      <div class="audit">
        <div class="audit-run">
          <div class="audit-result" role="status">{@render result()}</div>
          {@render runAudit()}
        </div>
        {#if audit.findings && found > 0}
          <Findings findings={audit.findings} />
        {/if}
      </div>
    {/if}
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

  /* The audit is the page's foot: a hairline a section's step under the last example parts it
     from the examples, and it stands at the end edge where the source row's action stood, its
     result just before it. */
  .audit {
    border-block-start: var(--sui-stroke) solid var(--sui-border-divider);
    display: grid;
    gap: var(--sui-space-4);
    margin-block-start: var(--sui-space-8);
    padding-block-start: var(--sui-space-6);
  }

  .audit-run {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-3);
    justify-content: end;
  }

  /* The pill is the line, so no line box of the page's leading rounds its height off the pixel
     grid (L-95). */
  .audit-result {
    display: flex;
  }
</style>
