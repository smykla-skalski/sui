<script lang="ts">
  import { mark, word } from '../words.js';
  import type { HTMLAttributes } from 'svelte/elements';
  import Avatar, { type AvatarShape } from './Avatar.svelte';
  import VisuallyHidden from './VisuallyHidden.svelte';

  let {
    name,
    handle,
    src,
    shape = 'person',
    size = 32,
    handleName = word(
      'IdentityRow.handleName',
      (name: string, handle: string) => `${name}${mark('comma')}${handle}`
    ),
    class: className = '',
    ...rest
  }: {
    name: string;
    /** The login, drawn in mono under the name. */
    handle?: string;
    /** The picture; without one the avatar draws initials. */
    src?: string | null;
    shape?: AvatarShape;
    /** The avatar's size in px. */
    size?: number;
    /** The words read for a row with a handle, from the name and the handle, in the language's order. */
    handleName?: (name: string, handle: string) => string;
    class?: HTMLAttributes<HTMLSpanElement>['class'];
  } & Omit<HTMLAttributes<HTMLSpanElement>, 'children'> = $props();
</script>

<!--
@component
Who a row is about, in one row: the avatar, then the name with the handle in mono under it.
Both lines are trimmed to their ink and stand 8px apart, so the words, not their line boxes,
centre on the avatar. A name that wraps keeps the avatar centred on its own lines, never on
the handle under them.

- Semantics: a `span` of text; the avatar is hidden, so the name is read once and the handle after it, joined by `handleName`.
- Content: a name, an optional handle and an optional picture.
- States: with a picture, with initials, and with or without a handle.
- Keyboard: none of its own; put it inside the link or button that acts on the person.
- Pointer and touch: none of its own; the control around it is the target.
- Focus: never takes focus.
- Responsive: a long name or handle wraps inside the room it is given, so every character can be read without a tooltip and nothing runs under what stands beside the row.
- Accessibility: the full name and handle are always drawn as text; the name holds 4.5:1 and the muted handle 4.5:1 on the surface.
- Localization: the name and handle are the caller's, and `handleName` joins them; the avatar sits at the inline start and follows the reading direction.
- Performance: one avatar picture per row, loaded lazily.
- Analytics: none, because a reader does nothing with it on its own.
- Failure: a picture that fails falls back to initials; an empty handle draws no second line.
-->

<span {...rest} class={['sui-identity-row', className]} style:--sui-local-face="{size / 16}rem">
  <!-- The two lines are read as one run of text, so a control around the row names the person
       with the language's own join, not with the space a browser puts between lines. -->
  <span class="sui-identity-copy" aria-hidden={handle ? 'true' : undefined}>
    <span class="sui-identity-name">{name}</span>
    {#if handle}
      <span class="sui-identity-handle">{handle}</span>
    {/if}
  </span>
  <!-- After the name in the source, so the name can anchor it; drawn at the inline start. -->
  <span class="sui-identity-face"
    ><Avatar {name} handle={handle ?? ''} {src} {shape} {size} alt="" /></span
  >
  {#if handle}<VisuallyHidden>{handleName(name, handle)}</VisuallyHidden>{/if}
</span>

<style>
  .sui-identity-row {
    align-items: center;
    anchor-scope: --sui-identity-name;
    display: flex;
    gap: var(--sui-space-2);
    max-inline-size: 100%;
    min-block-size: var(--sui-local-face);
    min-inline-size: 0;
    position: relative;
  }

  .sui-identity-face {
    display: flex;
    flex: none;
    order: -1;
  }

  /* The avatar centres on the name's own lines, and never stands above the row, so a one-line
     name and its handle still centre on it while a name that wraps keeps it beside its lines. */
  @supports (anchor-name: --sui-identity-name) {
    .sui-identity-row {
      padding-inline-start: calc(var(--sui-local-face) + var(--sui-space-2));
    }

    .sui-identity-name {
      anchor-name: --sui-identity-name;
    }

    .sui-identity-face {
      inset-inline-start: 0;
      position: absolute;
      position-anchor: --sui-identity-name;
      top: max(0px, calc(anchor(center) - var(--sui-local-face) / 2));
    }
  }

  /* An even column, so the avatar centred beside it lands on whole pixels (L-95). */
  .sui-identity-copy {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    display: grid;
    gap: var(--sui-row-copy-gap);
    min-inline-size: 0;
  }

  .sui-identity-name,
  .sui-identity-handle {
    align-content: center;
    block-size: var(--sui-block-snap);
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-identity-name {
    color: var(--sui-text-primary);
    font: var(--sui-weight-semibold) var(--sui-font-size-body) / var(--sui-row-copy-leading)
      var(--sui-sans);
  }

  .sui-identity-handle {
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-compact) / var(--sui-row-copy-leading)
      var(--sui-mono);
    font-variant-numeric: tabular-nums;
  }
</style>
