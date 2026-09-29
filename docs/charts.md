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
