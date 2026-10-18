# Charts

SUI ships four SVG chart components. They accept generic data and use `--sui-chart-1` through `--sui-chart-5` colors. They have no charting dependency and work during server rendering.

```svelte
<script lang="ts">
  import { LineChart, RangeChart, HeatmapChart } from '@smykla-skalski/sui';

  const series = [
    {
      id: 'requests',
      label: 'Requests',
      points: [
        { x: 1, y: 14 },
        { x: 2, y: 19 },
        { x: 3, y: 27 }
      ]
    }
  ];
</script>

<LineChart
  title="Requests by week"
  description="Requests rose during the three weeks shown."
  {series}
  xLabel="Week"
  yLabel="Requests"
/>
```

`ScatterChart` accepts the same props. Line points are connected in input order. `RangeChart` accepts `data: { label, start, end, marker? }[]`. `HeatmapChart` accepts ordered `rows`, ordered `columns`, and `cells: { row, column, value }[]`; `null` marks missing data. All numeric charts accept a formatter (`formatX`/`formatY` or `formatValue`).

Supply a description that states the chart's main finding. The SVG has a short accessible label, and an expandable table contains the numeric values. This follows the [W3C guidance for complex images](https://www.w3.org/WAI/tutorials/images/complex/). Keep domain-specific transforms, metrics, and terminology in each consuming app.

## Layout

The plot stands on a band of `--sui-chart-ground`, so a reader sees where the chart starts and ends. Every mark, grid line and axis word keeps its contrast on that ground. The plot is laid out to its ink: its words are measured in the face they draw in, and the first ink starts and the last ends on the band's inner edges.

A surface that holds a chart can let the band reach its own edges. It sets `--sui-local-bleed` to its inline padding on its direct children, as `Card` does. The band then reaches past the chart by that much and pads back by it, so the plot keeps the title's edges. The property does not inherit, so a chart nested deeper, such as in one column of a grid, keeps its band inside its column.

A plot wider than its band scrolls sideways. The edge that has more plot past it fades, as every sideways scroller in SUI does.
