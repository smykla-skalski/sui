import type { TokenRun } from '../components/CodeBlock.svelte';

/*
 * Shell wears the roles the common themes give it (Primer, VS Code, Shiki), mapped onto the
 * code palette's own. A variable is a name, as a key is, where it is set and where it is
 * read. A command heads its statement, so it takes the head's weight on the same ink, which
 * also tells it from a variable. A flag is an option's name, as an attribute name is.
 * Operators, the prompt and a line continuation are punctuation, so the commands they join
 * stand out.
 */
const COMMAND = 'tok-head';
const VARIABLE = 'tok-key';
const FLAG = 'tok-const';
const KEYWORD = 'tok-const';
const STRING = 'tok-str';
const COMMENT = 'tok-com';
const PUNCT = 'tok-pun';

/** POSIX reserved words, which only count where a command could start. */
const RESERVED = new Set([
  'if',
  'then',
  'else',
  'elif',
  'fi',
  'case',
  'esac',
  'for',
  'select',
  'while',
  'until',
  'do',
  'done',
  'function',
  'time',
  '!',
  '{',
  '}',
  '[[',
  ']]'
]);

/** Reserved words that a command follows. */
const LEADS = new Set(['if', 'then', 'else', 'elif', 'while', 'until', 'do', 'time', '!', '{']);

const OPERATOR =
  /\d*(?:<<<|<<-?|>>|>&|<&|>\||<>|[<>])(?:&?\d+|-)?|&>>?|\|\||\|&|&&|;;&?|;&|[|&;()]/y;
const SEPARATOR = /^(?:\|\|?|\|&|&&?|;;?&?|;&)$/;
/** A redirection that duplicates a descriptor names no file after it. */
const DUPLICATE = /&(?:\d+|-)$/;
const BARE = /[^\s|&;()<>'"`$\\]*/y;
const HEREDOC = /(\s*)((['"]?)([A-Za-z_][\w-]*)\3)/y;
const EXPANSION = /\$(?:\{[^}]*\}?|[A-Za-z_]\w*|\d|[@*#?$!-])/y;
const ARITHMETIC = /\$\(\((.*?)\)\)/y;
const ASSIGNMENT = /^([A-Za-z_]\w*(?:\[[^\]]*\])?)(\+?=)/;

type Stop = ')' | '`';

/** What a line leaves open for the next: a quote, a continued command, or a here-document. */
interface Carry {
  quote?: "'" | '"';
  continued: boolean;
  heredoc?: { end: string; strip: boolean };
}

class Line {
  out: TokenRun[] = [];
  at = 0;
  heredoc?: Carry['heredoc'];
  readonly text: string;
  readonly carry: Carry;

  constructor(text: string, carry: Carry) {
    this.text = text;
    this.carry = carry;
  }

  push(text: string, cls?: string): void {
    if (text === '') return;
    const last = this.out.at(-1);
    if (last !== undefined && last.cls === cls) last.text += text;
    else this.out.push({ cls, text });
  }

  /** Whether a word ends at `at`: at a space, an operator, the stop or the line's end. */
  ends(at: number, stop?: Stop): boolean {
    const char = this.text[at];
    if (char === undefined || /\s/.test(char) || char === stop) return true;
    OPERATOR.lastIndex = at;
    return /[|&;()<>]/.test(char) && OPERATOR.test(this.text);
  }

  /** Statements up to `stop`, or to the end of the line. */
  statements(command: boolean, stop?: Stop): void {
    let target = false;
    while (this.at < this.text.length) {
      const char = this.text[this.at];
      const space = /\s+/y;
      space.lastIndex = this.at;
      OPERATOR.lastIndex = this.at;
      const operator = OPERATOR.exec(this.text)?.[0];
      if (space.test(this.text)) {
        this.push(this.text.slice(this.at, space.lastIndex));
        this.at = space.lastIndex;
      } else if (char === stop) {
        this.push(char, PUNCT);
        this.at += 1;
        return;
      } else if (char === '#') {
        this.push(this.text.slice(this.at), COMMENT);
        this.at = this.text.length;
      } else if (operator !== undefined) {
        this.push(operator, PUNCT);
        this.at += operator.length;
        if (operator === '(') this.statements(true, ')');
        if (/^<<-?$/.test(operator)) this.delimiter(operator === '<<-');
        else if (SEPARATOR.test(operator)) command = true;
        else if (/[<>]/.test(operator)) target = !DUPLICATE.test(operator);
        else command = false;
      } else if (target) {
        this.word(false, stop);
        target = false;
      } else command = this.word(command, stop);
    }
  }

  delimiter(strip: boolean): void {
    HEREDOC.lastIndex = this.at;
    const found = HEREDOC.exec(this.text);
    if (found === null) return;
    this.push(found[1]);
    this.push(found[2], PUNCT);
    this.at = HEREDOC.lastIndex;
    this.heredoc = { end: found[4], strip };
  }

  /** One word, colored by what its literal head says it is; returns whether a command may follow. */
  word(command: boolean, stop?: Stop): boolean {
    BARE.lastIndex = this.at;
    const head = BARE.exec(this.text)?.[0] ?? '';
    if (command && RESERVED.has(head) && this.ends(this.at + head.length, stop)) {
      this.push(head, KEYWORD);
      this.at += head.length;
      return LEADS.has(head);
    }
    const assignment = ASSIGNMENT.exec(head);
    if (assignment !== null) {
      this.push(assignment[1], VARIABLE);
      this.push(assignment[2], PUNCT);
      this.at += assignment[0].length;
      this.rest(undefined, stop);
      return command;
    }
    // A flag never starts a command, so a flag on a line drawn without the one it continues
    // still reads as a flag.
    if (head.length > 1 && head.startsWith('-')) {
      const equals = head.indexOf('=');
      if (equals > 0) {
        this.push(head.slice(0, equals), FLAG);
        this.push('=', PUNCT);
        this.at += equals + 1;
        this.rest(undefined, stop);
      } else this.rest(FLAG, stop);
      return false;
    }
    this.rest(command ? COMMAND : undefined, stop);
    return false;
  }

  /** The rest of a word: its literal stretches wear `role`, its quotes and expansions their own. */
  rest(role: string | undefined, stop?: Stop): void {
    while (!this.ends(this.at, stop)) {
      const char = this.text[this.at];
      if (char === '\\' && this.at === this.text.length - 1) {
        this.push(char, PUNCT);
        this.carry.continued = true;
        this.at += 1;
      } else if (char === '\\') {
        this.push(this.text.slice(this.at, this.at + 2), role);
        this.at += 2;
      } else if (char === "'" || this.text.startsWith("$'", this.at)) this.single(char === '$');
      else if (char === '"') {
        this.push(char, STRING);
        this.at += 1;
        this.double();
      } else if (!this.expansion(stop)) {
        this.push(char, role);
        this.at += 1;
      }
    }
  }

  /** A single-quoted string, or an ANSI-C one (`$'…'`) whose quote may be escaped. */
  single(escapes: boolean): void {
    let close = -1;
    for (let at = this.at + (escapes ? 2 : 1); at < this.text.length && close === -1; at += 1) {
      if (escapes && this.text[at] === '\\') at += 1;
      else if (this.text[at] === "'") close = at;
    }
    const end = close === -1 ? this.text.length : close + 1;
    if (close === -1) this.carry.quote = "'";
    this.push(this.text.slice(this.at, end), STRING);
    this.at = end;
  }

  /** `$name`, `${…}`, `$((…))`, `$(…)` or backquotes at the cursor; false when there is none. */
  expansion(stop?: Stop): boolean {
    ARITHMETIC.lastIndex = this.at;
    const arithmetic = ARITHMETIC.exec(this.text);
    EXPANSION.lastIndex = this.at;
    const variable = EXPANSION.exec(this.text);
    if (arithmetic !== null) {
      this.push('$((', PUNCT);
      this.push(arithmetic[1]);
      this.push('))', PUNCT);
      this.at = ARITHMETIC.lastIndex;
    } else if (this.text.startsWith('$(', this.at) || this.text[this.at] === '`') {
      const opener = this.text[this.at] === '`' ? '`' : '$(';
      if (opener === stop) return false;
      this.push(opener, PUNCT);
      this.at += opener.length;
      this.statements(true, opener === '`' ? '`' : ')');
    } else if (variable !== null) {
      this.push(variable[0], VARIABLE);
      this.at = EXPANSION.lastIndex;
    } else return false;
    return true;
  }

  /** The inside of a double-quoted string, after its opening quote. */
  double(): void {
    while (this.at < this.text.length) {
      const char = this.text[this.at];
      if (char === '"') {
        this.push(char, STRING);
        this.at += 1;
        return;
      }
      if (char === '\\') {
        const continued = this.at === this.text.length - 1;
        this.push(this.text.slice(this.at, this.at + 2), continued ? PUNCT : STRING);
        this.at += 2;
      } else if (!this.expansion()) {
        this.push(char, STRING);
        this.at += 1;
      }
    }
    this.carry.quote = '"';
  }
}

function shellLine(text: string, carry: Carry): TokenRun[] {
  const line = new Line(text, carry);
  const { heredoc, quote, continued } = carry;
  if (heredoc !== undefined) {
    const ends = (heredoc.strip ? text.replace(/^\t+/, '') : text) === heredoc.end;
    if (ends) carry.heredoc = undefined;
    line.push(text, ends ? PUNCT : STRING);
    return line.out;
  }
  carry.quote = undefined;
  carry.continued = false;
  if (quote === "'") {
    const close = text.indexOf("'");
    line.at = close === -1 ? text.length : close + 1;
    line.push(text.slice(0, line.at), STRING);
    if (close === -1) carry.quote = quote;
  } else if (quote === '"') line.double();
  const fresh = !continued && quote === undefined;
  const prompt = fresh ? /^(\s*)(\$)(?= )/.exec(text) : null;
  if (prompt !== null) {
    line.push(prompt[1]);
    line.push(prompt[2], PUNCT);
    line.at = prompt[0].length;
  }
  line.statements(fresh);
  carry.heredoc = line.heredoc;
  return line.out;
}

/**
 * Colors shell line by line, carrying what a line leaves open (a quote, a continued command,
 * a here-document) to the next, so a continued line reads as arguments, not as a command.
 */
export function tokenizeShell(lines: readonly string[]): TokenRun[][] {
  const carry: Carry = { continued: false };
  return lines.map((text) => shellLine(text, carry));
}
