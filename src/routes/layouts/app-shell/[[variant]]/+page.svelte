<script lang="ts">
  import { page } from '$app/state';
  import {
    AppShell,
    ObjectList,
    ObjectRow,
    PageHeader,
    Pill,
    Rail,
    Section,
    SideNav,
    SkipLink,
    type NavSection,
    type PillTone,
    type RailItem
  } from '#lib';

  const sections: NavSection[] = [
    {
      items: [
        { href: '#overview', label: 'Overview', icon: 'gauge' },
        { href: '#repositories', label: 'Repositories', icon: 'repositories' },
        { href: '#queue', label: 'Queue', icon: 'pending', count: 3 }
      ]
    },
    {
      label: 'Sync',
      items: [
        { href: '#labels', label: 'Labels', icon: 'tag' },
        { href: '#rulesets', label: 'Rulesets', icon: 'shield' },
        {
          href: '#files',
          label: 'Files synced across every repository',
          short: 'Files',
          icon: 'file'
        }
      ]
    },
    {
      label: 'Access',
      items: [
        { href: '#users', label: 'Users', icon: 'users' },
        { href: '#invitations', label: 'Invitations', icon: 'mail', count: 2 }
      ]
    }
  ];

  const places: RailItem[] = [
    { label: 'Smykla Skalski', short: 'Smykla', icon: 'organization' },
    { label: 'Personal', icon: 'user' },
    { label: 'Root console', short: 'Console', icon: 'server', badge: 4 }
  ];

  const foot: RailItem[] = [{ label: 'Settings', icon: 'settings' }];

  const repositories: { name: string; state: string; tone: PillTone }[] = [
    { name: 'smykla-skalski/sui', state: 'Synced', tone: 'success' },
    { name: 'smykla-skalski/tack', state: 'Synced', tone: 'success' },
    { name: 'smykla-skalski/smyklot', state: 'Differs', tone: 'warning' },
    { name: 'smykla-skalski/sail', state: 'Synced', tone: 'success' },
    { name: 'smykla-skalski/benchee', state: 'Synced', tone: 'success' },
    { name: 'smykla-skalski/bosun', state: 'Not checked', tone: 'neutral' }
  ];

  const names = Object.fromEntries(
    sections.flatMap((group) => group.items).map((item) => [item.href, item.label])
  );

  // Each page of the sidebar has an address of its own, so Back and a shared link reach it.
  const current = $derived(page.url.hash in names ? page.url.hash : '#overview');
  const bottomNav = $derived(page.params.variant === 'bottom-nav');
  let place = $state('Smykla Skalski');
</script>

<svelte:head>
  <title>{names[current]} · App shell</title>
</svelte:head>

<SkipLink href="#content" />

<AppShell title={names[current]} landmark="none" label="Workspace navigation" {bottomNav}>
  {#snippet rail()}
    <Rail items={places} {foot} current={place} onpick={(item) => (place = item.label)} />
  {/snippet}
  {#snippet sidebar()}
    <SideNav kicker="Workspace" title="Smykla Skalski" {sections} {current} />
  {/snippet}

  <main id="content" tabindex="-1">
    <PageHeader
      eyebrow={['Smykla Skalski', 'Workspace']}
      title={names[current]}
      description="Every repository in the workspace, held to the same labels, rulesets and files"
    />
    <div class="body">
      <Section title="Health">
        <p class="copy">
          <Pill tone="success">Healthy</Pill>
          <span class="sentence">Every repository synced 4 minutes ago</span>
        </p>
      </Section>
      <Section title="Repositories" count={repositories.length} id="repositories-title">
        <ObjectList aria-labelledby="repositories-title">
          {#each repositories as repository (repository.name)}
            <ObjectRow href="#repositories">
              {#snippet main()}<span class="name">{repository.name}</span>{/snippet}
              {#snippet side()}<Pill tone={repository.tone}>{repository.state}</Pill>{/snippet}
            </ObjectRow>
          {/each}
        </ObjectList>
      </Section>
    </div>
  </main>
</AppShell>

<style>
  main:focus {
    outline: none;
  }

  /* The header's band stands flush with the pane's top and sides, and the sections under it
     keep the band's gutter, so their words line up with the header's. */
  .body {
    padding: 0 var(--sui-rhythm-pane-gutter) var(--sui-rhythm-pane-gutter);
  }

  .copy {
    align-items: center;
    color: var(--sui-text-secondary);
    display: flex;
    flex-wrap: wrap;
    font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-leading-body)
      var(--sui-sans);
    gap: var(--sui-space-2);
    margin: 0;
  }

  /* The sentence centres on the pill at an even height, so the pill lands on whole pixels. */
  .sentence {
    align-content: center;
    block-size: var(--sui-block-snap-even);
  }

  .name {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: var(--sui-weight-medium) var(--sui-font-size-body) / var(--sui-row-copy-leading)
      var(--sui-sans);
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }
</style>
