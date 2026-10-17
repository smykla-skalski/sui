<script module lang="ts">
  export const section = { title: 'Theme switch', order: 28 };
</script>

<script lang="ts">
  import { ThemeSwitch, type ThemeChoice } from '#lib';
  import Example from '../kit/Example.svelte';

  let theme = $state<ThemeChoice>('system');
</script>

<Example
  title="Page theme"
  note="Sets the theme of this page, remembers it for the next visit and follows the system live"
>
  <ThemeSwitch name="sink-theme" bind:value={theme} />
  <span class="state">Chosen: {theme}</span>
</Example>

<style>
  .state {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
  }
</style>
