export type ChartPoint = { x: number; y: number };

export type ChartSeries = {
  id: string;
  label: string;
  points: ChartPoint[];
  color?: string;
};

export type XYChartProps = {
  title: string;
  description: string;
  series: ChartSeries[];
  xLabel?: string;
  yLabel?: string;
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
