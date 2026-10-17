<script module lang="ts">
  export const section = { title: 'Color tag', order: 114 };
</script>

<script lang="ts">
  import { ColorTag } from '#lib';
  import Example from '../kit/Example.svelte';

  const github = [
    ['bug', 'd73a4a'],
    ['documentation', '0075ca'],
    ['duplicate', 'cfd3d7'],
    ['enhancement', 'a2eeef'],
    ['good first issue', '7057ff'],
    ['help wanted', '008672'],
    ['invalid', 'e4e669'],
    ['question', 'd876e3'],
    ['wontfix', 'ffffff']
  ] as const;

  const extremes = [
    ['white', '#ffffff'],
    ['cream', '#fef2c0'],
    ['grey', '#808080'],
    ['blue', '#1d76db'],
    ['violet', '#5319e7'],
    ['black', '#000000']
  ] as const;
</script>

<Example
  title="GitHub defaults"
  note="The ink is dark or light for 4.5:1, and a mid tone like the red is nudged until one ink reads"
>
  {#each github as [label, color] (label)}
    <ColorTag {label} {color} />
  {/each}
</Example>

<Example
  title="Pale and dark"
  note="The edge is the fill pulled toward the ink, so a white tag still shows on a white card"
>
  {#each extremes as [label, color] (label)}
    <ColorTag {label} {color} />
  {/each}
</Example>

<Example
  title="Unreadable color"
  note="Anything but hex digits draws the neutral tag, so a stored value never writes a style"
>
  <ColorTag label="imported" color="var(--brand)" />
  <ColorTag label="empty" color="" />
</Example>

<Example title="Long name" note="A long name wraps inside its tag rather than widening the row">
  <div class="narrow">
    <ColorTag label="area: control plane, multizone, global and zone sync" color="c5def5" />
  </div>
</Example>

<style>
  .narrow {
    display: flex;
    inline-size: min(100%, 16rem);
  }
</style>
