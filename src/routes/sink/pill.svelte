<script module lang="ts">
  export const section = { title: 'Pill', order: 80 };
</script>

<script lang="ts">
  import { Pill } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
</script>

<Example title="Tones" note="A status wears its word, and color never carries it alone">
  <Specimen label={'tone="neutral"'}><Pill>Member</Pill></Specimen>
  <Specimen label={'tone="info"'}><Pill tone="info">Invited</Pill></Specimen>
  <Specimen label={'tone="success"'}><Pill tone="success">Healthy</Pill></Specimen>
  <Specimen label={'tone="warning"'}><Pill tone="warning">Degraded</Pill></Specimen>
  <Specimen label={'tone="danger"'}><Pill tone="danger">Suspended</Pill></Specimen>
  <Specimen label={'tone="role"'}><Pill tone="role">Owner</Pill></Specimen>
</Example>

<Example title="With an icon" note="The glyph starts where a word would start">
  <Pill tone="role" icon="owner">Owner</Pill>
  <Pill tone="success" icon="check">Verified</Pill>
  <Pill icon="lock">Workspace scope</Pill>
  <Pill tone="danger" icon="database">Database offline</Pill>
</Example>

<Example title="Dot and live" note="The live dot pulses, and under reduced motion it stays still">
  <Specimen label="dot"><Pill dot>Current</Pill></Specimen>
  <Specimen label={'tone="success" live'}><Pill tone="success" live>Live</Pill></Specimen>
  <Specimen label={'tone="warning" dot'}><Pill tone="warning" dot>Reconnecting</Pill></Specimen>
</Example>

<Example title="Long status" note="A long status wraps inside the pill, so no word is cut">
  <div class="narrow">
    <Pill tone="info">Invited to the infrastructure and platform engineering workspace</Pill>
  </div>
</Example>

<style>
  .narrow {
    display: flex;
    inline-size: min(100%, 16rem);
  }
</style>
