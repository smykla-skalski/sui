<script lang="ts">
  import type { Snippet } from 'svelte';
  import { setRailPages } from './shell.svelte.js';

  let { pages, children }: { pages: Snippet; children: Snippet } = $props();

  // svelte-ignore state_referenced_locally
  const host = setRailPages(pages);
</script>

{@render children()}
<!-- A rail of the caller's own markup takes no pages, so they stand beside it as before. The
     rail takes them as it is set up, before this line is drawn. -->
{#if !host.hosted}{@render pages()}{/if}
