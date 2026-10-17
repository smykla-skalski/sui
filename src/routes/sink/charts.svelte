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
  note="Every chart has a title, a description and a table of its values"
  layout="stack"
>
  <LineChart
    title="Weekly trend"
    description="Both regions grew over four weeks"
    series={trend}
    xLabel="Week"
    yLabel="Items"
  />
  <ScatterChart
    title="Values by week"
    description="The points show growth across four weeks"
    series={trend}
    xLabel="Week"
    yLabel="Items"
  />
</Example>

<Example title="Ranges and matrices" layout="stack">
  <RangeChart
    title="Work ranges"
    description="The marker shows the selected point in each range"
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

<Example title="No data" note="An empty chart says so in words">
  <LineChart title="New project" description="Nothing has been measured yet" series={[]} />
</Example>
