<script module lang="ts">
  export const section = {
    title: 'Page index',
    order: 67,
    lead: 'The index beside a long page: where its sections are and which one the reader is in. A short page does without one.',
    components: ['PageToc']
  };
</script>

<script lang="ts">
  import { Disclosure, PageToc } from '#lib';
  import Example from '../kit/Example.svelte';

  const entries = [
    { id: 'toc-overview', label: 'Overview' },
    { id: 'toc-access', label: 'Who can change the branch rules' },
    { id: 'toc-checks', label: 'Required checks' },
    { id: 'toc-history', label: 'History' }
  ];
</script>

<Example
  title="In context"
  note="The current entry takes the ringed plate as the page scrolls, and a link opens a folded section and focuses its heading"
  layout="stack"
  ground="canvas"
>
  <div class="page">
    <div class="sections">
      <section id="toc-overview" class="part">
        <h4>Overview</h4>
        <p class="copy">
          These rules apply to every repository in the workspace that has not opted out of the
          template
        </p>
      </section>
      <section id="toc-access" class="part">
        <h4>Who can change the branch rules</h4>
        <p class="copy">Workspace owners and the platform team can edit them</p>
      </section>
      <section id="toc-checks" class="part">
        <h4>Required checks</h4>
        <p class="copy">Lint, unit tests and the kitchen sink audit must pass before a merge</p>
      </section>
      <Disclosure summary="Older changes">
        <section id="toc-history" class="part">
          <h4>History</h4>
          <p class="copy">The rules were last changed 12 days ago</p>
        </section>
      </Disclosure>
    </div>
    <div class="index">
      <PageToc {entries} />
    </div>
  </div>
</Example>

<style>
  .page {
    align-items: start;
    display: grid;
    gap: var(--sui-space-6);
    grid-template-columns: minmax(0, 1fr) var(--sui-toc-width);
  }

  /* The index sticks inside this column, which runs the page's whole height on a wide
     screen and is only as tall as the index on a phone, so there it does not stick. */
  .index {
    align-self: stretch;
  }

  .sections {
    display: grid;
    gap: var(--sui-space-8);
    min-inline-size: 0;
  }

  .part {
    align-content: start;
    display: grid;
    gap: var(--sui-row-copy-gap);
    min-block-size: 12rem;
  }

  h4 {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: var(--sui-weight-semibold) var(--sui-font-size-title) / var(--sui-leading-title)
      var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  .copy {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-leading-body)
      var(--sui-sans);
    margin: 0;
  }

  @media (max-width: 47.9375rem) {
    .page {
      grid-template-columns: minmax(0, 1fr);
    }

    .index {
      grid-row: 1;
    }
  }
</style>
