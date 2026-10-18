// Reads the kitchen sink's own sources, so every example can show the markup that draws it.

/** Where a tag that starts at `from` ends, skipping `>` inside quotes and braces. */
function tagEnd(source: string, from: number): number {
  let quote = '';
  let depth = 0;
  for (let index = from; index < source.length; index++) {
    const char = source[index];
    if (quote) {
      if (char === quote) quote = '';
    } else if (char === '"' || char === "'" || char === '`') quote = char;
    else if (char === '{') depth++;
    else if (char === '}') depth--;
    else if (char === '>' && depth === 0) return index;
  }
  return -1;
}

/**
 * Drops the fences of the `cell` snippet a variant grid draws with, keeping its body. Only
 * the snippet inside `<Variants>` is kit plumbing: a component's own `cell` snippet, such as
 * a data table's, is part of the example.
 */
function dropCellFence(markup: string): string {
  const grid = markup.indexOf('<Variants');
  if (grid === -1) return markup;
  const open = /\{#snippet cell\([^)]*\)\}/g;
  open.lastIndex = grid;
  const start = open.exec(markup);
  if (!start) return markup;
  let depth = 0;
  const fence = /\{#snippet\b|\{\/snippet\}/g;
  fence.lastIndex = start.index;
  for (let match = fence.exec(markup); match; match = fence.exec(markup)) {
    depth += match[0] === '{/snippet}' ? -1 : 1;
    if (depth === 0)
      return (
        markup.slice(0, start.index) +
        markup.slice(start.index + start[0].length, match.index) +
        markup.slice(match.index + match[0].length)
      );
  }
  return markup;
}

/** Removes the kit's own wrappers, which a reader of the example never writes. */
function unwrap(markup: string): string {
  let out = dropCellFence(markup);
  for (const name of ['Specimen', 'Variants']) {
    for (let at = out.indexOf(`<${name}`); at !== -1; at = out.indexOf(`<${name}`, at)) {
      const end = tagEnd(out, at);
      if (end === -1) break;
      out = out.slice(0, at) + out.slice(end + 1);
    }
    out = out.replace(new RegExp(`</${name}\\s*>`, 'g'), '');
  }
  return out;
}

function dedent(markup: string): string {
  const lines = markup.split('\n').map((line) => line.trimEnd());
  const indents = lines.filter((line) => line.trim()).map((line) => /^ */.exec(line)![0].length);
  const cut = Math.min(...indents);
  return lines
    .map((line) => line.slice(cut))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** The markup between `<Example title="…">` and its close, as a reader would write it. */
export function exampleSource(source: string, title: string): string | null {
  for (let at = source.indexOf('<Example'); at !== -1; at = source.indexOf('<Example', at + 1)) {
    const end = tagEnd(source, at);
    if (end === -1) return null;
    const attributes = source.slice(at, end);
    if (!attributes.includes(`title="${title}"`)) continue;
    const close = source.indexOf('</Example>', end);
    if (close === -1) return null;
    const markup = dedent(unwrap(source.slice(end + 1, close)));
    return markup === '' ? null : markup;
  }
  return null;
}

/** An id fragment from a title: lower case words joined by dashes. */
export const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
