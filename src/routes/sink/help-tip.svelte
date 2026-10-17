<script module lang="ts">
  export const section = { title: 'Help tip', order: 46 };
</script>

<script lang="ts">
  import { HelpTip } from '#lib';
  import Example from '../kit/Example.svelte';
</script>

<Example
  title="Beside a label"
  note="Hover pauses before the tip shows, focus shows it at once, and a tap or click toggles it"
>
  <span class="label">
    Retention
    <HelpTip label="About retention" text="Runs older than this are deleted every night" />
  </span>
  <span class="label">
    Required reviewers
    <HelpTip
      label="About required reviewers"
      text="Approvals needed before a pull request can merge, counted per change"
      side="block-end"
    />
  </span>
  <span class="label">
    Signal button
    <HelpTip
      label="About signal buttons"
      text="The one action a view exists for, so a view has exactly one of them"
    />
  </span>
</Example>

<style>
  .label {
    align-items: center;
    color: var(--sui-text-primary);
    display: inline-flex;
    font: 600 var(--sui-font-size-control) / var(--sui-leading-meta) var(--sui-sans);
    gap: var(--sui-space-1);
  }
</style>
