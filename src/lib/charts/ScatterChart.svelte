<script lang="ts">
  import XYChart from './XYChart.svelte';
  import type { XYChartProps } from './types.js';

  let props: XYChartProps = $props();
</script>

<!--
@component
Two numeric variables plotted against each other, one point per thing measured, such as
changed files against build minutes. A value over time is a `LineChart` instead. It takes the
same series, labels, formatters and sizing as `LineChart`, gives each series its own marker
shape as well as its color, and like every chart needs a `description` and offers its values
as a table.
-->

<XYChart {...props} kind="scatter" />
