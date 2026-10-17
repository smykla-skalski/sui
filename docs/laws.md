# SUI design laws

These laws govern every SUI component and the kitchen sink that shows them. They come from two sheets: the [Smyklot panel design system](https://github.com/smykla-skalski/smyklot/blob/main/design-system/smyklot-panel/MASTER.md) (`S-n`) and the rules of the ksai documentation site (`K-n`). When the sheets disagree, Smyklot wins and ksai fills what Smyklot does not say. Where the Smyklot sheet and its tested `tokens.css` disagree, SUI follows the tested code.

Each law names how it is held:

- `audit` - the kitchen sink measures it in the rendered page (`src/routes/audit/`), and `tests/browser.test.mjs` fails on any finding at phone and desktop widths in both themes
- `source` - `tests/laws.test.mjs` reads the component sources and the palette
- `review` - a person checks it, because no measurement decides it

A law that says "every" means every component, including the ones added after it was written. When a new component cannot meet a law, change the law here first.

## Palette and color

- **L-1** The palette (`src/lib/styles.css`) is the only place a colour is written. Component styles read `var(--sui-*)` and never a hex, `rgb()`, `hsl()` or named colour. `S-7` `source`
- **L-2** Every token a component reads is declared, and every declared token is read, directly or through another token. A scale is declared whole even when one step is unused. `S-8 S-9` `source`
- **L-3** Components read semantic tokens, never `--sui-primitive-*`. `K-1` `source`
- **L-4** A token derived with `var()` is restated in every palette block, so a dark subtree never keeps a light alias. `S-10` `source`
- **L-5** Text holds 4.5:1 against the ground it is painted on, and large text (24px, or 18.66px at 700) holds 3:1, in both themes. `S-11 S-212` `audit`
- **L-6** The focus ring holds 3:1 on the canvas, surfaces, control fills and input fills. A control whose ring is the control itself (switch track, check box, choice dot) uses `--sui-border-strong`, which holds 3:1. `S-18 S-20` `audit`
- **L-7** Ink on a tone fill comes from its partner token (`--sui-on-brand-action`, `--sui-on-danger`, `--sui-on-decision-accent`), never a literal white. `S-12` `source`
- **L-8** Structural hairlines stay subtle: `--sui-border-subtle` on `--sui-surface-base` is between 1.2:1 and 2:1. `S-13` `audit`
- **L-9** A resting control boundary is quiet but visible: `--sui-control-border` on `--sui-control-bg` is between 1.5:1 and 2.25:1, and on `--sui-input-bg` between 1.4:1 and 2.25:1. `S-14` `audit`
- **L-10** A control fill is never a focal surface: `--sui-control-bg` on `--sui-surface-base` stays under 1.5:1. An editable field is a distinct inset: `--sui-input-bg` on `--sui-surface-base` is between 1.05:1 and 1.3:1. `S-15 S-16` `audit`
- **L-11** Hover is one state change and press is two, in one direction. Measured as CIEDE2000 from the ground: on a light ground hover is 4.4 to 5.4 and press 7.2 to 8.3, on a dark ground hover is 5.3 to 6.7 and press 9 to 10.5. Hover and press are alpha veils over the ground, never flat fills. `S-27 S-30` `audit`
- **L-12** A row's hover step is about half a control's: 2 to 3 on light, 4.5 to 5.5 on dark. `S-31` `audit`
- **L-13** The primary button walks one way along its ramp: rest, hover and press move lightness in one direction, and `--sui-on-brand-action` holds 4.5:1 on all three. Destructive hover deepens on light and brightens on dark. `S-19 S-29` `audit`
- **L-14** The accent is restrained petrol and never a destructive colour. Information is blue-grey, success is green, warning is amber, danger is muted rose. A role wears violet (`--sui-role-tint`, `--sui-role-ink`), never an outcome tint. `S-3 S-4 S-21` `review`
- **L-15** Colour never carries state alone: every state colour comes with a word or an icon. The budget is roughly 85% graphite, 10% petrol and at most 5% semantic colour. `S-5 S-6` `review`
- **L-16** Gold (`--sui-decision-accent`) belongs only to unsaved state and the action that resolves it. Pending edits use the `--sui-unsaved-*` surface and ink, never the accent washed over a neutral surface. `S-36 S-39 S-40` `review`
- **L-17** No decorative gradients, glows, glass surfaces or left-edge accent strips. A surface carries state with its fill, words and marks, never a coloured edge on one side. `S-2 S-41` `audit`

## Fonts and type

- **L-18** Two families, the same faces Smyklot ships: `SUI Plus Jakarta Sans` (variable 400 to 700) for interface text and `SUI JetBrains Mono` (variable 400 to 500) for technical values. Each has a Latin and a Latin Extended face with `font-display: swap`. `S-48 K-14 K-15` `source`
- **L-19** Text never asks a face for a weight it does not have: sans stays within 400 to 700 and mono within 400 to 500. `K-21` `audit`
- **L-20** Headings, navigation, labels, buttons and prose are never monospace. Technical values (IDs, paths, versions, code, counts) are mono with tabular figures. `S-49 S-223 K-22` `audit`
- **L-21** Sizes come from `--sui-font-size-*` and leading from `--sui-leading-*` or `--sui-row-copy-leading`. Every `font` shorthand carries its leading. Every leading is a whole pixel at a 16px root, so rendered line boxes never land on half pixels. The one exception is `--sui-row-copy-leading`, the cap height plus the 8px copy gap, which is fractional by design. `S-51 S-52` `source` `audit`
- **L-22** The phone (47.9375rem and narrower) reads one step larger with its leading, and the page title steps down from 28px to 24px. `S-53` `source`
- **L-23** Titles, labels, button labels, pills and chips are trimmed to the cap height and the baseline (`text-box: trim-both cap alphabetic`). A trimmed box never clips its ink. `S-54 S-59 K-19` `audit`
- **L-24** A title and its description stand 8px apart as rendered ink (`--sui-row-copy-gap`), and wrapped lines keep the same 8px ink gap. Form help and form errors use the same rhythm, never body leading. `S-55 S-57` `audit`
- **L-25** The tiers: page title 28px 700, dialog title 20px 700 at -0.015em, card title 17px 600 balanced, body 15px, control and label 13px with labels at 600. Eyebrows and column headings are uppercase micro or compact type at 600 with 0.06em to 0.07em tracking. `S-61 S-62 S-63` `review`
- **L-26** Contents of a centred single-line row are centred by eye: the cap-to-baseline band of text and the border box of painted things share a centre within 0.25px. No `translate` nudges. `S-60` `audit`
- **L-27** A value inside a sentence breaks with it (`overflow-wrap: anywhere`), and an atom such as "84.7 MB" stays on one line. The `·` separator has a space on both sides. `S-83 S-162` `audit`

## Copy

- **L-28** Labels, hints, descriptions, list items, toasts and single-sentence paragraphs end without a period. `S-241 K-27` `audit`
- **L-29** A sentence holds at most 25 words, and a paragraph at most 3 sentences. `K-28 K-29` `audit`
- **L-30** Headings and buttons are sentence case. A button is a verb phrase that names its result. An empty state is a plain title, one explanation and a next step, with no decorative icon. A toast description does not repeat its title. `S-232 S-241 K-36` `review`
- **L-31** UI copy uses the real ellipsis character "…", never three dots. `K-38` `audit`

## Spacing and rhythm

- **L-32** Spacing comes from the 4px scale (`--sui-space-1` to `--sui-space-8`: 4, 8, 12, 16, 20, 24, 28, 32px) and the named rhythm tokens. `S-64 K-43` `source`
- **L-33** A card owns its 20px inset (16px at 36rem and narrower). Cards are spaced by their container's 16px gap and never by their own margin, and a card never decides its column width (`min-width: 0`). `S-65 S-66 S-67` `audit`
- **L-34** What stands beside a heading does not set the heading row's height: a one-line head row is at most 0.6px taller than its heading. Head controls centre on the title's cap line. `S-68 S-69` `audit`
- **L-35** A form stacks fields 16px apart, with 8px between label, control and help. A label and a switch in one row share a centre. `S-74` `audit`
- **L-36** A row pads 12px, its 1px hairline sits in its own band inset by the row padding, and a setting row is at least 44px tall. `S-73` `review`

## Controls

- **L-37** Standalone controls are 34px (`--sui-control-height-compact`). A surface may opt into the 40px tier through `--sui-local-control-height`, never through local padding. Every rendered control height is a whole pixel from the set 20, 24, 28, 34, 38 (rail tiles), 40, 44. `S-85 S-86` `audit`
- **L-38** Every pointer target is at least 24 by 24px, and a touch target (switch tap box, phone controls) at least 44 by 44px. A small control may extend its hit area with a pseudo-element. `S-87 S-215 K-125` `audit`
- **L-39** Button tones are jobs: `default` an ordinary action, `signal` the one action a view exists for, `ghost` low emphasis, `stop` destructive, `stop-quiet` destructive and bordered, `brand` the brand fill, `quiet` a control only when wanted, `add` an optional addition. Disabled is a state, not a tone. `S-90` `review`
- **L-40** A disabled control renders at 0.5 opacity with the default cursor and stays visible: disable an action whose precondition is unmet, do not hide it. `S-92 K-54` `audit`
- **L-41** Focus draws one 2px `--sui-focus` outline, never a box shadow. A bordered control is flush (offset 0, its border takes the focus colour), a free-standing control is offset 2px, and anything inside a clipping container is inset 2px. `S-93 K-124` `audit`
- **L-42** Press feedback is the ground plus `--sui-pressed-inset` and a 1px sink (`translate: 0 1px`), with no scale. Hover and press never paint at the same time. `S-94` `review`
- **L-43** A mark is as wide as what it says: buttons, chips, pills, links and switches are `fit-content`. `S-89` `audit`
- **L-44** An icon-only button is square at its tier (34px, or 28px quiet), has an accessible name that doubles as its tooltip, and never takes a text button's padding. `S-96 S-128 S-175` `audit`
- **L-45** The `add` tone (dashed, pill radius, leading plus, specific label) only starts an optional entry. It never submits, saves, cancels, resets, removes, navigates or picks an existing value. Cancel is a bordered default button at the trailing edge. `S-104 S-106 S-108` `review`
- **L-46** A primitive owns its look. A parent never styles a child primitive's border, ground, type, focus or height, and no component overrides another's classes with `:global`. `S-109 S-110` `source`
- **L-47** Text fields rest on `--sui-control-bg`, take `--sui-input-bg` on focus, and are symmetric about their line (top padding plus border equals bottom). `S-112 S-113` `audit`
- **L-48** Pickers use the shared trigger and chevron, never a native `<select>`. A menu is themed, at least as wide as its trigger, inside the viewport, at most `min(20rem, available height)` tall, and every option is 34px. `S-97 S-98` `audit`
- **L-49** A boolean is a `Switch`: a 34 by 20px track with a 16px thumb travelling 14px and a 44px tap box. A multi-choice or consent is a checklist with a visible 18px box. Native checkbox paint never shows. `S-99 S-100` `audit`
- **L-50** A segmented control holds 2 to 5 options, draws one solid thumb exactly the selected option's width, does not slide on first paint, travels 240ms between options, draws no thumb for `null`, and scrolls inside its own track when short of room. `S-114 S-115 S-116 S-117` `audit`
- **L-51** A combobox or listbox follows the ARIA pattern: arrows move with wrap-around, Enter commits, Escape closes without closing a surrounding dialog, and `aria-activedescendant` is set only while options show. `S-120 K-66 K-67` `review`
- **L-52** Opening or closing a popover, menu or inline editor keeps the trigger in place and the page scroll unchanged, and closing returns focus to the trigger. `S-124 S-126` `audit`

## Surfaces

- **L-53** Radii: check box 5px, chip 6px, control 8px, surface 10px, popover 12px, dialog 14px, pill fully round. `S-129` `source`
- **L-54** Shadows belong only to plates, popovers, menus and dialogs. `S-130` `review`
- **L-55** A card is `--sui-surface-base` with a 1px `--sui-border-subtle` keyline and a 10px radius. Cards are not nested for decoration. `S-131 S-134` `review`
- **L-56** A callout symbol centres on the first line's cap band within 0.25px at every wrap, and the space above the first cap equals the space below the last baseline. A callout has two tones (`quiet`, `warning`) plus the `decision` surface. `S-135 S-137 S-138` `audit`
- **L-57** A disclosure is a quiet native `<details>` with a trailing chevron inside its hit area. Controls revealed by a disclosure sit in their own card. `S-132 S-139 S-140` `audit`
- **L-58** A dialog is 34rem wide (inspector 40rem, wide 46rem), over a 56% light or 62% dark scrim with an 8px blur. It closes on Escape and on an outside click, traps focus, returns focus to its trigger, and confirms only when closing would discard work. `S-147 S-148` `review`
- **L-59** An empty or error state puts its title above its explanation with the 8px copy gap and offers a next step. `S-150 S-233` `audit`
- **L-60** A neutral toast leaves after 5 seconds and pauses while hovered or focused. Failures and unsaved work never leave on their own. `S-47` `review`

## Lists and data

- **L-61** Lists are semantic `ul` and `li` rows that grow when their content wraps. There are no zebra stripes and no fixed row heights, and the page keeps one scroll. `S-152 S-153 S-158` `review`
- **L-62** A data table has one heading recipe, aligns numbers at the end with tabular figures, and scrolls inside its own frame. No cell draws outside its column. `S-160 S-161 K-93` `audit`
- **L-63** Long collections load more on demand. No numbered pages and no page-size picker. `S-155` `review`
- **L-64** Loading reserves the final geometry, keeps loaded rows during a refresh, and every placeholder shares one pulse. `S-156 S-208 S-234` `audit`
- **L-65** Code colours belong to the language, hold 4.5:1 on their ground, and selected code is opaque. A copy control confirms with "Copied" for 1.6 seconds. `S-26 S-227 K-96` `audit`
- **L-66** Charts have a title, a description and a table of their values. Series colours come from `--sui-chart-1` to `--sui-chart-5`, and every mark holds 3:1 against its surface. `S-222` `audit`

## Icons

- **L-67** One outline family on a 24-unit grid with a 1.75 stroke and round caps, from a closed name list. Every glyph is `aria-hidden`. `S-171 K-133` `audit`
- **L-68** Icon sizes are the px tiers 8, 10, 12, 13, 16 and 18 (`--sui-icon-*`), never rem. `S-52 S-173` `source`
- **L-69** Every glyph's ink is centred in its 24-unit box within 0.25 units. `S-174` `source`

## Layout

- **L-70** No page scrolls sideways at 320px or 375px. `S-185` `audit`
- **L-71** Light and dark share geometry: switching themes moves nothing. `S-184` `audit`
- **L-72** Stacking order comes from the `--sui-layer-*` tokens. `S-195` `source`

## Motion

- **L-73** Every duration and easing reads a token: press 100ms, fast 160ms, normal 220ms, travel 240ms. `S-200` `source`
- **L-74** Hover, press and release are one continuous change. Movement uses transform and opacity, one interaction animates at most two elements, and exit is faster than entry. `S-201 S-203 S-204 S-205` `review`
- **L-75** Every transition and animation has a `prefers-reduced-motion` fallback that removes the movement and keeps the state. `S-206 K-122` `source` `audit`
- **L-76** Nothing slides into its first paint: an indicator stays still until it is measured. Overshoot easing only moves position and size. `S-116 S-209 K-120` `review`

## Accessibility

- **L-77** Every interactive element has an accessible name that contains its visible label, every image of meaning has text, and decorative SVG is hidden. `S-215 K-127` `audit`
- **L-78** Heading levels never skip, the page has one `main`, a title and a language. `S-197 S-215` `audit`
- **L-79** Keyboard order follows visual order, and every custom widget works with the keyboard alone. `S-213 S-214` `review`
- **L-80** A hover-only affordance also shows on focus and on devices without hover. `K-128` `review`
- **L-81** Links use the shared treatment and never the browser's default colours. `S-242` `audit`

## Shell

- **L-85** Navigation chrome is its own zone: sidebar text, secondary and muted ink hold 4.5:1 on `--sui-sidebar-bg`, the current row's ink holds 4.5:1 on its plate, and the sidebar focus ring holds 3:1. The current row's plate is the loudest thing in the column, further from the sidebar ground than a pressed row. `S-11 S-22 S-23` `audit`
- **L-86** At most one navigation row is current at a time, with `aria-current`, and its plate sits on that row within 0.05px. The plate does not slide into its first paint and glides 240ms between rows. `S-116 S-183 K-102 K-103` `audit`
- **L-87** On a phone the shell is one 56px bar whose controls are drawn at 44px, and the sidebar opens over the content as a drawer: focus moves in, Tab stays inside, Escape or a press outside closes it, and focus returns to the bar. `S-182 K-115 K-123` `audit`
- **L-88** On a wide screen the sidebar may fold into a 72px strip of icons that name themselves in tooltips, and the rail steps aside so the chrome stays one column. `S-179 S-180 S-181 K-104` `review`

## Source

- **L-82** Components use Svelte 5 runes: no `on:` directives, `export let`, `$$props`, `<slot>`, `$:` or `svelte/store`. `K-131` `source`
- **L-83** Every exported component opens with an `@component` contract written as prose and appears in the kitchen sink. `S-247` `source`
- **L-84** Selectors never nest `:has()` inside `:has()`, and sources carry no control characters. `S-220 S-221` `source`
