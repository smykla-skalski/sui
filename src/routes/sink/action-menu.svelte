<script module lang="ts">
  export const section = {
    title: 'Action Menu',
    lead: 'A menu of acts behind one trigger, with a destructive act last. A place to go is a link on the page, never a menu item.',
    components: ['ActionMenu']
  };
</script>

<script lang="ts">
  import { ActionMenu, Button, ConfirmDialog, type ActionMenuItem } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  let deleting = $state(false);
  let yanking = $state(false);

  const nothing = () => {};

  const repository: ActionMenuItem[] = [
    { label: 'Sync Now', icon: 'refresh', onselect: nothing },
    { label: 'Open Settings', icon: 'settings', onselect: nothing },
    {
      label: 'Transfer Ownership',
      icon: 'owner',
      disabled: true,
      description: 'Only owners can transfer',
      onselect: nothing
    },
    { separator: true },
    { label: 'Delete Repository…', icon: 'trash', tone: 'stop', onselect: () => (deleting = true) }
  ];

  const release: ActionMenuItem[] = [
    { label: 'Copy Version', onselect: nothing },
    {
      label: 'Compare with the Release Published before It, File by File',
      onselect: nothing
    },
    { separator: true },
    { label: 'Yank Release…', tone: 'stop', onselect: () => (yanking = true) }
  ];
</script>

<Example
  title="Triggers"
  --example-max="54rem"
  note="An icon trigger for a row’s end or beside buttons, and a worded trigger with a chevron in the default and ghost tones"
>
  <Specimen label="Icon trigger">
    <div class="row">
      <span class="name">web-console</span>
      <ActionMenu label="Repository actions" icon="more" items={repository} align="end" />
    </div>
  </Specimen>
  <Specimen label="Beside buttons">
    <div class="actions">
      <Button>Edit Release</Button>
      <ActionMenu label="Release actions" icon="more" toolbar items={release} align="end" />
    </div>
  </Specimen>
  <Specimen label="Button trigger">
    <ActionMenu items={release}>Release Actions</ActionMenu>
  </Specimen>
  <Specimen label="Ghost trigger">
    <ActionMenu items={release} tone="ghost">More Actions</ActionMenu>
  </Specimen>
</Example>

<Example
  title="States"
  --example-max="54rem"
  note="A menu whose acts are unavailable keeps its trigger in view, with the reason beside it"
>
  <Specimen label="Disabled icon trigger">
    <div class="locked">
      <ActionMenu label="Repository actions" icon="more" items={repository} disabled />
      <p class="reason">Read-only while the repository is archived</p>
    </div>
  </Specimen>
  <Specimen label="Disabled button trigger">
    <div class="locked">
      <ActionMenu items={release} disabled>Release Actions</ActionMenu>
      <p class="reason">Read-only while the repository is archived</p>
    </div>
  </Specimen>
</Example>

<Example
  title="Open"
  --example-max="54rem"
  note="Icons, a disabled item with its reason, a destructive item last and a long item that wraps, with the first item lit"
>
  <Specimen label="Open with icons">
    <!-- One control tall, as the button trigger beside it is, so the two menus start on one line. -->
    <ActionMenu
      label="Repository actions"
      icon="more"
      toolbar
      items={repository}
      align="end"
      preview
    />
  </Specimen>
  <Specimen label="Open with a long item">
    <ActionMenu items={release} preview>Release Actions</ActionMenu>
  </Specimen>
</Example>

<ConfirmDialog
  bind:open={deleting}
  title="Delete This Repository?"
  consequence="Its settings, history and webhooks are removed for good"
  confirmLabel="Delete Repository"
  tone="stop"
/>

<ConfirmDialog
  bind:open={yanking}
  title="Yank 0.3.0?"
  consequence="Nobody can install 0.3.0 again, and the version number is never reused"
  confirmLabel="Yank Release"
  tone="stop"
/>

<style>
  /* The icon trigger ends the row it acts on, so its menu hangs under the row from that end. */
  .row {
    align-items: center;
    display: flex;
    gap: var(--sui-space-3);
    inline-size: 15rem;
    justify-content: space-between;
    max-inline-size: 100%;
  }

  .actions {
    display: flex;
    gap: var(--sui-space-2);
  }

  .locked {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-3);
  }

  /* Words beside a trigger snap their box to the cap, so the icon centres on their cap (L-94). */
  .name,
  .reason {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
  }

  .name {
    color: var(--sui-text-primary);
  }
</style>
