<script module lang="ts">
  export const section = {
    title: 'Copyable link field',
    lead: 'A generated link or token in a read-only field, copied in one press or selected by hand. A value the reader edits is a TextInput.',
    components: ['CopyableLinkField']
  };
</script>

<script lang="ts">
  import { Button, CopyableLinkField } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  let invitation = $state('https://panel.example.com/invite/8f3k2q');
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
      value={invitation}
    />
    <Button
      onclick={() =>
        (invitation =
          'https://panel.example.com/invite/a-much-longer-one-time-invitation-token-that-wraps')}
    >
      Lengthen the invitation
    </Button>
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
  note="A long token wraps onto more lines, so all of it shows, never widens the row, and copies whole"
  layout="stack"
>
  <Specimen label="Wrapped token" code="copyLabel">
    <div class="narrow">
      <CopyableLinkField
        label="Webhook secret"
        copyLabel="Copy secret"
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
