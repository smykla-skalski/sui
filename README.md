# SUI

Reusable Svelte 5 components for Smykla projects. The shared look follows the [Smyklot panel design system](https://github.com/smykla-skalski/smyklot/blob/main/design-system/smyklot-panel/MASTER.md): neutral surfaces, one ocean blue accent in both themes, Plus Jakarta Sans for interface text, JetBrains Mono for technical values, and semantic status colors. Every component is held to the [SUI design laws](docs/laws.md), which merge the Smyklot sheet with the rules of a companion documentation site.

This repository contains the package and a kitchen sink (`npm run dev`): an overview of every component, one page per component in every state, `/all/` with every component on one page, and a law audit on demand on each. The shells and page layouts are whole pages under `/layouts`, which the kitchen sink shows in frames at phone, tablet and desktop widths.

## Install

Install the public `@smykla-skalski/sui` package from npm:

```sh
npm install @smykla-skalski/sui
```

Import the theme once in the app root. It holds every `--sui-*` token and both bundled font families. Components read these tokens and carry no fallbacks of their own, so either import the theme or define every token yourself.

```ts
import '@smykla-skalski/sui/styles.css';
```

Components mirror for right-to-left text through `:dir(rtl)`. Vite's default build target lets its CSS minifier rewrite that selector into a list of right-to-left `:lang()` selectors, which miss a page that sets only `dir`, so set a CSS target that keeps it:

```ts
// vite.config.ts
export default defineConfig({
  build: { cssTarget: ['chrome120', 'edge120', 'firefox115', 'safari16.4'] }
});
```

```svelte
<script lang="ts">
  import { Button, Card, Field, Pill } from '@smykla-skalski/sui';

  let project = $state('');
</script>

<Card title="New project" description="Give it a short name">
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
- Actions: `Button` (tones `default`, `signal`, `ghost`, `stop`, `stop-quiet`, `add`, `decision`), `IconButton`, `CopyButton`, `Link`, `BackLink`, `Breadcrumb`, `Tabs`, `SkipLink`
- Inputs: `Field`, `TextInput`, `Textarea`, `SearchField`, `Switch`, `Checkbox`, `CheckList`, `ChoiceCards`, `SegmentedControl`, `ThemeSwitch`, `CopyableLinkField`, `ColorPicker`
- Pickers and editors: `Select`, `Combobox`, `ActionMenu`, `HelpTip`, `DurationInput`, `PairEntry`, `PatternEntries`, `InheritControl`, `AdditionPicker`, `SettingList`, `SettingRow`
- Overlays: `Popover`, `Tooltip`, `Modal`, `ConfirmDialog`, `Toaster` with `toast()` and `dismiss()`, `SaveBar`
- Surfaces and content: `Card`, `Plate`, `Callout`, `Disclosure`, `PageHeader`, `PageToc`, `CodeBlock`, `DiffBlock`, `DataTable`, `FactList`, `FactLine`
- Marks: `Pill`, `Chip`, `Avatar`, `IdentityRow`, `ClippedLabel`, `RelativeTime`, `DayHeading`, `Icon`, `VisuallyHidden`
- Lists and states: `ObjectList`, `ObjectRow`, `ListToolbar`, `EmptyState`, `ErrorState`, `FormError`, `Skeleton`, `LoadMore`
- Charts: `LineChart`, `ScatterChart`, `RangeChart`, `HeatmapChart` (see [chart usage](docs/charts.md))
- Offline: `serve()` from `@smykla-skalski/sui/service-worker` for the app's service worker, with `registerServiceWorker()` and `ServiceWorkerStatus` in its layout (see [offline and updates](docs/offline.md))

Overlays use the native `<dialog>` element and the Popover API, so they render in the browser's top layer with native light dismiss and focus return. SUI has no runtime dependencies besides Svelte.

## Theming

Set `data-sui-theme="dark"` (or `data-theme="dark"`) on `<html>` for the dark palette, or put `data-sui-theme` on any element to theme only that subtree. With neither attribute on `<html>`, the palette follows the reader's system preference. `ThemeSwitch` offers Light, Dark and System, stores the choice and follows the system preference live. A reader who asks the system for more contrast gets lines that hold 3:1 on every ground in either theme.

Override tokens after the theme import. Components use the nearest value.

```css
:root {
  --sui-brand-action: #0f766e;
  --sui-on-brand-action: #fff;
  --sui-radius-control: 0.5rem;
}
```

A surface can opt into the 40px control tier with `--sui-local-control-height: var(--sui-control-height)`. The package applies no global reset and does not import SvelteKit app modules, so it works in SvelteKit, plain Svelte with Vite, and Svelte islands in Astro. The bundled fonts' licenses are in `src/lib/assets/fonts/`.

## Language

Every word a component draws or announces is a prop with an English default. Replace any of them app-wide once, before the first component renders, with `setWords`; a prop on one instance still wins. Words a component joins, such as a name and its count, take the language's order through function words and its punctuation through `marks.comma`, `marks.colon`, `marks.stop` and `marks.space`. Numbers, dates and times follow the page's `lang`.

```ts
import { setWords } from '@smykla-skalski/sui';

setWords({
  'CopyableLinkField.copyLabel': 'Kopiuj link',
  'LoadMore.endLabel': (shown: string) => `Wszystkie ${shown} widoczne`
});
```

## Design laws

[docs/laws.md](docs/laws.md) lists every law with its source and how it is held. [docs/authoring.md](docs/authoring.md) explains how to write a component that meets them.

- `npm test` runs the source laws (`tests/laws.test.mjs`): the palette is the only place a color is written, every token is declared and read, sizes, leading, spacing, radii, layers and durations come from tokens, every moving component has a reduced-motion fallback, and every component has a contract and a kitchen sink section.
- The kitchen sink runs the rendered laws on the page you are on when you press "Run the law audit" and shows each finding: contrast, palette bands, type faces and leading, copy rules, control heights, target sizes, centring, focus, names, the current place and sideways scroll. A run takes seconds and goes stale with the next edit, so the page never runs or keeps one on its own.
- The browser suites read `/all/`, the page with every section. `npm run test:browser` is the everyday check, about seven seconds: that audit in Chrome on a phone in light and a desktop in dark, and the checks that every joined name follows `setWords`. It uses the installed Chrome through `playwright-core`; set `SUI_BROWSER_CHANNEL` to use another channel.
- `npm run test:browser:long` runs everything CI runs: the audit at 320, 375, 768 and 1440px in both themes and on touch tablets, the audit and axe on every layout page, every keyboard stop, menu, press and layer, right to left, forced colors, text spacing and size, axe, the section pictures and the lab performance checks.

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

The package name is `@smykla-skalski/sui`. Follow [the publishing guide](docs/publishing.md) to create the npm organization, publish the initial version, and connect the GitHub Actions trusted publisher. Later releases publish from GitHub Releases with automatic npm provenance. Keep the package's public entry points and CSS token names stable within a major version. [docs/lifecycle.md](docs/lifecycle.md) says when a component joins, how a change goes through deprecation, how adoption is checked and how an app moves from 0.2 to 0.3.

## Direction

Adopt the primitives in one app first, then replace app-local controls where the behaviour matches. The CodeMirror-based editor from Smyklot is not part of the package, because it would add SUI's first runtime dependency.
