<script lang="ts">
  import { createRawSnippet, flushSync, mount, onMount, unmount } from 'svelte';
  import * as lib from '#lib';
  import * as format from '#lib/charts/format.js';
  import * as anchor from '#lib/internal/anchor.js';
  import * as focus from '#lib/internal/focus.js';
  import * as code from '#lib/components/CodeBlock.svelte';
  import * as diff from '#lib/components/DiffBlock.svelte';

  // A test builds reactive props as a parent component's script would, through these.
  const box = <T,>(value: T) => {
    const held = $state({ value });
    return held;
  };
  const get = <T,>(box: { value: T }) => box.value;
  const set = <T,>(box: { value: T }, value: T) => (box.value = value);

  // A blank page of the built site where a browser test mounts the library's components itself,
  // as an app would, without a dev server to serve its modules.
  onMount(() => {
    Object.assign(window, {
      lib,
      format,
      anchor,
      focus,
      code,
      diff,
      mount,
      unmount,
      flushSync,
      createRawSnippet,
      state: box,
      get,
      set
    });
  });
</script>

<svelte:head><title>Mount</title></svelte:head>
