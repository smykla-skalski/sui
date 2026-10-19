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
      prerender: { handleMissingId: 'ignore' },
      // The layout registers the worker with `registerServiceWorker`, which never does on the
      // dev server, so a dev page never runs a build's caches.
      serviceWorker: { register: false }
    })
  ],
  // Below these versions the CSS minifier rewrites `:dir(rtl)` into a list of right-to-left
  // `:lang()` selectors, which miss a page that sets only `dir`, so every mirrored rule is lost.
  build: { cssTarget: ['chrome120', 'edge120', 'firefox115', 'safari16.4'] },
  // The SSR pre-bundle resolves rolldown's virtual runtime, which no `include` covers, so
  // auto-discovery walks up into any parent project's tsconfig (e.g. from a git worktree).
  ssr: { optimizeDeps: { rolldownOptions: { tsconfig: 'tsconfig.json' } } }
});
