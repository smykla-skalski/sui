<script module lang="ts">
  export const section = { title: 'Pill', order: 80 };
</script>

<script lang="ts">
  import { Pill } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
</script>

<Example title="Tones" note="A standing wears its word, and color never carries it alone">
  <Specimen label={'tone="neutral"'}><Pill>Member</Pill></Specimen>
  <Specimen label={'tone="info"'}><Pill tone="info">Invited</Pill></Specimen>
  <Specimen label={'tone="success"'}><Pill tone="success">Active</Pill></Specimen>
  <Specimen label={'tone="warning"'}><Pill tone="warning">Expires soon</Pill></Specimen>
  <Specimen label={'tone="danger"'}><Pill tone="danger">Suspended</Pill></Specimen>
  <Specimen label={'tone="role"'}><Pill tone="role">Owner</Pill></Specimen>
</Example>

<Example title="With an icon" note="The glyph starts where a word would start">
  <Pill tone="role" icon="owner">Owner</Pill>
  <Pill tone="success" icon="check">Verified</Pill>
  <Pill tone="warning" icon="pending">Waiting for review</Pill>
  <Pill tone="danger" icon="ban">Banned</Pill>
</Example>

<Example
  title="Long standing"
  note="A pill stays on one line and ends in an ellipsis inside its column"
>
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
