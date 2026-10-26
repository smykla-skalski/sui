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
  title="Tones and actions"
  note="A neutral toast, a failure and one with an action, drawn in place with no timers"
  ground="canvas"
  layout="grid"
>
  <Specimen label="Neutral" code="preview">
    <Toaster preview items={[{ title: 'Settings saved' }]} />
  </Specimen>
  <Specimen label="Danger" code="tone: 'danger'">
    <Toaster
      preview
      items={[
        {
          title: 'Sync failed',
          description: 'GitHub answered 502, try again in a minute',
          tone: 'danger'
        }
      ]}
    />
  </Specimen>
  <Specimen label="With an action" code="action">
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
  note="A neutral toast leaves after five seconds unless hovered or focused, and a failure or one with Undo stays until dismissed"
>
  <Specimen label="Neutral" code="toast()">
    <Button onclick={() => toast({ title: 'Settings saved' })}>Save settings</Button>
  </Specimen>
  <Specimen label="Danger" code="tone: 'danger'">
    <Button
      onclick={() =>
        toast({
          title: 'Sync failed',
          description: 'GitHub answered 502, try again in a minute',
          tone: 'danger'
        })}>Sync repositories</Button
    >
  </Specimen>
  <Specimen label={removed ? 'Removed, with Restore on the page' : 'With Undo'} code="action">
    <Button tone={removed ? 'default' : 'stop-quiet'} onclick={removed ? restoreRule : removeRule}
      >{removed ? 'Restore' : 'Remove rule'}</Button
    >
  </Specimen>
</Example>

<Example
  title="Reaching the stack"
  note="F8 moves focus to the newest toast and Escape hands it back, and a stack taller than the screen scrolls"
>
  <Specimen label="Many toasts" code="hotkey">
    <Button
      onclick={() => {
        for (const name of ['sui', 'smyklot', 'ledger', 'atlas', 'harbor', 'relay'])
          toast({
            title: `Sync failed for ${name}`,
            description: 'GitHub answered 502, try again in a minute',
            tone: 'danger'
          });
      }}>Sync six repositories</Button
    >
  </Specimen>
</Example>

<Toaster />
