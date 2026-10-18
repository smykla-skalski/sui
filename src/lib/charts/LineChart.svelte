<script lang="ts">
  import XYChart from './XYChart.svelte';
  import type { XYChartProps } from './types.js';

  let props: XYChartProps = $props();
</script>

<!--
@component
A numeric series over a numeric axis, drawn as lines through its points. Dates are mapped
to timestamps by the caller, with `formatX` to print them. Series never differ by color
alone: each has its own marker shape, every line after the first its own dash, and with four
series or fewer each line is named at its end in text ink. The legend stays. Past five series
the colours come round again with a new shape and dash, though a chart that busy reads better
split in two. Every chart needs a short `description` that states what the reader should take
from it, and any values it has are available as a table under "View chart data". Axis ticks
fall on round numbers, and on whole numbers when every value is whole.

- Semantics: a `figure` named by its title, a heading at `level` (3 by default), with the plot as one `role="img"`, a legend list and a disclosure holding a table of every value.
- Content: series of numeric points with a label each, axis labels and formatters; a title and a one-sentence description are required.
- States: shown, empty, loading, refreshing, stale, failed and partial (some points left out); the data control draws hover, pressed and focus.
- Keyboard: Tab reaches the plot when it scrolls, then "View chart data", where Enter or Space opens the table, and the table itself when it scrolls.
- Pointer and touch: "View chart data" is 24px tall on a desktop pointer and 44px on a phone or a coarse pointer; the plot scrolls by swipe, wheel or keyboard, and nothing needs hover, since every value is in the table.
- Focus: opening the table keeps focus on its control; retrying a failed chart is the error state's button.
- Responsive: the plot stands on a band of the chart ground that reaches the edges of a card holding it, and its ink starts and ends exactly at the band's inner edges, its margins sized to the measured words; text keeps its token size, the margins grow with the reader's text size, and below 280px the plot scrolls sideways with a fade on each edge that has more past it.
- Accessibility: the plot is one image named by the title and description, the table has the title as its caption, every mark holds 3:1 and every word 4.5:1, and a change of status is announced politely.
- Localization: every word is a prop with an English default (`xLabel`, `yLabel`, `seriesHeading`, `dataLabel`, the empty, loading, refreshing, stale and failed words, and `missingLabel` for a count); default numbers follow the page language, and the plot reads left to right in every page while its legend and table follow the page.
- Performance: a line through more points than its plot has pixels is thinned to each pixel's lowest and highest point, and drops its markers when they would crowd; the table renders only while it is open. Nothing animates; an edge fade switches on the plot's own scroll timeline.
- Analytics: `ontableopenchange(open)` reports the table and `onretry` a retry.
- Failure: `status` draws `loading` as a placeholder of the plot's size that the loading light crosses, `refreshing` and `stale` as a line of words over the values on screen, and `failed` as an error state with `error` and an optional retry; no values draw an empty state with `emptyAction` as its next step, and points that are not finite are left out and counted in words.
-->

<XYChart {...props} kind="line" />
