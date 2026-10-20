<script lang="ts">
  import { onMount } from 'svelte';
  import { exposeAudit } from '../audit/expose.js';

  let { children } = $props();

  // Each layout is a whole page with no sink around it, as an app draws it, so the browser tests
  // run the law audit here, at the viewport's own width.
  onMount(() => exposeAudit());
</script>

{@render children()}
