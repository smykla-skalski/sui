<script module lang="ts">
  export const section = {
    title: 'Copyable Link Field',
    short: 'Link Field',
    lead: 'A generated link or token in a read-only field, copied in one press or selected by hand. A value the reader edits is a TextInput.',
    components: ['CopyableLinkField']
  };
</script>

<script lang="ts">
  import { Button, CopyableLinkField } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  let invitation = $state('https://panel.example.com/invite/YOUR_INVITE_TOKEN_HERE');
</script>

<Example
  title="Names"
  --example-max="40rem"
  note="A label names the field, or an accessible name does where the words on screen already name it"
  layout="stack"
>
  <Specimen label="With a label">
    <div class="invite">
      <CopyableLinkField
        label="Invitation link"
        hint="It works once and expires in 7&nbsp;days"
        value={invitation}
      />
      <Button
        onclick={() =>
          (invitation =
            'https://panel.example.com/invite/a-much-longer-one-time-invitation-token-that-wraps')}
      >
        Lengthen the Invitation
      </Button>
    </div>
  </Specimen>
  <Specimen label="Without a label">
    <CopyableLinkField
      aria-label="Clone address"
      value="git@github.com:smykla-skalski/sui.git"
      copyLabel="Copy Address"
    />
  </Specimen>
</Example>

<div class="fill">
  <Example
    title="Long Value"
    --example-max="calc(16rem + 2 * var(--sui-space-6))"
    note="A long token wraps onto more lines, so all of it shows, never widens the row, and copies whole"
    layout="stack"
  >
    <Specimen label="Wrapped token">
      <div class="narrow">
        <CopyableLinkField
          label="Webhook secret"
          copyLabel="Copy Secret"
          value="whsec_9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a0"
        />
      </div>
    </Specimen>
  </Example>
</div>

<style>
  /* The button ends the specimen as an action ends a form, past the field's own gap (L-35). */
  .invite {
    display: grid;
    gap: var(--sui-space-6);
  }

  .narrow {
    inline-size: min(100%, 16rem);
  }

  /* The narrow frame keeps the field's 16rem and the stage's 24px pad on a wide page; on a
     phone the frame and the field fill the column, as every other frame and field do (L-55). */
  @media (max-width: 47.9375rem) {
    .fill :global(.example) {
      --example-max: none;
    }

    .narrow {
      inline-size: 100%;
    }
  }
</style>
