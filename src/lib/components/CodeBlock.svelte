<script module lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import { tokenizeShell } from '../internal/shell-syntax.js';

  export type CodeLang = 'json' | 'yaml' | 'toml' | 'markdown' | 'html' | 'shell' | 'text';

  /* Each language's own name, which needs no translation; plain text's is a word, `plainTextName`. */
  const languageNames: Partial<Record<CodeLang, string>> = {
    json: 'JSON',
    yaml: 'YAML',
    toml: 'TOML',
    markdown: 'Markdown',
    html: 'HTML',
    shell: 'Shell'
  };

  /** One stretch of a line wearing one token class. */
  export interface TokenRun {
    /** A `tok-*` class, or undefined for plain text. */
    cls?: string;
    text: string;
  }

  const run = (text: string, cls?: string): TokenRun[] => (text === '' ? [] : [{ cls, text }]);

  function tokenizeJson(line: string): TokenRun[] {
    const out: TokenRun[] = [];
    const re =
      /("(?:[^"\\]|\\.)*")(\s*:)?|(\/\/.*$)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],:])/g;
    let last = 0;
    let match;
    while ((match = re.exec(line))) {
      out.push(...run(line.slice(last, match.index)));
      if (match[3] !== undefined) out.push(...run(match[3], 'tok-com'));
      else if (match[1] !== undefined && match[2] !== undefined) {
        out.push(...run(match[1], 'tok-key'), ...run(match[2], 'tok-pun'));
      } else if (match[1] !== undefined) out.push(...run(match[1], 'tok-str'));
      else if (match[4] !== undefined || match[5] !== undefined) {
        out.push(...run(match[4] ?? match[5] ?? '', 'tok-const'));
      } else if (match[6] !== undefined) out.push(...run(match[6], 'tok-pun'));
      last = re.lastIndex;
    }
    out.push(...run(line.slice(last)));
    return out;
  }

  function tokenizeYaml(line: string): TokenRun[] {
    const comment = /^(\s*)#(.*)$/.exec(line);
    if (comment !== null) {
      return [...run(comment[1] ?? ''), ...run(`#${comment[2] ?? ''}`, 'tok-com')];
    }
    const pair = /^(\s*(?:- )?)([\w./@-]+)(:)(.*)$/.exec(line);
    if (pair !== null) {
      const value = pair[4] ?? '';
      const constant =
        /^\s*-?\d+(\.\d+)?\s*$/.test(value) || /^\s*(true|false|null)\s*$/.test(value);
      return [
        ...run(pair[1] ?? '', 'tok-pun'),
        ...run(pair[2] ?? '', 'tok-key'),
        ...run(':', 'tok-pun'),
        ...run(value, constant ? 'tok-const' : 'tok-str')
      ];
    }
    const item = /^(\s*- )(.*)$/.exec(line);
    if (item !== null) return [...run(item[1] ?? '', 'tok-pun'), ...run(item[2] ?? '', 'tok-str')];
    return run(line);
  }

  function tokenizeMarkdown(line: string): TokenRun[] {
    if (/^#{1,6} /.test(line)) return run(line, 'tok-head');
    const out: TokenRun[] = [];
    const listed = /^(- )(.*)$/.exec(line);
    let rest = line;
    if (listed !== null) {
      out.push(...run(listed[1] ?? '', 'tok-pun'));
      rest = listed[2] ?? '';
    }
    const re = /`[^`]+`/g;
    let last = 0;
    let match;
    while ((match = re.exec(rest))) {
      out.push(...run(rest.slice(last, match.index)));
      out.push(...run(match[0], 'tok-const'));
      last = re.lastIndex;
    }
    out.push(...run(rest.slice(last)));
    return out;
  }

  function tokenizeToml(line: string): TokenRun[] {
    if (/^\s*#/u.test(line)) return run(line, 'tok-com');
    if (/^\s*(?:\[\[.+\]\]|\[.+\])\s*(?:#.*)?$/u.test(line)) return run(line, 'tok-head');
    const entry = /^(\s*)([\w.-]+)(\s*=\s*)(.*)$/u.exec(line);
    if (entry === null) return run(line);
    return [
      ...run(entry[1] ?? ''),
      ...run(entry[2] ?? '', 'tok-key'),
      ...run(entry[3] ?? '', 'tok-pun'),
      ...run(entry[4] ?? '', 'tok-str')
    ];
  }

  // Markup, Svelte templates included: tag names, attribute names and quoted values. An
  // expression in braces stays plain, because coloring it would need a script tokenizer.
  function tokenizeHtml(line: string): TokenRun[] {
    const out: TokenRun[] = [];
    const re =
      /(<!--.*?(?:-->|$))|(<\/?)([A-Za-z][\w.:-]*)|(\/?>)|(?<==)("[^"]*"|'[^']*')|([A-Za-z_:@][\w:.|-]*)(?==)/g;
    let last = 0;
    let match;
    while ((match = re.exec(line))) {
      out.push(...run(line.slice(last, match.index)));
      if (match[1] !== undefined) out.push(...run(match[1], 'tok-com'));
      else if (match[3] !== undefined)
        out.push(...run(match[2] ?? '', 'tok-pun'), ...run(match[3], 'tok-key'));
      else if (match[4] !== undefined) out.push(...run(match[4], 'tok-pun'));
      else if (match[5] !== undefined) out.push(...run(match[5], 'tok-str'));
      else if (match[6] !== undefined) out.push(...run(match[6], 'tok-const'));
      last = re.lastIndex;
    }
    out.push(...run(line.slice(last)));
    return out;
  }

  /**
   * Cuts one line into classed runs. A handful of patterns per language, because these
   * blocks show excerpts, not an editor. It returns data, never markup, so nothing a
   * document says can become HTML. Joined back, the runs equal the line.
   */
  export function tokenizeLine(lang: CodeLang, line: string): TokenRun[] {
    if (lang === 'yaml') return tokenizeYaml(line);
    if (lang === 'toml') return tokenizeToml(line);
    if (lang === 'markdown') return tokenizeMarkdown(line);
    if (lang === 'json') return tokenizeJson(line);
    if (lang === 'html') return tokenizeHtml(line);
    if (lang === 'shell') return tokenizeShell([line])[0];
    return run(line);
  }

  /** Cuts every line, letting shell carry an open quote or a continued command to the next. */
  export function tokenizeLines(lang: CodeLang, lines: readonly string[]): TokenRun[][] {
    return lang === 'shell' ? tokenizeShell(lines) : lines.map((line) => tokenizeLine(lang, line));
  }

  /**
   * Reports whether a scroller is wider inside than out, so a block that scrolls can take
   * keyboard focus and one that does not stays out of the tab order.
   */
  export function watchOverflow(report: (scrolls: boolean) => void): Attachment<HTMLElement> {
    return (box) => {
      const check = () => report(box.scrollWidth > box.clientWidth);
      const observer = new ResizeObserver(check);
      observer.observe(box);
      if (box.firstElementChild) observer.observe(box.firstElementChild);
      // A row that skips off the screen silences the observer from its first frame, so one
      // read lands first; every block reads in the same task, after the page is written.
      queueMicrotask(check);
      return () => observer.disconnect();
    };
  }
</script>

<script lang="ts">
  import { word } from '../words.js';
  import type { HTMLAttributes } from 'svelte/elements';
  import CopyButton from './CopyButton.svelte';
  import '../internal/scroll-edge.css';

  let {
    code,
    lang = 'text',
    label,
    lineNumbers = false,
    copy = true,
    bare = false,
    regionLabel = word('CodeBlock.regionLabel', 'Code'),
    copyLabel = word('CodeBlock.copyLabel', 'Copy Code'),
    plainTextName = word('CodeBlock.plainTextName', 'Text'),
    class: className = '',
    ...rest
  }: {
    code: string;
    lang?: CodeLang;
    /** The file name, drawn above the code and used as the scroller's accessible name. */
    label?: string;
    lineNumbers?: boolean;
    /** Offers a copy control in the corner. */
    copy?: boolean;
    /** Drops the block's own frame, fill and insets, for a host that already frames and insets it. */
    bare?: boolean;
    /** The scroller's name when it scrolls and has no `label`. */
    regionLabel?: string;
    /** The copy control's name, saying what it copies. */
    copyLabel?: string;
    /** What a phone's copy row calls plain text, where a language would stand. */
    plainTextName?: string;
    /** Layout for the call site only, never the block's own paint. */
    class?: HTMLAttributes<HTMLElement>['class'];
  } & HTMLAttributes<HTMLElement> = $props();

  const lines = $derived(tokenizeLines(lang, code.replace(/\n$/, '').split('\n')));

  let scrolls = $state(false);
</script>

<!--
@component
A read-only code window: mono at 14px on the inset ground, colored by the language's own
tokens, with long lines scrolling sideways inside the block rather than widening the page.
A block that scrolls can take keyboard focus, so it can be scrolled without a pointer.

`lineNumbers` draws a gutter in the gutter ink at full opacity behind a divider 12px from
its numbers and its code, which never selects or copies and stays in view while long lines scroll. Selected code is opaque, in the selection colors. `label` names the file above the
code, and `bare` drops the frame, its fill and the code's start inset for a host that frames and insets
the block itself, so the code starts on the host's own edge, as under a disclosure's words. `html` colors markup,
Svelte templates included. `shell` colors commands, flags, strings, variables and operators,
and carries an open quote or a continued line on to the next line. The copy control heads
the code in a row of its own, a faint step off the code as the file name's row is, after the language's name, always in view and never over the
code, or stands in the file name's row when there is one; a `bare` block keeps it in a column
beside its first line, and takes the row only on a phone. It copies `code` exactly as given.

- Semantics: a `figure` whose `figcaption` is the file name; the code is a `pre`, and a scroller that scrolls is a focusable `region` named by the label or `regionLabel`.
- Content: plain text in one of seven languages, any number of lines; long lines never wrap, and the block scrolls sideways instead.
- States: at rest, scrolling (a tab stop whose 2px ring covers the block's edge on focus, inside the scroller for a `bare` block), and the copy control's own copied and failed states.
- Keyboard: Tab reaches a block that scrolls and then its copy control, and the arrow keys scroll a focused block.
- Pointer and touch: the copy control is 28px, 44px on a phone or touch screen, and always shown; selection works as in any text.
- Focus: it never moves focus; the copy control keeps focus through its copied state.
- Responsive: the block fills its column and its lines scroll inside it at every width, with a fade on each edge that has more past it, the start fade past the line numbers; the copy row keeps the code the whole width at every width, and a `bare` block's copy column keeps its place at the end until a phone heads the block with the row.
- Accessibility: tokens hold 4.5:1 on the code ground, the gutter is hidden from assistive technology, and the scroller is named only when it is a tab stop.
- Localization: `regionLabel`, `copyLabel` and `plainTextName` carry the built-in words; the code always reads left to right (`dir="ltr"`) in a right-to-left page, while the file name follows the page.
- Performance: tokenizing is one pass over each line and runs again only when `code` or `lang` changes; one observer per block watches for overflow.
- Analytics: none of its own; the copy control reports its copy.
- Failure: an empty `code` draws one empty line; a language it does not know is drawn as plain text.
-->
{#snippet copier(name?: string)}
  <div class="sui-code-block-copy">
    {#if name}<span class="sui-code-block-lang" translate="no">{name}</span>{/if}<CopyButton
      text={code}
      label={copyLabel}
    />
  </div>
{/snippet}

<figure {...rest} class={['sui-code-block', { bare, labelled: label !== undefined }, className]}>
  {#if label !== undefined}
    <figcaption class="sui-code-block-label" translate="no">{label}</figcaption>
    {#if copy}{@render copier()}{/if}
  {/if}
  <!-- A block that scrolls sideways must be reachable by keyboard to be scrolled. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <pre
    translate="no"
    {@attach watchOverflow((value) => (scrolls = value))}
    class="sui-code-block-scroll sui-scroll-edge sui-scroll-edge-lines"
    style:--sui-local-code-digits={String(lines.length).length}
    dir="ltr"
    tabindex={scrolls ? 0 : undefined}
    role={scrolls ? 'region' : undefined}
    aria-label={scrolls ? (label ?? regionLabel) : undefined}><code
      class={{ numbered: lineNumbers }}
      >{#each lines as line, index (index)}<span class="ln"
          >{#if lineNumbers}<span class="no" aria-hidden="true">{index + 1}</span>{/if}<span
            class="src"
            >{#each line as piece, at (at)}<span class={piece.cls}>{piece.text}</span>{/each}</span
          ></span
        >{/each}</code
    ></pre>
  {#if copy && label === undefined}{@render copier(
      lang === 'text' ? plainTextName : languageNames[lang]
    )}{/if}
</figure>

<style>
  /* One row is as tall as the copy control and its 8px inset all round: the file name's row,
     and the room a single line of code stands in. Lines are 20px, so the first and the last
     keep the same 12px of air from the block's edges, and the copy control centres on the
     first line. The copy control has a column of its own beside the code, so it never covers
     a line, or sits in the file name's row. */
  .sui-code-block {
    --sui-local-code-row: calc(var(--sui-tier-quiet) + 2 * var(--sui-space-2));
    background: var(--sui-surface-code);
    border: var(--sui-stroke) solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    display: flex;
    flex-wrap: wrap;
    margin: 0;
    min-inline-size: 0;
  }

  .bare {
    background: transparent;
    border: 0;
    border-radius: 0;
  }

  .sui-code-block-label {
    align-content: center;
    color: var(--sui-text-primary);
    font: var(--sui-weight-medium) var(--sui-font-size-caption) / var(--sui-leading-compact)
      var(--sui-mono);
    font-variant-numeric: tabular-nums;
    flex: 1 1 8rem;
    min-block-size: var(--sui-local-code-row);
    overflow-wrap: anywhere;
    padding-inline: var(--sui-space-4);
    text-box: trim-both cap alphabetic;
  }

  /* The language's name shows only in a copy row of its own, below. */
  .sui-code-block-lang {
    display: none;
  }

  /* Beside a file name too long to share its row, the control takes a row of its own, from the
     start edge (L-90). */
  .sui-code-block-copy {
    align-self: start;
    display: flex;
    flex: none;
    padding: var(--sui-space-2);
  }

  /* A bare block's host insets it, so the control ends on that inset, as the code starts on it.
     With no file name it still centres on the first line, which then starts at the block's top;
     in a file name's row it centres on the row. */
  .bare .sui-code-block-copy {
    padding-inline-end: 0;
  }

  .bare:not(.labelled) .sui-code-block-copy {
    margin-block-start: calc((var(--sui-leading-meta) - var(--sui-tier-quiet)) / 2);
    padding-block-start: 0;
  }

  .sui-code-block-scroll {
    border-radius: inherit;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-mono);
    flex: 1 1 0;
    font-variant-numeric: tabular-nums;
    margin: 0;
    min-inline-size: 0;
    overflow-x: auto;
    --sui-local-code-room-start: calc((var(--sui-local-code-row) - var(--sui-leading-meta)) / 2);
    --sui-local-code-room-end: calc((var(--sui-local-code-row) - var(--sui-leading-meta)) / 2);
    padding-block: var(--sui-local-code-room-start) var(--sui-local-code-room-end);
  }

  /* A bare block's host gives the room above and below its lines, as it does for any content,
     so its code stands where the host's words would. Under a file name the code keeps its room,
     so it never meets the line under the name. */
  .bare:not(.labelled) .sui-code-block-scroll {
    --sui-local-code-room-start: 0px;
    --sui-local-code-room-end: 0px;
  }

  /* The line numbers stay put while the lines scroll under them, so the start fade begins
     past the gutter and its rule: its numbers are as wide as the longest, in tabular figures.
     The room above the first line and under the last moves into those lines, so the gutter and
     its rule run the body's whole height. */
  .sui-code-block-scroll:has(> .numbered) {
    padding-block: 0;
    --sui-local-edge-hold: calc(
      var(--sui-local-code-digits) * 1ch + var(--sui-space-4) + var(--sui-space-3) +
        var(--sui-stroke)
    );
  }

  /* Under the file name the code takes the block's whole width. */
  .labelled .sui-code-block-scroll {
    border-block-start: var(--sui-stroke) solid var(--sui-border-divider);
    border-start-end-radius: 0;
    border-start-start-radius: 0;
    flex-basis: 100%;
  }

  /* A framed block heads its code with a row of its own at every width, as a code window's tab
     row does: the language's name at its start, on the code's edge and in the file name's type,
     and the copy control at its end, so the block names itself and the code takes the whole
     width under the row. The name's smaller cap stands on the control's baseline, so the row
     reads as one line of words. At a large text size the name and the control share no line,
     so the control wraps under the name and keeps to the end (WCAG 1.4.4). A block with no copy
     control has no row to part from its code, so it keeps its own top edge. */
  .sui-code-block:not(.labelled, .bare) > .sui-code-block-copy {
    align-items: baseline;
    box-sizing: border-box;
    column-gap: var(--sui-space-3);
    flex-basis: 100%;
    flex-wrap: wrap;
    justify-content: flex-end;
    margin-block-start: 0;
    order: -1;
    padding-block-start: var(--sui-space-2);
  }

  /* The head row, the file name's or the copy row, stands a faint step off the code under it,
     as a code window's tab row does, so the row reads as the block's head and not a first line.
     The block clips it to its own inner corners, however the row wraps; nothing in a framed
     block draws past its edge, its copy control standing 8px inside it. */
  .sui-code-block:not(.bare) {
    overflow: clip;
  }

  .sui-code-block:not(.bare) > :is(.sui-code-block-label, .sui-code-block-copy) {
    background: color-mix(
      in srgb,
      var(--sui-text-primary) var(--sui-code-head-ink),
      var(--sui-surface-code)
    );
  }

  /* The copy control stands a step lighter than the head in both themes: the code's own white
     in light, and in dark more of the ink than the head takes, where a raised ground sank under
     it. On light that white already draws its shape against the head, so it rests on the block's
     own subtle edge and stays quieter than the frame round it; on dark its fill is a small step,
     so it keeps the control edge. */
  .sui-code-block:not(.bare) > .sui-code-block-copy {
    --sui-control-border: light-dark(var(--sui-border-subtle), var(--sui-border-control));
    --sui-surface-base: color-mix(
      in srgb,
      var(--sui-text-primary) var(--sui-code-chip-ink),
      var(--sui-surface-code)
    );
  }

  .sui-code-block:not(.bare) .sui-code-block-lang {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    display: block;
    font: var(--sui-weight-medium) var(--sui-font-size-caption) / var(--sui-leading-compact)
      var(--sui-mono);
    margin-inline-end: auto;
    padding-block: var(--sui-block-snap-room);
    padding-inline-start: calc(var(--sui-space-4) - var(--sui-space-2));
    text-box: trim-both cap alphabetic;
  }

  .sui-code-block:not(.labelled, .bare):has(> .sui-code-block-copy) > .sui-code-block-scroll {
    border-block-start: var(--sui-stroke) solid var(--sui-border-divider);
    border-start-end-radius: 0;
    border-start-start-radius: 0;
    flex-basis: 100%;
    --sui-local-code-room-start: calc((var(--sui-local-code-row) - var(--sui-leading-meta)) / 2);
  }

  /* A bare block, inset by its host as under a disclosure's words, keeps the control in a
     column beside its first line, and takes the row only on a phone, whose column is too
     narrow to give the control a column beside every line. */
  @media (max-width: 47.9375rem) {
    .sui-code-block.bare:not(.labelled) > .sui-code-block-copy {
      align-items: baseline;
      box-sizing: border-box;
      column-gap: var(--sui-space-3);
      flex-basis: 100%;
      flex-wrap: wrap;
      justify-content: flex-end;
      margin-block-start: 0;
      order: -1;
      padding-block-start: var(--sui-space-2);
    }

    .bare .sui-code-block-lang {
      align-content: center;
      block-size: var(--sui-block-snap);
      color: var(--sui-text-primary);
      display: block;
      font: var(--sui-weight-medium) var(--sui-font-size-caption) / var(--sui-leading-compact)
        var(--sui-mono);
      margin-inline: calc(-1 * var(--sui-space-2)) auto;
      padding-block: var(--sui-block-snap-room);
      text-box: trim-both cap alphabetic;
    }

    .bare:not(.labelled):has(> .sui-code-block-copy) > .sui-code-block-scroll {
      border-block-start: var(--sui-stroke) solid var(--sui-border-divider);
      border-start-end-radius: 0;
      border-start-start-radius: 0;
      flex-basis: 100%;
      --sui-local-code-room-start: calc((var(--sui-local-code-row) - var(--sui-leading-meta)) / 2);
    }
  }

  /* A framed block draws the ring over its own edge, round the code and the copy control
     together, as a field draws it over its frame, so no second box stands inside the first.
     Under focus the scroller keeps its fades whole, with no ring of its own to keep clear. */
  .sui-code-block-scroll:focus-visible {
    outline: none;
  }

  .sui-code-block:not(.bare):has(> .sui-code-block-scroll:focus-visible) {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: calc(-1 * var(--sui-stroke));
  }

  .sui-code-block:not(.bare) > .sui-code-block-scroll {
    --sui-local-edge-corner: 0px;
    --sui-local-edge-ring: 0px;
  }

  /* A bare block has no edge of its own, so its scroller draws the ring inside itself,
     rounded even though the block is square, so the ring never has sharp corners. */
  .bare .sui-code-block-scroll:focus-visible {
    border-radius: var(--sui-radius-control);
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  /* One grid for the whole block, every line a subgrid row: the gutter is as wide as the
     longest number, and every line is as wide as the longest line. */
  code {
    display: grid;
    font: inherit;
    grid-template-columns: minmax(0, 1fr);
    inline-size: max-content;
    min-inline-size: 100%;
  }

  code.numbered {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .ln {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
    min-block-size: var(--sui-leading-meta);
  }

  /* The gutter stays in view while long lines scroll under it, and a divider stands 12px
     from its numbers and its code, so a number never reads as the first token of its line. */
  .numbered > .ln:first-child > * {
    padding-block-start: var(--sui-local-code-room-start);
  }

  .numbered > .ln:last-child > * {
    padding-block-end: var(--sui-local-code-room-end);
  }

  .no {
    background: var(--sui-surface-code);
    border-inline-end: var(--sui-stroke) solid var(--sui-border-divider);
    color: var(--sui-code-gutter);
    inset-inline-start: 0;
    padding-inline: var(--sui-space-4) var(--sui-space-3);
    position: sticky;
    text-align: end;
    user-select: none;
  }

  .src {
    padding-inline: var(--sui-space-4);
    white-space: pre;
  }

  .bare .src {
    padding-inline-start: 0;
  }

  .numbered .src {
    padding-inline-start: var(--sui-space-3);
  }

  .sui-code-block-scroll::selection,
  .sui-code-block-scroll *::selection {
    background: var(--sui-code-selection-bg);
    color: var(--sui-code-selection-ink);
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
