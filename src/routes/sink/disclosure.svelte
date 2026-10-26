<script module lang="ts">
  export const section = {
    title: 'Disclosure',
    lead: "An optional explanation or setting that opens in place, its content hanging under the summary's words. Content most readers need stays on the page.",
    components: ['Disclosure']
  };
</script>

<script lang="ts">
  import { Disclosure, Field, Section } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  let open = $state(true);
</script>

<Example
  title="Variants"
  note="The chevron leads the summary's words at the start edge, and a hint says what is inside"
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
  <Specimen label="Inline help" code="inline">
    <Disclosure inline summary="How the schedule is read">
      <p class="copy">Times are in the workspace's time zone and repeat every week</p>
    </Disclosure>
  </Specimen>
</Example>

<Example
  title="States"
  note="Open, the chevron turns down and the content hangs under the summary's words"
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
  <Specimen label="Inline help, open" code="inline open">
    <Disclosure inline summary="How the schedule is read" open>
      <p class="copy">Times are in the workspace's time zone and repeat every week</p>
    </Disclosure>
  </Specimen>
</Example>

<Example
  title="Long text"
  note="When the words and the hint do not fit one line, the hint drops under the words and the chevron stays on the first line"
  layout="grid"
>
  <Specimen label="Long summary">
    <Disclosure
      summary="Why pull requests opened before the rules changed keep the checks they started with"
    >
      <p class="copy">A rule change applies to pull requests opened after it</p>
    </Disclosure>
  </Specimen>
  <Specimen label="Long summary, open with a hint" code={'hint="2 rules" open'}>
    <Disclosure
      summary="Rules that a parent workspace sets and this repository cannot change"
      hint="2 rules"
      open
    >
      <p class="copy">Ask an owner of the parent workspace to change them</p>
    </Disclosure>
  </Specimen>
  <Specimen label="Long hint" code={'hint="ID, worker and settings version"'}>
    <Disclosure summary="More about this sync" hint="ID, worker and settings version">
      <p class="copy">Support asks for these when a sync fails</p>
    </Disclosure>
  </Specimen>
</Example>

<Example
  title="Revealing controls"
  note="The controls a disclosure reveals sit straight in it under its words, never in a card"
  layout="stack"
>
  <Specimen label="Open with fields" code={'hint="2 fields" open'}>
    <Disclosure summary="Advanced settings" hint="2 fields" open>
      <div class="fields">
        <Field
          label="Commit author"
          hint="The name on every commit the sync makes"
          value="sync-bot"
        />
        <Field label="Branch prefix" value="sync/" />
      </div>
    </Disclosure>
  </Specimen>
</Example>

<Example
  title="In context"
  note="A disclosure closes its section with the detail few readers need, its content straight inside"
  layout="stack"
  ground="canvas"
>
  <Section title="Invites" description="Invites last 7 days" level={4}>
    <Disclosure summary="Why invites expire" open>
      <p class="copy">A link that never expires could let the wrong person join the workspace</p>
    </Disclosure>
  </Section>
</Example>

<Example
  title="Group"
  note="Disclosures that share a name open one at a time, as the browser keeps the group"
  layout="stack"
>
  <Specimen label="One open at a time" code={'name="sync-help"'}>
    <Disclosure name="sync-help" summary="When the sync runs" open>
      <p class="copy">On every push to the default branch, and once a night</p>
    </Disclosure>
    <Disclosure name="sync-help" summary="What the sync changes">
      <p class="copy">Only the files that the shared settings list</p>
    </Disclosure>
    <Disclosure name="sync-help" summary="How to pause it">
      <p class="copy">Turn off the sync in the repository's settings</p>
    </Disclosure>
  </Specimen>
</Example>

<Example
  title="Right to left"
  note="The chevron, the hint and the content's indent mirror, and the chevron turns down"
  layout="grid"
>
  <Specimen label="Closed" code={'dir="rtl"'}>
    <Disclosure dir="rtl" summary="Skipped repositories" hint="Three archived">
      <p class="copy">Archived repositories are left out of every sync</p>
    </Disclosure>
  </Specimen>
  <Specimen label="Open" code={'dir="rtl" open'}>
    <Disclosure dir="rtl" summary="Skipped repositories" hint="Three archived" open>
      <p class="copy">Archived repositories are left out of every sync</p>
    </Disclosure>
  </Specimen>
</Example>

<style>
  .copy {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    margin: 0;
  }

  .fields {
    display: grid;
    gap: var(--sui-space-4);
  }
</style>
