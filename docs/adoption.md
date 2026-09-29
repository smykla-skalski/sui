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

## First migration

1. Add the package and theme to one app.
2. Replace an app-local button or badge where the behavior matches. Keep domain-specific labels and actions in the app.
3. Move app colors into `--sui-*` overrides if necessary; keep the component API shared.
4. Remove the old component only after checking each call site.

Sybra, Baratie, and finance-buddy already use Svelte 5 and Tailwind 4. Smyklot uses Svelte 5 and its own CSS tokens. SUI's components work with both. Start with Button, Field, Card, and Badge. Modal, ConfirmDialog, Select, and Toast need a shared interaction contract and accessibility tests before extraction.
