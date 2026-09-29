<script lang="ts">
  import { Badge, Button, Card, Field } from '$lib';

  let name = $state('');
  let dark = $state(false);

  function toggleTheme() {
    dark = !dark;
    document.documentElement.dataset.suiTheme = dark ? 'dark' : 'light';
  }
</script>

<svelte:head>
  <title>SUI component gallery</title>
  <meta name="description" content="A small, themeable Svelte component foundation" />
</svelte:head>

<main>
  <header>
    <div>
      <p class="eyebrow">Smykla UI</p>
      <h1>Reusable Svelte components</h1>
      <p>A small foundation for interfaces across projects. Change the tokens to make it yours.</p>
    </div>
    <Button variant="secondary" onclick={toggleTheme}>Switch to {dark ? 'light' : 'dark'}</Button>
  </header>

  <section aria-labelledby="actions-heading">
    <h2 id="actions-heading">Actions</h2>
    <div class="row">
      <Button onclick={() => alert('Saved')}>Primary action</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Delete</Button>
      <Button loading>Saving</Button>
    </div>
  </section>

  <section aria-labelledby="content-heading">
    <h2 id="content-heading">Content and status</h2>
    <div class="cards">
      <Card
        heading="Project status"
        description="A card with optional heading, description, and footer."
      >
        <div class="row">
          <Badge>Draft</Badge>
          <Badge tone="success">Ready</Badge>
          <Badge tone="warning">Needs review</Badge>
          <Badge tone="danger">Blocked</Badge>
        </div>
        {#snippet footer()}<Button size="sm" variant="secondary">View details</Button>{/snippet}
      </Card>
      <Card heading="Contact">
        <Field
          label="Your name"
          hint="Shown on your profile"
          placeholder="Ada Lovelace"
          bind:value={name}
        />
        <p class="preview">Hello{name ? `, ${name}` : ''}.</p>
      </Card>
    </div>
  </section>
</main>

<style>
  :global(body) {
    margin: 0;
    background: var(--sui-canvas);
    color: var(--sui-foreground);
  }
  main {
    max-width: 68rem;
    margin: auto;
    padding: 4rem 1.5rem;
    font-family: var(--sui-font);
  }
  header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 2rem;
    margin-bottom: 3.5rem;
  }
  h1 {
    margin: 0.25rem 0;
    font-size: clamp(2rem, 4vw, 3.5rem);
    letter-spacing: -0.04em;
  }
  h2 {
    margin: 0 0 1rem;
    font-size: 1.125rem;
  }
  p {
    color: var(--sui-muted);
    line-height: 1.5;
  }
  .eyebrow {
    margin: 0;
    color: var(--sui-primary);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  section {
    margin-top: 2.5rem;
  }
  .row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 21rem), 1fr));
    gap: 1rem;
  }
  .preview {
    margin: 1rem 0 0;
  }
  @media (max-width: 40rem) {
    header {
      flex-direction: column;
    }
    main {
      padding-top: 2rem;
    }
  }
</style>
