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
- States: absent while `message` is empty, a one-line refusal, and a summary with links; each draws a warning mark beside the message.
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
      class={['sui-form-error', className]}
      role="alert"
      tabindex="-1"
      {@attach arrive}
    >
      <p class="sui-form-error-message">
        <span class="sui-form-error-mark"><Icon name="alert" size="xs" /></span>
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
  .sui-form-error {
    border-radius: var(--sui-radius-control);
    display: grid;
    gap: var(--sui-row-copy-gap);
    min-inline-size: 0;
  }

  .sui-form-error:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }

  .sui-form-error-message {
    align-items: start;
    color: var(--sui-danger);
    column-gap: var(--sui-space-1);
    display: grid;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    grid-template-columns: auto minmax(0, 1fr);
    margin: 0;
  }

  /* Centred on the first line's cap height, however many lines the message wraps to. */
  .sui-form-error-mark {
    display: flex;
    margin-block: round(calc((1cap - var(--sui-icon-xs)) / 2), 1px);
  }

  .sui-form-error-text {
    block-size: var(--sui-block-snap);
    min-inline-size: 0;
    overflow-wrap: anywhere;
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
    padding-inline-start: calc(var(--sui-icon-xs) + var(--sui-space-1));
  }

  /* 44px hit areas on lines this close would overlap, so a touch screen spaces them out. */
  @media (pointer: coarse), (max-width: 47.9375rem) {
    .sui-form-error-list {
      gap: var(--sui-space-6);
    }
  }
</style>
