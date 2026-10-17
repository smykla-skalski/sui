<script module lang="ts">
  export const section = {
    title: 'Callout',
    order: 63,
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
  note="Long copy starts at the symbol's tile however many lines follow"
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
</Example>

<Example
  title="Narrow width"
  note="At 24rem or narrower the actions stack in a column beside the message"
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
