<script module lang="ts">
  export const section = { title: 'Disclosure', order: 64 };
</script>

<script lang="ts">
  import { Card, Disclosure, TextInput } from '#lib';
  import Example from '../kit/Example.svelte';

  let open = $state(true);
</script>

<Example
  title="Closed and open"
  note="The summary's words share the heading's left edge, and the chevron turns when open"
  layout="stack"
>
  <Disclosure summary="Why this check is required">
    <p class="copy">The default branch deploys on every merge, so it is never left untested</p>
  </Disclosure>
  <Disclosure summary="What happens to open pull requests" bind:open>
    <p class="copy">They keep the rules they were opened with until they are updated</p>
  </Disclosure>
  <p class="state">The second one is {open ? 'open' : 'closed'}</p>
</Example>

<Example
  title="With a hint"
  note="A quiet hint before the chevron says what is inside without opening it"
  layout="stack"
>
  <Disclosure summary="Skipped repositories" hint="3 archived">
    <p class="copy">Archived repositories are left out of every sync</p>
  </Disclosure>
</Example>

<Example
  title="Inline help"
  note="The inline variant is 34px with an 8px bleed, for help inside a settings column"
  layout="stack"
>
  <Disclosure inline summary="How the schedule is read">
    <p class="copy">Times are in the workspace's time zone and repeat every week</p>
  </Disclosure>
</Example>

<Example
  title="Revealing controls"
  note="Controls a disclosure reveals sit in their own card inside it"
  layout="stack"
>
  <Disclosure summary="Advanced settings" open>
    <Card title="Commit author" level={4}>
      <TextInput aria-label="Commit author" value="sync-bot" mono />
    </Card>
  </Disclosure>
</Example>

<style>
  .copy {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
    margin: 0;
  }

  .state {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
    margin: 0;
  }
</style>
