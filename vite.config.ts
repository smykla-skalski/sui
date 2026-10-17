import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit({ preprocess: vitePreprocess() })],
  // The SSR pre-bundle resolves rolldown's virtual runtime, which no `include` covers, so
  // auto-discovery walks up into any parent project's tsconfig (e.g. from a git worktree).
  ssr: { optimizeDeps: { rolldownOptions: { tsconfig: 'tsconfig.json' } } }
});
