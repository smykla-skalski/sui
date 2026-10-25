import type { ChartPoint } from './types.js';

/**
 * A length the browser resolves rather than the script: so many pixels, rems, ems of the chart's
 * own text and hundredths of the plot's width (`cqi`, the plot being its own container), plus
 * multiples of a larger or smaller of several lengths, a length rounded to the pixel, or a
 * custom property. A server render knows none of those sizes, so a plot laid out in these
 * lengths draws exactly where its hydrated self does, at any width and text size.
 */
export type Length = {
  px: number;
  rem: number;
  em: number;
  cqi: number;
  parts: Part[];
};

type Part =
  | { by: number; pick: 'max' | 'min'; of: Length[] }
  | { by: number; pick: 'up' | 'down'; of: [Length] }
  | { by: number; name: string; value: Length };

/** The sizes a length resolves against: an em, a rem and the plot's width, in pixels. */
export type Sizes = { em: number; rem: number; width: number };

const zero: Length = { px: 0, rem: 0, em: 0, cqi: 0, parts: [] };

export const px = (value: number): Length => ({ ...zero, px: value });
export const rem = (value: number): Length => ({ ...zero, rem: value });
export const em = (value: number): Length => ({ ...zero, em: value });
/** A share of the plot's width, 0 at its start and 1 at its end. */
export const share = (value: number): Length => ({ ...zero, cqi: value * 100 });

/* The same pick or property taken twice adds up to one term, so a sum such as a plot's start
   less a share of it is written once. */
const alike = (a: Part, b: Part) =>
  'name' in a
    ? 'name' in b && a.name === b.name
    : !('name' in b) && a.pick === b.pick && a.of === b.of;

export function plus(...lengths: Length[]): Length {
  const parts: Part[] = [];
  for (const part of lengths.flatMap((length) => length.parts)) {
    const at = parts.findIndex((other) => alike(other, part));
    if (at < 0) parts.push(part);
    else parts[at] = { ...parts[at], by: parts[at].by + part.by };
  }
  return {
    px: lengths.reduce((sum, length) => sum + length.px, 0),
    rem: lengths.reduce((sum, length) => sum + length.rem, 0),
    em: lengths.reduce((sum, length) => sum + length.em, 0),
    cqi: lengths.reduce((sum, length) => sum + length.cqi, 0),
    parts: parts.filter((part) => Math.abs(part.by) > 1e-12)
  };
}

export function times(length: Length, by: number): Length {
  return {
    px: length.px * by,
    rem: length.rem * by,
    em: length.em * by,
    cqi: length.cqi * by,
    parts: by === 0 ? [] : length.parts.map((part) => ({ ...part, by: part.by * by }))
  };
}

export const minus = (a: Length, b: Length): Length => plus(a, times(b, -1));

const linear = (length: Length) => length.parts.length === 0;

/* Every unit is a positive size, so a length whose every coefficient is at least another's is
   at least as long, whatever the sizes turn out to be. */
const atLeast = (a: Length, b: Length) =>
  linear(a) && linear(b) && a.px >= b.px && a.rem >= b.rem && a.em >= b.em && a.cqi >= b.cqi;

function pick(kind: 'max' | 'min', lengths: Length[]): Length {
  const flat = lengths.flatMap((length) => {
    const [part] = length.parts;
    const lone =
      length.parts.length === 1 &&
      'pick' in part &&
      part.pick === kind &&
      part.by === 1 &&
      length.px === 0 &&
      length.rem === 0 &&
      length.em === 0 &&
      length.cqi === 0;
    return lone ? part.of : [length];
  });
  const wins = (a: Length, b: Length) => (kind === 'max' ? atLeast(a, b) : atLeast(b, a));
  const kept = flat.filter(
    (length, index) =>
      !flat.some(
        (other, at) => at !== index && wins(other, length) && (!wins(length, other) || at < index)
      )
  );
  const written = new Set<string>();
  const unique = kept.filter((length) => !written.has(css(length)) && written.add(css(length)));
  return unique.length === 1 ? unique[0] : { ...zero, parts: [{ by: 1, pick: kind, of: unique }] };
}

export const most = (...lengths: Length[]): Length => pick('max', lengths);
export const least = (...lengths: Length[]): Length => pick('min', lengths);

/** Rounded up to the next whole pixel, as a box's height is. */
export const roundUp = (length: Length): Length => ({
  ...zero,
  parts: [{ by: 1, pick: 'up', of: [length] }]
});

/** Rounded down to a whole pixel. */
export const roundDown = (length: Length): Length => ({
  ...zero,
  parts: [{ by: 1, pick: 'down', of: [length] }]
});

/** `value` held in the custom property `name`, so a length used many times is written once. */
export const named = (name: string, value: Length): Length => ({
  ...zero,
  parts: [{ by: 1, name, value }]
});

/** The length with every custom property it reads written out, for a box that declares none. */
export function inlined(length: Length): Length {
  return plus(
    { ...length, parts: [] },
    ...length.parts.map((part) =>
      'name' in part
        ? times(inlined(part.value), part.by)
        : { ...zero, parts: [{ ...part, of: part.of.map(inlined) } as Part] }
    )
  );
}

/** The length in pixels, for the given sizes. */
export function resolve(length: Length, sizes: Sizes): number {
  let sum =
    length.px + length.rem * sizes.rem + length.em * sizes.em + (length.cqi / 100) * sizes.width;
  for (const part of length.parts) {
    if ('name' in part) sum += part.by * resolve(part.value, sizes);
    else {
      const values = part.of.map((of) => resolve(of, sizes));
      const value =
        part.pick === 'max'
          ? Math.max(...values)
          : part.pick === 'min'
            ? Math.min(...values)
            : part.pick === 'up'
              ? Math.ceil(values[0])
              : Math.floor(values[0]);
      sum += part.by * value;
    }
  }
  return sum;
}

/* Four decimals of a pixel, a rem or an em place every mark well inside a hundredth of a pixel. */
const number = (value: number, decimals = 4) => {
  const text = String(+value.toFixed(decimals));
  return text === '-0' ? '0' : text;
};

function terms(length: Length): string[] {
  const out: string[] = [];
  for (const [value, unit] of [
    [length.px, 'px'],
    [length.rem, 'rem'],
    [length.em, 'em'],
    [length.cqi, 'cqi']
  ] as const)
    if (number(value) !== '0') out.push(`${number(value)}${unit}`);
  for (const part of length.parts) {
    const inner =
      'name' in part
        ? `var(${part.name})`
        : part.pick === 'up' || part.pick === 'down'
          ? `round(${part.pick}, ${expression(part.of[0])}, 1px)`
          : `${part.pick}(${part.of.map(expression).join(', ')})`;
    out.push(part.by === 1 ? inner : `${inner} * ${number(part.by, 6)}`);
  }
  return out;
}

/* A sum as it reads inside a math function, where a sum needs no calc() of its own. */
function expression(length: Length): string {
  const out = terms(length);
  if (out.length === 0) return '0px';
  return out.reduce((sum, term) =>
    term.startsWith('-') ? `${sum} - ${term.slice(1)}` : `${sum} + ${term}`
  );
}

/** The length as a CSS value, such as `12px`, `max(2em, 1rem)` or `calc(…)`. */
export function css(length: Length): string {
  const out = terms(length);
  if (out.length === 0) return '0px';
  if (out.length === 1 && !out[0].startsWith('-') && !out[0].includes(' * ')) return out[0];
  return `calc(${expression(length)})`;
}

/** What a `named` length's custom property holds, as a CSS value. */
export function definition(length: Length): string {
  const [part] = length.parts;
  return part && 'name' in part ? css(part.value) : css(length);
}

/** The grid's height in a line or scatter, in CSS pixels. */
export const xyGrid = 234;

/**
 * The widest plot a chart thins its points for, in CSS pixels. A line keeps the lowest and the
 * highest point of each of this many slices of its axis, and a scatter one mark in each
 * half-marker square of a plot this wide, so either draws the same marks at every width.
 */
// ponytail: a plot wider than this draws a slice's two points across more than one pixel;
// raise it if charts ever stand wider.
export const thinWidth = 1920;

/**
 * Where a run of text puts ink, in ems of the text it is set in: its advance, how far the ink
 * reaches before its start point (`left`) and past it (`right`), and above (`ascent`) and below
 * (`descent`) its baseline.
 */
export type Ink = { advance: number; left: number; right: number; ascent: number; descent: number };

/** Measures chart text, in the regular or the semibold face. */
export type Measure = (text: string, semibold?: boolean) => Ink;

/* The face's table, read into lookups when a chart first measures its words. */
let lookups:
  | {
      glyphs: Map<string, number>;
      first: Map<string, number>;
      second: Map<string, number>;
      kerning: Map<string, [number, number]>;
    }
  | undefined;

function faceLookups() {
  if (lookups) return lookups;
  const classes = (groups: string[]) =>
    new Map(groups.flatMap((group, index) => [...group].map((glyph) => [glyph, index] as const)));
  const kerning = new Map<string, [number, number]>();
  for (let at = 0; at < KERN_PAIRS.length; at += 4)
    kerning.set(`${KERN_PAIRS[at]} ${KERN_PAIRS[at + 1]}`, [
      KERN_PAIRS[at + 2],
      KERN_PAIRS[at + 3]
    ]);
  return (lookups = {
    glyphs: new Map([...GLYPHS].map((glyph, index) => [glyph, index])),
    first: classes(KERN_FIRST),
    second: classes(KERN_SECOND),
    kerning
  });
}

/**
 * The ink of `text` in the face chart text is set in, laid out as the browser shapes it with
 * kerning and without ligatures: each glyph's advance, moved by its pair's kerning, and the
 * union of the glyphs' ink. Null when a character is not in the face, so it is drawn in
 * another one whose glyphs only the browser knows.
 */
export function faceInk(text: string, semibold = false): Ink | null {
  const face = semibold ? SEMIBOLD : REGULAR;
  const { glyphs, first, second, kerning } = faceLookups();
  let pen = 0;
  let start = Infinity;
  let end = -Infinity;
  let ascent = -Infinity;
  let descent = -Infinity;
  let previous = '';
  for (const glyph of text) {
    const index = glyphs.get(glyph);
    if (index === undefined) return null;
    const pair = kerning.get(`${first.get(previous)} ${second.get(glyph)}`);
    if (pair) pen += pair[Number(semibold)];
    const [advance, left, right, up, down] = face.slice(index * 5, index * 5 + 5);
    if (left + right > 0) {
      start = Math.min(start, pen - left);
      end = Math.max(end, pen + right);
      ascent = Math.max(ascent, up);
      descent = Math.max(descent, down);
    }
    pen += advance;
    previous = glyph;
  }
  if (end === -Infinity) return { advance: pen / 1000, left: 0, right: 0, ascent: 0, descent: 0 };
  return {
    advance: pen / 1000,
    left: -start / 1000,
    right: end / 1000,
    ascent: ascent / 1000,
    descent: descent / 1000
  };
}

/** An even guess at the ink of text in a face the table does not hold, until it is measured. */
export function guessInk(text: string): Ink {
  const advance = [...text].length * 0.56;
  return { advance, left: 0, right: advance, ascent: 0.72, descent: 0 };
}

/** The inline extent of the ink of text drawn at `x` with SVG `text-anchor` `anchor`, in ems. */
export function inkSpan(
  ink: Ink,
  x: number,
  anchor: 'start' | 'middle' | 'end' = 'start'
): [number, number] {
  const start = x - (anchor === 'end' ? ink.advance : anchor === 'middle' ? ink.advance / 2 : 0);
  return [start - ink.left, start + ink.right];
}

/** The baseline that centres the ink of text on `y`. */
export function centred(ink: Ink, y: Length): Length {
  return plus(y, em((ink.ascent - ink.descent) / 2));
}

/**
 * Something drawn at a share `at` of the plot's width, 0 at its start and 1 at its end, whose
 * ink reaches `past` beyond that point towards the end.
 */
export type Reach = { at: number; past: Length };

/**
 * The plot's end that puts the furthest ink exactly on `width`. Each reach ends at
 * `start + at * (end - start) + past`, which grows with `end`, so the tightest one sets it.
 */
export function plotEnd(start: Length, width: Length, reaches: Reach[]): Length {
  return least(
    width,
    ...reaches
      .filter(({ at }) => at > 0)
      .map(({ at, past }) => plus(start, times(minus(minus(width, start), past), 1 / at)))
  );
}

/** Where a share `at` of the plot's width falls between its `start` and its `end`. */
export const along = (start: Length, end: Length, at: number): Length =>
  plus(times(start, 1 - at), times(end, at));

/** A tick's place as a share of its axis, and its words. */
export type Tick = { at: number; text: string };

/**
 * A mark's place as shares of the plot, `x` from its start and `y` from its bottom, and how
 * far its ink reaches from there across, above and below, in CSS pixels.
 */
export type MarkReach = { x: number; y: number; across: number; above: number; below: number };

/** Ticks of `values` laid out along their domain. */
export function ticksOf(
  values: number[],
  domain: [number, number],
  format: (value: number) => string
): Tick[] {
  return values.map((value) => ({
    at: (value - domain[0]) / (domain[1] - domain[0]),
    text: format(value)
  }));
}

const largest = (values: number[]) => Math.max(0, ...values);

/** The highest ink top and the lowest ink bottom of a row of text on one baseline. */
const lineInk = (inks: Ink[]) => ({
  ascent: largest(inks.map((ink) => ink.ascent)),
  descent: largest(inks.map((ink) => ink.descent))
});

/* A box's height rounds up to the pixel; the rounding spares a sum that misses a whole pixel
   by a float's error. */
const tall = (length: Length) => roundUp(minus(length, px(0.001)));

export type XYLayout = {
  height: Length;
  /** The plot's edges: the first and the last x tick, the top and the bottom y tick. */
  left: Length;
  right: Length;
  top: Length;
  bottom: Length;
  /** Where the y tick labels end, left of the plot. */
  tickEnd: Length;
  /** The rotated y title's baseline and its centre along the plot. */
  yTitle: { x: Length; y: Length };
  xTickBaseline: Length;
  xTitleBaseline: Length;
  /** Each line name's baseline, and how far right of its line's last point it starts. */
  names: Length[];
  nameGap: Length;
};

/**
 * A line or scatter laid out to its ink in lengths the browser resolves: the y title's ink
 * starts at 0, the furthest of the x ticks, the marks and the line names ends at the plot's
 * full width, the highest ink sits at 0 and the lowest at the height. The plot takes whatever
 * room the words leave, so the chart starts and ends exactly at the edges of the room it has,
 * however wide that is. Words are measured in ems and gaps set in rems, so the margins grow
 * with the reader's text size.
 */
export function xyLayout(input: {
  measure: Measure;
  xTicks: Tick[];
  yTicks: Tick[];
  xLabel: string;
  yLabel: string;
  marks: MarkReach[];
  names: { x: number; y: number; text: string }[];
}): XYLayout {
  const { measure, xTicks, yTicks, marks } = input;
  const tickGap = rem(0.5);
  const titleGap = rem(0.75);
  const nameGap = rem(0.75);
  const xInk = xTicks.map((tick) => measure(tick.text));
  const yInk = yTicks.map((tick) => measure(tick.text));
  const nameInk = input.names.map((name) => measure(name.text, true));
  const yTitle = input.yLabel ? measure(input.yLabel, true) : null;
  const xTitle = input.xLabel ? measure(input.xLabel, true) : null;
  const cap = measure('H', true).ascent;

  // Turned a quarter left, the y title's ascent points to the start, so it reaches 0 there.
  const titleX = em(yTitle?.ascent ?? 0);
  const titleEnd = yTitle ? plus(em(yTitle.ascent + yTitle.descent), titleGap) : px(0);
  const left = named(
    '--sui-local-plot-start',
    most(
      plus(titleEnd, tickGap, em(largest(yInk.map((ink) => ink.advance + ink.left)))),
      ...xInk
        .filter((_, index) => xTicks[index].at === 0)
        .map((ink) => em(-inkSpan(ink, 0, 'middle')[0])),
      ...marks.filter((mark) => mark.x === 0).map((mark) => px(mark.across))
    )
  );
  const right = named(
    '--sui-local-plot-end',
    plotEnd(left, share(1), [
      { at: 1, past: px(0) },
      ...xInk.map((ink, index) => ({
        at: xTicks[index].at,
        past: em(inkSpan(ink, 0, 'middle')[1])
      })),
      ...marks.map((mark) => ({ at: mark.x, past: px(mark.across) })),
      ...nameInk.map((ink, index) => ({
        at: input.names[index].x,
        past: plus(nameGap, em(ink.right))
      }))
    ])
  );

  // Down the plot, laid out from a top of 0 and then moved so the highest ink lands on 0.
  const grid = xyGrid;
  const yAt = (at: number) => grid - at * grid;
  const tops: Length[] = [px(-0.5)];
  const bottoms: Length[] = [px(grid + 0.5)];
  yInk.forEach((ink, index) => {
    const baseline = centred(ink, px(yAt(yTicks[index].at)));
    tops.push(minus(baseline, em(ink.ascent)));
    bottoms.push(plus(baseline, em(ink.descent)));
  });
  for (const mark of marks) {
    tops.push(px(yAt(mark.y) - mark.above));
    bottoms.push(px(yAt(mark.y) + mark.below));
  }
  const names = spread(
    input.names.map((name) => yAt(name.y)),
    rem(1),
    0,
    grid
  ).map((centre) => plus(centre, em(cap / 2)));
  names.forEach((baseline, index) => {
    tops.push(minus(baseline, em(nameInk[index].ascent)));
    bottoms.push(plus(baseline, em(nameInk[index].descent)));
  });
  // The x ticks stand a tick gap under everything the plot draws, the lowest y tick included.
  const ticks = lineInk(xInk);
  const xTickBaseline = plus(most(...bottoms), tickGap, em(ticks.ascent));
  if (yTitle) {
    tops.push(plus(px(grid / 2), em(yTitle.advance / 2 - yTitle.right)));
    bottoms.push(plus(px(grid / 2), em(yTitle.advance / 2 + yTitle.left)));
  }
  let foot = plus(xTickBaseline, em(ticks.descent));
  const xTitleBaseline = plus(foot, titleGap, em(xTitle?.ascent ?? 0));
  if (xTitle) foot = plus(xTitleBaseline, em(xTitle.descent));
  bottoms.push(foot);

  const shift = named('--sui-local-plot-top', times(least(...tops), -1));
  return {
    height: tall(plus(most(...bottoms), shift)),
    left,
    right,
    top: shift,
    bottom: plus(px(grid), shift),
    tickEnd: minus(left, tickGap),
    yTitle: { x: titleX, y: plus(px(grid / 2), shift) },
    xTickBaseline: plus(xTickBaseline, shift),
    xTitleBaseline: plus(xTitleBaseline, shift),
    names: names.map((baseline) => plus(baseline, shift)),
    nameGap
  };
}

export type RangeLayout = {
  height: Length;
  /** The plot's edges: the first and the last tick. */
  left: Length;
  right: Length;
  /** One row's height, and where the row labels end, left of the plot. */
  row: Length;
  labelEnd: Length;
  cap: number;
  tickBaseline: Length;
  titleBaseline: Length;
};

/**
 * A range chart laid out to its ink in lengths the browser resolves: the longest row label
 * starts at 0, the furthest tick label, end or marker ends at the plot's full width, the grid
 * starts at the top and the axis title ends at the bottom.
 */
export function rangeLayout(input: {
  measure: Measure;
  labels: string[];
  ticks: Tick[];
  valueLabel: string;
  marks: Reach[];
}): RangeLayout {
  const { measure, ticks, marks } = input;
  const labelGap = rem(0.75);
  const tickGap = rem(0.5);
  const titleGap = rem(0.75);
  const row = rem(2.625);
  const labelInk = input.labels.map((label) => measure(label));
  const tickInk = ticks.map((tick) => measure(tick.text));
  const title = input.valueLabel ? measure(input.valueLabel, true) : null;
  const left = named(
    '--sui-local-plot-start',
    most(
      plus(labelGap, em(largest(labelInk.map((ink) => ink.advance + ink.left)))),
      ...tickInk
        .filter((_, index) => ticks[index].at === 0)
        .map((ink) => em(-inkSpan(ink, 0, 'middle')[0])),
      ...marks.filter((mark) => mark.at === 0).map((mark) => mark.past)
    )
  );
  // A grid line is a stroke wide, so the last one reaches half a stroke past its tick.
  const right = named(
    '--sui-local-plot-end',
    plotEnd(left, share(1), [
      { at: 1, past: px(0.5) },
      ...tickInk.map((ink, index) => ({
        at: ticks[index].at,
        past: em(inkSpan(ink, 0, 'middle')[1])
      })),
      ...marks
    ])
  );
  const rows = times(row, input.labels.length);
  const tickRow = lineInk(tickInk);
  const tickBaseline = plus(rows, tickGap, em(tickRow.ascent));
  const titleBaseline = plus(tickBaseline, em(tickRow.descent), titleGap, em(title?.ascent ?? 0));
  return {
    height: tall(
      title ? plus(titleBaseline, em(title.descent)) : plus(tickBaseline, em(tickRow.descent))
    ),
    left,
    right,
    row,
    labelEnd: minus(left, labelGap),
    cap: measure('H').ascent,
    tickBaseline,
    titleBaseline
  };
}

export type HeatmapLayout = {
  width: Length;
  height: Length;
  /** Where the first column and the first row of cells start; a cell stands `inset` inside. */
  left: Length;
  top: Length;
  size: Length;
  inset: number;
  labelEnd: Length;
  columnBaseline: Length;
  cap: number;
};

/**
 * A matrix laid out to its ink in lengths the browser resolves: the longest row name starts
 * at 0, the column names' ink tops the matrix at 0, and the last cell, or a column name wider
 * than it, ends the width. Cells keep their size, so the matrix is as wide as its columns.
 */
export function heatmapLayout(input: {
  measure: Measure;
  rows: string[];
  columns: string[];
}): HeatmapLayout {
  const { measure } = input;
  const size = rem(3.25);
  const inset = 2;
  const gap = rem(0.75);
  const rowInk = input.rows.map((name) => measure(name));
  const columnInk = input.columns.map((name) => measure(name));
  const columns = lineInk(columnInk);
  const left = plus(gap, px(-inset), em(largest(rowInk.map((ink) => ink.advance + ink.left))));
  const columnBaseline = em(columns.ascent);
  const top = plus(columnBaseline, em(columns.descent), gap, px(-inset));
  const ends = columnInk.map((ink, index) =>
    plus(left, times(size, index + 0.5), em(inkSpan(ink, 0, 'middle')[1]))
  );
  return {
    width: tall(most(plus(left, times(size, input.columns.length), px(-inset)), ...ends)),
    height: tall(plus(top, times(size, input.rows.length), px(-inset))),
    left,
    top,
    size,
    inset,
    labelEnd: minus(plus(left, px(inset)), gap),
    columnBaseline,
    cap: measure('H').ascent
  };
}

/**
 * Keeps the first and last points and the lowest and highest point of each of `columns` slices
 * of the domain, in order, so a line through far more points than the plot has pixels draws the
 * same peaks for a fraction of the path.
 */
export function thin(
  points: ChartPoint[],
  columns: number,
  domain: [number, number]
): ChartPoint[] {
  if (points.length <= columns * 2) return points;
  const sorted = [...points].sort((a, b) => a.x - b.x);
  const kept: ChartPoint[] = [];
  const span = domain[1] - domain[0] || 1;
  let slice = -1;
  let low: ChartPoint | null = null;
  let high: ChartPoint | null = null;
  const flush = () => {
    if (!low || !high) return;
    if (low === high) kept.push(low);
    else kept.push(...(low.x <= high.x ? [low, high] : [high, low]));
  };
  for (const point of sorted) {
    const at = Math.min(columns - 1, Math.floor(((point.x - domain[0]) / span) * columns));
    if (at !== slice) {
      flush();
      slice = at;
      low = high = point;
    } else {
      if (point.y < (low?.y ?? Infinity)) low = point;
      if (point.y > (high?.y ?? -Infinity)) high = point;
    }
  }
  flush();
  if (kept[0] !== sorted[0]) kept.unshift(sorted[0]);
  if (kept.at(-1) !== sorted.at(-1)) kept.push(sorted[sorted.length - 1]);
  return kept;
}

/**
 * Keeps the first point that lands in each `cell`-pixel square, so a dense scatter draws one
 * mark where many would lie under each other, and the plot holds a bounded number of paths.
 */
export function sieve<T>(points: T[], at: (point: T) => [number, number], cell: number): T[] {
  const taken = new Set<string>();
  return points.filter((point) => {
    const [x, y] = at(point);
    const key = `${Math.floor(x / cell)}:${Math.floor(y / cell)}`;
    if (taken.has(key)) return false;
    taken.add(key);
    return true;
  });
}

export function extent(values: number[], includeZero = false): [number, number] {
  let minimum = Infinity;
  let maximum = -Infinity;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  if (minimum === Infinity) return [0, 1];
  if (includeZero) {
    minimum = Math.min(minimum, 0);
    maximum = Math.max(maximum, 0);
  }
  if (minimum === maximum) {
    const padding = Math.abs(minimum) * 0.1 || 1;
    const lower = minimum - padding;
    const upper = maximum + padding;
    return [
      Number.isFinite(lower) ? lower : -Number.MAX_VALUE,
      Number.isFinite(upper) ? upper : Number.MAX_VALUE
    ];
  }
  return [minimum, maximum];
}

/** Where `value` falls along `domain`, 0 at its start and 1 at its end. */
export function fraction(value: number, domain: [number, number]): number {
  const span = domain[1] - domain[0];
  if (Number.isFinite(span)) return (value - domain[0]) / span;
  return (value / 2 - domain[0] / 2) / (domain[1] / 2 - domain[0] / 2);
}

const STEPS = [1, 2, 2.5, 5, 10];

/**
 * Ticks about `count` strong, 1, 2, 2.5 or 5 times a power of ten apart, with whole steps when
 * every value is whole. The domain runs from the first tick to the last, so it covers every value.
 */
export function axis(
  values: number[],
  includeZero = false,
  count = 5
): { domain: [number, number]; ticks: number[] } {
  const [minimum, maximum] = extent(values, includeZero);
  const whole = values.every((value) => !Number.isFinite(value) || Number.isInteger(value));
  // Divide before subtracting so opposite finite extremes cannot overflow the range.
  const measured = maximum / (count - 1) - minimum / (count - 1);
  const rough = measured || Number.MIN_VALUE;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step =
    (power > 0
      ? STEPS.map((multiple) => multiple * power).find(
          (candidate) => candidate >= rough && (!whole || Number.isInteger(candidate))
        )
      : Number.MIN_VALUE) ?? rough;
  const tick = (index: number) => {
    const value = index * step;
    if (!Number.isFinite(value)) return Math.sign(value) * Number.MAX_VALUE;
    return Math.abs(value) < 1e15 ? Number(value.toPrecision(15)) : value;
  };
  const edge = (quotient: number, direction: -1 | 1) => {
    const nearest = Math.round(quotient);
    if (Math.abs(quotient - nearest) < 1e-9) {
      const value = tick(nearest);
      if ((direction === -1 && value >= minimum) || (direction === 1 && value <= maximum))
        return nearest;
    }
    return direction === -1 ? Math.floor(quotient) : Math.ceil(quotient);
  };
  const first = edge(minimum / step, -1);
  const last = edge(maximum / step, 1);
  if (first === last) return { domain: [minimum, maximum], ticks: [minimum, maximum] };
  const ticks = Array.from({ length: last - first + 1 }, (_, index) => tick(first + index));
  // Rounding a readable tick must never move the domain inside the data.
  if (ticks[0] > minimum) ticks[0] = minimum;
  if (ticks[ticks.length - 1] < maximum) ticks[ticks.length - 1] = maximum;
  return { domain: [ticks[0], ticks[ticks.length - 1]], ticks };
}

const CHART_SERIES = 5;

export function chartColor(index: number): string {
  return `var(--sui-chart-${(index % CHART_SERIES) + 1})`;
}

export type ChartMarker = 'circle' | 'square' | 'triangle' | 'diamond' | 'cross';

const MARKERS: readonly ChartMarker[] = ['circle', 'square', 'triangle', 'diamond', 'cross'];

/* The first line is solid. Round caps eat into each gap, so the gaps are wider than they read. */
const DASHES: readonly (string | undefined)[] = [undefined, '8 6', '1 6', '12 5 1 5', '4 5'];

/* Past five series the colours come round again, so each later round shifts the shapes by one
   and the dashes by two: up to 25 series, no two share a colour, a shape and a dash. */
const round = (index: number) => Math.floor(index / CHART_SERIES);

/** The shape that tells a series apart without its color, in the same order as its color. */
export function chartMarker(index: number): ChartMarker {
  return MARKERS[(index + round(index)) % CHART_SERIES];
}

/** The dash that tells a line apart without its color. The first line has none. */
export function chartDash(index: number): string | undefined {
  return DASHES[(index + 2 * round(index)) % CHART_SERIES];
}

/* How far past its half size each angular shape reaches, so it weighs the same as a circle. */
const STRETCH = { diamond: 1.3, triangle: 1.25, cross: 1.15 };

/**
 * A marker as an SVG path centred on (`cx`, `cy`). `size` is the side of the box the
 * shape fills; the angular shapes reach a little past it so they weigh the same as a circle.
 */
export function markerPath(shape: ChartMarker, cx: number, cy: number, size: number): string {
  const r = size / 2;
  const at = (points: [number, number][]) =>
    `M ${points.map(([dx, dy]) => `${cx + dx} ${cy + dy}`).join(' L ')} Z`;
  if (shape === 'circle')
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
  if (shape === 'square')
    return at([
      [-r, -r],
      [r, -r],
      [r, r],
      [-r, r]
    ]);
  if (shape === 'diamond') {
    const d = r * STRETCH.diamond;
    return at([
      [0, -d],
      [d, 0],
      [0, d],
      [-d, 0]
    ]);
  }
  if (shape === 'triangle') {
    const t = r * STRETCH.triangle;
    return at([
      [0, -t],
      [t, t * 0.8],
      [-t, t * 0.8]
    ]);
  }
  const arm = r * STRETCH.cross;
  const w = size / 6;
  return at([
    [-w, -arm],
    [w, -arm],
    [w, -w],
    [arm, -w],
    [arm, w],
    [w, w],
    [w, arm],
    [-w, arm],
    [-w, w],
    [-arm, w],
    [-arm, -w],
    [-w, -w]
  ]);
}

/** How far a marker of `size` reaches from its centre: to either side, above and below. */
export function markerReach(
  shape: ChartMarker,
  size: number
): { across: number; above: number; below: number } {
  const r = size / 2;
  if (shape === 'circle' || shape === 'square') return { across: r, above: r, below: r };
  const reach = r * STRETCH[shape];
  return { across: reach, above: reach, below: shape === 'triangle' ? reach * 0.8 : reach };
}

/**
 * Moves label centres apart so no two stand closer than `gap`, keeping their order and,
 * where there is room, staying between `min` and `max`. Labels already apart do not move.
 */
export function spread(values: number[], gap: Length, min: number, max: number): Length[] {
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const placed = order.map((item) => px(item.value));
  for (let at = 0; at < placed.length; at++)
    placed[at] = most(placed[at], at === 0 ? px(min) : plus(placed[at - 1], gap));
  for (let at = placed.length - 1; at >= 0; at--)
    placed[at] = least(placed[at], at === placed.length - 1 ? px(max) : minus(placed[at + 1], gap));
  const result = new Array<Length>(values.length);
  order.forEach((item, at) => (result[item.index] = placed[at]));
  return result;
}

/* The Latin face of SUI Plus Jakarta Sans as Chrome draws it at 1000px: each glyph measured
   alone with `measureText`, and each pair in SVG text set as chart text is, with no
   ligature or contextual form. The fraction slash is left out, since a shaper sets the digits
   beside it as a fraction whatever the text asks, and so are the hyphens and the replacement
   mark the face lacks, which each system draws from a fallback face of its own; the spaces it
   lacks stay, since the shaper sets them from the face itself. The browser suite checks the
   table against Chrome. */

const GLYPHS =
  ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~ ¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿıŒœˆ˚˜           –—‘’‚“”„•… ′″‹› €™↑↓−∕';

/* Five numbers a glyph, in thousandths of an em: its advance, how far its ink reaches before its
   start point and past it, and above and below its baseline. */
const REGULAR = [
  170, 0, 0, 0, 0, 282, -101, 181, 745, 0, 395, -82, 312, 745, -527, 790, -39, 751, 745, 0, 646,
  -55, 580, 845, 100, 974, -52, 921, 757, 12, 734, -56, 695, 757, 12, 245, -82, 162, 745, -527, 295,
  -48, 275, 745, 140, 295, -20, 247, 745, 140, 479, -53, 425, 745, -383, 606, -53, 553, 500, 0, 270,
  -80, 180, 110, 130, 498, -74, 424, 303, -233, 286, -103, 183, 110, 0, 429, -2, 427, 704, 120, 732,
  -72, 660, 757, 12, 371, -41, 261, 745, 0, 600, -52, 542, 757, 0, 609, -46, 546, 745, 12, 630, -46,
  586, 745, 0, 616, -52, 552, 745, 12, 597, -60, 540, 745, 12, 543, -43, 498, 745, 0, 628, -64, 564,
  757, 12, 597, -57, 537, 757, 0, 286, -103, 183, 536, 0, 306, -103, 203, 536, 130, 606, -124, 534,
  497, -39, 606, -78, 528, 406, -96, 606, -72, 482, 497, -39, 499, -35, 455, 757, 0, 929, -66, 896,
  620, 207, 652, -11, 641, 745, 0, 693, -88, 638, 745, 0, 781, -66, 726, 757, 12, 742, -88, 698,
  745, 0, 612, -88, 568, 745, 0, 581, -88, 548, 745, 0, 821, -66, 766, 757, 12, 736, -88, 648, 745,
  0, 256, -88, 168, 745, 0, 383, -55, 295, 745, 0, 654, -88, 643, 745, 0, 531, -88, 498, 745, 0,
  836, -88, 748, 745, 0, 736, -88, 648, 745, 0, 878, -66, 812, 757, 12, 643, -88, 588, 745, 0, 878,
  -66, 812, 757, 90, 641, -88, 608, 745, 0, 646, -55, 580, 757, 12, 512, -11, 501, 745, 0, 700, -85,
  615, 745, 12, 652, -11, 641, 745, 0, 984, -11, 973, 745, 0, 597, -11, 586, 745, 0, 623, -11, 612,
  745, 0, 584, -22, 562, 745, 0, 315, -88, 288, 745, 140, 429, -2, 427, 705, 120, 315, -27, 227,
  745, 140, 606, -99, 507, 745, -425, 598, -74, 524, 0, 70, 352, -103, 293, 790, -640, 572, -55,
  495, 548, 12, 667, -77, 612, 757, 12, 600, -55, 545, 548, 12, 667, -55, 590, 757, 12, 615, -55,
  560, 548, 12, 393, -25, 355, 757, 0, 662, -55, 585, 548, 220, 573, -77, 507, 757, 0, 229, -77,
  152, 745, 0, 229, 63, 152, 745, 220, 548, -77, 537, 757, 0, 229, -77, 152, 757, 0, 908, -77, 842,
  548, 0, 573, -77, 507, 548, 0, 655, -55, 600, 548, 12, 667, -77, 612, 548, 200, 667, -55, 590,
  548, 200, 338, -77, 327, 543, 0, 509, -44, 454, 548, 12, 388, -33, 333, 660, 6, 573, -66, 496,
  536, 12, 517, -11, 506, 536, 0, 797, -11, 786, 536, 0, 487, -11, 476, 536, 0, 536, -11, 525, 536,
  220, 449, -22, 427, 536, 0, 317, -20, 290, 745, 140, 300, -110, 190, 845, 190, 317, -27, 297, 745,
  140, 606, -81, 526, 360, -220, 170, 0, 0, 0, 0, 282, -101, 181, 536, 209, 600, -55, 545, 745, 0,
  643, -44, 599, 757, 0, 588, -55, 533, 508, -30, 623, -11, 612, 745, 0, 300, -110, 190, 845, 190,
  529, -44, 474, 757, 105, 436, -103, 383, 740, -640, 895, -63, 832, 757, 12, 455, -55, 378, 755,
  -361, 540, -29, 511, 459, -79, 606, -53, 553, 288, -40, 639, -63, 576, 784, -272, 440, -103, 373,
  730, -660, 482, -81, 401, 757, -440, 606, -53, 553, 565, 0, 427, -36, 385, 753, -223, 436, -35,
  396, 745, -215, 352, -103, 293, 790, -640, 573, -66, 496, 536, 140, 398, -48, 288, 745, 100, 286,
  -103, 183, 323, -213, 382, -103, 318, 10, 230, 302, -21, 197, 745, -223, 503, -55, 448, 755, -361,
  540, -29, 511, 459, -79, 891, -21, 852, 745, 0, 852, -21, 810, 745, 0, 982, -35, 943, 745, 0, 499,
  -44, 464, 536, 221, 652, -11, 641, 999, 0, 652, -11, 641, 999, 0, 652, -11, 641, 999, 0, 652, -11,
  641, 976, 0, 652, -11, 641, 949, 0, 652, -11, 641, 1044, 0, 985, -11, 941, 745, 0, 781, -66, 726,
  757, 230, 612, -88, 568, 999, 0, 612, -88, 568, 999, 0, 612, -88, 568, 999, 0, 612, -88, 568, 949,
  0, 256, 24, 168, 999, 0, 256, -88, 280, 999, 0, 256, 34, 291, 999, 0, 256, 12, 268, 949, 0, 742,
  -28, 698, 745, 0, 736, -88, 648, 976, 0, 878, -66, 812, 999, 12, 878, -66, 812, 999, 12, 878, -66,
  812, 999, 12, 878, -66, 812, 976, 12, 878, -66, 812, 949, 12, 606, -85, 521, 435, 0, 878, -66,
  812, 757, 12, 700, -85, 615, 999, 12, 700, -85, 615, 999, 12, 700, -85, 615, 999, 12, 700, -85,
  615, 949, 12, 623, -11, 612, 999, 0, 635, -80, 580, 745, 0, 603, -88, 548, 757, 150, 572, -55,
  495, 790, 12, 572, -55, 495, 790, 12, 572, -55, 495, 790, 12, 572, -55, 495, 767, 12, 572, -55,
  495, 740, 12, 572, -55, 495, 835, 12, 983, -55, 928, 548, 12, 600, -55, 545, 548, 230, 615, -55,
  560, 790, 12, 615, -55, 560, 790, 12, 615, -55, 560, 790, 12, 615, -55, 560, 740, 12, 199, 53,
  137, 790, 0, 199, -61, 251, 790, 0, 199, 63, 262, 790, 0, 199, 41, 239, 740, 0, 655, -55, 600,
  795, 12, 573, -77, 507, 767, 0, 655, -55, 600, 790, 12, 655, -55, 600, 790, 12, 655, -55, 600,
  790, 12, 655, -55, 600, 767, 12, 655, -55, 600, 740, 12, 606, -53, 553, 500, 0, 655, -41, 615,
  548, 12, 573, -66, 496, 790, 12, 573, -66, 496, 790, 12, 573, -66, 496, 790, 12, 573, -66, 496,
  740, 12, 536, -11, 525, 790, 220, 667, -77, 612, 745, 200, 536, -11, 525, 740, 220, 199, -62, 137,
  536, 0, 1261, -66, 1217, 757, 12, 1085, -55, 1030, 548, 12, 480, -103, 428, 790, -640, 386, -103,
  323, 835, -620, 480, -103, 421, 767, -640, 500, 0, 0, 0, 0, 1000, 0, 0, 0, 0, 500, 0, 0, 0, 0,
  1000, 0, 0, 0, 0, 333.33, 0, 0, 0, 0, 250, 0, 0, 0, 0, 166.67, 0, 0, 0, 0, 732, 0, 0, 0, 0, 286,
  0, 0, 0, 0, 205, 0, 0, 0, 0, 62.5, 0, 0, 0, 0, 568, -74, 494, 303, -233, 898, -74, 824, 303, -233,
  270, -80, 180, 757, -527, 270, -80, 180, 745, -515, 270, -80, 180, 110, 120, 420, -80, 330, 757,
  -527, 420, -80, 330, 745, -515, 420, -80, 330, 110, 120, 536, -103, 433, 433, -103, 686, -103,
  583, 110, 0, 85, 0, 0, 0, 0, 295, -110, 190, 745, -527, 445, -110, 340, 745, -527, 300, -29, 271,
  459, -79, 300, -29, 271, 459, -79, 222.22, 0, 0, 0, 0, 777, -33, 722, 757, 12, 963, -48, 853, 745,
  -298, 642, -53, 589, 614, 0, 642, -64, 600, 614, 0, 606, -78, 528, 288, -213, 501, -38, 463, 805,
  60
];

const SEMIBOLD = [
  175, 0, 0, 0, 0, 341, -113, 228, 745, 0, 463.5, -91.5, 371, 745, -483.5, 873, -54.5, 818.5, 745,
  0, 646.5, -44, 591.5, 845, 100, 1022, -66, 955.5, 757, 12, 773.5, -69.5, 719.5, 757, 12, 289,
  -91.5, 196.5, 745, -483.5, 351, -58.5, 320, 745, 160, 351, -31, 292.5, 745, 160, 519.5, -67, 452,
  745, -370.5, 642, -71, 571, 500, 0, 328, -95, 230, 130, 147.5, 566, -83, 483, 320.5, -220.5, 347,
  -116, 231, 130, 0, 480.5, -11, 469.5, 704.5, 120, 716, -61, 655, 757, 12, 392, -33, 293, 745, 0,
  598, -44.5, 544.5, 757, 0, 610.5, -36.5, 556.5, 745, 12, 646, -39, 609, 745, 0, 615, -44, 559,
  745, 12, 600.5, -48.5, 553.5, 745, 12, 553.5, -35, 516, 745, 0, 630.5, -55.5, 575.5, 757, 12,
  600.5, -47, 552, 757, 0, 347, -116, 231, 541, 0, 367, -116, 251, 541, 147.5, 642, -106.5, 549,
  520, -21.5, 642, -96, 546, 411, -71, 642, -93, 535.5, 520, -21.5, 555, -48, 498, 757, 0, 927.5,
  -55, 900, 631, 214.5, 692, -11, 681, 745, 0, 691.5, -77, 647.5, 745, 0, 776.5, -55, 732.5, 757,
  12, 740.5, -77, 702, 745, 0, 600.5, -77, 567.5, 745, 0, 584, -77, 562, 745, 0, 812.5, -55, 770,
  757, 12, 734, -77, 657, 745, 0, 271.5, -77, 194.5, 745, 0, 389.5, -44, 314, 745, 0, 670.5, -77,
  659.5, 745, 0, 539, -77, 517, 745, 0, 874, -77, 797, 745, 0, 739, -77, 662, 745, 0, 878, -55, 823,
  757, 12, 646, -77, 602, 745, 0, 878, -55, 823, 757, 90, 654, -77, 632, 745, 0, 646.5, -44, 591.5,
  757, 12, 532, -11, 521, 745, 0, 712, -71, 641, 745, 12, 682, -11, 671, 745, 0, 1008, -11, 997,
  745, 0, 639.5, -11, 628.5, 745, 0, 647.5, -11, 636.5, 745, 0, 575.5, -16.5, 559, 745, 0, 382, -99,
  339, 745, 160, 480.5, -11, 469.5, 705, 120, 382, -43, 283, 745, 160, 642, -98, 544.5, 745, -421.5,
  641, -83, 558, 0, 100, 371.5, -116, 337, 805, -640, 577.5, -44, 511.5, 553, 12, 670, -66, 626,
  757, 12, 605.5, -44, 561.5, 553, 12, 670, -44, 604, 757, 12, 613, -44, 569, 553, 12, 401.5, -27,
  372, 757, 0, 655, -44, 589, 553, 220, 586, -66, 531, 757, 0, 244.5, -66, 178.5, 745, 0, 244.5, 64,
  178.5, 745, 221, 567, -66, 555.5, 757, 0, 244.5, -66, 178.5, 757, 0, 918.5, -66, 863.5, 553, 0,
  586, -66, 531, 553, 0, 653, -44, 609, 553, 12, 670, -66, 626, 553, 200, 670, -44, 604, 553, 200,
  362, -66, 351, 547.5, 0, 512, -33, 467, 553, 12, 404.5, -25.5, 360.5, 665, 6, 586, -55, 520, 541,
  12, 549.5, -11, 538.5, 541, 0, 854.5, -11, 843.5, 541, 0, 534.5, -11.5, 523.5, 541, 0, 569, -11,
  558, 541, 220, 470.5, -16.5, 454, 541, 0, 371, -34, 328, 745, 160, 363, -124, 239, 845, 190, 371,
  -43, 337, 745, 160, 642, -85.5, 557, 363.5, -200, 175, 0, 0, 0, 0, 341, -113, 228, 541, 204,
  605.5, -44, 561.5, 745, 0, 656.5, -38.5, 618, 757, 0, 592, -44, 548, 521, -17, 647.5, -11, 636.5,
  745, 0, 363, -124, 239, 845, 190, 532, -33, 487, 757, 100, 501.5, -116, 446, 765, -640, 923.5,
  -77, 846.5, 757, 12, 448.5, -44, 382.5, 755, -357, 629, -39.5, 589, 464, -74, 642, -71, 571,
  300.5, -40, 666.5, -77, 589.5, 784, -271.5, 450, -116, 421, 755, -660, 517, -93.5, 423.5, 757,
  -428.5, 642, -71, 571, 580, 0, 415.5, -25, 380, 754, -224, 428.5, -23, 395, 746, -215, 371.5,
  -116, 337, 805, -640, 586, -55, 520, 541, 140, 508.5, -64.5, 384.5, 745, 100, 347, -116, 231,
  335.5, -205.5, 381.5, -116, 354, 10, 235, 310.5, -18, 216, 746, -224, 492, -44, 448, 755, -357,
  629, -40, 589.5, 464, -74, 884, -18, 855, 745, 0, 834, -18, 799, 745, 0, 962.5, -23, 934, 745, 0,
  555, -57, 507, 541, 216, 692, -11, 681, 1009, 0, 692, -11, 681, 1009, 0, 692, -11, 681, 1004, 0,
  692, -11, 681, 993, 0, 692, -11, 681, 969, 0, 692, -11, 681, 1042, 0, 989, -11, 956, 745, 0,
  776.5, -55, 733, 757, 235, 600.5, -77, 568, 1009, 0, 600.5, -77, 568, 1009, 0, 600.5, -77, 568,
  1004, 0, 600.5, -77, 568, 969, 0, 271.5, 29, 195, 1009, 0, 271.5, -77, 301, 1009, 0, 271.5, 48,
  321, 1004, 0, 271.5, 29, 301, 969, 0, 740.5, -20, 702, 745, 0, 739, -77, 662, 993, 0, 878, -55,
  823, 1009, 12, 878, -55, 823, 1009, 12, 878, -55, 823, 1004, 12, 878, -55, 823, 993, 12, 878, -55,
  823, 969, 12, 642, -94.5, 547.5, 452.5, 0, 878, -55, 823, 757, 12, 712, -71, 641, 1009, 12, 712,
  -71, 641, 1009, 12, 712, -71, 641, 1004, 12, 712, -71, 641, 969, 12, 647.5, -11, 637, 1009, 0,
  645, -70, 595, 745, 0, 628.5, -77, 584.5, 757, 155, 577.5, -44, 512, 805, 12, 577.5, -44, 512,
  805, 12, 577.5, -44, 512, 800, 12, 577.5, -44, 512, 789, 12, 577.5, -44, 512, 765, 12, 577.5, -44,
  512, 838, 12, 972, -44, 928, 553, 12, 605.5, -44, 562, 553, 235, 613, -44, 569, 805, 12, 613, -44,
  569, 805, 12, 613, -44, 569, 800, 12, 613, -44, 569, 765, 12, 218.5, 56, 166, 805, 0, 218.5, -53,
  274, 805, 0, 218.5, 75, 294, 800, 0, 218.5, 56, 274, 765, 0, 653, -44, 609, 795.5, 12, 586, -66,
  531, 789, 0, 653, -44, 609, 805, 12, 653, -44, 609, 805, 12, 653, -44, 609, 800, 12, 653, -44,
  609, 789, 12, 653, -44, 609, 765, 12, 642, -71, 571, 500, 0, 653, -25, 629, 553, 12, 586, -55,
  520, 805, 12, 586, -55, 520, 805, 12, 586, -55, 520, 800, 12, 586, -55, 520, 765, 12, 569, -11,
  558, 805, 220, 670, -66, 626, 745, 200, 569, -11, 558, 765, 220, 218.5, -53, 165.5, 541, 0, 1234,
  -55, 1201, 757, 12, 1065, -44, 1021, 553, 12, 520.5, -116, 485, 800, -640, 382.5, -116, 356, 838,
  -605, 510, -116, 485, 789, -640, 500, 0, 0, 0, 0, 1000, 0, 0, 0, 0, 500, 0, 0, 0, 0, 1000, 0, 0,
  0, 0, 333.33, 0, 0, 0, 0, 250, 0, 0, 0, 0, 166.67, 0, 0, 0, 0, 716, 0, 0, 0, 0, 347, 0, 0, 0, 0,
  205, 0, 0, 0, 0, 62.5, 0, 0, 0, 0, 626, -83, 543, 320.5, -220.5, 956, -83, 873, 320.5, -220.5,
  328, -95, 230, 757, -489.5, 328, -95, 230, 745, -477.5, 328, -95, 230, 130, 137.5, 513, -95, 415,
  757, -489.5, 513, -95, 415, 745, -477.5, 513, -95, 415, 130, 137.5, 617, -116, 501, 460.5, -75.5,
  747, -116, 631, 130, 0, 87.5, 0, 0, 0, 0, 346, -124, 229, 745, -483.5, 520.5, -124, 403.5, 745,
  -483.5, 359, -39.5, 319, 464, -74, 359, -40, 319.5, 464, -74, 222.22, 0, 0, 0, 0, 772, -27.5, 728,
  757, 12, 1027.5, -65, 903.5, 745, -298, 682, -70.5, 611.5, 624.5, 0, 682, -110, 651, 624.5, 0,
  642, -96, 546, 300.5, -200.5, 562.5, -52, 510.5, 805, 60
];

/* Glyphs kern by class: the classes a glyph takes as the first of a pair and as the second, and
   each pair of classes that moves, as the two class indexes and the move in the regular and
   the semibold face. */
const KERN_FIRST = [
  '"\'',
  '$S',
  '&',
  '([{',
  ',.‚„…',
  '1',
  '2',
  '6',
  '7',
  '9',
  '@DOQÐÒÓÔÕÖØ',
  'AÀÁÂÃÄÅ',
  'Bß',
  'CÇ',
  'EÆÈÉÊËŒ',
  'F',
  'G',
  'HIMNÌÍÎÏÑ',
  'J',
  'K',
  'L',
  'PÞ',
  'R',
  'T',
  'UÙÚÛÜ',
  'V',
  'W',
  'X',
  'Y¥Ý',
  'Z',
  'aàáâãäå',
  'bop¤ðòóôõöøþ',
  'c¢ç',
  'eæèéêëœ',
  'f',
  'hmnñ',
  'iìíı',
  'j',
  'k',
  'r',
  's§',
  't',
  'vwyýÿ',
  'x',
  'z',
  '¡',
  '¿',
  'îï',
  '‘”',
  '’“'
];

const KERN_SECOND = [
  '"\'',
  '$S',
  ')',
  ',.‚„…',
  '1',
  '4',
  '5',
  '6',
  '9',
  '?',
  '@CGOQÇÒÓÔÕÖØŒ',
  'AÀÁÂÃÄÅÆ',
  'J',
  'T',
  'UÙÚÛÜ',
  'V',
  'W',
  'X',
  'Y¥Ý',
  ']',
  'aàáâãäåæ',
  'bhkþ',
  'cdegoq¢¤çèéêëðòóôõöøœ',
  'f',
  'iìíı',
  'j',
  'l',
  'mnprñ',
  's§',
  't',
  'uùúûü',
  'v',
  'w',
  'x',
  'yýÿ',
  'z',
  '}',
  'îï',
  '‘’“”'
];

const KERN_PAIRS = [
  0, 11, -40, -50, 0, 12, -30, -30, 1, 11, 0, -5, 1, 16, -10, -10, 1, 18, -30, -25, 1, 20, -20, -10,
  1, 32, -10, -10, 1, 33, -20, -20, 2, 13, -70, -75, 3, 25, 100, 100, 4, 4, -20, -30, 5, 7, -10,
  -10, 6, 5, -10, -10, 7, 8, -20, -15, 8, 3, -40, -55, 8, 5, -90, -70, 8, 6, -20, -20, 8, 7, -50,
  -50, 9, 3, -20, -30, 9, 5, -30, -20, 9, 7, -20, -20, 10, 11, -30, -30, 10, 13, -30, -30, 10, 15,
  -20, -20, 10, 16, -20, -20, 10, 17, -30, -30, 10, 18, -30, -30, 10, 20, -10, -5, 10, 33, -20, -20,
  11, 0, -40, -50, 11, 1, -10, -10, 11, 10, -30, -30, 11, 13, -50, -50, 11, 14, -20, -20, 11, 15,
  -60, -50, 11, 16, -40, -40, 11, 18, -70, -70, 11, 22, -20, -20, 11, 23, -20, -20, 11, 29, -30,
  -30, 11, 30, -10, -10, 11, 31, -30, -30, 11, 32, -30, -30, 11, 34, -20, -20, 11, 38, -40, -40, 12,
  13, -20, -20, 12, 15, -20, -20, 12, 16, -10, -10, 12, 17, -20, -20, 12, 18, -40, -40, 12, 31, -10,
  -10, 12, 33, -10, -10, 13, 18, -10, -10, 13, 20, -10, -10, 13, 22, -10, -10, 14, 37, 60, 70, 15,
  3, -50, -25, 15, 10, -10, -10, 15, 11, -50, -50, 15, 12, -40, -35, 15, 20, -30, -25, 15, 22, -20,
  -15, 15, 27, -30, -30, 15, 28, -40, -40, 15, 30, -10, -10, 15, 31, -30, -30, 15, 33, -40, -40, 15,
  34, -40, -40, 15, 35, -20, -20, 15, 37, 60, 60, 16, 11, 0, -5, 16, 13, -10, -10, 16, 15, -10, -10,
  16, 18, -30, -30, 17, 37, 20, 45, 18, 11, -20, -20, 18, 37, 0, 30, 19, 1, -10, -10, 19, 10, -30,
  -30, 19, 20, -10, -10, 19, 22, -20, -20, 19, 23, -20, -20, 19, 28, -10, -10, 19, 29, -40, -40, 19,
  31, -40, -40, 19, 32, -50, -50, 19, 34, -30, -30, 19, 37, 60, 65, 20, 0, -50, -55, 20, 10, -20,
  -20, 20, 13, -60, -60, 20, 14, -20, -20, 20, 15, -70, -70, 20, 16, -70, -70, 20, 18, -90, -90, 20,
  23, -30, -30, 20, 29, -30, -30, 20, 31, -60, -60, 20, 32, -60, -60, 20, 34, -40, -40, 20, 37, 40,
  85, 21, 3, -80, -80, 21, 11, -60, -60, 21, 12, -90, -80, 21, 17, -20, -20, 21, 18, -20, -20, 21,
  20, -40, -35, 21, 22, -20, -20, 21, 28, -20, -20, 21, 37, 0, 10, 22, 13, -20, -20, 22, 15, -10,
  -10, 22, 16, -10, -5, 22, 18, -10, -10, 22, 22, -30, -30, 22, 29, -10, -10, 22, 31, -20, -20, 22,
  34, -10, -10, 23, 3, -70, -55, 23, 10, -30, -30, 23, 11, -50, -50, 23, 12, -40, -40, 23, 20, -60,
  -60, 23, 22, -70, -70, 23, 23, -30, -30, 23, 27, -60, -60, 23, 28, -60, -60, 23, 29, -20, -20, 23,
  30, -40, -40, 23, 31, -50, -50, 23, 32, -40, -40, 23, 33, -50, -50, 23, 34, -40, -40, 23, 35, -50,
  -50, 23, 37, 100, 105, 24, 11, -20, -20, 24, 20, -10, -5, 24, 37, 30, 45, 25, 1, -10, -5, 25, 3,
  -50, -50, 25, 10, -20, -20, 25, 11, -60, -50, 25, 20, -40, -40, 25, 22, -50, -50, 25, 23, -10,
  -15, 25, 27, -30, -30, 25, 28, -50, -50, 25, 29, -10, -10, 25, 30, -30, -30, 25, 31, -20, -20, 25,
  33, -20, -20, 25, 35, -20, -20, 25, 37, 80, 95, 26, 1, -10, -10, 26, 10, -20, -20, 26, 11, -40,
  -40, 26, 20, -40, -40, 26, 22, -40, -35, 26, 23, -10, -10, 26, 27, -40, -40, 26, 28, -50, -50, 26,
  30, -30, -30, 26, 33, -10, -10, 26, 34, -10, -10, 26, 35, -20, -20, 26, 37, 60, 80, 27, 10, -30,
  -30, 27, 22, -20, -20, 27, 23, -10, -15, 27, 28, -20, -20, 27, 29, -30, -30, 27, 30, -10, -10, 27,
  31, -10, -15, 27, 32, -10, -20, 27, 34, -30, -30, 27, 37, 60, 80, 28, 1, -30, -30, 28, 3, -60,
  -80, 28, 10, -30, -30, 28, 11, -70, -70, 28, 12, -40, -40, 28, 20, -70, -70, 28, 22, -100, -95,
  28, 23, -30, -30, 28, 27, -70, -70, 28, 28, -80, -80, 28, 29, -30, -30, 28, 30, -50, -50, 28, 31,
  -50, -50, 28, 32, -60, -50, 28, 33, -60, -60, 28, 34, -50, -50, 28, 35, -50, -50, 28, 37, 50, 75,
  29, 37, 60, 80, 30, 23, 0, -5, 30, 29, -10, -10, 30, 31, -10, -10, 31, 23, -20, -15, 31, 29, -10,
  -10, 31, 31, -10, -10, 31, 32, -10, -10, 31, 33, -20, -20, 31, 34, -10, -10, 32, 20, -10, -5, 32,
  23, 10, 10, 33, 20, -10, -5, 33, 31, -10, -10, 33, 33, -10, -10, 34, 2, 70, 70, 34, 3, -30, -30,
  34, 9, 30, 30, 34, 19, 40, 40, 34, 20, -30, -15, 34, 22, -30, -20, 34, 23, -10, -10, 34, 24, -10,
  -10, 34, 27, -10, -5, 34, 29, 10, 20, 34, 36, 100, 100, 34, 37, 70, 85, 35, 31, -10, -10, 35, 34,
  -10, -10, 36, 37, 60, 60, 37, 37, 70, 70, 38, 22, -10, -10, 39, 3, -40, -40, 39, 29, 0, 10, 40,
  31, -10, -10, 40, 32, -10, -10, 40, 33, -10, -15, 40, 34, -10, -10, 41, 20, -10, -5, 41, 22, -20,
  -10, 41, 25, 30, 60, 41, 37, 40, 60, 42, 3, -40, -40, 42, 20, -20, -20, 42, 22, -10, -10, 43, 20,
  -10, -10, 43, 22, -20, -20, 44, 37, 40, 55, 45, 15, -30, -45, 45, 16, -30, -45, 45, 18, -60, -80,
  46, 1, -40, -55, 46, 13, -40, -60, 46, 15, -60, -80, 46, 16, -60, -80, 46, 18, -60, -105, 46, 25,
  70, 70, 47, 21, 30, 40, 47, 24, 60, 60, 47, 25, 50, 60, 47, 26, 30, 50, 47, 37, 140, 165, 48, 11,
  -40, -40, 48, 12, -40, -40, 49, 11, -40, -40
];
