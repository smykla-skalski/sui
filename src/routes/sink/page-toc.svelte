<script module lang="ts">
  export const section = {
    title: 'Page Index',
    lead: 'The index beside a long page: where its sections are and which one the reader is in. A short page does without one.',
    components: ['PageToc']
  };
</script>

<script lang="ts">
  import { Disclosure, PageToc } from '#lib';
  import Example from '../kit/Example.svelte';

  const entries = [
    { id: 'toc-overview', label: 'Overview' },
    { id: 'toc-access', label: 'Who Can Change the Branch Rules' },
    { id: 'toc-checks', label: 'Required Checks' },
    { id: 'toc-history', label: 'History' }
  ];
</script>

<Example
  title="In Context"
  note="The current entry turns primary on the accent plate as the page scrolls, and a link opens a folded section and focuses its heading"
  layout="stack"
  ground="canvas"
>
  <div class="page">
    <div class="sections">
      <section id="toc-overview" class="part">
        <h4>Overview</h4>
        <div class="text">
          <p class="copy">
            These rules apply to every repository in the workspace that has not opted out of the
            template
          </p>
          <p class="copy body" lang="la">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
            exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
          <p class="copy body" lang="la">
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat
            nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
            officia deserunt mollit anim id est laborum.
          </p>
        </div>
      </section>
      <section id="toc-access" class="part">
        <h4>Who Can Change the Branch Rules</h4>
        <div class="text">
          <p class="copy">Workspace owners and the platform team can edit them</p>
          <p class="copy body" lang="la">
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque
            laudantium. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.
          </p>
          <p class="copy body" lang="la">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
            exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
        </div>
      </section>
      <section id="toc-checks" class="part">
        <h4>Required Checks</h4>
        <div class="text">
          <p class="copy">Lint, unit tests and the kitchen sink audit must pass before a merge</p>
          <p class="copy body" lang="la">
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat
            nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
            officia deserunt mollit anim id est laborum.
          </p>
          <p class="copy body" lang="la">
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque
            laudantium. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.
          </p>
        </div>
      </section>
      <Disclosure summary="Older Changes">
        <section id="toc-history" class="part">
          <h4>History</h4>
          <div class="text">
            <p class="copy">The rules were last changed 12&nbsp;days ago</p>
            <p class="copy body" lang="la">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
              incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
              exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
          </div>
        </section>
      </Disclosure>
    </div>
    <div class="index">
      <PageToc {entries} />
    </div>
  </div>
</Example>

<style>
  /* The text keeps a reading measure, near 72 characters on whole pixels, and the index
     stands 32px off it, as a documentation page sets its article beside its index. */
  .page {
    align-items: start;
    display: grid;
    gap: var(--sui-space-8);
    grid-template-columns: minmax(0, 40rem) var(--sui-toc-width);
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
  }

  .text {
    display: grid;
    gap: var(--sui-space-4);
  }

  h4 {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: var(--sui-weight-semibold) var(--sui-font-size-card-title) / var(--sui-leading-card-title)
      var(--sui-sans);
    margin: 0;
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
  }

  .copy {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-leading-body)
      var(--sui-sans);
    margin: 0;
  }

  /* The article reads in the primary ink, under a section's quieter one-line description. */
  .body {
    color: var(--sui-text-primary);
  }

  @media (max-width: 47.9375rem) {
    .page {
      gap: var(--sui-space-4);
      grid-template-columns: minmax(0, 1fr);
    }

    /* Over the article on a phone, a hairline closes the index, so the page reads as where to
       go, then what to read. */
    .index {
      border-block-end: var(--sui-stroke) solid var(--sui-border-divider);
      grid-row: 1;
      padding-block-end: var(--sui-space-4);
    }
  }
</style>
