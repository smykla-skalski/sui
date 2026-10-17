<script module lang="ts">
  export const section = { title: 'Skip link and visually hidden', order: 116 };
</script>

<script lang="ts">
  import { Button, SkipLink, VisuallyHidden } from '#lib';
  import Example from '../kit/Example.svelte';

  const members = ['Ada Lovelace', 'Grace Hopper'];
</script>

<Example
  title="Skip link"
  note="The link waits above the window and comes into the corner while it has focus"
  layout="stack"
>
  <p class="copy">Click this sentence, then press Tab to reveal the skip link</p>
  <SkipLink href="#skip-link-target">Skip to the example target</SkipLink>
  <p id="skip-link-target" class="copy target" tabindex="-1">
    Press Enter on the skip link and focus lands on this sentence
  </p>
</Example>

<Example
  title="Visually hidden"
  note="Each button reads as Remove and the member's name to a screen reader, and shows only Remove"
  layout="stack"
>
  <ul class="members">
    {#each members as member (member)}
      <li>
        <span class="copy">{member}</span>
        <Button>Remove <VisuallyHidden>{member}</VisuallyHidden></Button>
      </li>
    {/each}
  </ul>
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

  .members {
    display: grid;
    gap: var(--sui-space-2);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .members > li {
    align-items: center;
    display: flex;
    gap: var(--sui-space-3);
    justify-content: space-between;
  }
</style>
