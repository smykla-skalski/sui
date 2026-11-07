<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { Button, ErrorState, PageHeader } from '#lib';

  const missing = $derived(page.status === 404);
  const title = $derived(missing ? 'Page Not Found' : 'Page Failed to Load');
</script>

<svelte:head>
  <title>{title} · SUI kitchen sink</title>
</svelte:head>

<!-- A wrong address or a failed load still leads somewhere: the overview, which lists every
     component, and for a failure a reload. -->
<main class="missing">
  <PageHeader {title} />
  <ErrorState
    title={missing ? 'Nothing Lives at This Address' : 'The Page Stopped While It Loaded'}
    description={missing
      ? 'The address may hold a typo, or the page has moved'
      : (page.error?.message ?? 'Reload the page to try again')}
    onretry={missing ? undefined : () => location.reload()}
  >
    {#snippet action()}
      <Button href={resolve('/(sink)')}>Open the Overview</Button>
    {/snippet}
  </ErrorState>
</main>

<style>
  .missing {
    box-sizing: border-box;
    display: grid;
    gap: var(--sui-space-6);
    margin-inline: auto;
    max-inline-size: 48rem;
    padding: var(--sui-space-8) var(--sui-space-4);
  }
</style>
