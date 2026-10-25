# Component lifecycle

SUI is a product that apps depend on, so what goes in, how it changes and when it leaves follow one path. The path follows the [GOV.UK contribution criteria](https://design-system.service.gov.uk/community/contribution-criteria/): a shared component earns its place by need and evidence, and it leaves through a deprecation that names its replacement and its last release.

## Adding a component

A component joins SUI when all of these hold:

- Two apps need it, or one app needs it and a second has a task that will use it. A control only one app will ever draw stays in that app.
- No existing component, composition of components or `--sui-local-*` setting does the job.
- Its behaviour has run in an app with real data, so its contract describes what readers did with it, not what a mock-up suggested.
- It meets every law in [laws.md](laws.md), has a kitchen sink section and names its owner in the pull request that adds it.

Prefer a composition of existing components, documented in the kitchen sink, over a new component. Prefer a new component over a new prop that makes an existing one serve two jobs.

## Changing a component or a token

Each export and each `--sui-*` token in `styles.css` is public API. A change that would break an app that uses it goes through deprecation first:

1. The release that brings the replacement keeps the old name or prop working, and its changelog entry starts with "Deprecated", names the replacement and names the release that removes the old one. The component's `@component` contract says the same.
2. The old name stays for at least one minor release, so an app can move one call site at a time.
3. The release that removes it says "Breaking" and repeats the replacement, with the old and the new code side by side.

A breaking change with no possible bridge, such as a changed DOM structure, still names the release, the reason and the old and new code. Before 1.0 a minor release may break, but only through this path. From 1.0 only a major release removes anything.

## Measuring adoption

Downloads do not show whether SUI works for the apps. Before each minor release, check how the apps use it:

- Which apps import `@smykla-skalski/sui`, at which version, and which exports they import. `gh search code '"@smykla-skalski/sui"' --owner smykla-skalski` finds them.
- Which controls an app draws itself that SUI ships, such as a local dialog or a local badge. A local copy is a signal: either the app has not moved yet, or SUI misses something the app needs. Find out which before you push the app to change.
- Which apps stay on an older minor release, and what breaks for them on the latest one.

An export that no app imports for two minor releases is a removal candidate. Remove it through the deprecation path, or record in the release pull request why it stays.

## Moving an app from 0.2 to 0.3

0.3.0 replaced the four 0.2 components and renamed the tokens without a deprecation release. These are the changes an app on 0.2 makes:

| 0.2                                                                                  | 0.3                                                                                                                                        |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `import '@smykla-skalski/sui/styles.css'` optional, with fallbacks in each component | The theme import is required; components carry no fallbacks                                                                                |
| `<Badge tone="success">`                                                             | `<Pill tone="success">`; the tones `neutral`, `success`, `warning` and `danger` keep their names                                           |
| `<Button variant="primary">`                                                         | `<Button tone="signal">`, once per view                                                                                                    |
| `<Button variant="secondary">`                                                       | `<Button>`, whose default tone is `default`                                                                                                |
| `<Button variant="ghost">`                                                           | `<Button tone="ghost">`                                                                                                                    |
| `<Button variant="danger">`                                                          | `<Button tone="stop">`                                                                                                                     |
| `<Button size="sm">` or `size="md"`                                                  | No size prop: controls are 34px, 44px on phones, and a surface opts into 40px with `--sui-local-control-height: var(--sui-control-height)` |
| `<Card heading="…">`                                                                 | `<Card title="…">`                                                                                                                         |
| `--sui-foreground`, `--sui-muted`                                                    | `--sui-text-primary`, `--sui-text-muted`                                                                                                   |
| `--sui-surface`, `--sui-subtle`, `--sui-border`                                      | `--sui-surface-base`, `--sui-surface-inset`, `--sui-border-subtle`                                                                         |
| `--sui-primary`, `--sui-primary-hover`, `--sui-primary-foreground`                   | `--sui-brand-action`, `--sui-brand-action-hover`, `--sui-on-brand-action`                                                                  |
| `--sui-success-subtle`, `--sui-warning-subtle`, `--sui-danger-subtle`                | `--sui-success-tint`, `--sui-warning-tint`, `--sui-danger-tint`                                                                            |
| `--sui-font`, `--sui-radius`                                                         | `--sui-sans`, `--sui-radius-control`                                                                                                       |

The 0.3.0 entry in the [changelog](../CHANGELOG.md) lists every renamed token and every other component change. `Field` keeps `label`, `hint`, `error`, `value` and `type`. Move one workflow at a time, as [adoption.md](adoption.md) describes, and check each moved screen against the laws, not against the 0.2 look.
