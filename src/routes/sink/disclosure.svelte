<script module lang="ts">
  export const section = {
    title: 'Disclosure',
    lead: 'An optional explanation or setting that opens in place, its content hanging under the summary’s words. Content most readers need stays on the page.',
    components: ['Disclosure']
  };
</script>

<script lang="ts">
  import { Disclosure, Field, Section } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
</script>

<Example
  title="Variants"
  note="The chevron leads the summary’s words at the start edge, and a hint says what is inside"
  layout="grid"
  --specimen-column-gap="var(--sui-space-8)"
>
  <Specimen label="Default">
    <Disclosure summary="Why This Check Is Required">
      <p class="copy">The default branch deploys on every merge, so it is never left untested</p>
    </Disclosure>
  </Specimen>
  <Specimen label="With a hint">
    <Disclosure summary="Skipped Repositories" hint="3 archived">
      <p class="copy">Archived repositories are left out of every sync</p>
    </Disclosure>
  </Specimen>
  <Specimen label="Inline help">
    <Disclosure inline summary="How the Schedule Is Read">
      <p class="copy">Times are in the workspace’s time zone and repeat every week</p>
    </Disclosure>
  </Specimen>
</Example>

<Example
  title="States"
  note="Open, the chevron turns down and the content hangs under the summary’s words"
  layout="grid"
  --specimen-column-gap="var(--sui-space-8)"
>
  <Specimen label="Starts closed">
    <Disclosure summary="What Happens to Archived Repositories">
      <p class="copy">They are skipped until someone unarchives them</p>
    </Disclosure>
  </Specimen>
  <Specimen label="Starts open">
    <Disclosure summary="What Happens to Open Pull Requests" open>
      <p class="copy">They keep the rules they were opened with until they are updated</p>
    </Disclosure>
  </Specimen>
  <Specimen label="Inline help, open">
    <Disclosure inline summary="How the Schedule Is Read" open>
      <p class="copy">Times are in the workspace’s time zone and repeat every week</p>
    </Disclosure>
  </Specimen>
</Example>

<Example
  title="Long Text"
  note="When the words and the hint do not fit one line, the hint drops under the words and the chevron stays on the first line"
  layout="grid"
  --specimen-column-gap="var(--sui-space-8)"
>
  <Specimen label="Long summary">
    <Disclosure
      summary="Why Pull Requests Opened Before the Rules Changed Keep the Checks They Started With"
    >
      <p class="copy">A rule change applies to pull requests opened after it</p>
    </Disclosure>
  </Specimen>
  <Specimen label="Long summary, open with a hint">
    <Disclosure
      summary="Rules That a Parent Workspace Sets & This Repository Cannot Change"
      hint="2 rules"
      open
    >
      <p class="copy">Ask an owner of the parent workspace to change them</p>
    </Disclosure>
  </Specimen>
  <Specimen label="Long hint">
    <Disclosure summary="More About This Sync" hint="ID, worker and settings version">
      <p class="copy">Support asks for these when a sync fails</p>
    </Disclosure>
  </Specimen>
</Example>

<Example
  title="Revealing Controls"
  note="The controls a disclosure reveals sit straight in it under its words, never in a card"
  layout="stack"
>
  <Specimen label="Open with fields">
    <div class="measured">
      <Disclosure summary="Advanced Settings" hint="2 fields" open>
        <div class="fields">
          <Field
            label="Commit author"
            hint="The name on every commit the sync makes"
            value="sync-bot"
          />
          <Field label="Branch prefix" value="sync/" />
        </div>
      </Disclosure>
    </div>
  </Specimen>
</Example>

<Example
  title="In Context"
  note="A disclosure closes its section with the detail few readers need, its content straight inside"
  layout="stack"
  ground="canvas"
>
  <Section title="Invites" description="Invites last 7&nbsp;days" level={4}>
    <Disclosure summary="Why Invites Expire" open>
      <p class="copy">A link that never expires could let the wrong person join the workspace</p>
    </Disclosure>
  </Section>
</Example>

<Example
  title="Group"
  note="Disclosures that share a name open one at a time, as the browser keeps the group, and a divider parts their rows"
  layout="stack"
>
  <Specimen label="One open at a time">
    <div class="group">
      <div>
        <Disclosure name="sync-help" summary="When the Sync Runs" open>
          <p class="copy">On every push to the default branch, and once a night</p>
        </Disclosure>
      </div>
      <div>
        <Disclosure name="sync-help" summary="What the Sync Changes">
          <p class="copy">Only the files that the shared settings list</p>
        </Disclosure>
      </div>
      <div>
        <Disclosure name="sync-help" summary="How to Pause It">
          <p class="copy">Turn off the sync in the repository’s settings</p>
        </Disclosure>
      </div>
    </div>
  </Specimen>
</Example>

<Example
  title="Right to Left"
  note="The chevron, the hint and the content’s indent mirror, and the chevron turns down"
  layout="grid"
  --specimen-column-gap="var(--sui-space-8)"
>
  <Specimen label="Closed">
    <Disclosure dir="rtl" summary="Skipped Repositories" hint="3 archived">
      <p class="copy">Archived repositories are left out of every sync</p>
    </Disclosure>
  </Specimen>
  <Specimen label="Open">
    <Disclosure dir="rtl" summary="Skipped Repositories" hint="3 archived" open>
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

  /* A divider parts the rows of a group, so it scans as one list of questions, and each row
     stands half a step off it, so a lit summary never meets the line and the rows still read
     as one list. */
  .group > div {
    padding-block: calc(var(--sui-space-1) / 2);
  }

  /* A group keeps the measure of the revealed fields, so its dividers end with the rows
     beside it and never run empty under short summaries. */
  .group {
    max-inline-size: 37.5rem;
  }

  .group > div + div {
    border-block-start: var(--sui-stroke) solid var(--sui-border-divider);
  }

  /* The hint counts the fields, so the row ends where they do. */
  .measured {
    max-inline-size: 37.5rem;
  }

  .fields {
    display: grid;
    gap: var(--sui-space-5);
    max-inline-size: 36rem;
  }
</style>
