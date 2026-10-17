<script lang="ts">
  import '../lib/styles.css';
  let { children } = $props();
</script>

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
