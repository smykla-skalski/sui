<script module lang="ts">
  export const section = {
    title: 'Callout',
    lead: 'A short consequence set beside the work. Where the work itself would have been, reach for an empty state instead.',
    components: ['Callout']
  };
</script>

<script lang="ts">
  import { Button, Callout, Icon, Link, type CalloutTone, type IconName } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
  import Variants from '../kit/Variants.svelte';

  const tones = ['quiet', 'warning'] as const;
  let expiring = $state(false);
  const forms = ['Words only', 'With actions'] as const;
  const copy: Record<CalloutTone, { icon: IconName; title: string; text: string; action: string }> =
    {
      quiet: {
        icon: 'pending',
        title: 'Sync paused',
        text: 'Nothing is pushed until the sync resumes',
        action: 'Resume sync'
      },
      warning: {
        icon: 'warning',
        title: 'Token expires in 2 days',
        text: 'The sync stops when it expires',
        action: 'Renew token'
      }
    };
</script>

<Example
  title="Tones"
  note="Quiet states a consequence, and warning tints a hazardous one and says Warning to a screen reader"
>
  <Variants fill rows={tones} columns={forms} axis="tone" rowLabel={(tone) => `"${tone}"`}>
    {#snippet cell(tone, form)}
      {#snippet resolve()}<Button>{copy[tone].action}</Button>{/snippet}
      <Callout
        {tone}
        title={copy[tone].title}
        actions={form === 'With actions' ? resolve : undefined}
      >
        {#snippet icon()}<Icon name={copy[tone].icon} size="sm" />{/snippet}
        {copy[tone].text}
      </Callout>
    {/snippet}
  </Variants>
</Example>

<Example
  title="Decision"
  note="The gold surface belongs to unsaved work and the one action that resolves it"
  layout="stack"
>
  <Specimen label="Unsaved changes" code="decision">
    <Callout decision title="You have unsaved changes">
      {#snippet icon()}<Icon name="pending" size="sm" />{/snippet}
      Two settings changed since the last save
      {#snippet actions()}
        <Button>Discard</Button>
        <Button tone="decision">Save changes</Button>
      {/snippet}
    </Callout>
  </Specimen>
</Example>

<Example
  title="Long copy"
  note="Long copy starts at the symbol's tile however many lines follow, and an action beside it centres on the message"
  layout="stack"
>
  <Specimen label="Wrapping title and a link">
    <Callout
      title="Archived repositories are skipped during every sync, including the scheduled one"
    >
      {#snippet icon()}<Icon name="info" size="sm" />{/snippet}
      Unarchive a repository to bring it back into the sync, and read
      <Link href="#callout">how archiving works</Link> before you change the setting for the whole workspace
    </Callout>
  </Specimen>
  <Specimen label="Description only">
    <Callout>
      {#snippet icon()}<Icon name="info" size="sm" />{/snippet}
      A description can stand on its own without a title
    </Callout>
  </Specimen>
  <Specimen label="Long copy beside an action" code="actions">
    <Callout
      title="Archived repositories are skipped during every sync, including the scheduled one that runs at night"
    >
      {#snippet icon()}<Icon name="info" size="sm" />{/snippet}
      Unarchive a repository to bring it back into the sync, with the branch rules it had before it was
      archived
      {#snippet actions()}<Button>Show archived</Button>{/snippet}
    </Callout>
  </Specimen>
</Example>

<Example
  title="Appearing after an edit"
  note="A callout that an edit brings is announced once it appears, and one that loads with the page stays quiet"
  layout="stack"
>
  <Specimen label={expiring ? 'Announced' : 'Not shown'} code="live">
    <div class="appear">
      <Button onclick={() => (expiring = !expiring)}
        >{expiring ? 'Keep the token' : 'Shorten the token to 2 days'}</Button
      >
      {#if expiring}
        <div class="full">
          <Callout live tone="warning" title="Token expires in 2 days">
            {#snippet icon()}<Icon name="warning" size="sm" />{/snippet}
            The sync stops when it expires
          </Callout>
        </div>
      {/if}
    </div>
  </Specimen>
</Example>

<Example
  title="Narrow width"
  note="A callout too narrow for its actions beside an 11rem measure of copy moves them under the copy, from its start edge"
  layout="grid"
>
  <Specimen label="Quiet" code="actions">
    <Callout title="Sync paused">
      {#snippet icon()}<Icon name="pending" size="sm" />{/snippet}
      Nothing is pushed until the sync resumes
      {#snippet actions()}
        <Button>Resume sync</Button>
      {/snippet}
    </Callout>
  </Specimen>
  <Specimen label="Warning" code={'tone="warning" actions'}>
    <Callout tone="warning" title="Token expires in 2 days">
      {#snippet icon()}<Icon name="warning" size="sm" />{/snippet}
      The sync stops when it expires
      {#snippet actions()}
        <Button>Remind me</Button>
        <Button>Renew</Button>
      {/snippet}
    </Callout>
  </Specimen>
  <Specimen label="Decision" code="decision actions">
    <Callout decision title="You have unsaved changes">
      {#snippet icon()}<Icon name="pending" size="sm" />{/snippet}
      Two settings changed since the last save
      {#snippet actions()}
        <Button>Discard</Button>
        <Button tone="decision">Save changes</Button>
      {/snippet}
    </Callout>
  </Specimen>
</Example>

<style>
  .appear {
    display: grid;
    gap: var(--sui-space-3);
    justify-items: start;
  }

  .full {
    display: grid;
    justify-self: stretch;
  }
</style>
