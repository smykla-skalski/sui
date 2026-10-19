<script lang="ts">
  import { mark, word } from '../words.js';
  import { tick, type Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import { held, holdAround } from '../internal/held.svelte.js';
  import Button from './Button.svelte';

  const FOCUSABLE = 'input, select, textarea, button, [tabindex]:not([tabindex="-1"])';

  let {
    overridden = $bindable(false),
    label,
    id,
    inherited,
    source,
    disabled = false,
    loading = false,
    error = null,
    overrideLabel = word('InheritControl.overrideLabel', 'Override'),
    overrideFor = word(
      'InheritControl.overrideFor',
      (action: string, field: string) => `${action}${mark('space')}${field}`
    ),
    inheritLabel = word('InheritControl.inheritLabel', 'Use inherited value'),
    overrideName,
    inheritName,
    inheritFor = word(
      'InheritControl.inheritFor',
      (action: string, field: string) => `${action} for ${field}`
    ),
    inheritedLabel = word(
      'InheritControl.inheritedLabel',
      (value: string, from: string) => `${value} from ${from}`
    ),
    unknownLabel = word('InheritControl.unknownLabel', (from: string) => `Nothing set in ${from}`),
    loadingLabel = word('InheritControl.loadingLabel', 'Loading the inherited value…'),
    onoverride,
    oninherit,
    control,
    class: className = '',
    ...rest
  }: {
    /** True while this level sets its own value; false follows `source`. */
    overridden?: boolean;
    /** The setting's name, such as "Log level", which each button's accessible name carries. */
    label: string;
    /** Lands on Override while the value is inherited, so a row's `<label for>` points at a control. */
    id?: string;
    /** The value that applies while nothing is set here, said as a reader would say it. Empty when nothing is set there either. */
    inherited: string;
    /** Where the inherited value comes from, such as "the workspace". */
    source: string;
    disabled?: boolean;
    /** The inherited value is on its way. */
    loading?: boolean;
    /** Why the inherited value could not be read. Override still works. */
    error?: string | null;
    overrideLabel?: string;
    inheritLabel?: string;
    /** Override's accessible name, given `label`. It defaults to `overrideLabel` and `label`. */
    overrideName?: (label: string) => string;
    /** Joins the action and the field into the override's accessible name when `overrideName` is not given. */
    overrideFor?: (action: string, field: string) => string;
    /** The way back's accessible name, given `label`. */
    inheritName?: (label: string) => string;
    /** Joins the action and the field into the button's accessible name when `inheritName` is not given. */
    inheritFor?: (action: string, field: string) => string;
    /** The sentence that says the inherited value and its source, in the page's word order. */
    inheritedLabel?: (value: string, source: string) => string;
    /** Said when the source sets nothing either. */
    unknownLabel?: (source: string) => string;
    loadingLabel?: string;
    /** Hears each override. */
    onoverride?: () => void;
    /** Hears each return to the inherited value. */
    oninherit?: () => void;
    /** The control that sets the value here, drawn only while it is overridden. */
    control: Snippet;
    /** Layout for the call site only, never the control's own paint. */
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class' | 'id'> = $props();

  let root = $state<HTMLElement | null>(null);

  // The value sits inside the sentence wherever the language puts it, so it keeps its weight.
  const said = $derived.by(() => {
    if (inherited === '') return { before: unknownLabel(source), value: '', after: '' };
    const sentence = inheritedLabel(inherited, source);
    const at = sentence.indexOf(inherited);
    return at < 0
      ? { before: sentence, value: '', after: '' }
      : {
          before: sentence.slice(0, at),
          value: inherited,
          after: sentence.slice(at + inherited.length)
        };
  });

  async function override(): Promise<void> {
    overridden = true;
    onoverride?.();
    await tick();
    const choice =
      root?.querySelector<HTMLElement>('input:checked') ?? root?.querySelector(FOCUSABLE);
    choice?.focus({ preventScroll: true });
  }

  /* Work that runs on the form around it holds the choice: both buttons refuse the press,
     disabled under a firm hold and tab stops under a soft one. */
  const around = holdAround();
  const holding = $derived(held(root, around));

  async function inherit(): Promise<void> {
    overridden = false;
    oninherit?.();
    await tick();
    root?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
  }
</script>

<!--
@component
A value that comes from somewhere else until this level overrides it, and the way back. While it
inherits, it says the value in muted ink and where it comes from, beside an `add` button named
Override. Overriding draws the caller's `control` in its place and moves focus into it; the way
back, a bordered button, takes it away and returns focus to Override. Its frame keeps it in line
with the control's edge when it wraps under the control on a narrow row. Both moves keep the
page still.

An override is not a change by itself. Mark the row unsaved, with `SettingRow`'s `unsaved`, only
when the setting differs from its saved value, never because it differs from the inherited one.
Seed the control with the inherited value once, when it has no value of its own, and keep its
value when the reader goes back: Override then brings the last override back, which is the undo
for a press of the way back.

- Semantics: a `div` holding the sentence and a native button, or the caller's control and a native button; pass the row's `id` here and to the control, and it lands on Override while inheriting, so pressing the setting's name overrides.
- Content: the inherited value and its source as one sentence, or the caller's control.
- States: inheriting (the value in muted ink beside a link mark), overridden (the control beside a broken link mark), loading, failed (`error` with an alert mark), nothing set at the source, and disabled.
- Keyboard: Tab reaches Override or the control and then the way back; Enter or Space on either button switches.
- Pointer and touch: both buttons are 34px tall, 44px on a phone.
- Focus: overriding moves focus into the control, onto its chosen option first; going back moves it to Override.
- Responsive: the sentence wraps beside its mark, and the button wraps under it when the room is short.
- Accessibility: each button's name carries `label`, so a screen reader hears which setting it acts on; the mark is decorative and the sentence says the state.
- Localization: every word is a prop; the sentence is one function of the value and the source, so a language can place them in its own order, and the value keeps its weight wherever it lands.
- Performance: the control mounts only while overridden.
- Analytics: `onoverride` hears each override and `oninherit` each return to the inherited value.
- Failure: `loading` says `loadingLabel`, `error` says why the inherited value is unknown while Override still works, and an empty `inherited` says `unknownLabel`.
-->

<div bind:this={root} {...rest} class={['sui-inherit', className, { overridden }]}>
  <span class="sui-inherit-subject">
    <span class="sui-inherit-marker" aria-hidden="true">
      <Icon name={overridden ? 'link-off' : 'link'} size="sm" />
    </span>
    {#if overridden}
      <span class="sui-inherit-control">{@render control()}</span>
    {:else if loading}
      <span class="sui-inherit-value">{loadingLabel}</span>
    {:else if error}
      <span class="sui-inherit-problem">
        <Icon name="alert" size="sm" /><span class="sui-inherit-value">{error}</span>
      </span>
    {:else}
      <span class="sui-inherit-value"
        >{said.before}<span class="sui-inherit-word">{said.value}</span>{said.after}</span
      >
    {/if}
  </span>
  {#if overridden}
    <Button
      disabled={disabled || holding === 'firm'}
      aria-disabled={Boolean(holding) || undefined}
      aria-label={inheritName?.(label) ?? inheritFor(inheritLabel, label)}
      onclick={inherit}>{inheritLabel}</Button
    >
  {:else}
    <Button
      tone="add"
      {id}
      disabled={disabled || holding === 'firm'}
      aria-disabled={Boolean(holding) || undefined}
      aria-label={overrideName?.(label) ?? overrideFor(overrideLabel, label)}
      onclick={override}
    >
      {#snippet icon()}<Icon name="plus" size="sm" />{/snippet}
      {overrideLabel}
    </Button>
  {/if}
</div>

<style>
  .sui-inherit {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2) var(--sui-space-3);
    inline-size: fit-content;
    max-inline-size: 100%;
    min-inline-size: 0;
  }

  /* Words: the mark centres on the first line's cap height, however many lines they wrap to. */
  .sui-inherit-subject {
    align-items: start;
    display: flex;
    gap: var(--sui-inherit-marker-gap);
    min-inline-size: 0;
  }

  .sui-inherit-marker {
    block-size: var(--sui-inherit-marker-size);
    color: var(--sui-text-muted);
    display: grid;
    flex: none;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    inline-size: var(--sui-inherit-marker-size);
    margin-block: calc((round(up, 1cap, 2px) - var(--sui-inherit-marker-size)) / 2);
    place-items: center;
  }

  /* A control: the mark and the button stand on the control's own row, a control tall, so a
     caption over the control never pulls them off its centre. */
  .overridden,
  .overridden .sui-inherit-subject {
    align-items: end;
  }

  .overridden .sui-inherit-marker {
    block-size: var(--sui-local-control-height, var(--sui-control-height-compact));
    margin-block: 0;
  }

  .sui-inherit-control {
    display: flex;
    min-inline-size: 0;
  }

  .sui-inherit-value {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-inherit-word {
    font-weight: var(--sui-weight-semibold);
  }

  /* In the words' font, so its alert mark centres on their first line as the link mark does. */
  .sui-inherit-problem {
    align-items: start;
    color: var(--sui-danger);
    display: flex;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    gap: var(--sui-space-1);
    min-inline-size: 0;
  }

  .sui-inherit-problem > :global(svg) {
    flex: none;
    margin-block: calc((round(up, 1cap, 2px) - var(--sui-icon-sm)) / 2);
  }

  .sui-inherit-problem .sui-inherit-value {
    color: inherit;
  }
</style>
