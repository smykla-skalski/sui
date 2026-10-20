<script module lang="ts">
  export const section = {
    title: 'Detail pane',
    order: 64,
    lead: 'One thing beside its list or on its own page: a header band, one alert at most, sections by importance, properties, then rare detail',
    components: ['DetailLayout', 'PageHeader', 'Section', 'FactList']
  };
</script>

<script lang="ts">
  import { resolve } from '$app/paths';
  import { Section } from '#lib';
  import Example from '../kit/Example.svelte';
  import LayoutPreview from '../kit/LayoutPreview.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const source = 'src/routes/layouts/detail-pane/[[state]]/+page.svelte';
  const pane = (state?: string) => resolve('/layouts/detail-pane/[[state]]', { state });
</script>

<Example
  title="Layout"
  note="From 56rem of pane the properties stand beside the main sections, and every zone keeps its order"
  layout="stack"
  ground="canvas"
  code={false}
>
  <Specimen label="Loaded" code="main aside">
    <LayoutPreview href={pane()} {source} title="Detail pane page" />
  </Specimen>
</Example>

<Example
  title="First load"
  note="The title comes from the row that opened the pane, and placeholders hold each section's place until the check arrives"
  layout="stack"
  ground="canvas"
  code={false}
>
  <Specimen label="Loading" code="rowHeight loading status">
    <LayoutPreview href={pane('loading')} {source} title="Detail pane page while it loads" />
  </Specimen>
</Example>

<Example
  title="Not found"
  note="A check that no longer exists keeps its header and back link, and the failure stands in place of the body"
  layout="stack"
  ground="canvas"
  code={false}
>
  <Specimen label="Missing">
    <LayoutPreview href={pane('missing')} {source} title="Detail pane page for a missing check" />
  </Specimen>
</Example>

<Example
  title="Refresh failed"
  note="A refresh that fails takes the alert slot as one line, and the check that loaded earlier stays under it"
  layout="stack"
  ground="canvas"
  code={false}
>
  <Specimen label="Stale content" code="overContent">
    <LayoutPreview href={pane('stale')} {source} title="Detail pane page after a failed refresh" />
  </Specimen>
</Example>

<Example
  title="Empty section"
  note="A section with nothing to show says so in one quiet sentence and keeps its heading"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Nothing related">
    <Section title="Related" level={4}>
      <p class="quiet">This is the first check of acme, so nothing relates to it yet</p>
    </Section>
  </Specimen>
</Example>

<style>
  .quiet {
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-leading-body)
      var(--sui-sans);
    margin: 0;
  }
</style>
