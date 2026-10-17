# Changelog

## Unreleased

- Add the full Smyklot primitive set: about 60 components for actions, inputs, pickers, overlays, surfaces, marks, lists, states and settings, with native `<dialog>` and Popover API overlays and no runtime dependencies.
- Add the application shell: `AppShell`, `SideNav` and `Rail`, with a collapsed icon strip on wide screens and a phone bar with a focus-holding drawer. The shell answers to its own width through container queries.
- Add the design laws (`docs/laws.md`), the kitchen sink that audits them on each render, source-law tests and a browser law test (`npm run test:browser`).
- Port the Smyklot palette and both font families. Breaking: tokens are renamed after Smyklot (`--sui-foreground` is `--sui-text-primary`, `--sui-muted` is `--sui-text-muted`, `--sui-surface` is `--sui-surface-base`, `--sui-subtle` is `--sui-surface-inset`, `--sui-border` is `--sui-border-subtle`, `--sui-primary*` is `--sui-brand-action*`, `--sui-*-subtle` is `--sui-*-tint`, `--sui-font` is `--sui-sans`, `--sui-radius` is `--sui-radius-control`), and components no longer carry fallback values.
- Breaking: `Button` takes `tone` instead of `variant` and `size` (`primary` is `signal`, `secondary` is `default`, `danger` is `stop`), and controls are 34px with an opt-in 40px tier.
- Breaking: `Badge` is replaced by `Pill`. `Card` prefers `title` and `note`; `heading` and `description` still work.
- Rewrite the laws that went against WCAG 2.2, the APG and platform guidance. Field edges hold 3:1, phone controls are 44px, phone fields type at 16px, disabled controls draw at 0.7 opacity, and charts use their own categorical palette.
- Breaking: `Select` is a native `<select>`, styled with customizable select where the browser has it. `element` is an `HTMLSelectElement`, and native attributes such as `required` and `name` pass through.
- Breaking: `StatusPill` merges into `Pill`, and `ColorTag` merges into `Chip` (`color`). `Chip` has no status tones.
- Breaking: `Button` drops the `brand` and `quiet` tones. A `loading` button keeps its focus.
- Breaking: the `sticky` toast option is gone. A toast with an action stays until the reader acts, and toasts show above an open dialog.
- Breaking: `LoadMore` is a button that announces new rows and needs `shown`. It no longer loads on scroll.
- Breaking: `InheritControl` needs `label`. `RelativeTime` is no longer a tab stop. `SegmentedControl` turns into a select when its options do not fit.
- The palette takes a companion operations console's colors in both themes: neutral grounds, black and white veil lines, transparent control fills, and its status, unsaved and role colors. The accent is one ocean blue that fills the same in both themes with white ink, and links wear its text shade (`--sui-link`). Code and diffs stand on their own code ground, and charts draw on the console's mark hues.
- The decision gold is a fill with its own dark ink.
- Add `Field` `required`, `Checkbox` `bare`, `DataTable` `striped`, `Breadcrumb` `current`, `Modal` `role` and `ActionMenu` item descriptions.

## 0.2.1

- Publish through GitHub Actions OIDC with signed provenance.

## 0.2.0

- Add generic line, scatter, range, and heatmap charts with data tables.

## 0.1.0

- Initial Svelte 5 package with Button, Field, Card, and Badge.
- Smyklot-inspired light and dark themes with bundled Plus Jakarta Sans.
- Demo gallery and public package exports.
