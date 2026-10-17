<script module lang="ts">
  export const section = {
    title: 'Help tip',
    order: 46,
    lead: 'A small mark beside a label that holds one short explanation. Anything longer, or anything the reader must act on, belongs on the page.',
    components: ['HelpTip']
  };
</script>

<script lang="ts">
  import { HelpTip } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
</script>

<Example
  title="Placement"
  note="Hover pauses before the tip shows, focus shows it at once, and a tap or click toggles it"
>
  <Specimen label="Above" code={'side="block-start"'}>
    <span class="label">
      Retention
      <HelpTip label="About retention" text="Runs older than this are deleted every night" />
    </span>
  </Specimen>
  <Specimen label="Below" code={'side="block-end"'}>
    <span class="label">
      Required reviewers
      <HelpTip
        label="About required reviewers"
        text="Approvals needed before a pull request can merge, counted per change"
        side="block-end"
      />
    </span>
  </Specimen>
</Example>

<Example
  title="Open"
  note="A tapped or clicked mark stays pressed on its veil while its tip is open, drawn here in place"
>
  <Specimen label="Open" code="preview">
    <span class="label wrap">
      Retention
      <HelpTip
        preview
        label="About retention"
        text="Runs older than this are deleted every night"
      />
    </span>
  </Specimen>
</Example>

<style>
  .label.wrap {
    align-items: start;
    display: flex;
    flex-wrap: wrap;
    max-inline-size: 100%;
  }

  .label {
    align-items: center;
    color: var(--sui-text-primary);
    display: inline-flex;
    font: var(--sui-weight-semibold) var(--sui-font-size-control) / var(--sui-leading-meta)
      var(--sui-sans);
    gap: var(--sui-space-1);
  }
</style>
