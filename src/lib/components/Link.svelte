<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '../icons/Icon.svelte';
  import type { HTMLAnchorAttributes } from 'svelte/elements';

  let {
    href,
    external,
    rel,
    class: className = '',
    children,
    ...rest
  }: {
    href: string;
    /** Marks a link that leaves the product. Defaults to true for an absolute http(s) address. */
    external?: boolean;
    rel?: HTMLAnchorAttributes['rel'];
    /** Layout for the call site only, never the link's own paint. */
    class?: HTMLAnchorAttributes['class'];
    children: Snippet;
  } & Omit<HTMLAnchorAttributes, 'href' | 'rel' | 'children'> = $props();

  const JOINER = '\u2060';
  const leaves = $derived(external ?? /^https?:\/\//i.test(href));
  const relation = $derived(
    [rel, leaves && !rel?.includes('noreferrer') ? 'noreferrer' : null].filter(Boolean).join(' ') ||
      undefined
  );
</script>

<!--
@component
A link inside a sentence. It borrows the action ink rather than a link colour of its own,
so it never shows the browser's blue or purple, and its underline is faint at rest and full
on hover, so two links close together do not read as ruled lines. Press is a colour step,
because moving a run of text inside a sentence would move the words around it.

A link that leaves the product draws a north-east arrow after its words and is sent with
`rel="noreferrer"`. Whether it opens a new tab is the caller's choice. A control that looks
like a button is `Button` with `href`, and the way back from a page is `BackLink`.
-->

<a {...rest} {href} rel={relation} class={['sui-link', className]}
  >{@render children()}{#if leaves}{JOINER}<span class="sui-link-external"
      ><Icon name="arrow-up-right" size="micro" strokeWidth={2} /></span
    >{/if}</a
>

<style>
  .sui-link {
    color: var(--sui-brand-action-text);
    font-weight: 600;
    inline-size: fit-content;
    overflow-wrap: anywhere;
    text-decoration: underline;
    text-decoration-color: color-mix(in srgb, currentColor 35%, transparent);
    text-decoration-thickness: 1px;
    text-underline-offset: 0.18em;
    transition:
      color var(--sui-duration-fast) var(--sui-ease-standard),
      text-decoration-color var(--sui-duration-fast) var(--sui-ease-standard);
  }

  .sui-link:hover {
    text-decoration-color: currentColor;
  }

  .sui-link:active {
    color: color-mix(in srgb, var(--sui-brand-action-text) 78%, var(--sui-text-primary));
  }

  .sui-link:focus-visible {
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

  @media (prefers-reduced-motion: reduce) {
    .sui-link {
      transition: none;
    }
  }
</style>
