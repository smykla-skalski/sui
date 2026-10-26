<script module lang="ts">
  export const section = {
    title: 'List detail',
    lead: 'A list beside the item open from it, each at its own address. Under 56rem one pane shows at a time, with a way back to the list.',
    components: ['ListDetail']
  };
</script>

<script lang="ts">
  import { resolve } from '$app/paths';
  import Example from '../kit/Example.svelte';
  import LayoutPreview from '../kit/LayoutPreview.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const source = 'src/routes/layouts/list-detail/[[run]]/+page.svelte';
</script>

<Example
  title="Layout"
  note="Every run has its own page, and from 56rem of its own width the list stands beside the open run"
  layout="stack"
  ground="canvas"
  code={false}
>
  <Specimen label="Run open" code="current detail">
    <LayoutPreview
      href={resolve('/layouts/list-detail/[[run]]', { run: '4182' }) + '/'}
      {source}
      title="List detail page with a run open"
    />
  </Specimen>
</Example>

<Example
  title="Nothing open"
  note="With no run open the detail says so beside the list, and a press on a run opens it there"
  layout="stack"
  ground="canvas"
  code={false}
>
  <Specimen label="No run open" code="emptyTitle emptyDescription emptyStep">
    <LayoutPreview
      href={resolve('/layouts/list-detail/[[run]]', {}) + '/'}
      {source}
      title="List detail page with no run open"
    />
  </Specimen>
</Example>
