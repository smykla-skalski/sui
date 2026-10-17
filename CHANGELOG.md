# Changelog

## Unreleased

- Add the full Smyklot primitive set: about 60 components for actions, inputs, pickers, overlays, surfaces, marks, lists, states and settings, with native `<dialog>` and Popover API overlays and no runtime dependencies.
- Add the application shell: `AppShell`, `SideNav` and `Rail`, with a collapsed icon strip on wide screens and a phone bar with a focus-holding drawer. The shell answers to its own width through container queries.
- Add the design laws (`docs/laws.md`), the kitchen sink that audits them on each render, source-law tests and a browser law test (`npm run test:browser`).
- Port the Smyklot palette and both font families. Breaking: tokens are renamed after Smyklot (`--sui-foreground` is `--sui-text-primary`, `--sui-muted` is `--sui-text-muted`, `--sui-surface` is `--sui-surface-base`, `--sui-subtle` is `--sui-surface-inset`, `--sui-border` is `--sui-border-subtle`, `--sui-primary*` is `--sui-brand-action*`, `--sui-*-subtle` is `--sui-*-tint`, `--sui-font` is `--sui-sans`, `--sui-radius` is `--sui-radius-control`), and components no longer carry fallback values.
- Breaking: `Button` takes `tone` instead of `variant` and `size` (`primary` is `signal`, `secondary` is `default`, `danger` is `stop`), and controls are 34px with an opt-in 40px tier.
- Breaking: `Badge` is replaced by `Pill`. `Card` prefers `title` and `note`; `heading` and `description` still work.

## 0.2.1

- Publish through GitHub Actions OIDC with signed provenance.

## 0.2.0

- Add generic line, scatter, range, and heatmap charts with data tables.

## 0.1.0

- Initial Svelte 5 package with Button, Field, Card, and Badge.
- Smyklot-inspired light and dark themes with bundled Plus Jakarta Sans.
- Demo gallery and public package exports.
