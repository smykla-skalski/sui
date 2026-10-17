<script lang="ts">
  import { word } from '../words.js';
  import type { Snippet } from 'svelte';
  import Icon from '../icons/Icon.svelte';
  import type { HTMLAnchorAttributes } from 'svelte/elements';
  import VisuallyHidden from './VisuallyHidden.svelte';

  let {
    href,
    external,
    rel,
    standalone = false,
    externalLabel = word('Link.externalLabel', '(opens another site)'),
    class: className = '',
    children,
    ...rest
  }: {
    href: string;
    /** Marks a link that leaves the product. Defaults to true for an absolute http(s) address. */
    external?: boolean;
    rel?: HTMLAnchorAttributes['rel'];
    /**
     * For a link that stands outside a sentence, such as one in a row of links: its hit area
     * grows to 24px, and to 44px on a phone or any touch screen, past its words.
     */
    standalone?: boolean;
    /** What a screen reader hears after the words of a link that leaves the product. */
    externalLabel?: string;
    /** Layout for the call site only, never the link's own paint. */
    class?: HTMLAnchorAttributes['class'];
    children: Snippet;
  } & Omit<HTMLAnchorAttributes, 'href' | 'rel' | 'children'> = $props();

  const JOINER = '⁠';
  const leaves = $derived(external ?? /^https?:\/\//i.test(href));
  const relation = $derived(
    [rel, leaves && !rel?.includes('noreferrer') ? 'noreferrer' : null].filter(Boolean).join(' ') ||
      undefined
  );
</script>

<!--
@component
A link inside a sentence. It borrows the action ink rather than a link color of its own,
so it never shows the browser's blue or purple. Its full underline at rest tells it from the
words around it without color (WCAG 1.4.1), and hover thickens it. Press is a color step,
because moving a run of text inside a sentence would move the words around it.

A link that leaves the product draws a north-east arrow after its words, says "(opens another
site)" to a screen reader, and is sent with `rel="noreferrer"`. Whether it opens a new tab is
the caller's choice. A link outside a sentence, such as a row of source links, takes
`standalone`, which grows its hit area to a target's size. A control that looks like a button
is `Button` with `href`, and the way back from a page is `BackLink`.

- Semantics: a native `<a href>` named by its words, with the external note read after them.
- Content: a few words that say where it goes, never "click here"; an external one adds a 10px arrow kept on the line of its last word.
- States: rest (action ink at 600 with a full underline), hover (a 2px underline), focus (a 2px ring 2px off), pressed (a deeper ink) and visited, which looks like rest.
- Keyboard: Tab reaches it and Enter follows it.
- Pointer and touch: inside a sentence its target is the words' line, as WCAG 2.5.8 allows; `standalone` grows the hit area to 24px, and 44px on a phone or any touch screen.
- Focus: following it moves focus as the browser's navigation does; nothing here moves it.
- Responsive: it breaks with its sentence anywhere, and the arrow never falls onto a line of its own.
- Accessibility: its words are the name, an external one says "(opens another site)", and its ink holds 4.5:1 on every ground.
- Localization: `externalLabel` is a prop with an English default, and the arrow mirrors in a right-to-left page.
- Performance: one anchor, and only colour and the underline change.
- Analytics: the anchor's own `onclick` reports a follow; it adds nothing of its own.
- Failure: a missing `href` is a type error, and an address the product cannot reach is the caller's to mark `external`.
-->

<a {...rest} {href} rel={relation} class={['sui-link', className, { standalone }]}
  >{@render children()}{#if leaves}{JOINER}<span class="sui-link-external"
      ><Icon name="arrow-up-right" size="micro" strokeWidth={2} /><VisuallyHidden
        >{` ${externalLabel}`}</VisuallyHidden
      ></span
    >{/if}</a
>

<style>
  .sui-link {
    color: var(--sui-link);
    font-weight: var(--sui-weight-semibold);
    inline-size: fit-content;
    overflow-wrap: anywhere;
    text-decoration: underline;
    text-decoration-color: currentColor;
    text-decoration-thickness: var(--sui-stroke);
    text-underline-offset: 0.18em;
    transition:
      color var(--sui-duration-fast) var(--sui-ease-standard),
      text-decoration-thickness var(--sui-duration-fast) var(--sui-ease-standard);
  }

  @media (hover: hover) {
    .sui-link:hover {
      text-decoration-thickness: var(--sui-stroke-bold);
    }
  }

  .sui-link:active {
    color: color-mix(in srgb, var(--sui-link) 78%, var(--sui-text-primary));
  }

  .sui-link:focus-visible {
    border-radius: var(--sui-radius-chip);
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }

  /* An atomic box, so the link's underline does not run under the arrow. The word joiner
     before it keeps it on the line of the last word. */
  .sui-link-external {
    display: inline-block;
    margin-inline-start: var(--sui-space-1);
    text-decoration: none;
  }

  /* The hit area grows only along a side shorter than the target, so a wide link keeps its
     own width and neighbours on one line never overlap. */
  .standalone {
    position: relative;
  }

  .standalone::after {
    content: '';
    inset-block: min(0%, round(down, calc((100% - var(--sui-control-height-chip)) / 2), 1px));
    inset-inline: min(0%, round(down, calc((100% - var(--sui-control-height-chip)) / 2), 1px));
    position: absolute;
  }

  @media (pointer: coarse), (max-width: 47.9375rem) {
    .standalone::after {
      inset-block: min(0%, round(down, calc((100% - var(--sui-touch-target)) / 2), 1px));
      inset-inline: min(0%, round(down, calc((100% - var(--sui-touch-target)) / 2), 1px));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-link {
      transition: none;
    }
  }
</style>
