<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLLiAttributes } from 'svelte/elements';

  let {
    href,
    main,
    side,
    class: className = '',
    ...rest
  }: {
    /** Makes the whole row a link to this address while controls inside it stay pressable. */
    href?: string;
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
One row of an `ObjectList`. It pads 12px and draws a 1px hairline inset by that padding,
which the hovered row hides along with the one above it, so the hover ground never sits on
a line. On a phone the side drops under the main content and packs to the start.

With `href` the whole row is a link through a layer under the content, so a control inside
it, such as an `IconButton`, a `RelativeTime` or a switch, stays pressable and never
navigates. The link is named by the main content. A row without `href` stays still under
the pointer: hover and press only answer on a row that opens something.
-->

<li {...rest} class={['sui-object-row', className, { linked: href !== undefined }]}>
  {#if href !== undefined}
    <a class="sui-object-row-hit" {href} aria-labelledby="{id}-main"></a>
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
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      translate var(--sui-duration-press) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
  }

  .sui-object-row:not(:last-child)::after {
    background: var(--sui-border-subtle);
    block-size: var(--sui-row-hairline);
    content: '';
    inset-block-end: 0;
    inset-inline: var(--sui-row-pad-default);
    position: absolute;
  }

  /* The hit comes first, so the content painted after it stacks above it without a
     z-index; the content lets the pointer through and its controls take it back. */
  .sui-object-row-hit {
    border-radius: inherit;
    color: inherit;
    inset: 0;
    position: absolute;
    -webkit-tap-highlight-color: transparent;
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

  .sui-object-row:has(> .sui-object-row-hit:hover) {
    background-color: var(--sui-row-hover);
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

  /* The hover ground has round corners and a line crossing its edge reads as a crack, so
     both of its edges go: this row's line and the one above it. */
  .sui-object-row:has(> .sui-object-row-hit:hover)::after,
  .sui-object-row:has(+ :global(li > a[href]:hover))::after {
    background: transparent;
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

  @media (prefers-reduced-motion: reduce) {
    .sui-object-row {
      transition: none;
    }

    .sui-object-row:has(> .sui-object-row-hit:active) {
      translate: none;
    }
  }
</style>
