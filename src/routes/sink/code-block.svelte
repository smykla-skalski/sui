<script module lang="ts">
  export const section = {
    title: 'Code block',
    order: 68,
    lead: 'A read-only window of code, colored by its language, with a copy control in the corner. A change between two texts is a DiffBlock.',
    components: ['CodeBlock', 'CopyButton']
  };
</script>

<script lang="ts">
  import { CodeBlock, CopyButton } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const json = `{
  "extends": ["config:recommended"],
  // Grouped so one pull request carries every bump
  "packageRules": [{ "groupName": "all dependencies", "matchPackageNames": ["*"] }],
  "prHourlyLimit": 2,
  "automerge": false
}`;

  const yaml = `# Synced from the library template
name: check
on:
  push:
    branches:
      - main
jobs: 3
cache: true`;

  const toml = `[package]
name = "sui"
# The release channel
channel = "stable"`;

  const markdown = `## Install
- Run \`npm install @smykla-skalski/sui\`
- Import the palette once`;

  const long =
    'npm run build && npx svelte-package --input src/lib --output dist --types && node scripts/verify-exports.mjs --strict --report reports/exports.json';
</script>

<Example
  title="Languages"
  note="Each language colors its own tokens, and plain text stays plain"
  layout="stack"
  ground="canvas"
>
  <Specimen label="YAML" code={'lang="yaml"'}>
    <CodeBlock code={yaml} lang="yaml" />
  </Specimen>
  <Specimen label="TOML" code={'lang="toml"'}>
    <CodeBlock code={toml} lang="toml" />
  </Specimen>
  <Specimen label="Markdown" code={'lang="markdown"'}>
    <CodeBlock code={markdown} lang="markdown" />
  </Specimen>
  <Specimen label="Plain text" code={'lang="text"'}>
    <CodeBlock code="SUI_THEME=dark" lang="text" />
  </Specimen>
</Example>

<Example
  title="Parts"
  note="The label names the file, and the gutter reads at full opacity and never selects"
  layout="stack"
  ground="canvas"
>
  <Specimen label="File label and line numbers" code="label lineNumbers">
    <CodeBlock code={json} lang="json" label="renovate.json" lineNumbers />
  </Specimen>
  <Specimen label="Without a copy control" code={'copy={false}'}>
    <CodeBlock code="npm run check" copy={false} />
  </Specimen>
</Example>

<Example
  title="Long line"
  note="A long line scrolls inside the block, which then takes keyboard focus"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Scrolls sideways">
    <CodeBlock code={long} />
  </Specimen>
</Example>

<Example title="Copy control" note="It names what it copies and says Copied for 1.6 seconds">
  <Specimen label="Default name" code="text">
    <CopyButton text="npm install @smykla-skalski/sui" />
  </Specimen>
  <Specimen label="Named for what it copies" code={'label="Copy version"'}>
    <CopyButton text="0.2.1" label="Copy version" />
  </Specimen>
  <Specimen label="Toolbar tier, 34px" code="toolbar">
    <CopyButton text="https://sui.smyklot.com" label="Copy link" toolbar />
  </Specimen>
  <Specimen label="Disabled" code="disabled">
    <div class="copy-locked">
      <CopyButton
        text="ghp_example"
        label="Copy token"
        disabled
        aria-describedby="sink-copy-token-reason"
      />
      <p id="sink-copy-token-reason" class="copy-reason">The token was revoked</p>
    </div>
  </Specimen>
</Example>

<style>
  .copy-locked {
    display: grid;
    gap: var(--sui-row-copy-gap);
    justify-items: start;
  }

  .copy-reason {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }
</style>
