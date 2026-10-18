<script module lang="ts">
  export const section = {
    title: 'Theme switch',
    order: 28,
    lead: "Light, dark or the system's theme for the whole page, remembered for the next visit. Any other choice of a few options is a SegmentedControl.",
    components: ['ThemeSwitch']
  };
</script>

<script lang="ts">
  import { ThemeSwitch, type ThemeChoice } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  let theme = $state<ThemeChoice>('system');
</script>

<Example
  title="Page theme"
  note="Sets the theme of this page, remembers it for the next visit and follows the system live"
>
  <Specimen label="Light, dark and system" code="bind:value">
    <ThemeSwitch name="sink-theme" bind:value={theme} />
  </Specimen>
  <Specimen label="Light and dark" code={'system={false}'}>
    <ThemeSwitch name="sink-theme-two" system={false} />
  </Specimen>
  <Specimen label="Label drawn" code={'hideLabel={false}'}>
    <ThemeSwitch name="sink-theme-labelled" hideLabel={false} />
  </Specimen>
</Example>

<Example
  title="Narrow width"
  note="Short of room, the same three choices become a native select that shares the page's one choice"
  layout="stack"
>
  <Specimen label="As a select">
    <div class="narrow">
      <ThemeSwitch name="sink-theme-narrow" />
    </div>
  </Specimen>
</Example>

<style>
  .narrow {
    display: flex;
    inline-size: min(100%, 8rem);
  }
</style>
