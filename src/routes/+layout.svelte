<script lang="ts">
  import '../lib/styles.css';
  let { children } = $props();

  // The router restores a reloaded page's scroll only once the app has started, so a reload
  // would paint the top of the page and then jump. Leaving a page hands its restore to the
  // browser, which keeps the reader's place from the first frame; a page shown again from the
  // back-forward cache gives it back to the router.
  const browserRestores = () => (history.scrollRestoration = 'auto');
  const routerRestores = () => (history.scrollRestoration = 'manual');
</script>

<svelte:window onpagehide={browserRestores} onpageshow={routerRestores} />

{@render children()}

<style>
  :global(body) {
    background: var(--sui-canvas);
    color: var(--sui-text-primary);
    font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-leading-body)
      var(--sui-sans);
    margin: 0;
    /* Reflow is measured in CSS pixels (WCAG 1.4.10), so the floor does not grow with the text. */
    min-inline-size: 320px;
    -webkit-font-smoothing: antialiased;
  }
</style>
