<script module lang="ts">
  import { pageLocale } from '../internal/locale.js';

  export type AvatarShape = 'person' | 'workspace';

  let graphemes: Intl.Segmenter | undefined;

  function segments(value: string): string[] {
    graphemes ??= new Intl.Segmenter();
    return Array.from(graphemes.segment(value), (part) => part.segment);
  }

  /** "Ada Lovelace" is AL, "Engineering Team 01" is E1, and a bare handle gives its first letter. */
  function monogram(name: string, handle: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0)
      return (segments(handle.trim())[0] ?? '').toLocaleUpperCase(pageLocale()) || '?';
    const last = words.length > 1 ? words[words.length - 1] : '';
    const end = /^\d+$/.test(last) ? last.slice(-1) : (segments(last)[0] ?? '');
    return `${segments(words[0])[0]}${end}`.toLocaleUpperCase(pageLocale());
  }

  type Strokes = readonly [before: number, after: number, over: number, under: number];

  /* Where the bold sans draws each glyph initials are made of, in thousandths of an em, as
     canvas measureText reports it: the room its advance leaves before and after the strokes,
     and how far they reach over the cap line and under the baseline. Centring the advance and
     the cap band leaves a B or a P up to half a pixel right of the middle at 16px, and a Q's
     tail low. */
  const CAP = 745;
  const strokes: Record<string, Strokes> = {
    A: [11, 11, 0, 0],
    B: [72, 39, 0, 0],
    C: [50, 39, 12, 12],
    D: [72, 36, 0, 0],
    E: [72, 28, 0, 0],
    F: [72, 17, 0, 0],
    G: [50, 36, 12, 12],
    H: [72, 72, 0, 0],
    I: [72, 72, 0, 0],
    J: [39, 69, 0, 0],
    K: [72, 11, 0, 0],
    L: [72, 17, 0, 0],
    M: [72, 72, 0, 0],
    N: [72, 72, 0, 0],
    O: [50, 50, 12, 12],
    P: [72, 39, 0, 0],
    Q: [50, 50, 12, 90],
    R: [72, 17, 0, 0],
    S: [39, 50, 12, 12],
    T: [11, 11, 0, 0],
    U: [64, 64, 0, 12],
    V: [11, 11, 0, 0],
    W: [11, 11, 0, 0],
    X: [11, 11, 0, 0],
    Y: [11, 11, 0, 0],
    Z: [14, 14, 0, 0],
    Æ: [11, 28, 0, 0],
    Ð: [16, 36, 0, 0],
    Đ: [16, 36, 0, 0],
    Ľ: [72, 13, 12, 0],
    Ł: [36, 17, 0, 0],
    Œ: [50, 28, 12, 12],
    Ø: [50, 50, 12, 12],
    Þ: [65, 48, 0, 0],
    '0': [56, 56, 12, 12],
    '1': [29, 94, 0, 0],
    '2': [41, 51, 12, 0],
    '3': [32, 50, 0, 12],
    '4': [36, 34, 0, 0],
    '5': [40, 52, 0, 12],
    '6': [43, 42, 0, 12],
    '7': [31, 34, 0, 0],
    '8': [51, 51, 12, 12],
    '9': [42, 43, 12, 0],
    '?': [55, 64, 12, 0]
  };

  /* How far a mark on a capital reaches over the cap line, or under the baseline when negative. */
  const marks: Record<string, number> = {
    '\u0300': 270,
    '\u0301': 270,
    '\u0302': 262,
    '\u0303': 256,
    '\u0304': 225,
    '\u0306': 265,
    '\u0307': 235,
    '\u0308': 235,
    '\u030A': 296,
    '\u030B': 270,
    '\u030C': 262,
    '\u0323': -228,
    '\u0326': -257,
    '\u0327': -238,
    '\u0328': -238
  };

  function strokesOf(grapheme: string): Strokes | undefined {
    if (Object.hasOwn(strokes, grapheme)) return strokes[grapheme];
    const [base, ...added] = grapheme.normalize('NFD');
    if (!Object.hasOwn(strokes, base) || !added.every((mark) => Object.hasOwn(marks, mark)))
      return undefined;
    const reach = added.map((mark) => marks[mark]);
    const [before, after, over, under] = strokes[base];
    return [before, after, Math.max(over, ...reach), Math.max(under, ...reach.map((r) => -r))];
  }

  /**
   * How far the initials move from the middle of their advance and from the baseline at the
   * box's middle, as svg `dx` and `dy`, so the ink they draw centres on the box. A glyph the
   * sans does not draw, such as a letter of another script, centres its advance and the cap
   * band instead.
   */
  function inkCentre(letters: string): readonly [dx: string, dy: string] {
    const glyphs = segments(letters).map(strokesOf);
    const drawn = glyphs.filter((glyph) => glyph !== undefined);
    if (drawn.length === 0 || drawn.length < glyphs.length) return ['0', `${CAP / 2000}em`];
    const over = Math.max(...drawn.map((glyph) => glyph[2]));
    const under = Math.max(...drawn.map((glyph) => glyph[3]));
    const dx = (drawn[drawn.length - 1][1] - drawn[0][0]) / 2000;
    return [`${dx}em`, `${(CAP + over - under) / 2000}em`];
  }
</script>

<script lang="ts">
  let {
    name,
    handle = '',
    src,
    size = 28,
    shape = 'person',
    alt
  }: {
    /** Who or what the picture stands for. It gives the initials and, by default, `alt`. */
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
    /**
     * What a screen reader hears for the avatar, the name or else the handle by default. Empty
     * where the name already stands beside it, so it is read once.
     */
    alt?: string;
  } = $props();

  const label = $derived(alt ?? (name.trim() || handle.trim()));
  const letters = $derived(monogram(name, handle));
  const ink = $derived(inkCentre(letters));

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
without a referrer and covers initials drawn under it. A picture that is slow or fails takes no
room, so the initials show from the first frame with no script, and nothing changes once the
page runs. The initials' ink, not their advance or line, centres on the box.

- Semantics: a `span` with role `img`, named by `alt`, which is the name by default; the picture has an empty `alt` and the initials are hidden, so the name is read once. An empty `alt` hides the whole avatar.
- Content: a picture URL over initials from the name: "Ada Lovelace" is AL, "Engineering Team 01" is E1, and a bare handle gives its first letter.
- States: initials, then the picture over them on its own ground and ring once it loads, even where it is transparent; initials alone when there is no picture or it fails.
- Keyboard: none, because it is not interactive.
- Pointer and touch: none, because it is not a target.
- Focus: never takes focus.
- Responsive: one fixed size per place; the box is in rem, so text zoom grows the box and its initials together.
- Accessibility: one image named by `alt`; pass `alt=""` where the name stands beside it, as IdentityRow and Timeline do, so the name is read once. The initials hold 4.5:1 on the brand tint.
- Localization: initials take the first grapheme of each word, so a combined letter or an emoji stays whole, and they are uppercased in the page's language, so a Turkish "i" becomes "İ".
- Performance: the picture loads lazily and decodes off the main thread; nothing animates.
- Analytics: none, because a reader does nothing with an avatar.
- Failure: a missing picture, or one that fails to load, leaves the initials on the brand tint with no broken image, and an empty name and handle draw "?"; the failed URL is not requested again.
-->

<span
  class="sui-avatar"
  role={label ? 'img' : undefined}
  aria-label={label || undefined}
  aria-hidden={label ? undefined : 'true'}
  style:--sui-avatar-size="{size / 16}rem"
  data-corner={corner}
  data-step={step}
>
  <svg class="sui-avatar-letters" aria-hidden="true"
    ><text x="50%" y="50%" dx={ink[0]} dy={ink[1]}>{letters}</text></svg
  >
  {#if src}
    <img {src} alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
  {/if}
</span>

<style>
  .sui-avatar {
    background: var(--sui-brand-action-tint);
    block-size: var(--sui-avatar-size);
    border-radius: 50%;
    /* Under the picture, which draws a ring of its own, so only initials wear this one. */
    box-shadow: inset 0 0 0 var(--sui-stroke) color-mix(in srgb, currentColor 28%, transparent);
    box-sizing: border-box;
    color: var(--sui-brand-action-text);
    display: inline-grid;
    flex: none;
    font: var(--sui-weight-bold) var(--sui-font-size-title) / var(--sui-leading-flat)
      var(--sui-sans);
    grid-template: minmax(0, 1fr) / minmax(0, 1fr);
    inline-size: var(--sui-avatar-size);
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

  [data-step='nano'],
  [data-step='micro'] {
    font-size: var(--sui-font-size-micro);
  }

  [data-step='meta'] {
    font-size: var(--sui-font-size-meta);
  }

  /* An svg's text is placed at fractions of a pixel, where a line's baseline lands on a whole
     one and can sit half a pixel off the middle. */
  .sui-avatar-letters {
    block-size: 100%;
    fill: currentColor;
    grid-area: 1 / 1;
    inline-size: 100%;
    overflow: visible;
    text-anchor: middle;
  }

  /* Sized by its own size, so a picture that fails, which has none, takes no room and draws
     nothing, not even the browser's broken image. One that loads covers the initials on its
     own ground, even where it is transparent, and its ring is an outline because a photograph
     can end in the color of the card behind it. */
  img {
    background: var(--sui-brand-action-tint);
    border-radius: inherit;
    grid-area: 1 / 1;
    max-block-size: 100%;
    max-inline-size: 100%;
    object-fit: cover;
    outline: var(--sui-stroke) solid var(--sui-avatar-ring);
    outline-offset: calc(-1 * var(--sui-stroke));
    place-self: center;
  }

  /* Any size of its own, however small, reaches the whole box, so a small or oblong picture
     covers it too. Without calc-size a square picture as large as the box still covers it,
     and others stand inside it. */
  @supports (min-inline-size: calc-size(max-content, size)) {
    img {
      min-block-size: calc-size(max-content, min(100%, size * 1000));
      min-inline-size: calc-size(max-content, min(100%, size * 1000));
    }
  }

  /* Forced colors drop the shadow, so the ring becomes a system-color line. */
  @media (forced-colors: active) {
    .sui-avatar {
      outline: var(--sui-stroke) solid;
      outline-offset: calc(-1 * var(--sui-stroke));
    }
  }
</style>
