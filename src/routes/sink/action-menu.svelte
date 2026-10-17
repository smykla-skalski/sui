<script module lang="ts">
  export const section = { title: 'Action menu', order: 44 };
</script>

<script lang="ts">
  import { ActionMenu, ConfirmDialog, type ActionMenuItem } from '#lib';
  import Example from '../kit/Example.svelte';

  let last = $state('Nothing chosen yet');
  let deleting = $state(false);
  let yanking = $state(false);

  const did = (what: string) => () => (last = what);

  const repository: ActionMenuItem[] = [
    { label: 'Sync now', icon: 'refresh', onselect: did('Synced') },
    { label: 'Open settings', icon: 'settings', onselect: did('Opened settings') },
    {
      label: 'Transfer ownership',
      icon: 'owner',
      disabled: true,
      description: 'Only owners can transfer',
      onselect: did('Transferred')
    },
    { separator: true },
    { label: 'Delete repository', icon: 'trash', tone: 'stop', onselect: () => (deleting = true) }
  ];

  const release: ActionMenuItem[] = [
    { label: 'Copy version', onselect: did('Copied the version') },
    {
      label: 'Compare with the release published before it, file by file',
      onselect: did('Compared')
    },
    { label: 'Yank release', tone: 'stop', onselect: () => (yanking = true) }
  ];
</script>

<Example
  title="Icon trigger"
  note="Icons, a disabled item with its reason and a destructive item kept last behind a separator"
>
  <ActionMenu label="Repository actions" icon="more" items={repository} align="end" />
  <span class="state">{last}</span>
</Example>

<Example
  title="Open states"
  note="The open menu drawn in place with its first item highlighted, so a review needs no click"
  layout="stack"
>
  <ActionMenu label="Repository actions" icon="more" items={repository} align="end" preview />
  <ActionMenu items={release} preview>Release actions</ActionMenu>
</Example>

<Example title="Button trigger" note="A worded trigger with a chevron, and a long item that wraps">
  <ActionMenu items={release}>Release actions</ActionMenu>
  <ActionMenu items={release} tone="ghost">More</ActionMenu>
</Example>

<Example
  title="Disabled"
  note="A menu whose acts are unavailable keeps its trigger in view, with the reason beside it"
>
  <ActionMenu label="Repository actions" icon="more" items={repository} disabled />
  <ActionMenu items={release} disabled>Release actions</ActionMenu>
  <span class="state">Read-only while the repository is archived</span>
</Example>

<ConfirmDialog
  bind:open={deleting}
  title="Delete this repository?"
  consequence="Its settings, history and webhooks are removed for good"
  confirmLabel="Delete repository"
  tone="stop"
  onconfirm={() => (last = 'Deleted')}
  oncancel={() => (last = 'Kept the repository')}
/>

<ConfirmDialog
  bind:open={yanking}
  title="Yank 0.3.0?"
  consequence="Nobody can install 0.3.0 again, and the version number is never reused"
  confirmLabel="Yank release"
  tone="stop"
  onconfirm={() => (last = 'Yanked')}
  oncancel={() => (last = 'Kept the release')}
/>

<style>
  .state {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
  }
</style>
