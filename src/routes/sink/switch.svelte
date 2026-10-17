<script module lang="ts">
  export const section = {
    title: 'Switch',
    order: 24,
    lead: 'A boolean that takes effect the moment it flips. A value that a later save writes is a Checkbox.',
    components: ['Switch']
  };
</script>

<script lang="ts">
  import { Card, Switch } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
  import Variants from '../kit/Variants.svelte';

  const states = ['enabled', 'disabled'] as const;
  const values = ['Off', 'On'] as const;
  const switches = {
    Off: {
      label: 'Archive old runs',
      reason: 'The workspace keeps every run for 90 days',
      id: 'sink-switch-archive-reason'
    },
    On: {
      label: 'Keep audit log',
      reason: 'Every paid workspace keeps one',
      id: 'sink-switch-audit-reason'
    }
  };

  let scheduled = $state(true);
  let mirror = $state(false);
  let saving = $state(false);
  let refusal = $state<string | undefined>('The backup region is full, so mirroring stayed off');

  /* The sink's save always fails, so the switch flips back and says why. */
  function flip() {
    saving = true;
    refusal = undefined;
    setTimeout(() => {
      saving = false;
      mirror = !mirror;
      refusal = 'The backup region is full, so mirroring stayed off';
    }, 900);
  }
</script>

<Example
  title="States"
  note="Off and on, each with its label and a 44px tap box, and a locked switch says beside it why"
>
  <Variants
    rows={states}
    columns={values}
    rowLabel={(state) => (state === 'disabled' ? 'disabled' : 'disabled={false}')}
  >
    {#snippet cell(state, value)}
      {@const { label, reason, id } = switches[value]}
      {#if state === 'disabled'}
        <div class="locked">
          <Switch {label} checked={value === 'On'} aria-describedby={id} disabled />
          <p {id} class="reason">{reason}</p>
        </div>
      {:else}
        <Switch {label} checked={value === 'On'} />
      {/if}
    {/snippet}
  </Variants>
</Example>

<Example
  title="Saving"
  note="A flip takes effect at once, so the thumb turns while it saves and a refused change flips back and says why"
>
  <Specimen label="Pending" code="pending">
    <Switch label="Send weekly digests" checked pending />
  </Specimen>
  <Specimen label="Refused" code="error">
    <Switch
      label="Mirror to the backup region"
      bind:checked={mirror}
      pending={saving}
      error={refusal}
      onchange={flip}
    />
  </Specimen>
  <Specimen label="Invalid, kept when on" code="invalid">
    <Switch label="Allow public forks" checked invalid />
  </Specimen>
</Example>

<Example
  title="Keyboard focus"
  note="Tab to a switch and press Space to flip it, and the ring sits 2px off the track"
>
  <Specimen label="Off">
    <Switch label="Require reviews" />
  </Specimen>
</Example>

<Example
  title="In a card head"
  note="A bare switch keeps its 44px hit area as paint, so the head keeps its own rhythm"
  layout="grid"
  ground="canvas"
>
  <Specimen label="Bare" code="bare">
    <Card title="Scheduled syncs" level={4}>
      {#snippet actions()}
        <Switch aria-label="Run scheduled syncs" bare bind:checked={scheduled} />
      {/snippet}
      <p class="copy">Every repository syncs at 02:00 in its own time zone</p>
    </Card>
  </Specimen>
</Example>

<Example
  title="Narrow width"
  note="A long label wraps beside the track and the two stay centred"
  layout="stack"
>
  <Specimen label="Wrapped label">
    <div class="narrow">
      <Switch
        label="Close every stale pull request that has had no activity for thirty days"
        checked
      />
    </div>
  </Specimen>
</Example>

<style>
  .locked {
    display: grid;
    gap: var(--sui-row-copy-gap);
    justify-items: start;
  }

  .reason {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  .copy {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-leading-body)
      var(--sui-sans);
    margin: 0;
  }

  .narrow {
    inline-size: min(100%, 16rem);
  }
</style>
