<script module lang="ts">
  export const section = { title: 'Charts', order: 100 };
</script>

<script lang="ts">
  import { HeatmapChart, LineChart, RangeChart, ScatterChart } from '#lib';
  import Example from '../kit/Example.svelte';

  const trend = [
    {
      id: 'north',
      label: 'North',
      points: [
        { x: 1, y: 18 },
        { x: 2, y: 25 },
        { x: 3, y: 23 },
        { x: 4, y: 34 }
      ]
    },
    {
      id: 'south',
      label: 'South',
      points: [
        { x: 1, y: 12 },
        { x: 2, y: 16 },
        { x: 3, y: 22 },
        { x: 4, y: 27 }
      ]
    },
    {
      id: 'east',
      label: 'East',
      points: [
        { x: 1, y: 9 },
        { x: 2, y: 11 },
        { x: 3, y: 10 },
        { x: 4, y: 15 }
      ]
    }
  ];
  /* Twelve builds: how many files each changed against how long it took, warm cache or cold. */
  const builds = [
    {
      id: 'warm',
      label: 'Warm cache',
      points: [
        { x: 3, y: 4.2 },
        { x: 8, y: 5.1 },
        { x: 14, y: 6 },
        { x: 21, y: 6.8 },
        { x: 35, y: 8.1 },
        { x: 52, y: 9.4 }
      ]
    },
    {
      id: 'cold',
      label: 'Cold cache',
      points: [
        { x: 5, y: 9.8 },
        { x: 11, y: 10.9 },
        { x: 19, y: 12.4 },
        { x: 27, y: 13 },
        { x: 44, y: 15.6 },
        { x: 60, y: 17.2 }
      ]
    }
  ];
  const ranges = [
    { label: 'Planning', start: 12, end: 29, marker: 22 },
    { label: 'Design', start: 19, end: 37, marker: 30 },
    { label: 'Build', start: 25, end: 48, marker: 39 }
  ];
  const heatmap = [
    { row: 'Morning', column: 'Mon', value: 12 },
    { row: 'Morning', column: 'Tue', value: 19 },
    { row: 'Morning', column: 'Wed', value: 24 },
    { row: 'Afternoon', column: 'Mon', value: 20 },
    { row: 'Afternoon', column: 'Tue', value: 31 },
    { row: 'Afternoon', column: 'Wed', value: null }
  ];
</script>

<Example
  title="Series"
  note="Each series has its own shape and dash as well as its color, and short sets name each line at its end"
  layout="stack"
>
  <LineChart
    title="Weekly trend"
    description="North and south grew over four weeks, while east stayed nearly flat"
    series={trend}
    xLabel="Week"
    yLabel="Items"
  />
  <ScatterChart
    title="Build time by change size"
    description="Builds that change more files take longer, and a cold cache adds about six minutes"
    series={builds}
    xLabel="Changed files"
    yLabel="Build minutes"
  />
</Example>

<Example title="Ranges and matrices" layout="stack">
  <RangeChart
    title="Work ranges"
    description="The neutral marker shows the selected point in each range"
    data={ranges}
    valueLabel="Hours"
  />
  <HeatmapChart
    title="Activity"
    description="Tuesday afternoon has the most activity"
    rows={['Morning', 'Afternoon']}
    columns={['Mon', 'Tue', 'Wed']}
    cells={heatmap}
  />
</Example>

<Example title="Narrow column" note="Chart text keeps its token size when the chart is narrow">
  <div class="narrow">
    <LineChart
      title="Items by week"
      description="North stayed ahead of the other regions in every week"
      series={trend}
      xLabel="Week"
      yLabel="Items"
    />
  </div>
</Example>

<Example title="No data" note="An empty chart says so in words">
  <LineChart title="New project" description="Nothing has been measured yet" series={[]} />
</Example>

<style>
  .narrow {
    inline-size: min(100%, 20rem);
  }
</style>
