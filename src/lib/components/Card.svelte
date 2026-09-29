<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  type Props = HTMLAttributes<HTMLDivElement> & {
    children: Snippet;
    heading?: string;
    description?: string;
    footer?: Snippet;
  };

  let { children, heading, description, footer, class: className = '', ...rest }: Props = $props();
</script>

<div {...rest} class="sui-card {className}">
  {#if heading || description}
    <div class="sui-card-header">
      {#if heading}<h2>{heading}</h2>{/if}
      {#if description}<p>{description}</p>{/if}
    </div>
  {/if}
  <div class="sui-card-body">{@render children()}</div>
  {#if footer}<div class="sui-card-footer">{@render footer()}</div>{/if}
</div>

<style>
  .sui-card {
    overflow: hidden;
    border: 1px solid var(--sui-border, #c4cec9);
    border-radius: var(--sui-surface-radius, 0.625rem);
    background: var(--sui-surface, #fff);
    color: var(--sui-foreground, #18211f);
    box-shadow: var(--sui-shadow, 0 1px 3px rgb(16 24 40 / 8%));
    font-family: var(--sui-font, system-ui, sans-serif);
    box-sizing: border-box;
  }
  .sui-card-header {
    padding: 1.25rem 1.25rem 0;
  }
  .sui-card-header h2 {
    margin: 0;
    font-size: 1rem;
    line-height: 1.4;
  }
  .sui-card-header p {
    margin: 0.35rem 0 0;
    color: var(--sui-muted, #4c5b57);
    font-size: 0.875rem;
    line-height: 1.5;
  }
  .sui-card-body {
    padding: 1.25rem;
  }
  .sui-card-footer {
    padding: 0.875rem 1.25rem;
    border-top: 1px solid var(--sui-border, #c4cec9);
  }
</style>
