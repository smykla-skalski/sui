<script lang="ts">
  import type { Component } from 'svelte';
  import { PageHeader, PageToc, SkipLink, ThemeSwitch } from '#lib';
  import AuditPanel from './audit/AuditPanel.svelte';

  type SectionMeta = { title: string; order: number };
  type SectionModule = { default: Component; section: SectionMeta };

  const modules = import.meta.glob<SectionModule>('./sink/*.svelte', { eager: true });
  const sections = Object.entries(modules)
    .map(([path, module]) => ({
      id: path.replace(/^.*\/|\.svelte$/g, ''),
      ...module.section,
      Body: module.default
    }))
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  const entries = sections.map(({ id, title }) => ({ id, label: title }));
</script>

<svelte:head>
  <title>SUI kitchen sink</title>
  <meta
    name="description"
    content="Every SUI component in every state, held to the SUI design laws"
  />
</svelte:head>

<SkipLink href="#content" />

<div class="page">
  <PageHeader
    eyebrow="SUI"
    title="Kitchen sink"
    description="Every component in every state, measured against the design laws on each render"
    class="head"
  >
    {#snippet actions()}<ThemeSwitch name="sink-page-theme" />{/snippet}
  </PageHeader>

  <div class="layout">
    <PageToc {entries} title="Components" class="toc" />

    <main id="content" tabindex="-1">
      <AuditPanel />
      {#each sections as { id, title, Body } (id)}
        <section {id} aria-labelledby="{id}-title">
          <h2 id="{id}-title">{title}</h2>
          <Body />
        </section>
      {/each}
    </main>
  </div>
</div>

<style>
  .page {
    box-sizing: border-box;
    margin-inline: auto;
    max-inline-size: var(--sui-content-max);
    padding: var(--sui-rhythm-pane-top-wide) clamp(var(--sui-space-4), 2.4vw, var(--sui-space-8))
      var(--sui-space-8);
  }

  .layout {
    display: grid;
    gap: var(--sui-space-6);
    grid-template-columns: minmax(0, 1fr);
  }

  .layout :global(.toc) {
    display: none;
  }

  main {
    display: grid;
    gap: var(--sui-space-8);
    min-inline-size: 0;
  }

  main:focus {
    outline: none;
  }

  section {
    background: var(--sui-surface-base);
    border: 1px solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-surface);
    box-sizing: border-box;
    display: grid;
    gap: var(--sui-space-6);
    min-inline-size: 0;
    padding: var(--sui-rhythm-surface-pad);
    scroll-margin-block-start: var(--sui-space-4);
  }

  h2 {
    color: var(--sui-text-primary);
    font: 600 var(--sui-font-size-card-title) / var(--sui-leading-title) var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  @media (max-width: 36rem) {
    section {
      padding: var(--sui-rhythm-surface-pad-compact);
    }
  }

  @media (min-width: 72rem) {
    .layout {
      grid-template-columns: var(--sui-toc-width) minmax(0, 1fr);
    }

    .layout :global(.toc) {
      display: grid;
    }
  }
</style>
