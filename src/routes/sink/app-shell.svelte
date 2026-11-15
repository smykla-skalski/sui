<script module lang="ts">
  export const section = {
    title: 'App Shell',
    lead: 'The frame of an application: a sidebar whose head switches the place and whose rows pick the page, and the content. Views inside one page switch with Tabs.',
    components: ['AppShell', 'SideNav']
  };
</script>

<script lang="ts">
  import { resolve } from '$app/paths';
  import Example from '../kit/Example.svelte';
  import LayoutPreview from '../kit/LayoutPreview.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const source = 'src/routes/layouts/app-shell/+page.svelte';
</script>

<Example
  title="Layout"
  note="The page in its own frame: the sidebar's head switches the workspace, under 48 rem a drawer holds the sidebar, and above 64 rem Collapse Navigation folds it"
  layout="stack"
  ground="canvas"
  code={false}
>
  <Specimen label="Full page">
    <LayoutPreview href={resolve('/layouts/app-shell') + '/'} {source} title="App shell page" />
  </Specimen>
</Example>
