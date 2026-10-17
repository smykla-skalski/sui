<script lang="ts">
  import '../lib/styles.css';
  let { children } = $props();
</script>

{@render children()}

<style>
  :global(body) {
    background: var(--sui-canvas);
    color: var(--sui-text-primary);
    font: 400 var(--sui-font-size-body) / var(--sui-leading-body) var(--sui-sans);
    margin: 0;
    min-inline-size: 20rem;
    -webkit-font-smoothing: antialiased;
  }
</style>
