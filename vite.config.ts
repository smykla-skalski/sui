import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit({
      preprocess: vitePreprocess(),
      adapter: adapter(),
      // PR previews share one host, each under its own /pr-<number> prefix.
      paths: { base: (process.env.BASE_PATH ?? '') as '' | `/${string}` },
      // The sink's tabs and links point at demo anchors that no section renders.
      prerender: { handleMissingId: 'ignore' }
    })
  ],
  // The SSR pre-bundle resolves rolldown's virtual runtime, which no `include` covers, so
  // auto-discovery walks up into any parent project's tsconfig (e.g. from a git worktree).
  ssr: { optimizeDeps: { rolldownOptions: { tsconfig: 'tsconfig.json' } } }
});
