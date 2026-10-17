<script module lang="ts">
  export const section = { title: 'App shell', order: 118 };
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
        { href: '#shell-files', label: 'Files kept in step across every repository', icon: 'file' }
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
    { label: 'Smykla Skalski', icon: 'organization' },
    { label: 'Personal', icon: 'user' },
    { label: 'Root console', icon: 'server', badge: 4 }
  ];

  const foot: RailItem[] = [{ label: 'Settings', icon: 'settings' }];

  const names = Object.fromEntries(
    sections.flatMap((group) => group.items).map((item) => [item.href, item.label])
  );

  let wide = $state('#shell-repositories');
  let folded = $state('#shell-queue');
  let phone = $state('#shell-overview');
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
      eyebrow="Smykla Skalski · Workspace"
      title={names[current] ?? 'Overview'}
      description="Press a page in the sidebar and the selection plate glides to it"
      level={4}
    />
    <p class="copy"><Pill tone="success">Healthy</Pill> Every repository synced 4 minutes ago</p>
  </div>
{/snippet}

<Example
  title="Rail, pages and content"
  note="The rail chooses the place, the sidebar the page, and the current one wears the plate"
  layout="stack"
>
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
</Example>

<Example
  title="Collapsed on a wide screen"
  note="Above 64rem the sidebar folds into icons, so this 66rem frame scrolls sideways inside its section"
  layout="stack"
>
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
</Example>

<Example
  title="Phone"
  note="Below 48rem a bar names the page and the sidebar opens as a drawer over the content"
  layout="stack"
>
  <div class="frame phone">
    <AppShell title={names[phone]} contained landmark="none" label="Workspace navigation">
      {#snippet rail()}
        <Rail items={places} {foot} current={place} />
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
</Example>

<style>
  .frame {
    --sui-shell-height: 30rem;
    border: 1px solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-surface);
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

  .copy {
    align-items: center;
    color: var(--sui-text-secondary);
    display: flex;
    flex-wrap: wrap;
    font: 400 var(--sui-font-size-body) / var(--sui-leading-body) var(--sui-sans);
    gap: var(--sui-space-2);
    margin: 0;
  }
</style>
