# Package decisions

- **Svelte 5 and `@sveltejs/package`:** official SvelteKit packaging emits preprocessed components and type declarations, with a documented `exports` map. [Packaging guide](https://svelte.dev/docs/kit/packaging)
- **Runes, snippets, callback props:** current Svelte guidance for new code. [Best practices](https://svelte.dev/docs/svelte/best-practices)
- **Shared visual identity:** the first theme follows [Smyklot's panel design system](https://github.com/smykla-skalski/smyklot/blob/main/design-system/smyklot-panel/MASTER.md). CSS custom properties let each consumer extend it without coupling to Tailwind or Skeleton. [Custom properties](https://svelte.dev/docs/svelte/custom-properties)
- **Native elements first:** buttons and fields retain native attributes, keyboard behavior, and labels. [Accessibility guide](https://svelte.dev/docs/kit/accessibility)
- **Portable package:** no `$app/*` imports, so the package works in SvelteKit, Vite, and Astro. [Packaging best practices](https://svelte.dev/docs/kit/packaging#best-practices)

The first components cover simple repeated patterns. Local Sybra, Baratie, finance-buddy, sailor-buddy, and the [Smyklot panel](https://github.com/smykla-skalski/smyklot/tree/main/internal/panel/frontend) use Svelte 5 with distinct styling systems. Shared brand tokens and small primitives allow migration without copying app-specific behavior.

- **Native overlays:** modals use `<dialog>` and floating layers use the Popover API, positioned by a small script while CSS anchor positioning is not available in every engine. This keeps SUI free of runtime dependencies. [Popover API](https://developer.mozilla.org/docs/Web/API/Popover_API)
- **Laws as tests:** the design laws are enforced by source tests, an in-page audit and a browser test, because a law that only lives in a document stops holding the first time a component is added. [Design laws](laws.md)
