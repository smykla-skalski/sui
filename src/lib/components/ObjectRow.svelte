<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLLiAttributes } from 'svelte/elements';

  let {
    href,
    current = false,
    main,
    side,
    class: className = '',
    ...rest
  }: {
    /** Makes the whole row a link to this address while controls inside it stay pressable. */
    href?: string;
    /** The row whose item is open beside the list, as in a `ListDetail`. Needs `href`. */
    current?: boolean;
    /** The name and what the row says about it. With `href`, it also names the link. */
    main: Snippet;
    /** Standings, values and controls at the row's end; on a phone they drop under `main`. */
    side?: Snippet;
    class?: HTMLLiAttributes['class'];
  } & Omit<HTMLLiAttributes, 'children'> = $props();

  const id = $props.id();
</script>

<!--
@component
One row of an `ObjectList`. It pads 12px and draws a 1px hairline inset by that padding, which
the hovered row hides along with the one above it, so the hover ground never sits on a line.

With `href` the whole row is a link through a layer under the content, so a control inside it,
such as an `IconButton`, a `RelativeTime` or a switch, stays pressable and never navigates. A
row without `href` stays still under the pointer: hover and press only answer on a row that
opens something.

A `current` row is the one whose item is open beside the list. It stands on the plate that
marks where the reader is, at the pressed step, so it never looks hovered, hides its hairline
and the one above as a hovered row does, and keeps the plate under the pointer.

- Semantics: an `li`; with `href`, an `a` under the content, named by the main content through `aria-labelledby`, with `aria-current="page"` on a `current` row.
- Content: `main`, the name and what the row says about it, and an optional `side` of standings, values and controls.
- States: rest; with `href`, hover (the row ground, where the pointer can hover), pressed (a deeper ground and a 1px sink), focus (an inset ring on the row) and current (a plate at the pressed step, a step past hover, which hover leaves alone).
- Keyboard: the row link is one tab stop, then each control inside the row; Enter follows the link.
- Pointer and touch: the whole row is the link's target, at least 44px tall with its padding; controls inside keep their own targets.
- Focus: the ring is drawn inside the row, so a list that clips never cuts it.
- Responsive: on a phone the side drops under the main content and packs to the start; rows grow when their content wraps.
- Accessibility: the link's name is the main content, so a reader hears the row once; the side stays outside the name; a current row is announced as the current page, and its plate is `Highlight` under forced colors.
- Localization: everything it says is the caller's; the side sits at the inline end and follows the reading direction.
- Performance: no script; hover and press change only the ground and a 1px sink.
- Analytics: none of its own; the row link is a plain `a`, so the page's navigation tracking hears it.
- Failure: a row with no `main` content has no name, so always pass one; with nothing to open, leave out `href` and it stays still.
-->

<li
  {...rest}
  class={[
    'sui-object-row',
    className,
    { linked: href !== undefined, current: current && href !== undefined }
  ]}
>
  {#if href !== undefined}
    <a
      class="sui-object-row-hit"
      {href}
      aria-labelledby="{id}-main"
      aria-current={current ? 'page' : undefined}
    ></a>
  {/if}
  <div class="sui-object-row-main" id="{id}-main">{@render main()}</div>
  {#if side}
    <div class="sui-object-row-side">{@render side()}</div>
  {/if}
</li>

<style>
  .sui-object-row {
    align-items: center;
    border-radius: var(--sui-radius-control);
    color: var(--sui-text-primary);
    display: grid;
    gap: var(--sui-space-4);
    grid-template-columns: minmax(0, 1fr) auto;
    margin-inline: calc(-1 * var(--sui-row-pad-default));
    min-inline-size: 0;
    /* The bottom carries the hairline's pixel on top of the padding, so the ink stands
       12px off the line below it as off the line above. */
    padding: var(--sui-row-pad-default) var(--sui-row-pad-default)
      calc(var(--sui-row-pad-default) + var(--sui-row-hairline));
    position: relative;
    transition:
      translate var(--sui-duration-press) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
  }

  .sui-object-row:not(:last-child)::after {
    background: var(--sui-border-divider);
    block-size: var(--sui-row-hairline);
    content: '';
    inset-block-end: 0;
    inset-inline: var(--sui-row-pad-default);
    position: absolute;
  }

  /* The hit comes first, so the content painted after it stacks above it without a
     z-index; the content lets the pointer through and its controls take it back. The hit holds
     no words, and the row's names stay selectable as content. */
  .sui-object-row-hit {
    border-radius: inherit;
    color: inherit;
    inset: 0;
    position: absolute;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    -webkit-user-select: none;
  }

  .sui-object-row-hit:focus-visible {
    outline: none;
  }

  .sui-object-row-main,
  .sui-object-row-side {
    min-inline-size: 0;
    position: relative;
  }

  .linked > .sui-object-row-main,
  .linked > .sui-object-row-side {
    pointer-events: none;
  }

  .linked
    :global(
      :is(a[href], button, input, select, textarea, label, summary, [role='button'], [tabindex])
    ) {
    pointer-events: auto;
  }

  .sui-object-row-main {
    display: grid;
    gap: var(--sui-row-copy-gap);
    grid-template-columns: minmax(0, 1fr);
  }

  .sui-object-row-side {
    align-items: center;
    color: var(--sui-text-muted);
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-3);
    justify-content: flex-end;
  }

  /* The plate that marks where the reader is. A row's words keep their ink when it turns
     current, so the plate stands at the pressed step, as the sidebar's does, a step past the
     hover ground, and a hovered row never looks current (L-85). Like a hover ground it has
     round corners, so neither its own line nor the one above crosses its edge. */
  .current {
    background-color: var(--sui-row-pressed);
  }

  .sui-object-row.current:not(:last-child)::after,
  .sui-object-row:has(+ :global(li > a[aria-current='page']))::after {
    background: transparent;
  }

  @media (hover: hover) {
    .sui-object-row:not(.current):has(> .sui-object-row-hit:hover) {
      background-color: var(--sui-row-hover);
    }

    /* The hover ground has round corners and a line crossing its edge reads as a crack, so
       both of its edges go: this row's line and the one above it. */
    .sui-object-row:has(> .sui-object-row-hit:hover)::after,
    .sui-object-row:has(+ :global(li > a[href]:hover))::after {
      background: transparent;
    }
  }

  .sui-object-row:has(> .sui-object-row-hit:active) {
    background-color: var(--sui-row-pressed);
    box-shadow: var(--sui-pressed-inset);
    translate: 0 1px;
  }

  .sui-object-row:has(> .sui-object-row-hit:focus-visible) {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  @media (max-width: 47.9375rem) {
    .sui-object-row {
      grid-template-columns: minmax(0, 1fr);
    }

    .sui-object-row-side {
      color: var(--sui-text-secondary);
      justify-content: flex-start;
    }
  }

  @media (forced-colors: active) {
    .current {
      background-color: Highlight;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-object-row {
      transition: none;
    }

    .sui-object-row:has(> .sui-object-row-hit:active) {
      translate: none;
    }
  }
</style>
