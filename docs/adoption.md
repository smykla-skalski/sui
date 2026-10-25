# Adopting SUI

## SvelteKit apps

Install the published package, then import the theme once in `src/routes/+layout.svelte`:

```svelte
<script>
  import '@smykla-skalski/sui/styles.css';
  let { children } = $props();
</script>

{@render children()}
```

In apps that already have a theme, import its CSS after SUI's CSS so local `--sui-*` overrides win. Do not copy SUI's compiled component CSS into Tailwind layers; importing the Svelte component handles that CSS.

## Astro with Svelte islands

Use `@astrojs/svelte` and import the theme in a shared Astro layout:

```astro
---
import '@smykla-skalski/sui/styles.css';
import ContactForm from '../components/ContactForm.svelte';
---

<ContactForm client:load />
```

The Svelte island imports components from `@smykla-skalski/sui` normally. Hydrate only components that need client interaction.

## Migrating an app

Move one complete workflow at a time, such as changing a setting or reviewing a list of runs, not one component type across the whole app. A workflow shows whether the components work together with real data, errors and empty states; a button swapped on every page shows only that buttons look alike.

1. Before you change anything, record how the workflow does today: whether people finish it, where they make errors, how long it takes, its keyboard path, and its Largest Contentful Paint, Interaction to Next Paint and Cumulative Layout Shift where the app measures them.
2. List what experienced readers rely on in it, so the new screen keeps it or says where it went: places they find by memory, keyboard shortcuts, saved filters and views, and links they share or bookmark.
3. Add the package and theme, then rebuild that workflow from SUI components. Keep domain-specific labels and actions in the app, and move app colors into `--sui-*` overrides if necessary; keep the component API shared.
4. Check the moved screens against the [design laws](laws.md), not against the old app styles, and measure the workflow again: once at release and again after readers have used it for a while, because an early slowdown can be relearning.
5. Remove the old components and styles of that workflow only after checking each call site, then move to the next workflow.

Sybra, Baratie, and finance-buddy already use Svelte 5 and Tailwind 4. Smyklot uses Svelte 5 and its own CSS tokens. SUI's components work with both. An app on 0.2 follows the table in [lifecycle.md](lifecycle.md) first.
