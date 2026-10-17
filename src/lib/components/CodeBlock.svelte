<script module lang="ts">
  import type { Attachment } from 'svelte/attachments';

  export type CodeLang = 'json' | 'yaml' | 'toml' | 'markdown' | 'html' | 'text';

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
      /("(?:[^"\\]|\\.)*")(\s*:)?|(\/\/.*$)|(-?\d+(?:\.\d+)?)|\b(true|false|null)\b|([{}[\],:])/g;
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
    if (/^\s*\[\[?.+\]\]?\]\s*(?:#.*)?$/u.test(line)) return run(line, 'tok-head');
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
    return run(line);
  }

  /**
   * Reports whether a scroller is wider inside than out, so a block that scrolls can take
   * keyboard focus and one that does not stays out of the tab order.
   */
  export function watchOverflow(report: (scrolls: boolean) => void): Attachment<HTMLElement> {
    return (box) => {
      const observer = new ResizeObserver(() => report(box.scrollWidth > box.clientWidth));
      observer.observe(box);
      if (box.firstElementChild) observer.observe(box.firstElementChild);
      return () => observer.disconnect();
    };
  }
</script>

<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import CopyButton from './CopyButton.svelte';

  let {
    code,
    lang = 'text',
    label,
    lineNumbers = false,
    copy = true,
    bare = false,
    regionLabel = 'Code',
    copyLabel = 'Copy code',
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
    /** Drops the block's own frame, for a host that already frames it. */
    bare?: boolean;
    /** The scroller's name when it scrolls and has no `label`. */
    regionLabel?: string;
    /** The copy control's name, saying what it copies. */
    copyLabel?: string;
    /** Layout for the call site only, never the block's own paint. */
    class?: HTMLAttributes<HTMLElement>['class'];
  } & HTMLAttributes<HTMLElement> = $props();

  const lines = $derived(code.replace(/\n$/, '').split('\n'));

  let scrolls = $state(false);
</script>

<!--
@component
A read-only code window: mono at 13px on the inset ground, colored by the language's own
tokens, with long lines scrolling sideways inside the block rather than widening the page.
A block that scrolls can take keyboard focus, so it can be scrolled without a pointer.

`lineNumbers` draws a gutter in the gutter ink at full opacity, which never selects or
copies. Selected code is opaque, in the selection colors. `label` names the file above the
code, and `bare` drops the frame for a host that frames the block itself. `html` colors markup,
Svelte templates included. The copy control stands in its own column at the end of the block,
always in view and never over the code. It copies `code` exactly as given.

- Semantics: a `figure` whose `figcaption` is the file name; the code is a `pre`, and a scroller that scrolls is a focusable `region` named by the label or `regionLabel`.
- Content: plain text in one of six languages, any number of lines; long lines never wrap, and the block scrolls sideways instead.
- States: at rest, scrolling (a tab stop with the 2px inset ring on focus), and the copy control's own copied and failed states.
- Keyboard: Tab reaches a block that scrolls and then its copy control, and the arrow keys scroll a focused block.
- Pointer and touch: the copy control is 28px, 44px on a phone or touch screen, and always shown; selection works as in any text.
- Focus: it never moves focus; the copy control keeps focus through its copied state.
- Responsive: the block fills its column and its lines scroll inside it at every width; the copy column keeps its place at the end.
- Accessibility: tokens hold 4.5:1 on the code ground, the gutter is hidden from assistive technology, and the scroller is named only when it is a tab stop.
- Localization: `regionLabel` and `copyLabel` carry the built-in words; the code always reads left to right (`dir="ltr"`) in a right-to-left page, while the file name follows the page.
- Performance: tokenizing is a handful of patterns per line and runs again only when `code` changes; one observer per block watches for overflow.
- Analytics: none of its own; the copy control reports its copy.
- Failure: an empty `code` draws one empty line; a language it does not know is drawn as plain text.
-->
<figure {...rest} class={['sui-code-block', { bare }, className]}>
  {#if label !== undefined}
    <figcaption class="sui-code-block-label">{label}</figcaption>
  {/if}
  <div class={['sui-code-block-body', { single: lines.length === 1 }]} dir="ltr">
    <!-- A block that scrolls sideways must be reachable by keyboard to be scrolled. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <pre
      {@attach watchOverflow((value) => (scrolls = value))}
      class="sui-code-block-scroll"
      tabindex={scrolls ? 0 : undefined}
      role={scrolls ? 'region' : undefined}
      aria-label={scrolls ? (label ?? regionLabel) : undefined}><code
        class={{ numbered: lineNumbers }}
        >{#each lines as line, index (index)}<span class="ln"
            >{#if lineNumbers}<span class="no" aria-hidden="true">{index + 1}</span>{/if}<span
              class="src"
              >{#each tokenizeLine(lang, line) as piece, at (at)}<span class={piece.cls}
                  >{piece.text}</span
                >{/each}</span
            ></span
          >{/each}</code
      ></pre>
    {#if copy}
      <div class="sui-code-block-copy"><CopyButton text={code} label={copyLabel} /></div>
    {/if}
  </div>
</figure>

<style>
  .sui-code-block {
    background: var(--sui-surface-code);
    border: var(--sui-stroke) solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    margin: 0;
    min-inline-size: 0;
  }

  .bare {
    border: 0;
    border-radius: 0;
  }

  .sui-code-block-label {
    border-block-end: var(--sui-stroke) solid var(--sui-border-divider);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-micro) / var(--sui-leading-micro)
      var(--sui-mono);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.04em;
    overflow-wrap: anywhere;
    padding: var(--sui-space-2) var(--sui-space-3);
  }

  /* The copy control has a column of its own at the end, so it never covers a line. */
  .sui-code-block-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .sui-code-block-scroll {
    border-radius: inherit;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-mono);
    font-variant-numeric: tabular-nums;
    margin: 0;
    overflow-x: auto;
  }

  /* Rounded even when `bare` squares the block, so the inset ring never has sharp corners. */
  .sui-code-block-scroll:focus-visible {
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

  /* Every line is one height with its air inside it, so a tone runs from edge to edge and the
     block has no strip of bare ground above its first line or below its last. */
  .ln {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
    min-block-size: var(--sui-leading-meta);
    padding-block: calc(var(--sui-space-1) / 2);
  }

  .no {
    color: var(--sui-code-gutter);
    padding-inline: var(--sui-space-3);
    text-align: end;
    user-select: none;
  }

  .src {
    padding-inline: var(--sui-space-3);
    white-space: pre;
  }

  .numbered .src {
    padding-inline-start: 0;
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

  /* 2px off the corner, as the first line's air is, so the control lines up with it. */
  .sui-code-block-copy {
    align-self: start;
    display: flex;
    padding: calc(var(--sui-space-1) / 2);
  }

  /* One line: the control centres on it, and the line is as tall as the control. */
  .single .sui-code-block-copy {
    align-self: center;
  }

  .single:has(.sui-code-block-copy) .ln {
    min-block-size: var(--sui-tier-quiet);
  }
</style>
