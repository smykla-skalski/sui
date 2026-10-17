<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAnchorAttributes } from 'svelte/elements';

  let {
    href,
    class: className = '',
    children,
    ...rest
  }: {
    /** The fragment of the region the link jumps to, such as `#content`. */
    href: `#${string}`;
    /** Layout for the call site only, never the link's own paint. */
    class?: HTMLAnchorAttributes['class'];
    /** The label. Without one it says "Skip to content". */
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
-->

<a {...rest} {href} class={['sui-skip-link', className]}
  >{#if children}{@render children()}{:else}Skip to content{/if}</a
>

<style>
  .sui-skip-link {
    background: var(--sui-surface-base);
    border: 1px solid var(--sui-focus);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    font: 600 var(--sui-font-size-control) / var(--sui-leading-compact) var(--sui-sans);
    inset-block-start: var(--sui-space-3);
    inset-inline-start: var(--sui-space-4);
    max-inline-size: calc(100vw - 2 * var(--sui-space-4));
    padding: var(--sui-space-2) var(--sui-space-3);
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
