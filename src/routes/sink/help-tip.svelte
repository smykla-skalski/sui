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
  --example-max="26rem"
  title="Placement"
  note="A tip opens over its mark or under it, drawn here in place, with the mark open on its veil"
>
  <Specimen label="Above">
    <span class="label wrap over">
      <span class="words">Retention</span>
      <HelpTip preview label="About retention" text="Older runs are deleted every night" />
    </span>
  </Specimen>
  <Specimen label="Below">
    <span class="label wrap">
      <span class="words">Reviewers</span>
      <HelpTip preview label="About reviewers" text="Approvals needed to merge" side="block-end" />
    </span>
  </Specimen>
</Example>

<Example
  --example-max="26rem"
  title="Live"
  note="Hover pauses before the tip shows, focus shows it at once, and a tap or click toggles it"
>
  <Specimen label="Hover, focus or tap">
    <span class="label live">
      <span class="words">Retention</span>
      <HelpTip label="About retention" text="Older runs are deleted every night" />
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
    /* The mark's focus ring stands a step clear of the words, never against their last letter. */
    gap: calc(var(--sui-focus-ring-offset) + var(--sui-focus-ring-width) + var(--sui-space-1));
  }

  /* The live tip opens over its mark, so the label keeps room for a one-line tip, its gap and
     its arrow under its name, and the tip opens clear of the name. */
  .live {
    margin-block-start: calc(var(--sui-space-8) + var(--sui-space-2));
  }

  /* The words run cap to baseline, so the mark centres on them (L-94). */
  .words {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    padding-block: var(--sui-block-snap-room-even);
    text-box: trim-both cap alphabetic;
  }

  /* An open tip hangs under its mark, so the row keeps to the top and the words drop to the
     mark's middle. One over its mark keeps the row to the foot and lifts the words instead. */
  .wrap > .words {
    margin-block-start: calc((var(--sui-control-height-chip) - round(up, 1cap, 2px)) / 2);
  }

  .label.over {
    align-items: end;
  }

  .over > .words {
    margin-block: 0 calc((var(--sui-control-height-chip) - round(up, 1cap, 2px)) / 2);
  }
</style>
