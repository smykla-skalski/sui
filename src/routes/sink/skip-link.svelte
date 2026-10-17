<script module lang="ts">
  export const section = {
    title: 'Skip link and visually hidden',
    order: 116,
    lead: 'Words for keyboard and screen reader users: a link past the chrome that shows on focus, and text only a screen reader reads. Words that always show are a Link or plain text.',
    components: ['SkipLink', 'VisuallyHidden']
  };
</script>

<script lang="ts">
  import { Button, SkipLink, VisuallyHidden } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
</script>

<Example
  title="Skip link"
  note="The link waits above the window and comes into the corner while it has focus"
  layout="stack"
>
  <Specimen label="Waiting above the window" code="href">
    <p class="copy">Click this sentence, then press Tab to reveal the skip link</p>
    <SkipLink href="#skip-link-target">Skip to the example target</SkipLink>
  </Specimen>
  <Specimen label="Where focus lands" code={'tabindex="-1"'}>
    <p id="skip-link-target" class="copy target" tabindex="-1">
      Press Enter on the skip link and focus lands on this sentence
    </p>
  </Specimen>
</Example>

<Example
  title="Visually hidden"
  note="Each button shows only Remove, and a screen reader reads Remove and the member's name"
>
  <Specimen label="Read as Remove Ada Lovelace" code="VisuallyHidden">
    <Button>Remove <VisuallyHidden>Ada Lovelace</VisuallyHidden></Button>
  </Specimen>
  <Specimen label="Read as Remove Grace Hopper" code="VisuallyHidden">
    <Button>Remove <VisuallyHidden>Grace Hopper</VisuallyHidden></Button>
  </Specimen>
</Example>

<style>
  .copy {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-body) / var(--sui-leading-body) var(--sui-sans);
    margin: 0;
  }

  .target:focus {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }
</style>
