<script module lang="ts">
  export const section = {
    title: 'Switch',
    lead: 'A boolean that takes effect the moment it flips. A value that a later save writes is a Checkbox.',
    components: ['Switch']
  };
</script>

<script lang="ts">
  import { clock } from '../kit/format.js';
  import { Section, Switch } from '#lib';
  import Example from '../kit/Example.svelte';
  import Pair from '../kit/Pair.svelte';
  import Specimen from '../kit/Specimen.svelte';
  import Variants from '../kit/Variants.svelte';

  const states = ['enabled', 'disabled'] as const;
  const values = ['Off', 'On'] as const;
  const switches = {
    Off: {
      label: 'Archive old runs',
      reason: 'The workspace keeps every run for 90\u00a0days',
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
  --example-max="54rem"
  note="Off and on, each with its label and a 44 px tap box, and a locked switch says beside it why"
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
  --example-max="54rem"
  layout="grid"
  --specimen-min="14rem"
  note="A flip takes effect at once, so the thumb turns while it saves and a refused change flips back and says why"
>
  <Specimen label="Pending">
    <Switch label="Send weekly digests" checked pending />
  </Specimen>
  <Specimen label="Refused">
    <Switch
      label="Mirror to the backup region"
      bind:checked={mirror}
      pending={saving}
      error={refusal}
      onchange={flip}
    />
  </Specimen>
  <Specimen label="Invalid, kept when on">
    <Switch
      label="Allow public forks"
      checked
      invalid
      error="A private repository cannot allow public forks"
    />
  </Specimen>
</Example>

<Pair>
  <Example
    title="Keyboard Focus"
    note="Tab to a switch and press Space to flip it, and the ring sits 2 px off the track"
  >
    <Specimen label="Off">
      <Switch label="Require reviews" />
    </Specimen>
  </Example>

  <Example
    title="In a Section Head"
    note="A bare switch keeps its 44 px hit area as paint, so the head keeps its own rhythm"
    layout="grid"
    ground="canvas"
  >
    <Specimen label="Bare">
      <Section title="Scheduled Syncs" level={4}>
        {#snippet actions()}
          <Switch aria-label="Run scheduled syncs" bare bind:checked={scheduled} />
        {/snippet}
        <p class="copy">Every repository syncs at {clock(2)} in its own time zone</p>
      </Section>
    </Specimen>
  </Example>
</Pair>

<div class="fill">
  <Example
    title="Narrow Width"
    --example-max="calc(16rem + 2 * var(--sui-space-6))"
    note="A long label wraps beside the track and both stay centred"
    layout="stack"
  >
    <Specimen label="Wrapped label">
      <div class="narrow">
        <Switch
          label="Close every stale pull request that has had no activity for 30 days"
          checked
        />
      </div>
    </Specimen>
  </Example>
</div>

<style>
  /* The reason stands where the switch's own error does, straight under its 44px row, so every
     note under a switch keeps one distance from the track. */
  .locked {
    display: grid;
    justify-items: start;
  }

  .reason {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    padding-block: var(--sui-block-snap-room);
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

  /* The narrow frame keeps the switch's 16rem and the stage's 24px pad on a wide page; on a
     phone it fills the column, as every other frame does (L-55). */
  @media (max-width: 47.9375rem) {
    .fill :global(.example) {
      --example-max: none;
    }
  }
</style>
