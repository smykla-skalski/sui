# SUI

Reusable Svelte 5 components for Smykla projects. The shared look follows the [Smyklot panel design system](https://github.com/smykla-skalski/smyklot/blob/main/design-system/smyklot-panel/MASTER.md): graphite surfaces, petrol actions, Plus Jakarta Sans, and semantic status colors. This repository contains a package and a local gallery (`npm run dev`).

## Install

The package is prepared for publishing as `@smykla-skalski/sui`. Until its first release, install a local tarball built with `npm pack` or use a workspace dependency.

```sh
npm install @smykla-skalski/sui
```

Import the shared theme once in the app root. It includes the licensed Plus Jakarta Sans font. Components also have CSS fallbacks, so an app can define its own `--sui-*` tokens without importing the defaults.

```ts
import '@smykla-skalski/sui/styles.css';
```

```svelte
<script lang="ts">
  import { Badge, Button, Card, Field } from '@smykla-skalski/sui';

  let project = $state('');
</script>

<Card heading="New project" description="Give it a short name.">
  <Field label="Project name" bind:value={project} required />
  {#snippet footer()}
    <Button onclick={() => console.log(project)}>Create</Button>
    <Badge tone="success">Ready</Badge>
  {/snippet}
</Card>
```

## Components

| Component      | Key props                                  | Notes                                                                             |
| -------------- | ------------------------------------------ | --------------------------------------------------------------------------------- |
| `Button`       | `variant`, `size`, `loading`               | Native button attributes and `onclick` pass through; defaults to `type="button"`. |
| `Field`        | `label`, `hint`, `error`, `bind:value`     | Text-like input; generates a stable ID and links help/error text.                 |
| `Card`         | `heading`, `description`, `footer` snippet | Plain content surface; HTML div attributes pass through.                          |
| `Badge`        | `tone`                                     | Inline status label; HTML span attributes pass through.                           |
| `LineChart`    | `series`, `xLabel`, `yLabel`               | Numeric X/Y series with paths, legend, and data table.                            |
| `ScatterChart` | `series`, `xLabel`, `yLabel`               | Numeric X/Y points with legend and data table.                                    |
| `RangeChart`   | `data`, `valueLabel`                       | Labeled intervals with optional markers.                                          |
| `HeatmapChart` | `rows`, `columns`, `cells`                 | Matrix of numeric values with missing-cell support.                               |

Use native links for navigation. Do not use a button as a link. Use `aria-label` for icon-only actions.

Charts use generic numbers and labels. `LineChart` and `ScatterChart` accept `ChartSeries[]` (`id`, `label`, `points: { x, y }[]`, optional `color`). Map dates to numeric timestamps and supply `formatX` to display them. Every chart requires a short `description`; an expandable table provides the full values. Non-finite X/Y points are omitted. See [chart usage](docs/charts.md).

## Theming

Set CSS custom properties on `:root` or a containing element. Import `styles.css` for the Smyklot-inspired light palette. Set `data-sui-theme="dark"` or `data-theme="dark"` on `<html>` for its dark palette. An app can override tokens after the import; components use the nearest value.

```css
:root {
  --sui-primary: #0f766e;
  --sui-primary-foreground: #fff;
  --sui-radius: 0.5rem;
  --sui-surface-radius: 0.625rem;
}
```

Tokens are prefixed, and the package applies no global reset. It can be used in SvelteKit, plain Svelte/Vite, and Svelte islands in Astro. It does not import SvelteKit app modules or require Tailwind/Skeleton. Consumer `class` values are appended to component classes for local customization. The bundled font's license is in `src/lib/assets/fonts/PLUS_JAKARTA_SANS_OFL.txt`.

## Development

```sh
mise install
npm ci
npm run check
npm test
npm run build
npm run dev
```

`npm run build` writes distributable Svelte components, JavaScript, declarations, and CSS to `dist/`. `npm pack --dry-run` previews the published files.

## Release

The package name is `@smykla-skalski/sui`. The first public release needs an npm account with access to the `@smykla-skalski` scope. After CI passes, update the version and changelog, then publish with npm provenance:

```sh
npm publish --provenance --access public
```

For automated releases, configure npm trusted publishing for this repository before adding a release workflow. Keep the package's public entry points and CSS token names stable within a major version.

Add components in `src/lib/components`, export them from `src/lib/index.ts`, document their props here, and show a realistic use in `src/routes/+page.svelte`. Prefer native HTML behavior and Svelte 5 runes/snippets. Complex overlays should use an accessible headless primitive rather than hand-written focus management.

## Direction

Start by adopting these primitives in one app. Then extract repeated patterns with the same behavior across at least two apps. Current candidates: Alert/Callout, EmptyState, Toast, ConfirmDialog, Select, and Modal. Overlay components need focus trapping, escape handling, focus restoration, and keyboard tests before release.
