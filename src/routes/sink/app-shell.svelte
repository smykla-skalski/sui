<script module lang="ts">
  export const section = {
    title: 'App shell',
    order: 118,
    lead: 'The frame of an application, with a rail for the place, a sidebar for the page, and the content. Views inside one page switch with Tabs.',
    components: ['AppShell', 'Rail', 'SideNav']
  };
</script>

<script lang="ts">
  import {
    AppShell,
    PageHeader,
    Pill,
    Rail,
    SideNav,
    type NavItem,
    type NavSection,
    type RailItem
  } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const sections: NavSection[] = [
    {
      items: [
        { href: '#shell-overview', label: 'Overview', icon: 'gauge' },
        { href: '#shell-repositories', label: 'Repositories', icon: 'repositories' },
        { href: '#shell-queue', label: 'Queue', icon: 'pending', count: 3 }
      ]
    },
    {
      label: 'Sync',
      items: [
        { href: '#shell-labels', label: 'Labels', icon: 'tag' },
        { href: '#shell-rulesets', label: 'Rulesets', icon: 'shield' },
        {
          href: '#shell-files',
          label: 'Files kept in step across every repository',
          short: 'Files',
          icon: 'file'
        }
      ]
    },
    {
      label: 'Access',
      items: [
        { href: '#shell-users', label: 'Users', icon: 'users' },
        { href: '#shell-invitations', label: 'Invitations', icon: 'mail', count: 2 }
      ]
    }
  ];

  const places: RailItem[] = [
    { label: 'Smykla Skalski', short: 'Smykla', icon: 'organization' },
    { label: 'Personal', icon: 'user' },
    { label: 'Root console', short: 'Console', icon: 'server', badge: 4 }
  ];

  const foot: RailItem[] = [{ label: 'Settings', icon: 'settings' }];

  const names = Object.fromEntries(
    sections.flatMap((group) => group.items).map((item) => [item.href, item.label])
  );

  let wide = $state('#shell-repositories');
  let folded = $state('#shell-queue');
  let phone = $state('#shell-overview');
  let bottom = $state('#shell-labels');
  let place = $state('Smykla Skalski');
  let collapsed = $state(true);

  const go = (set: (href: string) => void) => (event: MouseEvent, item: NavItem) => {
    event.preventDefault();
    set(item.href);
  };
</script>

{#snippet content(current: string)}
  <div class="pane">
    <PageHeader
      eyebrow={['Smykla Skalski', 'Workspace']}
      title={names[current] ?? 'Overview'}
      description="Press a page in the sidebar and the selection plate glides to it"
      level={4}
    />
    <p class="copy">
      <Pill tone="success">Healthy</Pill>
      <span class="sentence">Every repository synced 4 minutes ago</span>
    </p>
  </div>
{/snippet}

<Example
  title="Layout"
  note="The rail chooses the place, the sidebar the page, and the current one wears the plate"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Expanded">
    <div class="frame">
      <AppShell title={names[wide]} contained landmark="none" label="Workspace navigation">
        {#snippet rail()}
          <Rail items={places} {foot} current={place} onpick={(item) => (place = item.label)} />
        {/snippet}
        {#snippet sidebar()}
          <SideNav
            kicker="Workspace"
            title="Smykla Skalski"
            {sections}
            current={wide}
            onnavigate={go((href) => (wide = href))}
          />
        {/snippet}
        {@render content(wide)}
      </AppShell>
    </div>
  </Specimen>
</Example>

<Example
  title="Collapsed"
  note="Above 64rem Collapse folds the pages into icons over short labels beside the rail, so this 66rem frame scrolls sideways"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Collapsed" code="bind:collapsed">
    <div class="scroller">
      <div class="frame wide">
        <AppShell
          title={names[folded]}
          contained
          landmark="none"
          label="Workspace navigation"
          bind:collapsed
        >
          {#snippet rail()}
            <Rail items={places} {foot} current={place} onpick={(item) => (place = item.label)} />
          {/snippet}
          {#snippet sidebar()}
            <SideNav
              kicker="Workspace"
              title="Smykla Skalski"
              {sections}
              current={folded}
              onnavigate={go((href) => (folded = href))}
            />
          {/snippet}
          {@render content(folded)}
        </AppShell>
      </div>
    </div>
  </Specimen>
</Example>

<Example
  title="Narrow width"
  note="Below 48rem a bar names the page, and its Menu button opens the rail and the pages as one drawer"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Under 48rem">
    <div class="frame phone">
      <AppShell title={names[phone]} contained landmark="none" label="Workspace navigation">
        {#snippet rail()}
          <Rail items={places} {foot} current={place} onpick={(item) => (place = item.label)} />
        {/snippet}
        {#snippet sidebar()}
          <SideNav
            kicker="Workspace"
            title="Smykla Skalski"
            {sections}
            current={phone}
            onnavigate={go((href) => (phone = href))}
          />
        {/snippet}
        {@render content(phone)}
      </AppShell>
    </div>
  </Specimen>
</Example>

<Example
  title="Bottom navigation"
  note="With bottomNav, a phone keeps the rail's few places in a bar along the bottom, and the drawer holds only the pages"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Under 48rem" code="bottomNav">
    <div class="frame phone">
      <AppShell
        title={names[bottom]}
        contained
        landmark="none"
        label="Workspace navigation"
        bottomNav
      >
        {#snippet rail()}
          <Rail items={places} {foot} current={place} onpick={(item) => (place = item.label)} />
        {/snippet}
        {#snippet sidebar()}
          <SideNav
            kicker="Workspace"
            title="Smykla Skalski"
            {sections}
            current={bottom}
            onnavigate={go((href) => (bottom = href))}
          />
        {/snippet}
        {@render content(bottom)}
      </AppShell>
    </div>
  </Specimen>
</Example>

<style>
  .frame {
    --sui-shell-height: 30rem;
    border: var(--sui-stroke) solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-surface);
    box-sizing: border-box;
    overflow: hidden;
  }

  /* The right edge fades while more of the frame waits to the side, and the fade clears
     once the frame is scrolled to its end where scroll timelines exist. */
  .scroller {
    border-radius: var(--sui-radius-surface);
    mask-image: linear-gradient(
      to right,
      var(--sui-canvas) calc(100% - var(--sui-space-8)),
      transparent
    );
    mask-repeat: no-repeat;
    mask-size: 100% 100%;
    max-inline-size: 100%;
    overflow-x: auto;
  }

  @supports (animation-timeline: scroll()) {
    .scroller {
      animation: sink-shell-reveal var(--sui-ease-linear) both;
      animation-timeline: scroll(self inline);
    }
  }

  @keyframes sink-shell-reveal {
    to {
      mask-size: calc(100% + var(--sui-space-8)) 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .scroller {
      animation: none;
    }
  }

  .scroller:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  .wide {
    inline-size: 66rem;
  }

  .phone {
    inline-size: min(100%, 23.4375rem);
  }

  .pane {
    display: grid;
    gap: var(--sui-space-4);
    padding: var(--sui-rhythm-pane-top-compact) var(--sui-space-6);
  }

  /* The sentence centres on the pill at an even height, so the pill lands on whole pixels. */
  .sentence {
    align-content: center;
    block-size: var(--sui-block-snap-even);
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
</style>
