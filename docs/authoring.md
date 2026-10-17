# Writing a SUI component

Read [laws.md](laws.md) first. A component is done when it meets every law there, shows every state in the kitchen sink, and the law audit on the kitchen sink reports nothing.

## Files

- The component lives in `src/lib/components/<Name>.svelte`. Glyphs live in `src/lib/icons/`. Shared behaviour that is not a component (placement, focus, timing) lives in `src/lib/internal/`.
- Export it from `src/lib/index.ts`, with its public types.
- Show it in a kitchen sink section, `src/routes/sink/<name>.svelte`. The page finds every file in that folder, and a running dev server does not always notice a new one; save `src/routes/+page.svelte` once to make it look again.

## Kitchen sink sections

A section is a component's page: what it is for, then every variant and state it has, each one named. It is built from four kit parts in `src/routes/kit/`, and nothing else frames or labels a specimen.

```svelte
<script module lang="ts">
  export const section = {
    title: 'Switch',
    order: 30,
    lead: 'A boolean that takes effect the moment it flips. A value that a later save writes is a Checkbox.',
    components: ['Switch']
  };
</script>

<script lang="ts">
  import { Switch } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
</script>

<Example title="States" note="Off, on and disabled, each with its label">
  <Specimen label="Off"><Switch label="Send notifications" /></Specimen>
  <Specimen label="On" code="checked"><Switch label="Sync on push" checked /></Specimen>
</Example>
```

- `section`: `title` is the component's name. `lead` says what the component is for and when to reach for another one, in one or two sentences of at most 25 words. A lone sentence ends without a period, and two sentences each end with one. `components` lists the exports the section shows, and the page links each one to its source.
- `Example` is one titled point with a one-sentence `note` that says what it proves. Its specimens stand on a framed stage, and its markup shows under the stage at a press, so write the markup a reader would copy: literal props, no sink-only wrappers. `layout` is `row` for marks and controls, `grid` for fields and other things that fill a column, and `stack` for wide compositions. `ground="canvas"` is for specimens that are surfaces themselves (cards, plates, dialogs, toasts, shells, framed lists), so they read against the page as they will in a product.
- `Specimen` names one specimen: `label` is the variant or state in words ("Disabled"), and `code` is the props that draw it as written in the markup (`tone="stop" disabled`). Every specimen is named. Only an "In context" example, which shows one composition, may stand without a caption.
- `Variants` is a matrix for two axes at once: one prop down the side (`rows`, `axis`, `rowLabel`) and its states or options across the top (`columns`), drawn by the `cell` snippet. It folds into labelled blocks on a narrow stage.
- Examples come in this order, using only the ones that apply: variants or tones, states, sizes or tiers, content (icons, long text, empty), behaviour and open states, in context, narrow width. Titles are short nouns in sentence case.
- Use the library's own components for any frame a specimen needs, a `Card` for a card, and never a local imitation.

## Contract

Open the markup with an `@component` comment. Start with prose: what the component is for, when to reach for something else, and any behaviour a caller cannot see from the props. Then end it with one line for each item a component specification must answer, in this order and with these exact labels (L-83):

```
- Semantics: the element or role, and its name.
- Content: what text, icons and children it takes, and its limits.
- States: every state it draws (default, hover, focus, pressed, selected, pending, error, disabled) and how each looks.
- Keyboard: Tab, arrows, Enter, Space and Escape.
- Pointer and touch: target sizes on a pointer and a phone, and the alternative to any drag or gesture.
- Focus: where focus goes on open, close and removal.
- Responsive: how it wraps, folds, scrolls or turns into another control.
- Accessibility: name, description, announcements and contrast.
- Localization: which built-in words are props, how plurals and numbers follow the page language, and what mirrors in a right-to-left page.
- Performance: its cost with long content and many instances, and what it animates.
- Analytics: the callbacks that report the reader's outcome.
- Failure: what it shows when content is empty, slow, refused, invalid or missing.
```

Write "none" only when an item truly does not apply, and say why. Document each prop with a one-line JSDoc comment when its name does not say everything.

## Props

- Svelte 5 runes only: `$props`, `$state`, `$derived`, `$effect`, `$bindable`, snippets and callback props. No `on:`, `export let`, `<slot>`, `$:` or stores.
- Pass native attributes through with `...rest` onto the element a caller would expect, and merge `class` as `class={['sui-name', className]}`.
- Offer `element = $bindable(null)` when a caller may need to focus or anchor to the element.
- Use `$props.id()` for generated ids, assigned to a `const` first.
- Name tones after jobs, never colors (`signal`, `stop`, `quiet`), and keep tone names in step with `Button`.

## Styles

- Styles are scoped in the component. Prefix the root class with `sui-`.
- Read only `--sui-*` tokens from `src/lib/styles.css`. No hex, `rgb()`, named colors, and no `var()` fallbacks except `0px` for optional bearings and a token behind a `--sui-local-*` property that a parent may set. If a token is missing, use the nearest one and report it instead of adding one.
- Sizes and leading: `font: var(--sui-weight-*) var(--sui-font-size-*) / var(--sui-leading-*) var(--sui-sans)`. Edges are `var(--sui-stroke)` (1px) or `var(--sui-stroke-bold)` (2px) wide. Mono (`--sui-mono`) only for technical values, with `font-variant-numeric: tabular-nums`, at weight 400 or 500. Text a reader types reads `--sui-font-size-input` and `--sui-leading-input`, which step to 16px on phones so iOS does not zoom. No text is smaller than `--sui-font-size-micro`.
- Trim labels, titles and pills with `text-box: trim-both cap alphabetic`, and wrap a label in its own `span` inside flex containers so the trim reaches it.
- Spacing from `--sui-space-*` and the rhythm tokens. Heights from `--sui-control-height-compact` (34px, 44px on phones), `--sui-local-control-height` for the 40px tier, `--sui-tier-quiet` (28px), `--sui-control-height-chip` (24px) and `--sui-tier-mark` (20px). A target smaller than 44px grows its hit area to `--sui-touch-target` on phones with a pseudo-element.
- Edges: a button's border is `--sui-control-border`, and a field's edge (text field, text area, select trigger) is `--sui-field-border`, which holds 3:1.
- Focus: `outline: var(--sui-focus-ring-width) solid var(--sui-focus)` with `--sui-focus-ring-flush` on bordered controls (and `border-color: var(--sui-focus)`), `--sui-focus-ring-offset` on free-standing ones, `--sui-focus-ring-inset` inside a clipping box. Never a box shadow.
- States: hover is `--sui-interactive-hover-layer` (rows use `--sui-row-hover`), press is `--sui-interactive-pressed` with `box-shadow: var(--sui-pressed-inset)` on every control a reader presses (text links aside), plus `translate: 0 1px` on one with a border of its own; a part inside a shared frame takes the ground and inset without the sink, and every pressable control sets `user-select: none` so a press never selects its words (L-42, checked by pressing every control in the browser suite and by the audit). Disabled is `opacity: var(--sui-disabled-opacity); cursor: default`, and only with a visible reason beside it.
- Motion: durations and easings from tokens (`--sui-duration-press`, `-fast`, `-normal`, `-travel`, `--sui-ease-*`). Every transition and animation gets a `@media (prefers-reduced-motion: reduce)` block that removes the movement and keeps the state.
- Layers: floating content goes through the top layer (`Popover`, `<dialog>`, the toast stack). Only in-flow chrome that stacks reads `--sui-layer-*`.
- No `:global` rule that styles another component's classes. A parent never sets a child primitive's border, ground, type, focus or height.

## Language and direction

- Every word a component draws or announces is a prop with an English default, such as `clearLabel = 'Clear the search'`. A word that depends on a count is a function prop, `(count: number) => string`, so a caller can apply its own plural rules.
- Numbers, dates and times format with the page's language through `src/lib/internal/locale.ts`, never with the browser's default.
- Layout uses logical properties (`inset-inline-start`, `margin-inline`, `padding-inline-end`), never `left`, `right` or a physical shorthand that differs per side. Movement along the reading direction flips under `:dir(rtl)`. Directional glyphs mirror in `Icon` on their own.
- Code, diffs, numbers in a chart's plot and other content that reads left to right whatever the page set `dir="ltr"` on their own element.

## Forced colors and touch

- A state drawn only with a ground, a veil or a shadow also draws a line or an outline under `@media (forced-colors: active)`, using system colors (`Highlight`, `CanvasText`, `GrayText`), so it survives high contrast.
- Hover paint sits inside `@media (hover: hover)` (L-98). Press, focus and selection are not hover.
- A target smaller than 44px grows to `--sui-touch-target` under `@media (max-width: 47.9375rem), (pointer: coarse)`, so a touch tablet gets the phone's targets too.
- Breakpoints are the palette's two (L-99); anything that answers to its own width uses a container query.

## Behaviour

- Native elements first: `<button>`, `<input>`, `<select>`, `<details>`, `<dialog>`, the Popover API. A picker is a native `<select>` styled with `appearance: base-select` where the browser has it.
- Floating layers use `Popover` and `src/lib/internal/anchor.ts`. Tooltips use `Tooltip`, only on a control that does something, and never as the only place a name or a needed fact lives.
- When an action removes the focused control, move focus to the control that continues the task. Focus never falls to the page body.
- Keyboard: every custom widget follows its ARIA pattern (combobox, listbox, menu, radio group, switch, dialog). Escape inside a nested layer stops at that layer.
- Icon-only controls go through `IconButton`, which requires a label.
- Copy in components and examples: sentence case, no trailing period on labels, hints, list items and one-sentence paragraphs, at most 25 words a sentence, the real ellipsis `…`.

## Checking

- `npm run check` passes with no errors or warnings.
- `npm test` passes, including `tests/laws.test.mjs`.
- Open the kitchen sink with `npm run dev`, look at the section in light and dark at 375px and at a desktop width, and read the law audit at the top of the page. It must say "Every law holds on this page".
