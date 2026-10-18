<script module lang="ts">
  import { pageLocale } from '../internal/locale.js';

  export type AvatarShape = 'person' | 'workspace';

  let graphemes: Intl.Segmenter | undefined;

  function first(value: string): string {
    graphemes ??= new Intl.Segmenter();
    return graphemes.segment(value)[Symbol.iterator]().next().value?.segment ?? '';
  }

  /** "Ada Lovelace" is AL, "Engineering Team 01" is E1, and a bare handle gives its first letter. */
  function monogram(name: string, handle: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return first(handle.trim()).toLocaleUpperCase(pageLocale()) || '?';
    const last = words.length > 1 ? words[words.length - 1] : '';
    const end = /^\d+$/.test(last) ? last.slice(-1) : first(last);
    return `${first(words[0])}${end}`.toLocaleUpperCase(pageLocale());
  }
</script>

<script lang="ts">
  let {
    name,
    handle = '',
    src,
    size = 28,
    shape = 'person'
  }: {
    /** Who or what the picture stands for. It gives the initials when there is no picture. */
    name: string;
    /** The login, for initials when the name is empty. */
    handle?: string;
    src?: string | null;
    /**
     * In px at the default text size, because the places that need an avatar never agree on a
     * step. It is drawn in rem, so the box grows with text zoom as its initials do.
     */
    size?: number;
    /** A person is a circle and a workspace a rounded square. */
    shape?: AvatarShape;
  } = $props();

  /* The URL that failed rather than a flag, so a changed picture is tried again while
     the one that just failed is not requested twice. */
  let failed = $state<string | null>(null);

  const source = $derived(src && src !== failed ? src : null);

  /* Initials snap to a type step instead of scaling with the circle, so every list
     carries the same weight at a given size. */
  const step = $derived(size < 24 ? 'nano' : size < 32 ? 'micro' : size < 40 ? 'meta' : 'title');

  /* A workspace's corner follows its size, near 30% of it, through the radius scale: one
     flat radius reads as a squircle at 28px and a barely softened square at 48px. */
  const corner = $derived(
    shape === 'person'
      ? undefined
      : size < 30
        ? 'control'
        : size < 36
          ? 'surface'
          : size < 44
            ? 'popover'
            : 'dialog'
  );
</script>

<!--
@component
Who or what, at the size the place asks for. A person is a circle and a workspace a rounded
square, so two avatars side by side say which is which without a label. The picture is fetched
without a referrer.

- Semantics: an `img` with empty `alt`, or a `span` of initials hidden from assistive technology, because the name it stands for always stands beside it.
- Content: a picture URL, or initials from the name: "Ada Lovelace" is AL, "Engineering Team 01" is E1, and a bare handle gives its first letter.
- States: picture, initials, and initials again when the picture fails.
- Keyboard: none, because it is not interactive.
- Pointer and touch: none, because it is not a target.
- Focus: never takes focus.
- Responsive: one fixed size per place; the box is in rem, so text zoom grows the box and its initials together.
- Accessibility: decorative and hidden, so the name beside it is read once; the initials hold 4.5:1 on the brand tint.
- Localization: initials take the first grapheme of each word, so a combined letter or an emoji stays whole, and they are uppercased in the page's language, so a Turkish "i" becomes "İ".
- Performance: the picture loads lazily and decodes off the main thread; nothing animates.
- Analytics: none, because a reader does nothing with an avatar.
- Failure: a missing picture, or one that fails to load, draws the initials on the brand tint, and an empty name and handle draw "?"; the failed URL is not requested again.
-->

{#if source !== null}
  <img
    class="sui-avatar"
    style:--sui-avatar-size="{size / 16}rem"
    data-corner={corner}
    src={source}
    alt=""
    width={size}
    height={size}
    loading="lazy"
    decoding="async"
    referrerpolicy="no-referrer"
    onerror={() => (failed = source)}
  />
{:else}
  <span
    class="sui-avatar sui-avatar-initials"
    style:--sui-avatar-size="{size / 16}rem"
    data-corner={corner}
    data-step={step}
    aria-hidden="true"><span class="sui-avatar-letters">{monogram(name, handle)}</span></span
  >
{/if}

<style>
  .sui-avatar {
    block-size: var(--sui-avatar-size);
    border-radius: 50%;
    box-sizing: border-box;
    flex: none;
    inline-size: var(--sui-avatar-size);
    object-fit: cover;
    /* An outline paints over a picture where an inset shadow would sit under it, and a
       photograph can end in the color of the card behind it. */
    outline: var(--sui-stroke) solid var(--sui-avatar-ring);
    outline-offset: calc(-1 * var(--sui-stroke));
  }

  [data-corner='control'] {
    border-radius: var(--sui-radius-control);
  }

  [data-corner='surface'] {
    border-radius: var(--sui-radius-surface);
  }

  [data-corner='popover'] {
    border-radius: var(--sui-radius-popover);
  }

  [data-corner='dialog'] {
    border-radius: var(--sui-radius-dialog);
  }

  .sui-avatar-initials {
    align-items: center;
    background: var(--sui-brand-action-tint);
    color: var(--sui-brand-action-text);
    display: inline-flex;
    font: var(--sui-weight-bold) var(--sui-font-size-title) / var(--sui-leading-flat)
      var(--sui-sans);
    justify-content: center;
    outline-color: color-mix(in srgb, currentColor 28%, transparent);
  }

  .sui-avatar-initials[data-step='nano'] {
    font-size: var(--sui-font-size-micro);
  }

  .sui-avatar-initials[data-step='micro'] {
    font-size: var(--sui-font-size-micro);
  }

  .sui-avatar-initials[data-step='meta'] {
    font-size: var(--sui-font-size-meta);
  }

  /* The letters centre in their snapped box, so the spare pixels split above and under them
     (L-102). */
  .sui-avatar-letters {
    align-content: center;
    block-size: var(--sui-block-snap);
    text-box: trim-both cap alphabetic;
  }
</style>
