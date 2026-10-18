<script lang="ts">
  import XYChart from './XYChart.svelte';
  import type { XYChartProps } from './types.js';

  let props: XYChartProps = $props();
</script>

<!--
@component
Two numeric variables plotted against each other, one point per thing measured, such as
changed files against build minutes. A value over time is a `LineChart` instead. It takes the
same series, labels, formatters, states and sizing as `LineChart`, gives each series its own
marker shape as well as its color, and like every chart needs a `description` and offers its
values as a table.

- Semantics: a `figure` named by its title, a heading at `level` (3 by default), with the plot as one `role="img"`, a legend list and a disclosure holding a table of every value.
- Content: series of numeric points with a label each, axis labels and formatters; a title and a one-sentence description are required.
- States: shown, empty, loading, refreshing, stale, failed and partial (some points left out); the data control draws hover, pressed and focus.
- Keyboard: Tab reaches the plot when it scrolls, then "View chart data", where Enter or Space opens the table, and the table itself when it scrolls.
- Pointer and touch: "View chart data" is 24px tall on a desktop pointer and 44px on a phone or a coarse pointer; the plot scrolls by swipe, wheel or keyboard, and nothing needs hover, since every value is in the table.
- Focus: opening the table keeps focus on its control; retrying a failed chart is the error state's button.
- Responsive: the plot stands on a band of the chart ground that reaches the edges of a card holding it, and its ink starts and ends exactly at the band's inner edges, its margins sized to the measured words; text keeps its token size, the margins grow with the reader's text size, and below 280px the plot scrolls sideways with a fade on each edge that has more past it.
- Accessibility: the plot is one image named by the title and description, the table has the title as its caption, every mark holds 3:1 and every word 4.5:1, and a change of status is announced politely.
- Localization: every word is a prop with an English default (`xLabel`, `yLabel`, `seriesHeading`, `dataLabel`, the empty, loading, refreshing, stale and failed words, and `missingLabel` for a count); default numbers follow the page language, and the plot reads left to right in every page while its legend and table follow the page.
- Performance: every point is one small path with its own title, and points closer than half a marker to one already drawn are left out, since they would lie under it; so the plot holds a bounded number of paths however many points arrive, and every value stays in the table, which renders only while it is open. Nothing animates; an edge fade switches on the plot's own scroll timeline.
- Analytics: `ontableopenchange(open)` reports the table and `onretry` a retry.
- Failure: `status` draws `loading` as a placeholder of the plot's size that the loading light crosses, `refreshing` and `stale` as a line of words over the values on screen, and `failed` as an error state with `error` and an optional retry; no values draw an empty state with `emptyAction` as its next step, and points that are not finite are left out and counted in words.
-->

<XYChart {...props} kind="scatter" />
