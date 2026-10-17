<script module lang="ts">
  export const section = { title: 'Status pill', order: 82 };
</script>

<script lang="ts">
  import { StatusPill } from '#lib';
  import Example from '../kit/Example.svelte';
</script>

<Example title="Tones" note="A fact about the surface, quieter than a value and never pressable">
  <StatusPill>Read only</StatusPill>
  <StatusPill tone="success">Healthy</StatusPill>
  <StatusPill tone="warning">Degraded</StatusPill>
  <StatusPill tone="danger">Unavailable</StatusPill>
</Example>

<Example title="Dot and live" note="The live dot pulses, and under reduced motion it stays still">
  <StatusPill dot>Current</StatusPill>
  <StatusPill tone="success" live>Live</StatusPill>
  <StatusPill tone="warning" dot>Reconnecting</StatusPill>
</Example>

<Example title="With an icon" note="A symbol for what the words alone cannot carry">
  <StatusPill icon="lock">Workspace scope</StatusPill>
  <StatusPill tone="danger" icon="database">Database offline</StatusPill>
</Example>

<Example title="Long fact" note="A long fact ends in an ellipsis inside its column">
  <div class="narrow">
    <StatusPill dot>Changes from three upstream repositories arriving</StatusPill>
  </div>
</Example>

<style>
  .narrow {
    display: flex;
    inline-size: min(100%, 14rem);
  }
</style>
