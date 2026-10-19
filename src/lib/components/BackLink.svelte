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
     * `label` is the action ink at 600. `quiet` is the secondary ink at 400, for a page whose
     * tabs already carry the emphasis. Both keep the destination's own case.
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

- Semantics: a native `<a href>` named by `label`, with the chevron hidden.
- Content: `label`, the destination's own name in its own case, such as "All runs", after a chevron that points back.
- States: rest (action ink at 600, or secondary ink at 400 when `quiet`), hover (primary ink), focus (a 2px ring 2px off), pressed (a 1px sink) and visited, which looks like rest.
- Keyboard: Tab reaches it and Enter follows it.
- Pointer and touch: a 24px tall hit area on a pointer and 44px on a phone or any touch screen, as wide as its words and glyph.
- Focus: following it moves focus as the browser's navigation does; nothing here moves it.
- Responsive: one line as wide as its words; a long name wraps beside the chevron.
- Accessibility: `label` is the name, the glyph is hidden, and both tones hold 4.5:1 on the canvas.
- Localization: `label` comes from the caller, and the chevron mirrors in a right-to-left page so back still points to the start edge.
- Performance: one anchor, and only colour and the 1px sink move.
- Analytics: the anchor's own `onclick` reports a follow; it adds nothing of its own.
- Failure: none of its own, because it always has a destination; a missing page is the router's to answer.
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
    font: var(--sui-weight-semibold) var(--sui-font-size-meta) / var(--sui-leading-flat)
      var(--sui-sans);
    gap: var(--sui-space-1);
    inline-size: fit-content;
    margin-block: round(calc((1cap - var(--sui-control-height-chip)) / 2), 1px);
    min-block-size: var(--sui-control-height-chip);
    text-decoration: none;
    transition: translate var(--sui-duration-press) var(--sui-ease-standard);
  }

  .sui-back-link[data-tone='quiet'] {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-flat)
      var(--sui-sans);
    gap: var(--sui-space-1);
  }

  @media (hover: hover) {
    .sui-back-link:hover {
      color: var(--sui-text-primary);
    }
  }

  .sui-back-link:active {
    translate: 0 1px;
  }

  .sui-back-link:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }

  .sui-back-link-label {
    align-content: center;
    block-size: var(--sui-block-snap);
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

  /* A finger needs a 44px target, so the hit area grows past the drawn box (L-38). */
  @media (pointer: coarse), (max-width: 47.9375rem) {
    .sui-back-link {
      position: relative;
    }

    .sui-back-link::after {
      content: '';
      inset: calc((100% - var(--sui-touch-target)) / 2);
      position: absolute;
    }
  }
</style>
