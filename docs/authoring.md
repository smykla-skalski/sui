# Writing a SUI component

Read [laws.md](laws.md) first. A component is done when it meets every law there, shows every state in the kitchen sink, and the law audit on the kitchen sink reports nothing.

## Files

- The component lives in `src/lib/components/<Name>.svelte`. Glyphs live in `src/lib/icons/`. Shared behaviour that is not a component (placement, focus, timing) lives in `src/lib/internal/`.
- Export it from `src/lib/index.ts`, with its public types.
- Show it in a kitchen sink section, `src/routes/sink/<name>.svelte`. The page finds every file in that folder. A section declares its title and order in a module script, and uses `src/routes/kit/Example.svelte` for each group of specimens:

```svelte
<script module lang="ts">
  export const section = { title: 'Switch', order: 30 };
</script>

<script lang="ts">
  import { Switch } from '#lib';
  import Example from '../kit/Example.svelte';
</script>

<Example title="States" note="Off, on and disabled, each with its label">...</Example>
```

The page renders the section's `h2`, so a section starts at `h3` through `Example`. A running dev server does not always notice a new file in that folder; save `src/routes/+page.svelte` once to make it look again.

## Contract

Open the markup with an `@component` comment written as prose: what the component is for, when to reach for something else, and any behaviour a caller cannot see from the props. No headings or prop lists in it. Document each prop with a one-line JSDoc comment when its name does not say everything.

## Props

- Svelte 5 runes only: `$props`, `$state`, `$derived`, `$effect`, `$bindable`, snippets and callback props. No `on:`, `export let`, `<slot>`, `$:` or stores.
- Pass native attributes through with `...rest` onto the element a caller would expect, and merge `class` as `class={['sui-name', className]}`.
- Offer `element = $bindable(null)` when a caller may need to focus or anchor to the element.
- Use `$props.id()` for generated ids, assigned to a `const` first.
- Name tones after jobs, never colors (`signal`, `stop`, `quiet`), and keep tone names in step with `Button`.

## Styles

- Styles are scoped in the component. Prefix the root class with `sui-`.
- Read only `--sui-*` tokens from `src/lib/styles.css`. No hex, `rgb()`, named colors, and no `var()` fallbacks except `0px` for optional bearings. If a token is missing, use the nearest one and report it instead of adding one.
- Sizes and leading: `font: <weight> var(--sui-font-size-*) / var(--sui-leading-*) var(--sui-sans)`. Mono (`--sui-mono`) only for technical values, with `font-variant-numeric: tabular-nums`, at weight 400 or 500. Text a reader types reads `--sui-font-size-input` and `--sui-leading-input`, which step to 16px on phones so iOS does not zoom. No text is smaller than `--sui-font-size-micro`.
- Trim labels, titles and pills with `text-box: trim-both cap alphabetic`, and wrap a label in its own `span` inside flex containers so the trim reaches it.
- Spacing from `--sui-space-*` and the rhythm tokens. Heights from `--sui-control-height-compact` (34px, 44px on phones), `--sui-local-control-height` for the 40px tier, `--sui-tier-quiet` (28px), `--sui-control-height-chip` (24px) and `--sui-tier-mark` (20px). A target smaller than 44px grows its hit area to `--sui-touch-target` on phones with a pseudo-element.
- Edges: a button's border is `--sui-control-border`, and a field's edge (text field, text area, select trigger) is `--sui-field-border`, which holds 3:1.
- Focus: `outline: var(--sui-focus-ring-width) solid var(--sui-focus)` with `--sui-focus-ring-flush` on bordered controls (and `border-color: var(--sui-focus)`), `--sui-focus-ring-offset` on free-standing ones, `--sui-focus-ring-inset` inside a clipping box. Never a box shadow.
- States: hover is `--sui-interactive-hover-layer` (rows use `--sui-row-hover`), press is `--sui-interactive-pressed` with `box-shadow: var(--sui-pressed-inset)` and `translate: 0 1px`. Disabled is `opacity: var(--sui-disabled-opacity); cursor: default`, and only with a visible reason beside it.
- Motion: durations and easings from tokens (`--sui-duration-press`, `-fast`, `-normal`, `-travel`, `--sui-ease-*`). Every transition and animation gets a `@media (prefers-reduced-motion: reduce)` block that removes the movement and keeps the state.
- Layers: floating content goes through the top layer (`Popover`, `<dialog>`, the toast stack). Only in-flow chrome that stacks reads `--sui-layer-*`.
- No `:global` rule that styles another component's classes. A parent never sets a child primitive's border, ground, type, focus or height.

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
