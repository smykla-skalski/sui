<script module lang="ts">
  export const section = { title: 'Pill', order: 80 };
</script>

<script lang="ts">
  import { Pill } from '#lib';
  import Example from '../kit/Example.svelte';
</script>

<Example title="Tones" note="A standing wears its word, and colour never carries it alone">
  <Pill>Member</Pill>
  <Pill tone="info">Invited</Pill>
  <Pill tone="success">Active</Pill>
  <Pill tone="warning">Expires soon</Pill>
  <Pill tone="danger">Suspended</Pill>
  <Pill tone="role">Owner</Pill>
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
    inline-size: min(100%, 14rem);
  }
</style>
