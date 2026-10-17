<script module lang="ts">
  export const section = { title: 'Navigation', order: 66 };
</script>

<script lang="ts">
  import { BackLink, Breadcrumb, Link } from '#lib';
  import Example from '../kit/Example.svelte';
</script>

<Example
  title="Breadcrumb"
  note="The way up through the hierarchy, where the nearest ancestor is the last link and the page itself closes the path"
  layout="stack"
>
  <Breadcrumb
    items={[
      { label: 'Acme', href: '#navigation' },
      { label: 'Repositories', href: '#navigation' },
      { label: 'Library', href: '#navigation' }
    ]}
    current="Settings"
  />
</Example>

<Example
  title="One ancestor"
  note="A path with one ancestor leads with a chevron, so it reads as Up"
>
  <Breadcrumb items={[{ label: 'Repositories', href: '#navigation' }]} />
</Example>

<Example title="Back link" note="The way back from a page that stands inside a list">
  <BackLink href="#navigation" label="All runs" />
  <BackLink href="#navigation" label="All runs" tone="quiet" />
</Example>

<Example
  title="Link"
  note="The action ink with a faint underline that fills on hover, and an arrow when it leaves, read aloud as opens another site"
  layout="stack"
>
  <p class="copy">
    Read the <Link href="#callout">callout guidance</Link> or the
    <Link href="https://www.w3.org/WAI/ARIA/apg/">ARIA authoring practices</Link> before you write a new
    pattern
  </p>
  <p class="copy narrow">
    A long link wraps with its sentence: see
    <Link href="#code-block">the guide to settings every repository in the workspace inherits</Link>
  </p>
</Example>

<style>
  .copy {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-body) / var(--sui-leading-body) var(--sui-sans);
    margin: 0;
  }

  .narrow {
    max-inline-size: 16rem;
  }
</style>
