<script lang="ts">
  import { word } from '../words.js';
  import type { Snippet } from 'svelte';
  import type { HTMLAnchorAttributes } from 'svelte/elements';

  let {
    href,
    label = word('SkipLink.label', 'Skip to content'),
    class: className = '',
    children,
    ...rest
  }: {
    /** The fragment of the region the link jumps to, such as `#content`. */
    href: `#${string}`;
    /** The words, when no richer `children` are given. */
    label?: string;
    /** Layout for the call site only, never the link's own paint. */
    class?: HTMLAnchorAttributes['class'];
    /** Richer words than `label` can carry. */
    children?: Snippet;
  } & Omit<HTMLAnchorAttributes, 'href' | 'children'> = $props();
</script>

<!--
@component
The first stop for a keyboard reader: a link past the chrome to the page's main region. Put
it first in the body, before the navigation it skips. It waits above the top of the window
and slides into the corner while it has focus, on the skip layer over everything else, with
a 1px focus border and the focus ring.

Give the target `tabindex="-1"` so focus lands in it and the next Tab continues from there.
A link that is always visible is `Link`, and words that are never shown are `VisuallyHidden`.

- Semantics: a native `<a href="#…">` named by its words.
- Content: `label` or `children`, a short phrase that names where it jumps, such as "Skip to content".
- States: waiting above the window, shown in the corner while it has focus with a 1px focus border and the 2px ring, and pressed, which follows it.
- Keyboard: the first Tab of the page reaches it, Enter jumps, and the next Tab leaves it hidden again.
- Pointer and touch: a pointer rarely meets it; once shown it is a 34px box with a 44px hit area on a phone or any touch screen.
- Focus: Enter moves focus into the target, which needs `tabindex="-1"` to take it.
- Responsive: it stays inside the window's width less its 16px insets and wraps there.
- Accessibility: its words are the name, and its ink holds 4.5:1 on its own ground over any content.
- Localization: `label` is a prop with an English default, and it sits at the start corner of a right-to-left page.
- Performance: one anchor that moves by `translate` alone, with no movement under reduced motion.
- Analytics: the anchor's own `onclick` reports a jump; it adds nothing of its own.
- Failure: a target missing from the page leaves focus on the link, so nothing falls to the body.
-->

<a {...rest} {href} class={['sui-skip-link', className]}
  >{#if children}{@render children()}{:else}{label}{/if}</a
>

<style>
  .sui-skip-link {
    background: var(--sui-surface-base);
    border: var(--sui-stroke) solid var(--sui-focus);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    font: var(--sui-weight-semibold) var(--sui-font-size-control) / var(--sui-leading-compact)
      var(--sui-sans);
    inset-block-start: var(--sui-space-3);
    inset-inline-start: var(--sui-space-4);
    max-inline-size: calc(100vw - 2 * var(--sui-space-4));
    padding: var(--sui-space-2) var(--sui-space-3);
    /* The words run from their cap line to their baseline, so the padding is the room above
       and under them alike (L-102). */
    text-box: trim-both cap alphabetic;
    block-size: var(--sui-block-snap);
    position: fixed;
    text-decoration: none;
    transition: translate var(--sui-duration-fast) var(--sui-ease-out);
    translate: 0 calc(-100% - var(--sui-space-6));
    z-index: var(--sui-layer-skip);
  }

  .sui-skip-link:focus {
    translate: 0 0;
  }

  .sui-skip-link:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-flush);
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-skip-link {
      transition: none;
    }
  }

  /* A finger needs a 44px target, so the hit area grows past the drawn box (L-38). */
  @media (pointer: coarse), (max-width: 47.9375rem) {
    .sui-skip-link::after {
      content: '';
      inset: calc((100% - var(--sui-touch-target)) / 2);
      position: absolute;
    }
  }
</style>
