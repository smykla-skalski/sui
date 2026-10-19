import type { TokenRun } from '../components/CodeBlock.svelte';

/*
 * A glob wears the roles the ignore-file grammar GitHub's Linguist uses gives it, mapped onto
 * the code palette's own, as shell-syntax.ts maps shell. Wildcards are the operators that
 * match, so they take the keyword's role, as shell's reserved words do. A leading `!` turns
 * the whole pattern around, so it takes the key's ink, apart from the wildcards. A character
 * a set lists, or one an escape makes literal, is a string. Separators, brackets, braces,
 * commas, a range's dash and an escape's backslash are punctuation, so the names between them
 * stand out, and the names themselves stay plain.
 */
const WILDCARD = 'tok-const';
const NEGATION = 'tok-key';
const LISTED = 'tok-str';
const PUNCT = 'tok-pun';

/** Where a character class that opens at `start` closes, or undefined when it never does. */
function classEnd(text: string, start: number): number | undefined {
  let at = start + 1;
  if (text[at] === '!' || text[at] === '^') at += 1;
  // A bracket first in the class is a member, not its end.
  if (text[at] === ']') at += 1;
  for (; at < text.length; at += 1) {
    if (text[at] === '\\') at += 1;
    else if (text.startsWith('[:', at) && text.indexOf(':]', at + 2) !== -1)
      at = text.indexOf(':]', at + 2) + 1;
    else if (text[at] === ']') return at;
  }
  return undefined;
}

/**
 * Each brace set's closing brace by its opening one. A brace with no mate, or one that lists
 * no alternatives and no range, as `{a}` does, is a literal, as the shell reads it.
 */
function braceSets(text: string): Map<number, number> {
  const sets = new Map<number, number>();
  const open: { at: number; set: boolean }[] = [];
  for (let at = 0; at < text.length; at += 1) {
    const char = text[at];
    const inner = open.at(-1);
    if (char === '\\') at += 1;
    else if (char === '[') at = classEnd(text, at) ?? at;
    else if (char === '{') open.push({ at, set: false });
    else if (inner !== undefined && (char === ',' || text.startsWith('..', at))) inner.set = true;
    else if (char === '}' && inner !== undefined) {
      open.pop();
      if (inner.set) sets.set(inner.at, at);
    }
  }
  return sets;
}

/** Colors one glob, such as `!docs/*.{md,txt}`, without losing or adding a character. */
export function tokenizeGlob(pattern: string): TokenRun[] {
  const out: TokenRun[] = [];
  const push = (text: string, cls?: string) => {
    if (text === '') return;
    const last = out.at(-1);
    if (last !== undefined && last.cls === cls) last.text += text;
    else out.push({ cls, text });
  };
  const sets = braceSets(pattern);
  const closes = new Set(sets.values());
  const negation = /^!+/.exec(pattern)?.[0] ?? '';
  push(negation, NEGATION);
  let depth = 0;
  let at = negation.length;
  while (at < pattern.length) {
    const char = pattern[at];
    const end = char === '[' ? classEnd(pattern, at) : undefined;
    if (char === '\\') {
      push(char, PUNCT);
      push(pattern[at + 1] ?? '', LISTED);
      at += 2;
    } else if (char === '*' || char === '?') {
      push(char, WILDCARD);
      at += 1;
    } else if (end !== undefined) {
      characterClass(pattern.slice(at, end + 1), push);
      at = end + 1;
    } else if (sets.has(at) || closes.has(at)) {
      push(char, PUNCT);
      depth += char === '{' ? 1 : -1;
      at += 1;
    } else if (depth > 0 && (char === ',' || pattern.startsWith('..', at))) {
      const mark = char === ',' ? char : '..';
      push(mark, PUNCT);
      at += mark.length;
    } else {
      push(char, char === '/' ? PUNCT : depth > 0 ? LISTED : undefined);
      at += 1;
    }
  }
  return out;
}

/** A whole bracket expression, from `[` to its `]`. */
function characterClass(text: string, push: (text: string, cls?: string) => void): void {
  push('[', PUNCT);
  let at = 1;
  if (text[at] === '!' || text[at] === '^') {
    push(text[at], NEGATION);
    at += 1;
  }
  const first = at;
  const last = text.length - 1;
  while (at < last) {
    const char = text[at];
    if (char === '\\') {
      push(char, PUNCT);
      push(text[at + 1] ?? '', LISTED);
      at += 2;
    } else {
      // A dash between two members is a range; first or last in the class it is a member.
      const range = char === '-' && at > first && at < last - 1;
      push(char, range ? PUNCT : LISTED);
      at += 1;
    }
  }
  push(']', PUNCT);
}
