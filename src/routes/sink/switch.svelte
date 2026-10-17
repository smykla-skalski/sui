<script module lang="ts">
  export const section = { title: 'Switch', order: 24 };
</script>

<script lang="ts">
  import { Switch } from '#lib';
  import Example from '../kit/Example.svelte';

  let notify = $state(false);
  let sync = $state(true);
  let card = $state(true);
</script>

<Example title="States" note="Off, on and disabled, each with its label and a 44px tap box">
  <Switch label="Send notifications" bind:checked={notify} />
  <Switch label="Sync on push" bind:checked={sync} />
  <Switch label="Archive old runs" disabled />
  <Switch label="Keep audit log" checked disabled />
</Example>

<Example
  title="Keyboard focus"
  note="Tab to a switch and press Space to flip it, and the ring sits 2px off the track"
>
  <Switch label="Require reviews" />
</Example>

<Example title="Bare" note="A head that sets its own rhythm keeps the 44px hit area as paint">
  <div class="head">
    <span class="head-title">Scheduled syncs</span>
    <Switch aria-label="Run scheduled syncs" bare bind:checked={card} />
  </div>
</Example>

<Example
  title="Narrow width"
  note="A long label wraps beside the track and the two stay centred"
  layout="stack"
>
  <div class="narrow">
    <Switch
      label="Close every stale pull request that has had no activity for thirty days"
      checked
    />
  </div>
</Example>

<style>
  .head {
    align-items: center;
    display: flex;
    gap: var(--sui-space-3);
    inline-size: min(100%, 24rem);
    justify-content: space-between;
  }

  .head-title {
    color: var(--sui-text-primary);
    font: 600 var(--sui-font-size-card-title) / var(--sui-leading-title) var(--sui-sans);
    text-box: trim-both cap alphabetic;
  }

  .narrow {
    inline-size: min(100%, 16rem);
  }
</style>
