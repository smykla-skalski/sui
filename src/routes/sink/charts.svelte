<script module lang="ts">
  export const section = {
    title: 'Charts',
    order: 100,
    lead: 'Numbers drawn as lines, points, ranges or a matrix, each with a title, a description and a table of its values. Values a reader looks up belong in a DataTable.',
    components: ['LineChart', 'ScatterChart', 'RangeChart', 'HeatmapChart']
  };
</script>

<script lang="ts">
  import { Button, HeatmapChart, LineChart, RangeChart, ScatterChart } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

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
    { label: 'Build', start: 25, end: 48 }
  ];
  /* Two readings never arrived, so the line skips them and says how many it left out. */
  const gappy = [
    {
      id: 'north',
      label: 'North',
      points: [
        { x: 1, y: 18 },
        { x: 2, y: Number.NaN },
        { x: 3, y: 23 },
        { x: 4, y: Number.NaN },
        { x: 5, y: 31 }
      ]
    }
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
  <Specimen label="Line, a series over time" code="series xLabel yLabel">
    <LineChart
      title="Weekly trend"
      description="North and south grew over four weeks, while east stayed nearly flat"
      series={trend}
      xLabel="Week"
      yLabel="Items"
    />
  </Specimen>
  <Specimen label="Scatter, two measures of each item" code="series xLabel yLabel">
    <ScatterChart
      title="Build time by change size"
      description="Builds that change more files take longer, and a cold cache adds about six minutes"
      series={builds}
      xLabel="Changed files"
      yLabel="Build minutes"
    />
  </Specimen>
</Example>

<Example
  title="Ranges and matrices"
  note="A range marks a diamond inside an interval, and a matrix prints every value, with a dashed cell where one is missing"
  layout="stack"
>
  <Specimen label="Range" code="data valueLabel">
    <RangeChart
      title="Work ranges"
      description="Each diamond shows when work started inside its planned window"
      data={ranges}
      valueLabel="Hours"
    />
  </Specimen>
  <Specimen label="Heatmap" code="rows columns cells">
    <HeatmapChart
      title="Activity"
      description="Tuesday afternoon has the most activity"
      rows={['Morning', 'Afternoon']}
      columns={['Mon', 'Tue', 'Wed']}
      cells={heatmap}
    />
  </Specimen>
</Example>

<Example
  title="States"
  note="Each state says itself in words: a placeholder while loading, a line over updating or aging values, and a way out of a failure"
>
  <Specimen label="Loading" code={'status="loading"'}>
    <LineChart
      title="Signups by week"
      description="Signups each region added per week"
      series={[]}
      status="loading"
    />
  </Specimen>
  <Specimen label="Refreshing" code={'status="refreshing"'}>
    <LineChart
      title="Orders by week"
      description="North and south grew over four weeks"
      series={trend}
      xLabel="Week"
      yLabel="Orders"
      status="refreshing"
    />
  </Specimen>
  <Specimen label="Stale" code={'status="stale" staleLabel'}>
    <LineChart
      title="Deploys by week"
      description="North and south grew over four weeks"
      series={trend}
      xLabel="Week"
      yLabel="Deploys"
      status="stale"
      staleLabel="Last updated 3 hours ago"
    />
  </Specimen>
  <Specimen label="Failed" code={'status="failed" error onretry'}>
    <LineChart
      title="Errors by week"
      description="Errors each region reported per week"
      series={[]}
      status="failed"
      error="The metrics service did not answer. Try again in a minute."
      onretry={() => {}}
    />
  </Specimen>
  <Specimen label="Partial" code="series">
    <LineChart
      title="Daily readings"
      description="North kept rising on the days it reported"
      series={gappy}
      xLabel="Day"
      yLabel="Items"
    />
  </Specimen>
  <Specimen label="Empty" code={'series={[]} emptyAction'}>
    <LineChart title="New project" description="Nothing has been measured yet" series={[]}>
      {#snippet emptyAction()}<Button>Connect a data source</Button>{/snippet}
    </LineChart>
  </Specimen>
</Example>

<Example title="Narrow width" note="Chart text keeps its token size when the chart is narrow">
  <Specimen label="In 20rem">
    <div class="narrow">
      <LineChart
        title="Items by week"
        description="North stayed ahead of the other regions in every week"
        series={trend}
        xLabel="Week"
        yLabel="Items"
      />
    </div>
  </Specimen>
</Example>

<style>
  .narrow {
    inline-size: min(100%, 20rem);
  }
</style>
