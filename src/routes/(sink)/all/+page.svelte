<script lang="ts">
  import Page from '../../kit/Page.svelte';
  import Section from '../../kit/Section.svelte';
  import { sections } from '../../kit/sections';
</script>

<!-- Every section on one page, for a law audit over the whole library and the browser tests. -->
<Page title="All components" description="Every component in every state on one page">
  {#each sections as section (section.id)}
    <Section {section} />
  {/each}
</Page>
