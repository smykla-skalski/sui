<script module lang="ts">
  export const section = {
    title: 'Toaster',
    lead: 'A toast says what just happened, with at most one way back such as Undo. Unsaved work belongs in a SaveBar.',
    components: ['Toaster']
  };
</script>

<script lang="ts">
  import { Button, Toaster, dismiss, toast } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  let removed = $state(false);
  let undo = 0;

  function removeRule(): void {
    removed = true;
    undo = toast({
      title: 'Rule removed',
      description: 'Required reviewers no longer applies to main',
      action: { label: 'Undo', run: restoreRule }
    });
  }

  // The page offers the same way back as the toast, on the button that removed the rule, so
  // focus stays on that button after each press.
  function restoreRule(): void {
    removed = false;
    dismiss(undo);
    toast({ title: 'Rule restored' });
  }
</script>

<Example
  title="Tones & Actions"
  note="A neutral toast, a failure and one with an action, drawn in place with no timers"
  ground="canvas"
  layout="grid"
>
  <Specimen label="Neutral">
    <Toaster
      preview
      items={[{ title: 'Settings saved', description: 'Main now needs 2 reviews before a merge' }]}
    />
  </Specimen>
  <Specimen label="Danger">
    <Toaster
      preview
      items={[
        {
          title: 'The sync needs another try',
          description: 'GitHub answered 502, so try again in a minute',
          tone: 'danger'
        }
      ]}
    />
  </Specimen>
  <Specimen label="With Undo">
    <Toaster
      preview
      items={[
        {
          title: 'Rule removed',
          description: 'Required reviewers no longer applies to main',
          action: { label: 'Undo', run: () => {} }
        }
      ]}
    />
  </Specimen>
</Example>

<Example
  title="Timing"
  note="A neutral toast leaves after 5 seconds unless hovered or focused, and a failure or one with Undo stays until dismissed"
  layout="grid"
  --specimen-min="min(16rem, calc((100% - var(--sui-space-6)) / 2 - 1px))"
>
  <Specimen label="Neutral">
    <Button onclick={() => toast({ title: 'Settings saved' })}>Save Settings</Button>
  </Specimen>
  <Specimen label="Danger">
    <Button
      onclick={() =>
        toast({
          title: 'The sync needs another try',
          description: 'GitHub answered 502, so try again in a minute',
          tone: 'danger'
        })}>Sync Repositories</Button
    >
  </Specimen>
  <Specimen label={removed ? 'Removed, with Restore on the page' : 'With Undo'}>
    <Button tone={removed ? 'default' : 'stop-quiet'} onclick={removed ? restoreRule : removeRule}
      >{removed ? 'Restore' : 'Remove Rule'}</Button
    >
  </Specimen>
</Example>

<Example
  title="Reaching the Stack"
  note="F8 moves focus to the newest toast and Escape hands it back, and a stack taller than the screen scrolls"
  layout="grid"
  ground="canvas"
  --specimen-min="24rem"
  --specimen-max="24rem"
  --example-max="calc(52.5rem + 2 * var(--sui-stroke))"
>
  <Specimen label="3 toasts">
    <Toaster
      preview
      items={['sui', 'smyklot', 'ledger'].map((name) => ({
        title: `The ${name} sync needs another try`,
        description: 'GitHub answered 502, so try again in a minute',
        tone: 'danger' as const
      }))}
    />
  </Specimen>
  <Specimen label="Many toasts">
    <Button
      onclick={() => {
        for (const name of ['sui', 'smyklot', 'ledger', 'atlas', 'harbor', 'relay'])
          toast({
            title: `The ${name} sync needs another try`,
            description: 'GitHub answered 502, so try again in a minute',
            tone: 'danger'
          });
      }}>Sync 6 Repositories</Button
    >
  </Specimen>
</Example>

<Toaster />
