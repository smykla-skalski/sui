# Package decisions

- **Svelte 5 and `@sveltejs/package`:** official SvelteKit packaging emits preprocessed components and type declarations, with a documented `exports` map. [Packaging guide](https://svelte.dev/docs/kit/packaging)
- **Runes, snippets, callback props:** current Svelte guidance for new code. [Best practices](https://svelte.dev/docs/svelte/best-practices)
- **Shared visual identity:** the first theme follows [Smyklot's panel design system](https://github.com/smykla-skalski/smyklot/blob/main/design-system/smyklot-panel/MASTER.md). CSS custom properties let each consumer extend it without coupling to Tailwind or Skeleton. [Custom properties](https://svelte.dev/docs/svelte/custom-properties)
- **Native elements first:** buttons and fields retain native attributes, keyboard behavior, and labels. [Accessibility guide](https://svelte.dev/docs/kit/accessibility)
- **Portable package:** no `$app/*` imports, so the package works in SvelteKit, Vite, and Astro. [Packaging best practices](https://svelte.dev/docs/kit/packaging#best-practices)

The first components cover simple repeated patterns. Local Sybra, Baratie, finance-buddy, sailor-buddy, and the [Smyklot panel](https://github.com/smykla-skalski/smyklot/tree/main/internal/panel/frontend) use Svelte 5 with distinct styling systems. Shared brand tokens and small primitives allow migration without copying app-specific behavior. Accessible overlays need a separate design and test pass.
