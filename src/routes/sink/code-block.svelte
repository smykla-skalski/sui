<script module lang="ts">
  export const section = {
    title: 'Code Block',
    short: 'Code',
    lead: 'A read-only window of code, colored by its language, with a copy control in the corner. A change from one text to another is a DiffBlock.',
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

  const shell = `# Pack the library, then count what it exports
SUI_THEME=dark npm run build -- --mode=production
npx svelte-package --input src/lib \\
  --output "$OUT_DIR" && ls "\${OUT_DIR}/components" | wc -l
grep -rn 'export default' dist 2>/dev/null || echo "No exports"`;

  const long =
    'npm run build && npx svelte-package --input src/lib --output dist --types && node scripts/verify-exports.mjs --strict --report reports/exports.json';
</script>

<Example
  title="Languages"
  note="Each language colors its own tokens, and plain text stays plain"
  layout="stack"
  ground="canvas"
>
  <Specimen label="A comment, nested keys and a list">
    <CodeBlock code={yaml} lang="yaml" />
  </Specimen>
  <Specimen label="A table with a comment">
    <CodeBlock code={toml} lang="toml" />
  </Specimen>
  <Specimen label="A heading, a list and inline code">
    <CodeBlock code={markdown} lang="markdown" />
  </Specimen>
  <Specimen label="Variables, flags, quotes and a continued line">
    <CodeBlock code={shell} lang="shell" />
  </Specimen>
  <Specimen label="A setting left uncolored">
    <CodeBlock code="SUI_THEME=dark" lang="text" />
  </Specimen>
</Example>

<Example
  title="Parts"
  note="The label names the file, and the gutter reads at full opacity and never selects"
  layout="stack"
  ground="canvas"
>
  <Specimen label="File label & line numbers">
    <CodeBlock code={json} lang="json" label="renovate.json" lineNumbers />
  </Specimen>
  <Specimen label="Without a copy control">
    <CodeBlock code="npm run check" lang="shell" copy={false} />
  </Specimen>
</Example>

<Example
  title="Long Line"
  note="A long line scrolls inside the block, which then takes keyboard focus"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Scrolls sideways">
    <CodeBlock code={long} lang="shell" />
  </Specimen>
</Example>

<Example title="Copy Control" note="It names what it copies and says Copied for 1.6&nbsp;seconds">
  <Specimen label="Default name">
    <div class="tier"><CopyButton text="npm install @smykla-skalski/sui" /></div>
  </Specimen>
  <Specimen label="Named for what it copies">
    <div class="tier"><CopyButton text="0.2.1" label="Copy Version" /></div>
  </Specimen>
  <Specimen label="Toolbar tier, as tall as a field">
    <div class="tier">
      <CopyButton text="https://sui.tercenas.com" label="Copy Link" toolbar />
    </div>
  </Specimen>
  <Specimen label="Disabled">
    <div class="copy-locked">
      <CopyButton
        text="YOUR_API_TOKEN_HERE"
        label="Copy Token"
        disabled
        aria-describedby="sink-copy-token-reason"
      />
      <p id="sink-copy-token-reason" class="copy-reason">
        This token no longer works, so create a new one
      </p>
    </div>
  </Specimen>
</Example>

<style>
  .copy-locked {
    display: grid;
    gap: var(--sui-row-copy-gap);
    justify-items: start;
  }

  /* Side by side, each tier stands in a toolbar tier's height, so the quieter 28px ones centre
     on the 34px one beside them and the four words share one line. The disabled one keeps its
     reason a copy gap under it, so it takes only the room above. A phone stacks them, each
     alone on its line, so each keeps its own height there. */
  @media (min-width: 48rem) {
    .tier {
      align-items: center;
      display: grid;
      justify-items: start;
      min-block-size: var(--sui-control-height-compact);
    }

    .copy-locked {
      padding-block-start: calc((var(--sui-control-height-compact) - var(--sui-tier-quiet)) / 2);
    }
  }

  .copy-reason {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
  }
</style>
