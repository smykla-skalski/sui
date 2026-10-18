<script module lang="ts">
  export const section = {
    title: 'Action menu',
    order: 44,
    lead: 'A menu of acts behind one trigger, with a destructive act last. A place to go is a link on the page, never a menu item.',
    components: ['ActionMenu']
  };
</script>

<script lang="ts">
  import { ActionMenu, ConfirmDialog, type ActionMenuItem } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  let deleting = $state(false);
  let yanking = $state(false);

  const nothing = () => {};

  const repository: ActionMenuItem[] = [
    { label: 'Sync now', icon: 'refresh', onselect: nothing },
    { label: 'Open settings', icon: 'settings', onselect: nothing },
    {
      label: 'Transfer ownership',
      icon: 'owner',
      disabled: true,
      description: 'Only owners can transfer',
      onselect: nothing
    },
    { separator: true },
    { label: 'Delete repository', icon: 'trash', tone: 'stop', onselect: () => (deleting = true) }
  ];

  const release: ActionMenuItem[] = [
    { label: 'Copy version', onselect: nothing },
    {
      label: 'Compare with the release published before it, file by file',
      onselect: nothing
    },
    { label: 'Yank release', tone: 'stop', onselect: () => (yanking = true) }
  ];
</script>

<Example
  title="Triggers"
  note="An icon trigger for a row's end, and a worded trigger with a chevron in the default and ghost tones"
>
  <Specimen label="Icon trigger" code={'label icon="more" align="end"'}>
    <ActionMenu label="Repository actions" icon="more" items={repository} align="end" />
  </Specimen>
  <Specimen label="Button trigger" code="children">
    <ActionMenu items={release}>Release actions</ActionMenu>
  </Specimen>
  <Specimen label="Ghost trigger" code={'tone="ghost"'}>
    <ActionMenu items={release} tone="ghost">More</ActionMenu>
  </Specimen>
</Example>

<Example
  title="States"
  note="A menu whose acts are unavailable keeps its trigger in view, with the reason beside it"
>
  <Specimen label="Disabled icon trigger" code="disabled">
    <div class="locked">
      <ActionMenu label="Repository actions" icon="more" items={repository} disabled />
      <p class="reason">Read-only while the repository is archived</p>
    </div>
  </Specimen>
  <Specimen label="Disabled button trigger" code="disabled">
    <div class="locked">
      <ActionMenu items={release} disabled>Release actions</ActionMenu>
      <p class="reason">Read-only while the repository is archived</p>
    </div>
  </Specimen>
</Example>

<Example
  title="Open"
  note="Icons, a disabled item with its reason, a destructive item last and a long item that wraps, with the first item lit"
>
  <Specimen label="Open with icons" code="preview">
    <ActionMenu label="Repository actions" icon="more" items={repository} align="end" preview />
  </Specimen>
  <Specimen label="Open with a long item" code="preview">
    <ActionMenu items={release} preview>Release actions</ActionMenu>
  </Specimen>
</Example>

<ConfirmDialog
  bind:open={deleting}
  title="Delete this repository?"
  consequence="Its settings, history and webhooks are removed for good"
  confirmLabel="Delete repository"
  tone="stop"
/>

<ConfirmDialog
  bind:open={yanking}
  title="Yank 0.3.0?"
  consequence="Nobody can install 0.3.0 again, and the version number is never reused"
  confirmLabel="Yank release"
  tone="stop"
/>

<style>
  .locked {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-3);
  }

  .reason {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }
</style>
