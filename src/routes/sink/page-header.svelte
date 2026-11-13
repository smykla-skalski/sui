<script module lang="ts">
  export const section = {
    title: 'Page Header',
    lead: 'The top of a page: where it is, what it is called, its state, what it is for and the controls that act on it. A part of the page takes a Section heading instead.',
    components: ['PageHeader', 'Breadcrumb', 'BackLink']
  };
</script>

<script lang="ts">
  import {
    BackLink,
    Breadcrumb,
    Button,
    FactList,
    PageHeader,
    Pill,
    RelativeTime,
    Tabs
  } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const started = new Date(Date.now() - 12.5 * 60_000).toISOString();
  let checked = $state(false);
</script>

{#snippet startedAt()}<RelativeTime value={started} />{/snippet}

<Example
  title="Parts"
  note="Every header is a band over the page, and its actions move under the copy on a phone"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Eyebrow, description & actions">
    <div class="page wide">
      <PageHeader
        level={4}
        eyebrow={['Acme', 'Sync']}
        title="Repository Settings"
        description="Rules every repository in this workspace is held to"
      >
        {#snippet actions()}
          <Button>Export Settings</Button>
          <Button tone="signal">Save Changes</Button>
        {/snippet}
      </PageHeader>
      <p class="view">Every new repository starts with these rules</p>
    </div>
  </Specimen>
</Example>

<Example
  title="Title Only"
  note="A page with nothing more to say than its name takes a header of one line"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Title only">
    <div class="page wide">
      <PageHeader level={4} title="Activity" />
      <p class="view">Nothing happened in the last 7&nbsp;days</p>
    </div>
  </Specimen>
</Example>

<Example
  title="State & Facts"
  note="The state stands beside the title and is said once when it changes, and headline facts close the copy"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Status, description & facts">
    <div class="page wide">
      <PageHeader
        level={4}
        title="Sync Check #4182"
        description="Compared 16 repositories in acme with the saved settings"
      >
        {#snippet kicker()}<BackLink href="#page-header" label="Queue" />{/snippet}
        {#snippet status()}
          <Pill tone={checked ? 'success' : 'warning'} dot>
            {checked ? 'Up to date' : '3 differ'}
          </Pill>
        {/snippet}
        {#snippet facts()}
          <FactList
            facts={[
              { label: 'Workspace', value: 'acme' },
              { label: 'Started', value: startedAt },
              { label: 'Took', value: '48\u00a0seconds' },
              { label: 'Requested by', value: 'Alex Kim' }
            ]}
          />
        {/snippet}
        {#snippet actions()}
          <!-- Both words share one cell, so the button keeps the longer one's width as they flip. -->
          <Button tone="signal" onclick={() => (checked = !checked)}
            ><span class="flip"
              ><span class:shown={!checked}>Check Again</span><span class:shown={checked}
                >Undo the Check</span
              ></span
            ></Button
          >
        {/snippet}
      </PageHeader>
      <p class="view">
        {checked
          ? 'Every repository matches its settings'
          : '3 repositories differ from their settings'}
      </p>
    </div>
  </Specimen>
</Example>

<Example
  title="With Tabs"
  note="The band’s foot is the tabs’ line, so the view under it starts on a clean cut"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Views of one page">
    <div class="page wide">
      <PageHeader
        level={4}
        eyebrow={['Acme', 'Repositories']}
        title="smykla-skalski/sui"
        description="The component library and its kitchen sink"
      >
        {#snippet actions()}
          <Button>Sync Now</Button>
        {/snippet}
        {#snippet tabs()}
          <Tabs
            label="Repository"
            current="#page-header-runs"
            items={[
              { href: '#page-header-overview', label: 'Overview' },
              { href: '#page-header-runs', label: 'Runs', count: 12 },
              { href: '#page-header-settings', label: 'Settings' }
            ]}
          />
        {/snippet}
      </PageHeader>
      <p class="view">The last run checked 84 files, all in sync</p>
    </div>
  </Specimen>
</Example>

<Example
  title="Breadcrumb"
  note="A breadcrumb takes the eyebrow’s place and leads back up the path to the page"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Path to the page">
    <div class="page wide">
      <PageHeader
        level={4}
        title="Sync Schedule"
        description="When the sync checks this repository against its template"
      >
        {#snippet kicker()}
          <Breadcrumb
            items={[
              { label: 'Acme', href: '#page-header' },
              { label: 'Repositories', href: '#page-header' }
            ]}
          />
        {/snippet}
      </PageHeader>
      <p class="view">Checked every day at 06:00</p>
    </div>
  </Specimen>
</Example>

<Example
  title="Back Link"
  note="A back link takes the eyebrow’s place when the page has one way back"
  layout="stack"
  ground="canvas"
>
  <Specimen label="One step back">
    <div class="page wide">
      <PageHeader
        level={4}
        title="Run 1842"
        description="One sync of this repository against its template"
      >
        {#snippet kicker()}<BackLink href="#page-header" label="All runs" />{/snippet}
      </PageHeader>
      <p class="view">Finished in 4&nbsp;minutes with no changes</p>
    </div>
  </Specimen>
</Example>

<Example
  title="Long Title"
  note="The title balances its lines and holds them closer together than the description under them"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Wrapping title & description">
    <div class="page wide">
      <PageHeader
        level={4}
        eyebrow={['Acme', 'Access']}
        title="Bypass Rules for the Platform Team’s Deployment Repositories Across Every Region"
        description="People and apps listed here can push past the branch rules, and the audit log records every push they make"
      >
        {#snippet actions()}
          <Button tone="signal">Add a Rule</Button>
        {/snippet}
      </PageHeader>
      <p class="view">2 people and 1 app can bypass the rules</p>
    </div>
  </Specimen>
</Example>

<style>
  /* A page's content area: the header's band sits flush with its edges, and the view under it
     takes the same gutter. */
  .page {
    background: var(--sui-canvas);
    border: var(--sui-stroke) solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-surface);
    overflow: hidden;
  }

  /* A page stacked alone on the stage runs across its inset to the frame's edges, as a page
     fills the window, so its header and view keep a phone's width less the page's own gutter
     and the frame draws its sides. It runs to its specimen's foot too, so the divider under it,
     or the Code row's line under the last, is its foot and no strip of ground parts the two. */
  .wide {
    border-block-end: 0;
    border-inline: 0;
    border-radius: 0;
    margin: 0 calc(-1 * var(--sui-local-bleed, 0px)) calc(-1 * var(--sui-local-bleed, 0px));
  }

  .flip {
    display: inline-grid;
  }

  .flip > span {
    grid-area: 1 / 1;
    justify-self: center;
  }

  .flip > :not(.shown) {
    visibility: hidden;
  }

  /* The view under the header is the page's own content, so it wears the content's ink and
     never reads as one more caption band. */
  .view {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    padding: 0 var(--sui-rhythm-pane-gutter) var(--sui-space-6);
    padding-block: var(--sui-block-snap-half, 0px)
      calc(var(--sui-space-6) + var(--sui-block-snap-spare, 0px) - var(--sui-block-snap-half, 0px));
    text-box: trim-both cap alphabetic;
  }
</style>
