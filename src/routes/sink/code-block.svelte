<script module lang="ts">
  export const section = { title: 'Code block', order: 68 };
</script>

<script lang="ts">
  import { CodeBlock, CopyButton } from '#lib';
  import Example from '../kit/Example.svelte';

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
  title="Line numbers and a file label"
  note="The gutter reads at full opacity and never selects, and the label names the file"
  layout="stack"
>
  <CodeBlock code={json} lang="json" label="renovate.json" lineNumbers />
</Example>

<Example
  title="Languages"
  note="Each language colors its own tokens, and plain text stays plain"
  layout="stack"
>
  <CodeBlock code={yaml} lang="yaml" />
  <CodeBlock code={toml} lang="toml" label="Cargo.toml" />
  <CodeBlock code={markdown} lang="markdown" />
</Example>

<Example
  title="A long line"
  note="A long line scrolls inside the block, which then takes keyboard focus"
  layout="stack"
>
  <CodeBlock code={long} />
</Example>

<Example
  title="Copy control"
  note="It shows on hover and focus, always on touch, and says Copied for 1.6 seconds"
>
  <CopyButton text="npm install @smykla-skalski/sui" />
  <CopyButton text="0.2.1" label="Copy version" />
</Example>

<Example title="Without a copy control" note="A caller can leave the control out" layout="stack">
  <CodeBlock code="SUI_THEME=dark" copy={false} />
</Example>
