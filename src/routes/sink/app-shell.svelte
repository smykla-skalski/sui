<script module lang="ts">
  export const section = {
    title: 'App shell',
    lead: 'The frame of an application, with a rail for the place, a sidebar for the page, and the content. Views inside one page switch with Tabs.',
    components: ['AppShell', 'Rail', 'SideNav']
  };
</script>

<script lang="ts">
  import { resolve } from '$app/paths';
  import Example from '../kit/Example.svelte';
  import LayoutPreview from '../kit/LayoutPreview.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const source = 'src/routes/layouts/app-shell/[[variant]]/+page.svelte';
</script>

<Example
  title="Layout"
  note="The page in its own frame: under 48rem a drawer holds the rail and the pages, and above 64rem Collapse folds them"
  layout="stack"
  ground="canvas"
  code={false}
>
  <Specimen label="Full page">
    <LayoutPreview
      href={resolve('/layouts/app-shell/[[variant]]', {}) + '/'}
      {source}
      title="App shell page"
    />
  </Specimen>
</Example>

<Example
  title="Bottom navigation"
  note="With bottomNav, a phone keeps the rail's few places in a bar along the bottom, and the drawer holds only the pages"
  layout="stack"
  ground="canvas"
  code={false}
>
  <Specimen label="Phone" code="bottomNav">
    <LayoutPreview
      href={resolve('/layouts/app-shell/[[variant]]', { variant: 'bottom-nav' }) + '/'}
      {source}
      title="App shell page with bottom navigation"
      width="phone"
    />
  </Specimen>
</Example>
