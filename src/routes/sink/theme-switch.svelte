<script module lang="ts">
  export const section = {
    title: 'Theme Switch',
    lead: 'Light, dark or the system’s theme for the whole page, remembered for the next visit. Any other choice of a few options is a SegmentedControl.',
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
  title="Page Theme"
  --example-max="54rem"
  --specimen-min="21rem"
  --specimen-row-gap="var(--sui-space-6)"
  layout="grid"
  note="Sets the theme of this page, remembers it for the next visit and follows the system live"
>
  <Specimen label="Light, dark & system">
    <ThemeSwitch name="sink-theme" bind:value={theme} />
  </Specimen>
  <Specimen label="Light & dark">
    <ThemeSwitch name="sink-theme-two" system={false} hint="Follows the system" />
  </Specimen>
</Example>

<Example
  title="Label"
  --example-max="54rem"
  --specimen-min="21rem"
  --specimen-row-gap="var(--sui-space-6)"
  layout="grid"
  note="The options already say what they are, so the label is spoken unless a page draws it"
>
  <Specimen label="Drawn">
    <ThemeSwitch name="sink-theme-labelled" hideLabel={false} />
  </Specimen>
</Example>

<Example
  title="Narrow Width"
  --example-max="54rem"
  --specimen-min="21rem"
  --specimen-row-gap="var(--sui-space-6)"
  layout="grid"
  note="Short of room, the same 3 choices become a native select that shares the page’s one choice"
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
