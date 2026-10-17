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
- Breaking: `InheritControl` needs `label`. `SegmentedControl` turns into a select when its options do not fit.
- The palette takes a companion operations console's colors in both themes: neutral grounds, black and white veil lines, transparent control fills, and its status, unsaved and role colors. The accent is one ocean blue that fills the same in both themes with white ink, and links wear its text shade (`--sui-link`). Code and diffs stand on their own code ground, and charts draw on the console's mark hues.
- The decision gold is a fill with its own dark ink.
- Add `Field` `required`, `Checkbox` `bare`, `DataTable` `striped`, `Breadcrumb` `current`, `Modal` `role` and `ActionMenu` item descriptions.
- Breaking: `PairEntry` draws a set of pairs as chips that wrap side by side and edit in a popover. It takes `value` (an array of `{ key, value }` pairs), `validate`, `addLabel`, `doneLabel` and `removeLabel`; `key`, `row`, `heads`, the placeholders, `error` and `onremove` are gone, and it exports the `Pair` type.
- A menu, listbox, picker or editor that a press opens grows from a line on its edge that faces the trigger, as wide as the trigger, and folds back into that line on close. A layer near the viewport's bottom now flips above its trigger. Tabs, segments and sidebar rows share one count badge.
- Breaking: token renames. `--sui-radius-chip` (the pill) is `--sui-radius-pill`, `--sui-r-chip` is `--sui-radius-chip`, the `--sui-rhythm-*` durations are `--sui-duration-spinner`, `-shimmer` and `-live`, and `--sui-drift` is `--sui-changed`. `--sui-rhythm-head-surface-wide` and `-compact` are one `--sui-rhythm-head-surface`, which steps down with the phone type. The unused `--sui-layer-chrome`, `-scrim`, `-side` and `-rail`, `--sui-rhythm-head-toolbar`, `--sui-rhythm-preview` and `--sui-ease-overshoot` are gone, and stacking inside a control reads `--sui-layer-inner-plate` and `--sui-layer-inner-face`.
- Add weight tokens (`--sui-weight-regular` to `--sui-weight-bold`), stroke tokens (`--sui-stroke`, `--sui-stroke-bold`) and the breakpoint tokens `--sui-breakpoint-phone` and `--sui-breakpoint-wide`. Spacing rhythm tokens are in rem, so they grow with the reader's text size.
- With no theme attribute on the page, the palette follows the system's dark preference. Controls step up to 44px on any touch screen, not only on narrow ones.
- In a right-to-left page, layers hang from their trigger's inline start, and directional glyphs mirror.
- Every control a reader presses shows the press: the pressed ground and inset, and a 1px sink when it has its own frame. The browser suite presses each one to check. A press, a double press or a press that drags never selects a control's words.
- `SegmentedControl` draws its label (`hideLabel` hides it) and `countedLabel` words the select it turns into. `ThemeSwitch` stores a press on the option already shown and reports `onchange`.
- `SettingRow`'s reset is a "Reset" button, and an unsaved row shows the word "Unsaved" instead of a star. New `pending`, `error`, `disabled`, `readonly` and `reason`, and `onclear` may return an undo that the row then offers.
- `SaveBar` confirms a save with a notice, saves on Ctrl+S or Cmd+S, offers Undo when `ondiscard` returns one, and keeps focus on its controls. Under 30rem of height it sits in the flow.
- `DataTable` sorts columns marked `sortable` (bindable `sort`, `onsort`, `aria-sort`), draws empty, loading, refreshing and failed states, keys rows with `rowKey` and formats numbers in the page's language.
- `PatternEntries` takes a paste of several lines, judges a new pattern when the reader leaves it, and offers Undo after a removal. `AdditionPicker` jumps to a choice as the reader types and draws its loading, empty and failed states. `InheritControl` takes its words as props and draws loading, failed and unknown states.
- `Chip`, `Pill`, `LoadMore`, `ListToolbar` and `PairEntry` announce what changed, take their words as props, and report outcomes through callbacks. `Pill`'s live pulse runs once.
- `Modal` returns focus where the opener stood when the opener is gone (`returnFocus`), reports `onclose(reason)`, and takes `busy` and `error`. `ConfirmDialog` runs its act before closing and stays open, busy and then failed, when a promised act is refused. The scrim is 56% in light and 62% in dark.
- `Popover` closes a manual layer on Escape and returns focus on close. `Tooltip` describes its control when it adds words. `HelpTip` reports its open state. `Toaster` scrolls a tall stack, takes F8 to reach the newest toast, and reports `ondismiss(reason)` with a `linger` prop.
- `Callout` moves its actions under the message on a narrow card and caps its line length. `Skeleton` announces when loading ends and says when it is slow. `Disclosure` uses the control height tier.
- `CodeBlock` keeps its copy control in its own column, always visible. `CodeBlock` and `DiffBlock` read left to right in any page, and `DiffBlock` marks changes with `ins`, `del` and `mark` and names them for screen readers.
- `ClippedLabel` and `RelativeTime` outside a control are tab stops that show their whole text, and `RelativeTime` writes both readings in a new page language at the next clock tick. `RelativeTime` and `DayHeading` format with the page's language and take a `locale` prop. Icon tiers grow with the reader's text size, and the 8px `nano` tier is gone.
- Breaking: `Card` takes only `title` and `description` (`heading` and `note` are gone), and its class and attributes land on a wrapper that is its own size container. `ChartSeries.color` is gone, so every series draws from the chart palette.
- `AppShell` keeps the rail's places in a bottom bar on phones with `bottomNav`, shows a labelled "Menu" button, closes the drawer when a row is followed, and reports `onopenchange` and `oncollapsedchange`. The rail is 4.5rem wide, so it grows with the reader's text size.
- `SideNav`, `Rail` and `PageToc` draw the current place one way: a plate inside a 3:1 ring, `Highlight` in forced colors. `SideNav`'s fold control is a labelled row at the end of the list, shown only where the shell can fold. `SideNav` and `PageToc` take a heading `level`. `Rail`, `Tabs`, `Breadcrumb` and `PageToc` report `onnavigate`.
- `Tabs` fades the edge with more tabs past it and are 44px targets on touch. `Breadcrumb` grows its links' targets on touch. `PageHeader` wraps its actions under the copy when they do not fit, and caps its description's line length. `Plate` announces a change of status.
- Charts take a heading `level`, a `status` (`loading`, `refreshing`, `stale`, `failed` with `onretry`) and their words as props, format numbers in the page's language, keep their plot left to right, thin out dense lines, and name their scrolling regions. Heatmap cells print their values beside a legend, and the range chart's marker is a diamond named in a legend.
- `Button` wraps a long label, draws its focus ring off a filled tone, keeps `disabled` and `loading` on a link, and presses `stop` one step deeper (`--sui-danger-pressed`). `IconButton` keeps focus while busy. `CopyButton` takes its words as props, keeps a failure until the next press and reports `oncopied` and `oncopyfailed`.
- `Link` takes `standalone`, which grows a lone link's target, and `externalLabel`. `SkipLink` takes `label`.
- `Field` takes `requiredLabel` and marks and announces its error. `FormError` lists `problems` as links that focus their fields, takes focus when it appears and speaks again when `attempt` changes. `CheckList` and `ChoiceCards` take `required` and keep focus while locked.
- `Switch` takes `pending` and `error`, presses and hovers, and keeps its thumb in its track in a right-to-left page. `Checkbox` keeps its danger edge when checked.
- `Select` takes `invalid` and its words as props. `Combobox` posts its value through a hidden input, wraps long options, marks the chosen one, takes `invalid` and `limit`, announces counts and refused searches, and reports `onselect`.
- `DurationInput` posts seconds, reads the page language's decimal mark, judges the amount when the reader leaves it, and takes its words as props. `CopyableLinkField` and `JoinedField` ring the part that holds focus and draw a read-only look. `TextInput` and `Textarea` keep their danger edge on hover and draw a read-only look.
- `ColorPicker` takes its words as props, names its swatches, posts its value through `name`, goes back to the opening color on Escape, closes when focus leaves, and grows its targets on touch.
- An open menu, popover or tooltip scrolls with the page in the same frame as its trigger instead of trailing it, follows its trigger when content above it changes height, keeps the side it opened on, and a tall layer scrolls inside itself without jumping back to the top. A segmented choice inside a growing layer marks its whole option.
- Breaking: `SearchField` draws its label above the field; `showLabel` is gone, and `hideLabel` hides it for a caller that draws the label itself. `ListToolbar` draws its search's label beside the field, shows a spinner and `pendingLabel` while `pending`, says the count again after a pick that leaves it unchanged, joins the tools' choices as a list in the page's language, and calls `onsearch` only for a new query.
- Breaking: `EmptyState` takes either `action` or `step`, the next step in words, so it is never a dead end; charts take `emptyStep` for an empty chart with no `emptyAction`. `ErrorState` keeps focus where it stood when a retry leaves no control there.
- Add `setWords`, which replaces any built-in word app-wide in one place; every component's English default reads through it, including `DiffBlock`'s change labels, `ColorPicker`'s colour and swatch names, the `Toaster`'s words and the names a component joins from a label (`SettingRow` `resetName`, `InheritControl` `inheritFor`, `SideNav` `pagesLabel`), and a prop on one instance still wins.
- A joined field puts its end part on a line of its own when the value would be left too narrow, as at a large text size, and a bare `CopyButton` wraps its words there. Phone bars ride with the content once they would cover a quarter of the screen, also in a contained shell, and the phone bar's title breaks between words.
- Breaking: `Tabs` marks the current tab with the plate inside a 3:1 ring that `SideNav`, `Rail` and `PageToc` draw, so where the reader is looks the same in every navigation list, and a choice in a control keeps the brand fill. `Card` draws the word "Unsaved" after its title instead of a star, and its unsaved keyline holds 3:1 in light.
- `CopyableLinkField` wraps a long value so all of it shows, and read-only fields sit in the inset well with a quiet frame so they never look editable. In forced colors a checked box and an on switch keep a 2px invalid edge. `ColorPicker` names a swatch given as a bare hex by its colour (`colorName`).
- `PairEntry` chips wrap a long key or value instead of cutting it, and a draft left by a press outside or by Tab waits for the editor to open again; Tab out closes the editor. `PatternEntries` judges the other entries only against the list as it stood before the reader started typing. `SettingList` takes `loading`, `error` with `onretry`, and `empty`.
- The shell and charts follow a text size that changes after load, a chart's plot keeps its least width as its margins grow, phone bars that would cover much of the screen ride with the content, the `bottomNav` bar keeps 44px tiles and wraps, and a page header in a phone-wide shell takes the phone's title and spacing. Heatmap cells draw a 3:1 edge.
- Container-query widths are palette breakpoints (`--sui-breakpoint-card`, `-row`, `-callout`, `-bar`), held to that list by the source laws like the media queries. A cut label or a time keeps the system's long-press menu out of its tip's way on touch.
- `ThemeSwitch` takes Space on the shown option as a choice. `DurationInput` says an amount in a new unit only when that takes at most two decimals, and otherwise reads the amount in the new unit. A failed `CopyButton` keeps its danger ink under the pointer.
- `Popover` takes `closeOnLeave`, which closes the layer when focus leaves it, as a Tab out does, while a press on its trigger closes it instead of reopening it. `ColorPicker` and `ListToolbar` use it, so a second press on their trigger closes them.
- In forced colors an invalid field, select, joined field and `ChoiceCards` frame draws a 2px edge, and the `ChoiceCards` frame draws at all.
- `DataTable`'s heading row grows on touch so a sort heading's 44px target stays inside the scrolling frame. `Breadcrumb`'s wrapped lines keep their targets apart. `FactList`'s linked value is a standalone `Link`.
- `ScatterChart` draws one mark per half-marker square, so a dense scatter holds a bounded number of paths. `SideNav`'s default count reads "1 item", and a chart's missing count groups its digits.
- At twice the text size, a toast with an action puts its buttons under the copy, `ListToolbar`'s trigger wraps its words, and a `Plate` state that wraps grows its head.
- Fields draw a quiet frame with a 3:1 baseline, every box lands on whole pixels, no clipping container cuts a ring or a focus ring, and code and diff lines share one height with no gap above or below.

## 0.2.1

- Publish through GitHub Actions OIDC with signed provenance.

## 0.2.0

- Add generic line, scatter, range, and heatmap charts with data tables.

## 0.1.0

- Initial Svelte 5 package with Button, Field, Card, and Badge.
- Smyklot-inspired light and dark themes with bundled Plus Jakarta Sans.
- Demo gallery and public package exports.
