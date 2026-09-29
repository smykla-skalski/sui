<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  type Props = HTMLButtonAttributes & {
    children: Snippet;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md';
    loading?: boolean;
  };

  let {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    type = 'button',
    class: className = '',
    ...rest
  }: Props = $props();
</script>

<button
  {...rest}
  {type}
  class="sui-button {className}"
  data-variant={variant}
  data-size={size}
  disabled={disabled || loading}
  aria-busy={loading || undefined}
>
  {#if loading}<span class="sui-button-spinner" aria-hidden="true"></span>{/if}
  {@render children()}
</button>

<style>
  .sui-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-height: 2.5rem;
    padding: 0.5rem 0.875rem;
    border: 1px solid transparent;
    border-radius: var(--sui-radius, 0.5rem);
    background: var(--sui-primary, #0f766e);
    color: var(--sui-primary-foreground, #fff);
    font: 600 0.8125rem/1.125rem var(--sui-font, system-ui, sans-serif);
    text-decoration: none;
    cursor: pointer;
    box-sizing: border-box;
    transition:
      background-color 120ms ease,
      border-color 120ms ease;
  }

  .sui-button:hover:not(:disabled) {
    background: var(--sui-primary-hover, #115e59);
  }
  .sui-button:focus-visible {
    outline: 2px solid var(--sui-focus, #0f766e);
    outline-offset: 2px;
  }
  .sui-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .sui-button[data-size='sm'] {
    min-height: 2rem;
    padding: 0.35rem 0.625rem;
  }
  .sui-button[data-variant='secondary'] {
    background: var(--sui-surface, #fff);
    border-color: var(--sui-border, #c4cec9);
    color: var(--sui-foreground, #18211f);
  }
  .sui-button[data-variant='secondary']:hover:not(:disabled) {
    background: var(--sui-subtle, #f0f3f2);
  }
  .sui-button[data-variant='ghost'] {
    background: transparent;
    color: var(--sui-foreground, #18211f);
  }
  .sui-button[data-variant='ghost']:hover:not(:disabled) {
    background: var(--sui-subtle, #f0f3f2);
  }
  .sui-button[data-variant='danger'] {
    background: var(--sui-danger, #a33a45);
    color: var(--sui-danger-foreground, #fff);
  }
  .sui-button[data-variant='danger']:hover:not(:disabled) {
    background: var(--sui-danger-hover, #8b2f39);
  }
  .sui-button-spinner {
    width: 0.85em;
    height: 0.85em;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: sui-spin 700ms linear infinite;
  }
  @keyframes sui-spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .sui-button {
      transition: none;
    }
    .sui-button-spinner {
      animation-duration: 1.5s;
    }
  }
</style>
