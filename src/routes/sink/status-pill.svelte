<script module lang="ts">
  export const section = { title: 'Status pill', order: 82 };
</script>

<script lang="ts">
  import { StatusPill } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
</script>

<Example title="Tones" note="A fact about the surface, quieter than a value and never pressable">
  <Specimen label={'tone="neutral"'}><StatusPill>Read only</StatusPill></Specimen>
  <Specimen label={'tone="success"'}><StatusPill tone="success">Healthy</StatusPill></Specimen>
  <Specimen label={'tone="warning"'}><StatusPill tone="warning">Degraded</StatusPill></Specimen>
  <Specimen label={'tone="danger"'}><StatusPill tone="danger">Unavailable</StatusPill></Specimen>
</Example>

<Example title="Dot and live" note="The live dot pulses, and under reduced motion it stays still">
  <Specimen label="dot"><StatusPill dot>Current</StatusPill></Specimen>
  <Specimen label={'tone="success" live'}
    ><StatusPill tone="success" live>Live</StatusPill></Specimen
  >
  <Specimen label={'tone="warning" dot'}
    ><StatusPill tone="warning" dot>Reconnecting</StatusPill></Specimen
  >
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
    inline-size: min(100%, 16rem);
  }
</style>
