<script module lang="ts">
  export const section = {
    title: 'Disclosure',
    order: 64,
    lead: 'An optional explanation that opens in place, on a quiet native details row. Controls it reveals sit in their own Card inside it.',
    components: ['Disclosure']
  };
</script>

<script lang="ts">
  import { Card, Disclosure, TextInput } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  let open = $state(true);
</script>

<Example
  title="Variants"
  note="The summary's words share the left edge of the text above, and a hint says what is inside"
  layout="stack"
>
  <Specimen label="Default">
    <Disclosure summary="Why this check is required">
      <p class="copy">The default branch deploys on every merge, so it is never left untested</p>
    </Disclosure>
  </Specimen>
  <Specimen label="With a hint" code={'hint="3 archived"'}>
    <Disclosure summary="Skipped repositories" hint="3 archived">
      <p class="copy">Archived repositories are left out of every sync</p>
    </Disclosure>
  </Specimen>
  <Specimen label="Inline help, 34px with an 8px bleed" code="inline">
    <Disclosure inline summary="How the schedule is read">
      <p class="copy">Times are in the workspace's time zone and repeat every week</p>
    </Disclosure>
  </Specimen>
</Example>

<Example
  title="States"
  note="The chevron turns a quarter when open, and the open state binds both ways"
  layout="stack"
>
  <Specimen label="Closed">
    <Disclosure summary="What happens to archived repositories">
      <p class="copy">They are skipped until someone unarchives them</p>
    </Disclosure>
  </Specimen>
  <Specimen label={open ? 'Open, bound' : 'Closed, bound'} code="bind:open">
    <Disclosure summary="What happens to open pull requests" bind:open>
      <p class="copy">They keep the rules they were opened with until they are updated</p>
    </Disclosure>
  </Specimen>
</Example>

<Example
  title="Revealing controls"
  note="Controls a disclosure reveals sit in their own card inside it"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Open with a card" code="open">
    <Disclosure summary="Advanced settings" open>
      <Card title="Commit author" level={4}>
        <TextInput aria-label="Commit author" value="sync-bot" mono />
      </Card>
    </Disclosure>
  </Specimen>
</Example>

<style>
  .copy {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
    margin: 0;
  }
</style>
