<script module lang="ts">
  export const section = {
    title: 'Copyable link field',
    order: 111,
    lead: 'A generated link or token in a read-only field, copied in one press or selected by hand. A value the reader edits is a TextInput.',
    components: ['CopyableLinkField']
  };
</script>

<script lang="ts">
  import { CopyableLinkField } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
</script>

<Example
  title="Names"
  note="A label names the field, or an accessible name does where the words on screen already name it"
  layout="stack"
>
  <Specimen label="With a label" code="label hint">
    <CopyableLinkField
      label="Invitation link"
      hint="It works once and expires in 7 days"
      value="https://panel.example.com/invite/8f3k2q"
    />
  </Specimen>
  <Specimen label="Without a label" code="aria-label copyLabel">
    <CopyableLinkField
      aria-label="Clone address"
      value="git@github.com:smykla-skalski/sui.git"
      copyLabel="Copy address"
    />
  </Specimen>
</Example>

<Example
  title="Long value"
  note="A long token scrolls inside the field, never widens the row, and copies whole"
  layout="stack"
>
  <Specimen label="Scrolled token">
    <div class="narrow">
      <CopyableLinkField
        label="Webhook secret"
        value="whsec_9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
      />
    </div>
  </Specimen>
</Example>

<style>
  .narrow {
    inline-size: min(100%, 16rem);
  }
</style>
