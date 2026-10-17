<script module lang="ts">
  import type { TokenRun } from './CodeBlock.svelte';

  /** Kept, added, removed, or changed in place (a prepared line only). */
  export type DiffOp = ' ' | '+' | '-' | '~';

  /** [start, end) offsets of the emphasised stretch of a line. */
  export type DiffEmphasis = readonly [number, number];

  /** One rendered line of a unified diff. */
  export interface DiffLine {
    op: DiffOp;
    text: string;
    /** The stretches that actually changed, drawn one step deeper than the line. */
    emphasis?: readonly DiffEmphasis[];
  }

  /**
   * A unified diff of two small texts: longest common subsequence over lines, with the
   * deletions of a changed region before the insertions that replace them. Where a deletion
   * and an insertion pair up, the stretch past their common prefix and suffix is emphasised
   * on both. The table is quadratic, which is fine for the excerpts a diff block shows.
   */
  export function unifiedDiff(before: string, after: string): DiffLine[] {
    const a = splitLines(before);
    const b = splitLines(after);
    // ponytail: quadratic LCS table; trim shared edges first if whole files arrive here.
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

  function withEmphasis(op: '+' | '-', text: string, other: string | null): DiffLine {
    if (other === null || other === text) return { op, text };
    const shortest = Math.min(text.length, other.length);
    let prefix = 0;
    while (prefix < shortest && text[prefix] === other[prefix]) prefix += 1;
    let suffix = 0;
    while (
      suffix < shortest - prefix &&
      text[text.length - 1 - suffix] === other[other.length - 1 - suffix]
    ) {
      suffix += 1;
    }
    const end = text.length - suffix;
    return end > prefix ? { op, text, emphasis: [[prefix, end]] } : { op, text };
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
  import type { HTMLAttributes } from 'svelte/elements';
  import { tokenizeLine, watchOverflow, type CodeLang } from './CodeBlock.svelte';

  let {
    before = '',
    after = '',
    lines: prepared,
    lang = 'text',
    label,
    labels,
    class: className = '',
    ...rest
  }: {
    before?: string;
    after?: string;
    /** Lines already diffed elsewhere. They win over `before` and `after`. */
    lines?: readonly DiffLine[];
    /** The file's own language: the diff tones ride on top of its tokens. */
    lang?: CodeLang;
    /** The diff's accessible name when it scrolls, such as the file it compares. */
    label?: string;
    /** Names the two sources beside the minus and plus glyphs. */
    labels?: { before: string; after: string };
    /** Layout for the call site only, never the block's own paint. */
    class?: HTMLAttributes<HTMLElement>['class'];
  } & HTMLAttributes<HTMLElement> = $props();

  const lines = $derived(prepared ?? unifiedDiff(before, after));
  const glyph: Record<DiffOp, string> = { ' ': '', '+': '+', '-': '−', '~': '~' };

  let scrolls = $state(false);
</script>

<!--
@component
A small unified diff, drawn from two texts or from lines prepared elsewhere. It shows an
excerpt worth reading, never a whole file. Each line wears its tone, and a glyph beside the
colour says the same thing: plus for added, minus for removed, a tilde for a line changed in
place. The stretch that actually changed inside a paired line is one step deeper.

Line numbers count the window, not the file, and only kept lines wear one: an added or
removed line has no single number to claim. Two empty sides say "No changes".
-->

<figure {...rest} class={['sui-diff-block', className]}>
  {#if labels}
    <figcaption class="sui-diff-block-legend">
      <span><span class="del" aria-hidden="true">−</span> {labels.before}</span>
      <span><span class="add" aria-hidden="true">+</span> {labels.after}</span>
    </figcaption>
  {/if}
  {#if lines.length === 0}
    <p class="sui-diff-block-empty">No changes</p>
  {:else}
    <!-- A block that scrolls sideways must be reachable by keyboard to be scrolled. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <pre
      {@attach watchOverflow((value) => (scrolls = value))}
      class="sui-diff-block-scroll"
      tabindex={scrolls ? 0 : undefined}
      role={scrolls ? 'region' : undefined}
      aria-label={scrolls ? (label ?? 'Diff') : undefined}><code
        >{#each lines as line, index (index)}<span class="ln" data-op={line.op}
            ><span class="no" aria-hidden="true">{line.op === ' ' ? index + 1 : ''}</span><span
              class="op">{glyph[line.op]}</span
            ><span class="src"
              >{#each emphasize(tokenizeLine(lang, line.text), line.emphasis) as piece, at (at)}<span
                  class={[piece.cls, piece.word && 'word']}>{piece.text}</span
                >{/each}</span
            ></span
          >{/each}</code
      ></pre>
  {/if}
</figure>

<style>
  .sui-diff-block {
    background: var(--sui-surface-inset);
    border: 1px solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    margin: 0;
    min-inline-size: 0;
  }

  .sui-diff-block-legend {
    border-block-end: 1px solid var(--sui-border-subtle);
    color: var(--sui-text-secondary);
    display: flex;
    flex-wrap: wrap;
    font: 400 var(--sui-font-size-compact) / var(--sui-leading-compact) var(--sui-sans);
    gap: var(--sui-space-2) var(--sui-space-4);
    padding: var(--sui-space-2) var(--sui-space-3);
  }

  .sui-diff-block-empty {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
    margin: 0;
    padding: var(--sui-space-3);
  }

  .sui-diff-block-scroll {
    border-radius: inherit;
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-mono);
    font-variant-numeric: tabular-nums;
    margin: 0;
    overflow-x: auto;
    padding: var(--sui-space-3) 0;
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

  .ln {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
    min-block-size: var(--sui-leading-meta);
  }

  .no {
    color: var(--sui-code-gutter);
    padding-inline: var(--sui-space-3);
    text-align: end;
    user-select: none;
  }

  .op {
    min-inline-size: 1ch;
    padding-inline-end: var(--sui-space-2);
  }

  .src {
    padding-inline-end: var(--sui-space-3);
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

  .ln[data-op='+'] .word {
    background: var(--sui-diff-add-word);
  }

  .ln[data-op='-'] .word {
    background: var(--sui-diff-del-word);
  }

  .ln[data-op='~'] .word {
    background: color-mix(in srgb, var(--sui-diff-chg-ink) 18%, var(--sui-diff-chg-bg));
  }

  /* Syntax colours are tuned for the code ground, not for the deeper word mark under them. */
  .ln .word {
    color: var(--sui-text-primary);
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
    font-weight: 500;
  }
</style>
