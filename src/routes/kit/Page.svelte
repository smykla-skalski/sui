<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Button, Icon, PageHeader, Pill } from '#lib';
  import Findings from '../audit/Findings.svelte';
  import { AuditRun } from '../audit/run.svelte.js';

  let {
    title,
    description,
    eyebrow,
    children
  }: {
    title: string;
    description: string;
    eyebrow?: string;
    children: Snippet;
  } = $props();

  const audit = new AuditRun();
  const found = $derived(audit.findings?.length ?? 0);
</script>

<svelte:head>
  <title>{title} · SUI kitchen sink</title>
  <meta name="description" content={description} />
</svelte:head>

<!-- A sink page: its header, which runs the law audit on what the page draws, and its content.
     The audit says its result beside the title and adds a list under the header only when a law
     breaks, so a page that holds draws nothing more. -->
<div class="sink">
  <PageHeader class="head" {eyebrow} {title} {description}>
    {#snippet status()}
      {#if audit.running}
        <Pill>Measuring…</Pill>
      {:else if audit.findings && found === 0}
        <Pill tone="success" icon="check">Laws hold</Pill>
      {:else if audit.findings}
        <Pill tone="danger" icon="failure">{found} {found === 1 ? 'finding' : 'findings'}</Pill>
      {/if}
    {/snippet}
    {#snippet actions()}
      <Button tone="ghost" loading={audit.running} onclick={() => audit.measure()}>
        {#snippet icon()}<Icon name="refresh" size="sm" />{/snippet}
        Run the law audit
      </Button>
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

  .sink :global(.head) {
    --sui-local-head-inset: max(
      var(--sink-gutter),
      calc((100cqi - var(--sui-content-max)) / 2 + var(--sink-gutter))
    );
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
