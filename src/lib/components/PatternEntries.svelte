<script lang="ts">
  import { tick } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import Button from './Button.svelte';
  import IconButton from './IconButton.svelte';
  import TextInput from './TextInput.svelte';

  const uid = $props.id();

  let {
    value = $bindable([]),
    validate,
    addLabel = 'Add a pattern',
    disabled = false,
    class: className = '',
    ...rest
  }: {
    value?: string[];
    /** Says what is wrong with one pattern, or null when it is fine. An empty entry is never asked about. */
    validate?: (pattern: string, index: number, patterns: readonly string[]) => string | null;
    /** The add button's words, specific to what the patterns match. */
    addLabel?: string;
    disabled?: boolean;
    /** Layout for the call site only, never the list's own paint. */
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> = $props();

  let root = $state<HTMLElement | null>(null);
  let adder = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);

  const problems = $derived(
    value.map((pattern, index) =>
      pattern.trim() === '' ? null : (validate?.(pattern.trim(), index, value) ?? null)
    )
  );

  const fields = () => [...(root?.querySelectorAll('input') ?? [])];

  // An empty entry already open is the new entry, so Add returns to it instead of minting another.
  async function add(): Promise<void> {
    let at = value.findIndex((pattern) => pattern.trim() === '');
    if (at < 0) {
      at = value.length;
      value = [...value, ''];
    }
    await tick();
    fields()[at]?.focus();
  }

  async function remove(index: number): Promise<void> {
    value = value.filter((_, at) => at !== index);
    await tick();
    (fields()[index] ?? adder)?.focus();
  }

  // Clearing an entry to retype it never deletes it under the keyboard; leaving it empty does.
  function settle(index: number, event: FocusEvent): void {
    const row = event.currentTarget as HTMLElement;
    if (row.contains(event.relatedTarget as Node | null)) return;
    const trimmed = value[index]?.trim();
    if (trimmed === '') value = value.filter((_, at) => at !== index);
    else if (trimmed !== undefined && trimmed !== value[index])
      value = value.map((pattern, at) => (at === index ? trimmed : pattern));
  }

  const write = (index: number, next: string) =>
    (value = value.map((pattern, at) => (at === index ? next : pattern)));
</script>

<!--
@component
An editable list of patterns, such as branches or paths to leave alone. Each entry is a mono
`TextInput` edited where it stands, with a 34px square cross that removes it, and the list ends
with an `add` button that opens an empty entry and moves focus to it. Leaving an entry empty
drops it, and removing one hands focus to the next entry or to the add button.

`validate` judges each pattern against the whole list, so it can refuse a duplicate. Its answer
stands 8px under the entry, which is marked invalid and described by it, and the text stays as
typed until the reader fixes it.
-->

<div bind:this={root} {...rest} class={['sui-pattern-entries', className]}>
  {#if value.length > 0}
    <ul class="sui-pattern-list" role="list">
      {#each value as pattern, index (index)}
        {@const problem = problems[index]}
        <li class="sui-pattern-entry" onfocusout={(event) => settle(index, event)}>
          <div class="sui-pattern-line">
            <span class="sui-pattern-field">
              <TextInput
                mono
                value={pattern}
                aria-label="Pattern {index + 1}"
                invalid={problem !== null}
                aria-describedby={problem === null ? undefined : `${uid}-problem-${index}`}
                autocomplete="off"
                spellcheck="false"
                {disabled}
                oninput={(event) => write(index, event.currentTarget.value)}
              />
            </span>
            <IconButton
              toolbar
              icon="close"
              label={pattern.trim() === ''
                ? 'Remove the empty pattern'
                : `Remove ${pattern.trim()}`}
              {disabled}
              onclick={() => remove(index)}
            />
          </div>
          {#if problem !== null}
            <p id="{uid}-problem-{index}" class="sui-pattern-problem">{problem}</p>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
  <Button tone="add" bind:element={adder} {disabled} onclick={add}>
    {#snippet icon()}<Icon name="plus" size="sm" />{/snippet}
    {addLabel}
  </Button>
</div>

<style>
  .sui-pattern-entries {
    display: grid;
    gap: var(--sui-space-2);
    justify-items: start;
    max-inline-size: 100%;
    min-inline-size: 0;
  }

  .sui-pattern-list {
    display: grid;
    gap: var(--sui-space-2);
    justify-self: stretch;
    list-style: none;
    margin: 0;
    min-inline-size: 0;
    padding: 0;
  }

  .sui-pattern-entry {
    display: grid;
    gap: var(--sui-row-copy-gap);
    min-inline-size: 0;
  }

  .sui-pattern-line {
    align-items: center;
    display: flex;
    gap: var(--sui-space-2);
    min-inline-size: 0;
  }

  .sui-pattern-field {
    display: grid;
    flex: 0 1 16rem;
    min-inline-size: 0;
  }

  /* Contained, so a long reason wraps under its entry instead of widening the list. */
  .sui-pattern-problem {
    block-size: var(--sui-block-snap);
    color: var(--sui-danger);
    contain: inline-size;
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    margin: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }
</style>
