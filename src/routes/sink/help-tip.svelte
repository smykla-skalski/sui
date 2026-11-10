<script module lang="ts">
  export const section = {
    title: 'Help Tip',
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
  --example-max="40rem"
  title="Placement"
  note="Hover pauses before the tip shows, focus shows it at once, and a tap or click toggles it"
>
  <Specimen label="Above">
    <span class="label">
      <span class="words">Retention</span>
      <HelpTip label="About retention" text="Runs older than this are deleted every night" />
    </span>
  </Specimen>
  <Specimen label="Below">
    <span class="label">
      <span class="words">Required reviewers</span>
      <HelpTip
        label="About required reviewers"
        text="Approvals needed before a pull request can merge, counted per change"
        side="block-end"
      />
    </span>
  </Specimen>
</Example>

<Example
  --example-max="40rem"
  title="Open"
  note="A tapped or clicked mark stays pressed on its veil while its tip is open, drawn here in place"
>
  <Specimen label="Open">
    <span class="label wrap">
      <span class="words">Retention</span>
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

  /* The mark keeps to its label while 12rem of tip fits beside the words, as on a phone, and
     drops under them only with large text, so the tip never leaves its specimen. */
  .wrap > :global(:last-child) {
    flex: 1 1 12rem;
    min-inline-size: 0;
  }

  .label {
    align-items: center;
    color: var(--sui-text-primary);
    display: inline-flex;
    font: var(--sui-weight-semibold) var(--sui-font-size-control) / var(--sui-leading-meta)
      var(--sui-sans);
    /* The mark's focus ring stands clear of the words instead of touching their last letter. */
    gap: calc(var(--sui-focus-ring-offset) + var(--sui-focus-ring-width) + var(--sui-space-1) / 2);
  }

  /* A live tip opens over its mark, so both placed labels keep a tip's height under their
     names and sit on one line, and the tip opens in empty card space, clear of the name. */
  .label:not(.wrap) {
    margin-block-start: var(--sui-space-8);
  }

  /* The words run cap to baseline, so the mark centres on them (L-94). */
  .words {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    padding-block: var(--sui-block-snap-room-even);
    text-box: trim-both cap alphabetic;
  }

  /* The open tip hangs under its mark, so the row keeps to the top and the words drop to the
     mark's middle instead. */
  .wrap > .words {
    margin-block-start: calc((var(--sui-control-height-chip) - round(up, 1cap, 2px)) / 2);
  }
</style>
