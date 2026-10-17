<script module lang="ts">
  export const section = { title: 'Toaster', order: 54 };
</script>

<script lang="ts">
  import { Button, Toaster, toast } from '#lib';
  import Example from '../kit/Example.svelte';
</script>

<Example
  title="Neutral"
  note="Leaves after five seconds, and waits while the pointer or focus is on it"
>
  <Button onclick={() => toast({ title: 'Settings saved' })}>Save settings</Button>
  <Button
    onclick={() =>
      toast({
        title: 'Rule removed',
        description: 'Required reviewers no longer applies to main',
        action: { label: 'Undo', run: () => toast({ title: 'Rule restored' }) }
      })}>Remove a rule</Button
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

<Example title="Danger and sticky" note="A failure and unsaved work stay until they are dismissed">
  <Button
    onclick={() =>
      toast({
        title: 'Sync failed',
        description: 'GitHub answered 502, try again in a minute',
        tone: 'danger'
      })}>Sync repositories</Button
  >
  <Button
    onclick={() =>
      toast({
        title: 'Draft kept',
        description: '3 changes are waiting to be saved',
        sticky: true
      })}>Keep a draft</Button
  >
</Example>

<Toaster />
