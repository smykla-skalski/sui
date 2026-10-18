<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    title,
    level = 2,
    status,
    class: className = '',
    children,
    ...rest
  }: {
    title: string;
    /** The title's heading level, so the plate fits the outline of the page it is on. */
    level?: 2 | 3 | 4 | 5 | 6;
    /** The plate's current state, said at the end of the title line and announced when it changes. */
    status?: Snippet;
    /** Layout for the call site only, never the plate's own paint. */
    class?: HTMLAttributes<HTMLElement>['class'];
    children?: Snippet;
  } & HTMLAttributes<HTMLElement> = $props();
</script>

<!--
@component
A titled ground for one subject, with its state said on the same line as its name. The
head is always drawn and the body is optional: a plate with nothing in it is a subject with
nothing to report yet, which is a state worth showing rather than a hole to hide.

A plate is a place, not a message. Something the reader must act on now is a `Callout`
inside it. It carries the one-pixel plate lift, which a `Card` does not, and like a card it
takes its outer spacing from its container. The head and the body keep one 16px inset on every
side, and a state that does not fit beside a long title stands 8px of ink under it. The state
sits in a polite status region, so a change of state is announced without moving focus; pass
`status` from the first render, because a region that arrives with its words is often not read.

- Semantics: a `section` titled by a heading at `level`, with the state in a `role="status"` region.
- Content: a title that wraps, a `status` with words and an optional glyph, and an optional body.
- States: head only, a step smaller and with no rule, or head and body; the state's own words say what it is.
- Keyboard: none of its own; Tab reaches the controls inside in reading order.
- Pointer and touch: none of its own; the controls inside keep their own targets.
- Focus: nothing here moves focus, and an announced change of state leaves focus where it is.
- Responsive: the state follows the title on its line, and moves under a title that leaves it no room.
- Accessibility: a change of `status` is announced politely, and the title and state hold 4.5:1.
- Localization: it draws no words of its own; the state sits at the inline end, which mirrors in a right-to-left page.
- Performance: static layout with no script.
- Analytics: none of its own, because it holds no control.
- Failure: without a body the plate still names its subject and state, which is how it shows nothing to report.
-->

<section {...rest} class={['sui-plate', className, { 'head-only': !children }]}>
  <header class="sui-plate-head">
    <svelte:element this={`h${level}`} class="sui-plate-title">{title}</svelte:element>
    {#if status}
      <div class="sui-plate-status" role="status">{@render status()}</div>
    {/if}
  </header>
  {#if children}
    <div class="sui-plate-body">{@render children()}</div>
  {/if}
</section>

<style>
  .sui-plate {
    background: var(--sui-surface-base);
    border: var(--sui-stroke) solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-surface);
    box-shadow: var(--sui-shadow-plate);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    margin: 0;
    min-inline-size: 0;
  }

  /* One inset on every side of the head, the body's own, however the title wraps: the state
     follows the title on its line, or the next line 8px of ink under it. */
  .sui-plate-head {
    align-items: center;
    border-block-end: var(--sui-stroke) solid var(--sui-border-divider);
    box-sizing: border-box;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-row-copy-gap) var(--sui-space-3);
    justify-content: space-between;
    padding: var(--sui-space-4);
  }

  .head-only .sui-plate-head {
    border-block-end: 0;
  }

  .sui-plate-title {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: var(--sui-weight-semibold) var(--sui-font-size-card-title) / var(--sui-leading-title)
      var(--sui-sans);
    margin: 0;
    min-inline-size: 0;
    overflow-wrap: break-word;
    text-box: trim-both cap alphabetic;
    text-wrap: balance;
  }

  /* With nothing under it the title is a label, a step below a card title. */
  .head-only .sui-plate-title {
    font: var(--sui-weight-semibold) var(--sui-font-size-body) / var(--sui-leading-body)
      var(--sui-sans);
  }

  /* One title cap tall, in the title's own face so `1cap` is the title's, as Card's actions:
     a status mark overflows it evenly and centres on the title without raising the head. A
     state that wraps grows the box by every line past a chip's height, so its words never
     reach into the body. */
  .sui-plate-status {
    align-items: center;
    block-size: round(1cap, 1px);
    block-size: calc-size(
      auto,
      max(round(1cap, 1px), size - var(--sui-control-height-chip) + round(1cap, 1px))
    );
    display: flex;
    flex-wrap: wrap;
    font: var(--sui-weight-semibold) var(--sui-font-size-card-title) / var(--sui-leading-title)
      var(--sui-sans);
    gap: var(--sui-space-2);
  }

  .head-only .sui-plate-status {
    font: var(--sui-weight-semibold) var(--sui-font-size-body) / var(--sui-leading-body)
      var(--sui-sans);
  }

  .sui-plate-body {
    min-inline-size: 0;
    padding: var(--sui-space-4);
  }
</style>
