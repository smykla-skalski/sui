<script lang="ts">
  import Page from '../../kit/Page.svelte';
  import Section from '../../kit/Section.svelte';

  let { data } = $props();
</script>

<Page
  eyebrow={data.section.family}
  title={data.section.meta.title}
  description={data.section.meta.lead}
  measure={data.section.meta.measure}
  sourced
>
  <Section section={data.section} head={false} />
</Page>
