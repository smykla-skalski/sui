<script module lang="ts">
  export const section = {
    title: 'Navigation',
    order: 66,
    lead: 'The ways between pages: a breadcrumb up the hierarchy, a back link out of a list and a link inside a sentence. A control that looks like a button is a Button with href.',
    components: ['Breadcrumb', 'BackLink', 'Link']
  };
</script>

<script lang="ts">
  import { BackLink, Breadcrumb, Link } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
</script>

<Example
  title="Breadcrumb"
  note="The nearest ancestor is the last link, and a lone ancestor leads with a chevron so it reads as Up"
>
  <Specimen label="Ancestors and the page" code="items current">
    <Breadcrumb
      items={[
        { label: 'Acme', href: '#navigation' },
        { label: 'Repositories', href: '#navigation' },
        { label: 'Library', href: '#navigation' }
      ]}
      current="Settings"
    />
  </Specimen>
  <Specimen label="One ancestor" code="items">
    <Breadcrumb items={[{ label: 'Repositories', href: '#navigation' }]} />
  </Specimen>
</Example>

<Example title="Back link" note="The way back from a page that stands inside a list">
  <Specimen label="Default" code="href label">
    <BackLink href="#navigation" label="All runs" />
  </Specimen>
  <Specimen label="Quiet, beside tabs" code={'tone="quiet"'}>
    <BackLink href="#navigation" label="All runs" tone="quiet" />
  </Specimen>
</Example>

<Example
  title="Link"
  note="The action ink with a faint underline that fills on hover, and an arrow after a link that leaves"
>
  <Specimen label="Inside a sentence" code="href">
    <p class="copy">
      Read the <Link href="#callout">callout guidance</Link> before you write a new pattern
    </p>
  </Specimen>
  <Specimen label="Leaves the product" code={'href="https://…"'}>
    <p class="copy">
      Follow the <Link href="https://www.w3.org/WAI/ARIA/apg/">ARIA authoring practices</Link> before
      you build a new widget
    </p>
  </Specimen>
</Example>

<Example title="Narrow width" note="A long link wraps with its sentence" layout="stack">
  <Specimen label="Wrapped link">
    <p class="copy narrow">
      Before you change a default, read
      <Link href="#code-block"
        >the guide to settings every repository in the workspace inherits</Link
      >
    </p>
  </Specimen>
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
