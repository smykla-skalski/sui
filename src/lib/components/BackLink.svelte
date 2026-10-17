<script lang="ts">
  import type { HTMLAnchorAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';

  let {
    href,
    label,
    tone = 'label',
    class: className = '',
    ...rest
  }: {
    href: string;
    label: string;
    /**
     * `label` is capitals, tracked out, in the action ink. `quiet` is sentence case in the
     * secondary ink, for a page whose tabs already carry the emphasis.
     */
    tone?: 'label' | 'quiet';
    /** Layout for the call site only, never the link's own paint. */
    class?: HTMLAnchorAttributes['class'];
  } & Omit<HTMLAnchorAttributes, 'href' | 'children'> = $props();
</script>

<!--
@component
The way back from a page that stands inside a list. It is a link, never a button: it carries
a real address, so a modified click opens it in a new tab and it reads as somewhere to go.
Use `Breadcrumb` when the page sits in a hierarchy deeper than one list.

Its 24px hit area bleeds into the space around it, so it takes one cap line of layout and
fits the eyebrow's place in a `PageHeader`.
-->

<a {...rest} {href} class={['sui-back-link', className]} data-tone={tone}>
  <Icon name="chevron-left" size={tone === 'quiet' ? 'xs' : 'sm'} />
  <span class="sui-back-link-label">{label}</span>
</a>

<style>
  .sui-back-link {
    align-items: center;
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-brand-action-text);
    display: inline-flex;
    font: 700 var(--sui-font-size-micro) / var(--sui-leading-flat) var(--sui-sans);
    gap: var(--sui-space-1);
    inline-size: fit-content;
    letter-spacing: 0.08em;
    margin-block: calc((1cap - var(--sui-control-height-chip)) / 2);
    min-block-size: var(--sui-control-height-chip);
    text-decoration: none;
    text-transform: uppercase;
    transition:
      color var(--sui-duration-fast) var(--sui-ease-standard),
      translate var(--sui-duration-press) var(--sui-ease-standard);
  }

  .sui-back-link[data-tone='quiet'] {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-flat) var(--sui-sans);
    gap: var(--sui-space-1);
    letter-spacing: normal;
    text-transform: none;
  }

  .sui-back-link:hover {
    color: var(--sui-text-primary);
  }

  .sui-back-link:active {
    translate: 0 1px;
  }

  .sui-back-link:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }

  .sui-back-link-label {
    text-box: trim-both cap alphabetic;
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-back-link {
      transition: none;
    }

    .sui-back-link:active {
      translate: none;
    }
  }
</style>
