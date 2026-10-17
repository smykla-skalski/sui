<script module lang="ts">
  export const section = { title: 'Copyable link field', order: 111 };
</script>

<script lang="ts">
  import { CopyableLinkField } from '#lib';
  import Example from '../kit/Example.svelte';
</script>

<Example
  title="With a label"
  note="The label names the field, and the hint says how long the link lasts"
  layout="stack"
>
  <CopyableLinkField
    label="Invitation link"
    hint="It works once and expires in 7 days"
    value="https://panel.example.com/invite/8f3k2q"
  />
</Example>

<Example
  title="Long value"
  note="A long token scrolls inside the field, never widens the row, and copies whole"
  layout="stack"
>
  <div class="narrow">
    <CopyableLinkField
      label="Webhook secret"
      value="whsec_9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
    />
  </div>
</Example>

<Example
  title="Without a label"
  note="Where the words on screen already name it, the field takes an accessible name instead"
  layout="stack"
>
  <CopyableLinkField
    aria-label="Clone address"
    value="git@github.com:smykla-skalski/sui.git"
    copyLabel="Copy address"
  />
</Example>

<style>
  .narrow {
    inline-size: min(100%, 20rem);
  }
</style>
