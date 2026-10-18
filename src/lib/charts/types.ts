import type { Snippet } from 'svelte';

export type ChartPoint = { x: number; y: number };

/** A series takes the next chart colour, marker shape and dash in order, never a colour of its own. */
export type ChartSeries = {
  id: string;
  label: string;
  points: ChartPoint[];
};

/**
 * Where a chart's data stands, when it is not simply shown: `loading` before the first answer,
 * `refreshing` while a newer one is fetched over the values on screen, `stale` when the values on
 * screen may be out of date, and `failed` when no values could be fetched.
 */
export type ChartStatus = 'loading' | 'refreshing' | 'stale' | 'failed';

/** What every chart takes besides its data: its words, its outline level and its data's state. */
export type ChartFrameProps = {
  title: string;
  /** What the reader should take from the chart, in one sentence. */
  description: string;
  /** The title's heading level, so the chart fits the outline of the page it is on. */
  level?: 2 | 3 | 4 | 5 | 6;
  status?: ChartStatus;
  /** Why a failed chart failed and what the reader can do about it. */
  error?: string;
  /** Draws "Try again" on a failed chart. */
  onretry?: () => void;
  /** The next step an empty chart offers, usually a `Button`; without it the chart says `emptyStep`. */
  emptyAction?: Snippet;
  /** The next step in words, for an empty chart with no `emptyAction`. */
  emptyStep?: string;
  /** Called when the reader opens or closes the table of values. */
  ontableopenchange?: (open: boolean) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  /** The words on the control that shows the table of values. */
  dataLabel?: string;
  loadingLabel?: string;
  refreshingLabel?: string;
  staleLabel?: string;
  failedTitle?: string;
  /** What a failed chart says when `error` gives no reason. */
  failedDescription?: string;
  /** Says how many values were left out because they were missing or not numbers. */
  missingLabel?: (count: number) => string;
};

export type XYChartProps = ChartFrameProps & {
  series: ChartSeries[];
  xLabel?: string;
  yLabel?: string;
  /** The table's heading over the series names. */
  seriesHeading?: string;
  formatX?: (value: number) => string;
  formatY?: (value: number) => string;
};

export type RangeDatum = {
  label: string;
  start: number;
  end: number;
  marker?: number;
};

export type HeatmapCell = {
  row: string;
  column: string;
  value: number | null;
};
