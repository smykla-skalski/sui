<script lang="ts">
  import type { Snippet } from 'svelte';
  import { setRailPages } from './shell.svelte.js';

  let { pages, children }: { pages: Snippet; children: Snippet } = $props();

  // svelte-ignore state_referenced_locally
  setRailPages(pages);
</script>

{@render children()}
