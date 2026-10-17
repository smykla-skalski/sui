<script module lang="ts">
  export const section = { title: 'Callout', order: 63 };
</script>

<script lang="ts">
  import { Button, Callout, Icon, Link } from '#lib';
  import Example from '../kit/Example.svelte';
</script>

<Example
  title="Tones"
  note="Quiet states a consequence, and warning carries the tint and a spoken name for a hazardous one"
  layout="stack"
>
  <Callout title="Changes apply to new pull requests">
    {#snippet icon()}<Icon name="info" size="sm" />{/snippet}
    Open pull requests keep the rules they were opened with
  </Callout>
  <Callout tone="warning" title="This removes every branch rule">
    {#snippet icon()}<Icon name="warning" size="sm" />{/snippet}
    Pushes to the default branch will no longer be checked by anyone
  </Callout>
</Example>

<Example
  title="Wrapping copy"
  note="The icon stays on the first line's cap band however many lines follow"
  layout="stack"
>
  <Callout title="Archived repositories are skipped during every sync, including the scheduled one">
    {#snippet icon()}<Icon name="info" size="sm" />{/snippet}
    Unarchive a repository to bring it back into the sync, and read
    <Link href="#callout">how archiving works</Link> before you change the setting for the whole workspace
  </Callout>
  <Callout>
    {#snippet icon()}<Icon name="info" size="sm" />{/snippet}
    A description can stand on its own without a title
  </Callout>
</Example>

<Example
  title="Decision"
  note="The gold surface belongs to unsaved work and the one action that resolves it"
  layout="stack"
>
  <Callout decision title="You have unsaved changes">
    {#snippet icon()}<Icon name="pending" size="sm" />{/snippet}
    Two settings changed since the last save
    {#snippet actions()}
      <Button>Discard</Button>
      <Button tone="decision">Save changes</Button>
    {/snippet}
  </Callout>
</Example>

<Example
  title="Actions at narrow width"
  note="At 24rem or narrower the actions stack in a column beside the message"
  layout="stack"
>
  <div class="narrow">
    <Callout title="Sync paused">
      {#snippet icon()}<Icon name="pending" size="sm" />{/snippet}
      Nothing is pushed until the sync resumes
      {#snippet actions()}
        <Button>Resume sync</Button>
      {/snippet}
    </Callout>
    <Callout tone="warning" title="Token expires in 2 days">
      {#snippet icon()}<Icon name="warning" size="sm" />{/snippet}
      The sync stops when it expires
      {#snippet actions()}
        <Button>Remind me</Button>
        <Button>Renew</Button>
      {/snippet}
    </Callout>
    <Callout decision title="You have unsaved changes">
      {#snippet icon()}<Icon name="pending" size="sm" />{/snippet}
      Two settings changed since the last save
      {#snippet actions()}
        <Button>Discard</Button>
        <Button tone="decision">Save changes</Button>
      {/snippet}
    </Callout>
  </div>
</Example>

<style>
  .narrow {
    display: grid;
    gap: var(--sui-space-3);
    max-inline-size: 22rem;
  }
</style>
