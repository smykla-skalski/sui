<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  type Props = Omit<HTMLInputAttributes, 'value' | 'type'> & {
    label: string;
    hint?: string;
    error?: string;
    value?: string;
    type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';
  };

  const fallbackId = $props.id();

  let {
    label,
    hint,
    error,
    value = $bindable(''),
    type = 'text',
    id = fallbackId,
    'aria-describedby': describedBy,
    class: className = '',
    ...rest
  }: Props = $props();

  let description = $derived(
    [describedBy, hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') ||
      undefined
  );
</script>

<div class="sui-field">
  <label for={id}>{label}</label>
  <input
    {...rest}
    {id}
    {type}
    class="sui-field-input {className}"
    bind:value
    aria-invalid={error ? true : undefined}
    aria-describedby={description}
  />
  {#if hint}<p id="{id}-hint" class="sui-field-hint">{hint}</p>{/if}
  {#if error}<p id="{id}-error" class="sui-field-error">{error}</p>{/if}
</div>

<style>
  .sui-field {
    display: grid;
    gap: 0.375rem;
    font-family: var(--sui-font, system-ui, sans-serif);
  }
  label {
    color: var(--sui-foreground, #18211f);
    font-size: 0.8125rem;
    font-weight: 600;
  }
  .sui-field-input {
    width: 100%;
    min-height: 2.5rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--sui-border, #c4cec9);
    border-radius: var(--sui-radius, 0.5rem);
    background: var(--sui-surface, #fff);
    color: var(--sui-foreground, #18211f);
    font: inherit;
    font-size: 0.875rem;
    box-sizing: border-box;
  }
  .sui-field-input::placeholder {
    color: var(--sui-muted, #4c5b57);
  }
  .sui-field-input:focus-visible {
    outline: 2px solid var(--sui-focus, #0f766e);
    outline-offset: 2px;
  }
  .sui-field-input:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .sui-field-input[aria-invalid='true'] {
    border-color: var(--sui-danger, #a33a45);
  }
  p {
    margin: 0;
    font-size: 0.75rem;
    line-height: 1.4;
  }
  .sui-field-hint {
    color: var(--sui-muted, #4c5b57);
  }
  .sui-field-error {
    color: var(--sui-danger, #a33a45);
  }
</style>
