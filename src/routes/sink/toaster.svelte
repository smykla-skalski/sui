<script module lang="ts">
  export const section = { title: 'Toaster', order: 54 };
</script>

<script lang="ts">
  import { Button, Toaster, dismiss, toast } from '#lib';
  import Example from '../kit/Example.svelte';

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

  function restoreRule(): void {
    removed = false;
    dismiss(undo);
    toast({ title: 'Rule restored' });
  }
</script>

<Example
  title="Neutral"
  note="Leaves after five seconds, and waits while the pointer or focus is on it"
>
  <Button onclick={() => toast({ title: 'Settings saved' })}>Save settings</Button>
</Example>

<Example
  title="With a way back"
  note="A toast with Undo stays until it is used or dismissed, and the page offers the same way back"
>
  <span class="state">
    {removed ? 'Required reviewers was removed from main' : 'Required reviewers applies to main'}
  </span>
  <!-- One button that changes its job, so focus stays on it after each press. -->
  <Button tone={removed ? 'default' : 'stop-quiet'} onclick={removed ? restoreRule : removeRule}
    >{removed ? 'Restore' : 'Remove rule'}</Button
  >
</Example>

<Example
  title="Open"
  note="A neutral toast, a failure and one with an action, drawn in place with no timers"
>
  <Toaster
    preview
    items={[
      { title: 'Settings saved' },
      {
        title: 'Sync failed',
        description: 'GitHub answered 502, try again in a minute',
        tone: 'danger'
      },
      {
        title: 'Rule removed',
        description: 'Required reviewers no longer applies to main',
        action: { label: 'Undo', run: () => {} }
      }
    ]}
  />
</Example>

<Example title="Danger" note="A failure stays until it is dismissed, and is announced as an alert">
  <Button
    onclick={() =>
      toast({
        title: 'Sync failed',
        description: 'GitHub answered 502, try again in a minute',
        tone: 'danger'
      })}>Sync repositories</Button
  >
</Example>

<Toaster />

<style>
  .state {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
  }
</style>
