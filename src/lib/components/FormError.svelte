<script module lang="ts">
  export type FormProblem = {
    /** The `id` of the control to fix, which the link focuses. */
    field: string;
    /** What is wrong with it, in the words its own field error uses. */
    message: string;
  };
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import Link from './Link.svelte';

  let {
    message,
    problems = [],
    attempt = 0,
    onnavigate,
    class: className = '',
    ...rest
  }: {
    /** What the server said, or a summary such as "Fix 2 problems to save". Nothing renders while it is empty. */
    message: string | null | undefined;
    /** One link per field to fix, for a long form; the summary takes focus when it appears. */
    problems?: readonly FormProblem[];
    /** Bump it on every refused send, so the same message is spoken, and focused, again. */
    attempt?: number;
    /** Hears the field a reader goes to from the summary. */
    onnavigate?: (field: string) => void;
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & Omit<HTMLAttributes<HTMLDivElement>, 'children'> = $props();

  /* A summary is where the reader starts fixing, so it takes focus each time it appears;
     reading the list afterwards must never pull focus back. */
  function arrive(node: HTMLElement) {
    if (untrack(() => problems.length > 0)) node.focus();
  }

  function jump(event: MouseEvent, field: string) {
    const target = document.getElementById(field);
    if (!target) return;
    event.preventDefault();
    target.focus();
    onnavigate?.(field);
  }
</script>

<!--
@component
What a form says when the server refused it, or when a send finds fields to fix. The part
that matters is the part easiest to leave off, `role="alert"`: without it the line paints and
nothing announces it, so a reader who cannot see the form is told nothing happened.

A long form passes `problems`, one per field to fix: the error becomes a summary at the top of
the form with a link to each field, and it takes focus when it appears, so the reader starts
there (GOV.UK). Each field still shows its own error. Bump `attempt` on every refused send, so
a repeated refusal is spoken again.

It renders only when there is something to say, so a caller needs no guard. It has no
margins of its own; the form that holds it sets the gap above it.

- Semantics: a `role="alert"` box with the message, and a list of links when it summarises `problems`.
- Content: `message`, one sentence that says what happened, and `problems`, one short message per field in the order the fields stand.
- States: absent while `message` is empty, a one-line refusal, and a summary whose 16px semibold message heads its links; each draws a warning mark beside the message, on a pale wash of the danger tint inside a light edge of the hue.
- Keyboard: a summary takes focus, Tab walks its links, and Enter on a link focuses that field.
- Pointer and touch: each link's target is 24px tall, and 44px on a phone or any touch screen.
- Focus: a summary takes focus when it appears and again on each `attempt`; a link moves focus to its field.
- Responsive: it fills its column and every line wraps.
- Accessibility: the alert announces it when it appears, a warning mark and the words carry the state beside the danger ink, and its text holds 4.5:1.
- Localization: it draws no words of its own; the message and the problems come from the caller, and the layout is logical.
- Performance: nothing while empty, and one alert with one link per problem otherwise; nothing animates.
- Analytics: `onnavigate` hears each field a reader goes to from the summary.
- Failure: a problem whose field is missing falls back to the link's own address, so the press still lands somewhere.
-->

{#key attempt}
  {#if message}
    <div
      {...rest}
      class={['sui-form-error', className, { summary: problems.length > 0 }]}
      role="alert"
      tabindex="-1"
      {@attach arrive}
    >
      <p class="sui-form-error-message">
        <span class="sui-form-error-mark"><Icon name="alert" size="base" /></span>
        <span class="sui-form-error-text">{message}</span>
      </p>
      {#if problems.length > 0}
        <ul class="sui-form-error-list" role="list">
          {#each problems as problem (problem.field)}
            <li>
              <Link
                href="#{problem.field}"
                standalone
                onclick={(event) => jump(event, problem.field)}>{problem.message}</Link
              >
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
{/key}

<style>
  /* A refusal of the whole form is a pale wash of the danger tint inside a light edge of the
     hue, as an error panel is, so it owns the top of the form and its words keep their
     contrast. Its words read at body size beside a 16px mark, so it pads 16px all round. */
  .sui-form-error {
    background: var(--sui-danger-wash);
    border: var(--sui-stroke) solid var(--sui-danger-wash-edge);
    border-radius: var(--sui-radius-control);
    display: grid;
    gap: var(--sui-row-copy-gap);
    min-inline-size: 0;
    padding: var(--sui-space-4);
  }

  /* Focus moves here by script, after a pointer submit too, where :focus-visible would draw no
     ring, so any focus rings it and the reader sees where the keyboard now stands (GOV.UK's
     error summary rings the same way). Only script and a click inside it focus it. */
  .sui-form-error:focus {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }

  /* The mark, the edge and the wash carry the refusal, so its words read in the primary ink, as
     an error panel's title does. */
  .sui-form-error-message {
    align-items: start;
    color: var(--sui-text-primary);
    column-gap: var(--sui-space-2);
    display: grid;
    font: var(--sui-weight-medium) var(--sui-font-size-body) / var(--sui-row-copy-leading)
      var(--sui-sans);
    grid-template-columns: auto minmax(0, 1fr);
    margin: 0;
  }

  /* A summary's message heads its links, so it reads at the 16px semibold a failed line's
     title wears. */
  .summary > .sui-form-error-message {
    font-size: var(--sui-font-size-title);
    font-weight: var(--sui-weight-semibold);
  }

  /* Centred on the first line's cap height, however many lines the message wraps to. */
  .sui-form-error-mark {
    color: var(--sui-danger);
    display: flex;
    margin-block: round(calc((1cap - var(--sui-icon-base)) / 2), 1px);
  }

  .sui-form-error-text {
    align-content: center;
    block-size: var(--sui-block-snap);
    min-inline-size: 0;
    overflow-wrap: anywhere;
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
  }

  /* The links line up with the message's words, past the mark. */
  .sui-form-error-list {
    display: grid;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    gap: var(--sui-space-2);
    list-style: none;
    margin: 0;
    padding: 0;
    padding-inline-start: calc(var(--sui-icon-base) + var(--sui-space-2));
  }

  /* 44px hit areas on lines this close would overlap, so a touch screen spaces them out. */
  @media (pointer: coarse), (max-width: 47.9375rem) {
    .sui-form-error-list {
      gap: var(--sui-space-6);
    }
  }
</style>
