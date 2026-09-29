<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  type Props = HTMLAttributes<HTMLSpanElement> & {
    children: Snippet;
    tone?: 'neutral' | 'success' | 'warning' | 'danger';
  };

  let { children, tone = 'neutral', class: className = '', ...rest }: Props = $props();
</script>

<span {...rest} class="sui-badge {className}" data-tone={tone}>{@render children()}</span>

<style>
  .sui-badge {
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--sui-border, #c4cec9);
    border-radius: 999px;
    padding: 0.15rem 0.55rem;
    background: var(--sui-subtle, #f0f3f2);
    color: var(--sui-foreground, #18211f);
    font: 600 0.75rem/1.4 var(--sui-font, system-ui, sans-serif);
    white-space: nowrap;
    box-sizing: border-box;
  }
  .sui-badge[data-tone='success'] {
    background: var(--sui-success-subtle, #e7f5f2);
    color: var(--sui-success-ink, #0f766e);
    border-color: transparent;
  }
  .sui-badge[data-tone='warning'] {
    background: var(--sui-warning-subtle, #f8f0de);
    color: var(--sui-warning-ink, #8a5d17);
    border-color: transparent;
  }
  .sui-badge[data-tone='danger'] {
    background: var(--sui-danger-subtle, #faecee);
    color: var(--sui-danger-ink, #a33a45);
    border-color: transparent;
  }
</style>
