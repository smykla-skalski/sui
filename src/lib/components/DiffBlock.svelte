<script module lang="ts">
  import type { TokenRun } from './CodeBlock.svelte';

  /** Kept, added, removed, or changed in place (a prepared line only). */
  export type DiffOp = ' ' | '+' | '-' | '~';

  /** [start, end) UTF-16 offsets of the emphasised stretch, at grapheme boundaries. */
  export type DiffEmphasis = readonly [number, number];

  /** One rendered line of a unified diff. */
  export interface DiffLine {
    op: DiffOp;
    text: string;
    /** The stretches that actually changed, drawn one step deeper than the line. */
    emphasis?: readonly DiffEmphasis[];
  }

  /** The most cells the line table may hold, about four hundred lines a side. */
  const TABLE_LIMIT = 160_000;

  /**
   * A unified diff of two small texts: longest common subsequence over lines, with the
   * deletions of a changed region before the insertions that replace them. Where a deletion
   * and an insertion pair up, the words and marks that differ between them are emphasised on
   * both, whole words at a time. Shared first and last lines are kept without entering the quadratic table, and a
   * middle too large for it is drawn as all of its old lines removed and its new ones added.
   */
  export function unifiedDiff(before: string, after: string): DiffLine[] {
    const whole = { a: splitLines(before), b: splitLines(after) };
    if (before !== '' && after !== '' && before.endsWith('\n') !== after.endsWith('\n'))
      (before.endsWith('\n') ? whole.a : whole.b).push('');
    let head = 0;
    while (head < whole.a.length && head < whole.b.length && whole.a[head] === whole.b[head])
      head += 1;
    let tail = 0;
    while (
      tail < whole.a.length - head &&
      tail < whole.b.length - head &&
      whole.a[whole.a.length - 1 - tail] === whole.b[whole.b.length - 1 - tail]
    )
      tail += 1;
    const kept = (lines: string[]) => lines.map((text): DiffLine => ({ op: ' ', text }));
    const a = whole.a.slice(head, whole.a.length - tail);
    const b = whole.b.slice(head, whole.b.length - tail);
    const middle =
      (a.length + 1) * (b.length + 1) > TABLE_LIMIT
        ? [
            ...a.map((text): DiffLine => ({ op: '-', text })),
            ...b.map((text): DiffLine => ({ op: '+', text }))
          ]
        : lineDiff(a, b);
    return [
      ...kept(whole.a.slice(0, head)),
      ...middle,
      ...kept(whole.a.slice(whole.a.length - tail))
    ];
  }

  function lineDiff(a: string[], b: string[]): DiffLine[] {
    const table = Array.from({ length: a.length + 1 }, () =>
      new Array<number>(b.length + 1).fill(0)
    );
    for (let i = a.length - 1; i >= 0; i -= 1) {
      for (let j = b.length - 1; j >= 0; j -= 1) {
        table[i][j] =
          a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
      }
    }
    const out: DiffLine[] = [];
    let i = 0;
    let j = 0;
    while (i < a.length || j < b.length) {
      if (i < a.length && j < b.length && a[i] === b[j]) {
        out.push({ op: ' ', text: a[i] });
        i += 1;
        j += 1;
        continue;
      }
      const dels: string[] = [];
      const adds: string[] = [];
      while (
        i < a.length &&
        (j >= b.length || (a[i] !== b[j] && table[i + 1][j] >= table[i][j + 1]))
      ) {
        dels.push(a[i]);
        i += 1;
      }
      while (
        j < b.length &&
        (i >= a.length || (a[i] !== b[j] && table[i + 1][j] < table[i][j + 1]))
      ) {
        adds.push(b[j]);
        j += 1;
      }
      const paired = Math.min(dels.length, adds.length);
      dels.forEach((text, k) => out.push(withEmphasis('-', text, k < paired ? adds[k] : null)));
      adds.forEach((text, k) => out.push(withEmphasis('+', text, k < paired ? dels[k] : null)));
    }
    return out;
  }

  function splitLines(text: string): string[] {
    return text === '' ? [] : text.replace(/\n$/, '').split('\n');
  }

  const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

  const WORDISH = /^[\p{L}\p{N}_]/u;
  const SPACE = /^\s/u;
  /** The most stretches a paired line marks before its changes read as one stretch. */
  const MOST_STRETCHES = 3;

  /** A line cut into runs of word graphemes, runs of space, and single other graphemes. */
  function wordRuns(text: string): string[] {
    const out: string[] = [];
    let kind = '';
    for (const { segment } of GRAPHEMES.segment(text)) {
      const next = WORDISH.test(segment) ? 'word' : SPACE.test(segment) ? 'space' : 'mark';
      if (next !== 'mark' && next === kind) out[out.length - 1] += segment;
      else out.push(segment);
      kind = next;
    }
    return out;
  }

  /*
   * A paired line marks the words and marks the other side does not share, by longest common
   * subsequence over whole words, so a changed word is marked whole and the quotes and brackets
   * both sides keep stay plain. Changes split only by space read as one stretch, and a line
   * with more than three stretches marks one from its first change to its last. A line too long
   * for the table is drawn without marks. Both lines of a pair read one alignment, from the
   * removed line to the added one, so a tie never leaves different words plain on each side.
   */
  function withEmphasis(op: '+' | '-', text: string, other: string | null): DiffLine {
    if (other === null || other === text) return { op, text };
    const a = wordRuns(text);
    const b = wordRuns(other);
    if ((a.length + 1) * (b.length + 1) > TABLE_LIMIT) return { op, text };
    const [removed, added] = op === '-' ? [a, b] : [b, a];
    const table = Array.from({ length: removed.length + 1 }, () =>
      new Array<number>(added.length + 1).fill(0)
    );
    for (let i = removed.length - 1; i >= 0; i -= 1)
      for (let j = added.length - 1; j >= 0; j -= 1)
        table[i][j] =
          removed[i] === added[j]
            ? table[i + 1][j + 1] + 1
            : Math.max(table[i + 1][j], table[i][j + 1]);
    const shared = new Array<boolean>(a.length).fill(false);
    for (let i = 0, j = 0; i < removed.length && j < added.length;) {
      if (removed[i] === added[j]) {
        shared[op === '-' ? i : j] = true;
        i += 1;
        j += 1;
      } else if (table[i + 1][j] >= table[i][j + 1]) i += 1;
      else j += 1;
    }
    const stretches: [number, number][] = [];
    let offset = 0;
    let gap = false;
    a.forEach((run, at) => {
      const end = offset + run.length;
      if (!shared[at]) {
        const last = stretches.at(-1);
        if (last && (last[1] === offset || gap)) last[1] = end;
        else stretches.push([offset, end]);
        gap = false;
      } else if (stretches.length > 0 && SPACE.test(run)) {
        gap = stretches.at(-1)![1] === offset;
      } else gap = false;
      offset = end;
    });
    if (stretches.length === 0) return { op, text };
    const emphasis: DiffEmphasis[] =
      stretches.length > MOST_STRETCHES ? [[stretches[0][0], stretches.at(-1)![1]]] : stretches;
    return { op, text, emphasis };
  }

  /** Re-cuts token runs so the stretches inside `ranges` are marked, splitting a run at an edge. */
  export function emphasize(
    runs: readonly TokenRun[],
    ranges: readonly DiffEmphasis[] = []
  ): (TokenRun & { word?: boolean })[] {
    if (ranges.length === 0) return [...runs];
    const inside = (at: number) => ranges.some(([start, end]) => at >= start && at < end);
    const out: (TokenRun & { word?: boolean })[] = [];
    let offset = 0;
    for (const piece of runs) {
      let from = 0;
      while (from < piece.text.length) {
        const state = inside(offset + from);
        let to = from + 1;
        while (to < piece.text.length && inside(offset + to) === state) to += 1;
        out.push({ cls: piece.cls, text: piece.text.slice(from, to), word: state });
        from = to;
      }
      offset += piece.text.length;
    }
    return out;
  }
</script>

<script lang="ts">
  import { mark as joiner, word } from '../words.js';
  import type { HTMLAttributes } from 'svelte/elements';
  import { tokenizeLines, watchOverflow, type CodeLang } from './CodeBlock.svelte';
  import VisuallyHidden from './VisuallyHidden.svelte';
  import '../internal/scroll-edge.css';

  let {
    before = '',
    after = '',
    lines: prepared,
    lang = 'text',
    label,
    labels,
    emptyLabel = word('DiffBlock.emptyLabel', 'No changes'),
    regionLabel = word('DiffBlock.regionLabel', 'Diff'),
    opLabels = word('DiffBlock.opLabels', { '+': 'Added', '-': 'Removed', '~': 'Changed' }),
    class: className = '',
    ...rest
  }: {
    before?: string;
    after?: string;
    /** Lines already diffed elsewhere. They win over `before` and `after`. */
    lines?: readonly DiffLine[];
    /** The file's own language: the diff tones ride on top of its tokens. */
    lang?: CodeLang;
    /** The file the diff compares, drawn above it and used as its name. */
    label?: string;
    /** Names the two sources beside the minus and plus glyphs. */
    labels?: { before: string; after: string };
    /** What two empty sides say. */
    emptyLabel?: string;
    /** The scroller's name when it scrolls and has no `label`. */
    regionLabel?: string;
    /** The words a screen reader hears for each line's glyph. */
    opLabels?: Record<'+' | '-' | '~', string>;
    /** Layout for the call site only, never the block's own paint. */
    class?: HTMLAttributes<HTMLElement>['class'];
  } & HTMLAttributes<HTMLElement> = $props();

  const lines = $derived(prepared ?? unifiedDiff(before, after));
  /* A kept line's number is its line in the new text, so the numbers of a window agree with the
     file it shows; removed lines take no line of it. */
  const numbers = $derived.by(() => {
    let at = 0;
    return lines.map((line) => (line.op === '-' ? 0 : ++at));
  });
  const tokens = $derived.by(() => {
    const out: TokenRun[][] = lines.map(() => []);
    // Removed and added rows are different documents. Carry shell state through each version,
    // then show the added version's state on rows they share.
    for (const added of [false, true]) {
      const indexes = lines.flatMap((line, index) =>
        (added ? line.op !== '-' : line.op !== '+') ? [index] : []
      );
      const runs = tokenizeLines(
        lang,
        indexes.map((index) => lines[index].text)
      );
      indexes.forEach((index, at) => (out[index] = runs[at]));
    }
    return out;
  });
  const glyph: Record<DiffOp, string> = { ' ': '', '+': '+', '-': '−', '~': '~' };
  // The changed stretch is marked in the document, not only in colour: inserted, deleted, or
  // changed in place.
  const mark: Record<DiffOp, 'ins' | 'del' | 'mark' | 'span'> = {
    ' ': 'span',
    '+': 'ins',
    '-': 'del',
    '~': 'mark'
  };

  let scrolls = $state(false);
</script>

<!--
@component
A small unified diff, drawn from two texts or from lines prepared elsewhere. It shows an
excerpt worth reading, never a whole file. Each line wears its tone, and a glyph beside the
color says the same thing: plus for added, minus for removed, a tilde for a line changed in
place. The glyph stands in the gutter on a step of the tone. The words that actually changed
inside a paired line, whole words at a time and at most three stretches, are a step deeper
again and underlined in the line's ink, marked as inserted, deleted or changed.

Line numbers count the new text's lines in the window, not the file, and only kept lines wear
one: an added or removed line has no single number to claim. A change only in the final newline draws an added
or removed empty line. Two empty sides say `emptyLabel`.

- Semantics: a `figure` whose `figcaption` holds the file name and the two sources; the lines are a `pre`, a scroller that scrolls is a focusable `region`, and changed stretches are `ins`, `del` and `mark`.
- Content: two texts or prepared lines in one of seven languages; long lines never wrap and scroll sideways instead.
- States: kept, added, removed and changed lines, each with its tone and its glyph on a deeper gutter, a deeper underlined stretch inside a paired line, scrolling with the 2px inset ring on focus, and empty.
- Keyboard: Tab reaches a diff that scrolls, and the arrow keys scroll it.
- Pointer and touch: none of its own beyond selecting text.
- Focus: it never moves focus.
- Responsive: the diff fills its column and its lines scroll inside it at every width, with a fade on each edge that has more past it; the caption wraps.
- Accessibility: each glyph is read as `opLabels` words, the caption names the figure, and the changed stretch is marked in the document and underlined, so it survives forced colours; each tone holds the ink drawn on it at 4.5:1, and added and removed stay apart for red-green colour blindness.
- Localization: `emptyLabel`, `regionLabel` and `opLabels` carry the built-in words; the lines always read left to right (`dir="ltr"`), while the caption follows the page.
- Performance: shared first and last lines skip the line table, and a middle over about four hundred lines a side is drawn as removed then added instead of compared.
- Analytics: none; a diff reports no outcome.
- Failure: two empty sides say `emptyLabel`; an oversized middle falls back to a plain removed-then-added diff.
-->
<figure {...rest} class={['sui-diff-block', className]}>
  {#if label !== undefined || labels}
    <figcaption class="sui-diff-block-legend">
      {#if label !== undefined}<span class="sui-diff-block-name" translate="no">{label}</span>{/if}
      {#if labels}
        <span class="sui-diff-block-sources">
          <span
            ><span class="del" aria-hidden="true" translate="no">−</span>{joiner(
              'space'
            )}{labels.before}</span
          >
          <span
            ><span class="add" aria-hidden="true" translate="no">+</span>{joiner(
              'space'
            )}{labels.after}</span
          >
        </span>
      {/if}
    </figcaption>
  {/if}
  {#if lines.length === 0}
    <p class="sui-diff-block-empty">{emptyLabel}</p>
  {:else}
    <!-- A block that scrolls sideways must be reachable by keyboard to be scrolled. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <pre
      translate="no"
      {@attach watchOverflow((value) => (scrolls = value))}
      dir="ltr"
      class="sui-diff-block-scroll sui-scroll-edge sui-scroll-edge-lines"
      tabindex={scrolls ? 0 : undefined}
      role={scrolls ? 'region' : undefined}
      aria-label={scrolls ? (label ?? regionLabel) : undefined}><code
        >{#each lines as line, index (index)}<span class="ln" data-op={line.op}
            ><span class="no" aria-hidden="true">{line.op === ' ' ? numbers[index] : ''}</span><span
              class="op"
              ><span aria-hidden="true">{glyph[line.op]}</span>{#if line.op !== ' '}<VisuallyHidden
                  translate="yes">{opLabels[line.op]}{joiner('space')}</VisuallyHidden
                >{/if}</span
            ><span class="src"
              >{#each emphasize(tokens[index], line.emphasis) as piece, at (at)}{#if piece.word}<svelte:element
                    this={mark[line.op]}
                    class={[piece.cls, 'word']}>{piece.text}</svelte:element
                  >{:else}<span class={piece.cls}>{piece.text}</span>{/if}{/each}</span
            ></span
          >{/each}</code
      ></pre>
  {/if}
</figure>

<style>
  /* A diff is a code block's sibling: the same 44px head row a faint step off the code, the same
     quiet line numbers on a 16px start rail, and the same air over its first line and under its
     last, which centres a line in the head row's height, held in those lines' cells. */
  .sui-diff-block {
    --sui-local-code-row: calc(var(--sui-tier-quiet) + 2 * var(--sui-space-2));
    --sui-local-code-room: calc(
      (var(--sui-local-code-row) - var(--sui-leading-meta) - var(--sui-space-1)) / 2
    );
    background: var(--sui-surface-code);
    border: var(--sui-stroke) solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    margin: 0;
    min-inline-size: 0;
    overflow: clip;
  }

  .sui-diff-block-legend {
    align-content: center;
    align-items: center;
    background: color-mix(
      in srgb,
      var(--sui-text-primary) var(--sui-code-head-ink),
      var(--sui-surface-code)
    );
    border-block-end: var(--sui-stroke) solid var(--sui-border-subtle);
    box-sizing: border-box;
    color: var(--sui-text-secondary);
    display: flex;
    flex-wrap: wrap;
    font: var(--sui-weight-regular) var(--sui-font-size-caption) / var(--sui-leading-compact)
      var(--sui-sans);
    gap: var(--sui-space-2) var(--sui-space-4);
    justify-content: space-between;
    min-block-size: var(--sui-local-code-row);
    padding: var(--sui-space-2) var(--sui-space-4);
  }

  .sui-diff-block-name {
    color: var(--sui-text-primary);
    font-family: var(--sui-mono);
    font-weight: var(--sui-weight-medium);
    font-variant-numeric: tabular-nums;
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }

  /* The head's words trimmed to their capitals in even boxes, so they centre in the row (L-102). */
  .sui-diff-block-name,
  .sui-diff-block-sources > * {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    padding-block: var(--sui-block-snap-room-even);
    text-box: trim-both cap alphabetic;
  }

  .sui-diff-block-sources {
    display: flex;
    flex-wrap: wrap;
    gap: inherit;
  }

  /* Two empty sides still read as a diff and not a field: one row of the body's height, its
     words in the line numbers' quiet ink on their 16px start rail, and in the sans, as words
     are and code is not (L-20). */
  .sui-diff-block-empty {
    align-content: center;
    block-size: var(--sui-local-code-row);
    color: var(--sui-code-gutter);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    margin: 0;
    padding-inline: var(--sui-space-4);
    text-box: trim-both cap alphabetic;
  }

  .sui-diff-block-scroll {
    border-radius: inherit;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-mono);
    font-variant-numeric: tabular-nums;
    margin: 0;
    overflow-x: auto;
  }

  .sui-diff-block-scroll:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  .sui-diff-block-scroll::selection,
  .sui-diff-block-scroll *::selection {
    background: var(--sui-code-selection-bg);
    color: var(--sui-code-selection-ink);
  }

  /* One grid for the whole diff, every line a subgrid row, so the tones run the width of
     the longest line and the gutter is as wide as the longest number. */
  code {
    display: grid;
    font: inherit;
    grid-template-columns: auto auto minmax(0, 1fr);
    inline-size: max-content;
    min-inline-size: 100%;
  }

  /* Every line is one height with its air inside its cells, so a tone runs the line's height and
     the gutter's step fills it. The block's own air stands in the first and last lines' cells,
     so a removed or added edge line carries its tone to the frame. */
  .ln {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
    min-block-size: var(--sui-leading-meta);
  }

  .ln > * {
    padding-block: calc(var(--sui-space-1) / 2);
  }

  .ln:first-child > * {
    padding-block-start: calc(var(--sui-local-code-room) + var(--sui-space-1) / 2);
  }

  .ln:last-child > * {
    padding-block-end: calc(var(--sui-local-code-room) + var(--sui-space-1) / 2);
  }

  .no {
    color: var(--sui-code-gutter);
    padding-inline: var(--sui-space-4) var(--sui-space-3);
    text-align: end;
    user-select: none;
  }

  /* The glyph and its spoken word stay out of a copied selection, as the gutter does. */
  .op {
    min-inline-size: 1ch;
    padding-inline-end: var(--sui-space-2);
    -webkit-user-select: none;
    user-select: none;
  }

  .src {
    padding-inline: var(--sui-space-2) var(--sui-space-3);
    white-space: pre;
  }

  .ln[data-op='+'] {
    background: var(--sui-diff-add-bg);
  }

  .ln[data-op='-'] {
    background: var(--sui-diff-del-bg);
  }

  .ln[data-op='~'] {
    background: var(--sui-diff-chg-bg);
  }

  /* A minus is a short bar where a plus is a cross, so both glyphs stand at the code face's
     heaviest weight, 500 (L-19): the removed side's mark keeps its ink beside the added side's. */
  .op > [aria-hidden],
  .add,
  .del {
    font-weight: var(--sui-weight-medium);
  }

  /* The head's glyphs are the lines' glyphs, drawn in the code's face beside the sans words. */
  .sui-diff-block-sources :is(.add, .del) {
    font-family: var(--sui-mono);
  }

  .ln[data-op='+'] .op,
  .add {
    color: var(--sui-diff-add-ink);
  }

  .ln[data-op='-'] .op,
  .del {
    color: var(--sui-diff-del-ink);
  }

  .ln[data-op='~'] .op {
    color: var(--sui-diff-chg-ink);
  }

  /* A changed line's number and glyph stand on a step of its tone, a fill that holds the line's
     mark, as the numbered gutters of GitHub and GitLab do. */
  .ln[data-op='+'] > :is(.no, .op) {
    background: var(--sui-diff-add-gutter);
  }

  .ln[data-op='-'] > :is(.no, .op) {
    background: var(--sui-diff-del-gutter);
  }

  .ln[data-op='~'] > :is(.no, .op) {
    background: var(--sui-diff-chg-gutter);
  }

  .ln[data-op='+'] .word {
    background: var(--sui-diff-add-word);
    text-decoration-color: var(--sui-diff-add-ink);
  }

  .ln[data-op='-'] .word {
    background: var(--sui-diff-del-word);
    text-decoration-color: var(--sui-diff-del-ink);
  }

  .ln[data-op='~'] .word {
    background: var(--sui-diff-chg-word);
    text-decoration-color: var(--sui-diff-chg-ink);
  }

  /* Syntax colors are tuned for the code ground, not for the deeper word mark under them. The
     underline in the line's ink marks the stretch without its ground, and holds in forced
     colours. */
  .ln .word {
    color: var(--sui-text-primary);
    text-decoration-line: underline;
    text-decoration-thickness: var(--sui-stroke);
    text-underline-offset: 0.2em;
  }

  .tok-key {
    color: var(--sui-code-key);
  }

  .tok-const {
    color: var(--sui-code-const);
  }

  .tok-str {
    color: var(--sui-code-string);
  }

  .tok-com {
    color: var(--sui-code-comment);
  }

  .tok-pun {
    color: var(--sui-code-punct);
  }

  .tok-head {
    color: var(--sui-code-key);
    font-weight: var(--sui-weight-medium);
  }
</style>
