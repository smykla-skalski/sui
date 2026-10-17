# Package decisions

- **Svelte 5 and `@sveltejs/package`:** official SvelteKit packaging emits preprocessed components and type declarations, with a documented `exports` map. [Packaging guide](https://svelte.dev/docs/kit/packaging)
- **Runes, snippets, callback props:** current Svelte guidance for new code. [Best practices](https://svelte.dev/docs/svelte/best-practices)
- **Shared visual identity:** the first theme follows [Smyklot's panel design system](https://github.com/smykla-skalski/smyklot/blob/main/design-system/smyklot-panel/MASTER.md). CSS custom properties let each consumer extend it without coupling to Tailwind or Skeleton. [Custom properties](https://svelte.dev/docs/svelte/custom-properties)
- **Native elements first:** buttons and fields retain native attributes, keyboard behavior, and labels. [Accessibility guide](https://svelte.dev/docs/kit/accessibility)
- **Portable package:** no `$app/*` imports, so the package works in SvelteKit, Vite, and Astro. [Packaging best practices](https://svelte.dev/docs/kit/packaging#best-practices)

The first components cover simple repeated patterns. Local Sybra, Baratie, finance-buddy, sailor-buddy, and the [Smyklot panel](https://github.com/smykla-skalski/smyklot/tree/main/internal/panel/frontend) use Svelte 5 with distinct styling systems. Shared brand tokens and small primitives allow migration without copying app-specific behavior.

- **Native overlays:** modals use `<dialog>` and floating layers use the Popover API, positioned by a small script while CSS anchor positioning is not available in every engine. This keeps SUI free of runtime dependencies. [Popover API](https://developer.mozilla.org/docs/Web/API/Popover_API)
- **Laws as tests:** the design laws are enforced by source tests, an in-page audit and a browser test, because a law that only lives in a document stops holding the first time a component is added. [Design laws](laws.md)

## Design decisions and their evidence

Each contested choice names the standard or study it rests on, so a later change argues with the evidence instead of with taste.

- **One accent fill in both themes:** the ocean blue holds 4.5:1 with white ink on both grounds and 3:1 as a focus ring, so one fill serves both themes and a reader sees the same action color everywhere. [WCAG 1.4.3 and 1.4.11](https://www.w3.org/TR/WCAG22/#contrast-minimum)
- **Fields as a quiet frame with a 3:1 baseline:** the boundary that identifies a field holds 3:1, and the rest of the frame stays quiet so a dense form is not a grid of loud boxes. The minimal input with a bottom border is the WCAG understanding document's own passing example, and Fluent 2 draws inputs the same way. [Understanding 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- **Pair entry as chips that edit in a popover:** a list of mappings reads side by side as tokens, the way input chips carry structured values, and each chip opens a labelled editor, so a visible label stays with every field. Removal sits outside the editing target. [Material 3 input chips](https://m3.material.io/components/chips/guidelines)
- **Layers grow from the edge that faces their trigger:** motion explains where an object came from and where it goes, and stays on the compositor (transform and opacity). [Material motion](https://m3.material.io/styles/motion/overview)
- **Undo over confirmation:** an act that can be undone happens at once and offers Undo; only an act that cannot be undone asks first. [NN/g on confirmation dialogs](https://www.nngroup.com/articles/confirmation-dialog/)
- **44px targets on phones and touch screens:** the WCAG 2.5.8 floor is 24px, and platform guidance asks for 44pt, so every target grows to 44px where a finger is the pointer. [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- **Hover only where a pointer hovers:** a tap must not leave a control looking hovered. [Media Queries 4](https://www.w3.org/TR/mediaqueries-4/#hover)
- **A page with no theme follows the system:** a reader's dark preference applies without script. [prefers-color-scheme](https://www.w3.org/TR/mediaqueries-5/#prefers-color-scheme)
- **Built-in words are props:** every label, status and announcement a component writes can be translated, and counts take a function so a caller applies its own plural rules. [Intl.PluralRules](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules)
