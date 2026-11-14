<script module lang="ts">
  export const section = {
    title: 'List Detail',
    lead: 'A list beside the item open from it, each at its own address. Under 56 rem one pane shows at a time, with a way back to the list.',
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
  note="Every run has its own page, and from 56 rem of its own width the list stands beside the open run"
  layout="stack"
  ground="canvas"
  code={false}
>
  <Specimen label="Run open">
    <LayoutPreview
      href={resolve('/layouts/list-detail/[[run]]', { run: '4182' }) + '/'}
      {source}
      title="List detail page with a run open"
    />
  </Specimen>
</Example>

<Example
  title="Nothing Open"
  note="With no run open the detail says so beside the list, and a press on a run opens it there"
  layout="stack"
  ground="canvas"
  code={false}
>
  <Specimen label="No run open">
    <div class="whole-list">
      <LayoutPreview
        href={resolve('/layouts/list-detail/[[run]]', {}) + '/'}
        {source}
        title="List detail page with no run open"
      />
    </div>
  </Specimen>
</Example>

<style>
  .whole-list {
    container-type: inline-size;
  }

  /* A phone's frame shows the list alone, as a phone does. Its twelve runs end 786px down a
     375px window, so the frame stands that tall at its own scale, the stage's width up to
     375px, and ends under the last run at every phone width rather than cutting through one.
     The width is the one at which the preview starts as a phone. */
  @media (max-width: 47.9375rem) {
    .whole-list {
      --preview-height: round(up, min(100cqi - 2px, 375px) * 786 / 375 + 2px, 1px);
    }
  }
</style>
