# SUI

Reusable Svelte 5 components for Smykla projects. The shared look follows the [Smyklot panel design system](https://github.com/smykla-skalski/smyklot/blob/main/design-system/smyklot-panel/MASTER.md): graphite surfaces, petrol actions, Plus Jakarta Sans for interface text, JetBrains Mono for technical values, and semantic status colors. Every component is held to the [SUI design laws](docs/laws.md), which merge the Smyklot sheet with the rules of the ksai documentation site.

This repository contains the package and a kitchen sink (`npm run dev`) that shows every component in every state and measures the laws on each render.

## Install

Install the public `@smykla-skalski/sui` package from npm:

```sh
npm install @smykla-skalski/sui
```

Import the theme once in the app root. It holds every `--sui-*` token and both bundled font families. Components read these tokens and carry no fallbacks of their own, so either import the theme or define every token yourself.

```ts
import '@smykla-skalski/sui/styles.css';
```

```svelte
<script lang="ts">
  import { Button, Card, Field, Pill } from '@smykla-skalski/sui';

  let project = $state('');
</script>

<Card title="New project" note="Give it a short name">
  <Field label="Project name" bind:value={project} required />
  {#snippet footer()}
    <Button tone="signal" onclick={() => console.log(project)}>Create</Button>
    <Pill tone="success">Ready</Pill>
  {/snippet}
</Card>
```

## Components

Each component documents its contract in an `@component` comment, and the kitchen sink shows its states.

- Shell: `AppShell` (rail, sidebar and content, a collapsed icon strip on wide screens, a bar and a drawer on phones), `SideNav`, `Rail`
- Actions: `Button` (tones `default`, `signal`, `ghost`, `stop`, `stop-quiet`, `brand`, `quiet`, `add`, `decision`), `IconButton`, `CopyButton`, `Link`, `BackLink`, `Breadcrumb`, `Tabs`, `SkipLink`
- Inputs: `Field`, `TextInput`, `Textarea`, `SearchField`, `Switch`, `Checkbox`, `CheckList`, `ChoiceCards`, `SegmentedControl`, `ThemeSwitch`, `CopyableLinkField`, `ColorPicker`
- Pickers and editors: `Select`, `Combobox`, `ActionMenu`, `HelpTip`, `DurationInput`, `PairEntry`, `PatternEntries`, `InheritControl`, `AdditionPicker`, `SettingList`, `SettingRow`
- Overlays: `Popover`, `Tooltip`, `Modal`, `ConfirmDialog`, `Toaster` with `toast()` and `dismiss()`, `SaveBar`
- Surfaces and content: `Card`, `Plate`, `Callout`, `Disclosure`, `PageHeader`, `PageToc`, `CodeBlock`, `DiffBlock`, `DataTable`, `FactList`
- Marks: `Pill`, `Chip`, `StatusPill`, `ColorTag`, `Avatar`, `IdentityRow`, `ClippedLabel`, `RelativeTime`, `DayHeading`, `Icon`, `VisuallyHidden`
- Lists and states: `ObjectList`, `ObjectRow`, `ListToolbar`, `EmptyState`, `ErrorState`, `FormError`, `Skeleton`, `LoadMore`
- Charts: `LineChart`, `ScatterChart`, `RangeChart`, `HeatmapChart` (see [chart usage](docs/charts.md))

Overlays use the native `<dialog>` element and the Popover API, so they render in the browser's top layer with native light dismiss and focus return. SUI has no runtime dependencies besides Svelte.

## Theming

Set `data-sui-theme="dark"` (or `data-theme="dark"`) on `<html>` for the dark palette, or put `data-sui-theme` on any element to theme only that subtree. `ThemeSwitch` offers Light, Dark and System, stores the choice and follows the system preference live.

Override tokens after the theme import. Components use the nearest value.

```css
:root {
  --sui-brand-action: #0f766e;
  --sui-on-brand-action: #fff;
  --sui-radius-control: 0.5rem;
}
```

A surface can opt into the 40px control tier with `--sui-local-control-height: var(--sui-control-height)`. The package applies no global reset and does not import SvelteKit app modules, so it works in SvelteKit, plain Svelte with Vite, and Svelte islands in Astro. The bundled fonts' licenses are in `src/lib/assets/fonts/`.

## Design laws

[docs/laws.md](docs/laws.md) lists every law with its source and how it is held. [docs/authoring.md](docs/authoring.md) explains how to write a component that meets them.

- `npm test` runs the source laws (`tests/laws.test.mjs`): the palette is the only place a color is written, every token is declared and read, sizes, leading, spacing, radii, layers and durations come from tokens, every moving component has a reduced-motion fallback, and every component has a contract and a kitchen sink section.
- The kitchen sink runs the rendered laws in the page and shows each finding: contrast, palette bands, type faces and leading, copy rules, control heights, target sizes, centring, focus, names and sideways scroll.
- `npm run test:browser` runs that audit in Chrome at 320, 375, 768 and 1440px in both themes. It also walks every keyboard stop, opens every menu, checks reduced motion, theme geometry and icon centring. It uses the installed Chrome through `playwright-core`; set `SUI_BROWSER_CHANNEL` to use another channel.

## Development

```sh
mise install
npm ci
npm run check
npm test
npm run test:browser
npm run build
npm run dev
```

`npm run build` writes distributable Svelte components, JavaScript, declarations, and CSS to `dist/`. `npm pack --dry-run` previews the published files.

## Release

The package name is `@smykla-skalski/sui`. Follow [the publishing guide](docs/publishing.md) to create the npm organization, publish the initial version, and connect the GitHub Actions trusted publisher. Later releases publish from GitHub Releases with automatic npm provenance. Keep the package's public entry points and CSS token names stable within a major version.

## Direction

Adopt the primitives in one app first, then replace app-local controls where the behaviour matches. The CodeMirror-based editor from Smyklot is not part of the package, because it would add SUI's first runtime dependency.
