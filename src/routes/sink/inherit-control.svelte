<script module lang="ts">
  export const section = {
    title: 'Inherit control',
    order: 107,
    lead: 'A value inherited from another level until this one overrides it, with the way back. A setting with nothing to inherit takes its control directly.',
    components: ['InheritControl']
  };
</script>

<script lang="ts">
  import {
    Card,
    DurationInput,
    InheritControl,
    SegmentedControl,
    SettingList,
    SettingRow
  } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const INHERITED_LIFETIME = 3600;
  const levels = [
    { value: 'debug', label: 'Debug' },
    { value: 'info', label: 'Info' },
    { value: 'warn', label: 'Warnings' },
    { value: 'error', label: 'Errors' }
  ];

  // What the store holds: the lifetime follows the workspace and the level is set here.
  const saved = { lifetime: null as number | null, level: 'debug' as string | null };

  // Each control starts on the inherited value and keeps its own across a return to the
  // inherited one, so Override brings the last override back.
  let lifetimeOverridden = $state(false);
  let lifetime = $state(INHERITED_LIFETIME);
  let levelOverridden = $state(true);
  let level = $state<string | null>('debug');

  const lifetimeUnsaved = $derived((lifetimeOverridden ? lifetime : null) !== saved.lifetime);
  const levelUnsaved = $derived((levelOverridden ? level : null) !== saved.level);
</script>

<Example
  title="States"
  note="An inherited value is muted with its source, an override shows the control with a way back, and a locked one says why"
>
  <Specimen label="Inherited" code={'inherited="1 hour" source="the workspace"'}>
    <InheritControl
      bind:overridden={lifetimeOverridden}
      label="Session lifetime"
      inherited="1 hour"
      source="the workspace"
    >
      {#snippet control()}
        <DurationInput label="Session lifetime" bind:value={lifetime} min={60} />
      {/snippet}
    </InheritControl>
  </Specimen>
  <Specimen label="Overridden" code="bind:overridden">
    <InheritControl
      bind:overridden={levelOverridden}
      label="Log level"
      inherited="Info"
      source="the organization"
    >
      {#snippet control()}
        <SegmentedControl label="Log level" options={levels} bind:value={level} />
      {/snippet}
    </InheritControl>
  </Specimen>
  <Specimen label="Disabled" code="disabled">
    <div class="locked">
      <InheritControl label="Retention" inherited="30 days" source="the organization" disabled>
        {#snippet control()}
          <DurationInput label="Retention" value={2_592_000} />
        {/snippet}
      </InheritControl>
      <p class="reason">Only an owner can override the retention</p>
    </div>
  </Specimen>
</Example>

<Example
  title="Unknown values"
  note="A loading, failed or empty inherited value is said in words, and Override still works"
>
  <Specimen label="Loading" code="loading">
    <InheritControl label="Retention" inherited="" source="the organization" loading>
      {#snippet control()}
        <DurationInput label="Retention" value={2_592_000} />
      {/snippet}
    </InheritControl>
  </Specimen>
  <Specimen label="Failed" code="error">
    <InheritControl
      label="Retention"
      inherited=""
      source="the organization"
      error="The organization's value could not load"
    >
      {#snippet control()}
        <DurationInput label="Retention" value={2_592_000} />
      {/snippet}
    </InheritControl>
  </Specimen>
  <Specimen label="Nothing set" code={'inherited=""'}>
    <InheritControl label="Retention" inherited="" source="the organization">
      {#snippet control()}
        <DurationInput label="Retention" value={2_592_000} />
      {/snippet}
    </InheritControl>
  </Specimen>
</Example>

<Example
  title="In setting rows"
  note="A row is unsaved only while it differs from what is stored, so picking Debug again clears the log level's mark"
  layout="stack"
  ground="canvas"
>
  <Card title="Runtime" level={4}>
    <SettingList>
      <SettingRow
        name="Session lifetime"
        why="How long a sign-in lasts before it is asked for again"
        unsaved={lifetimeUnsaved}
      >
        {#snippet control({ id })}
          <InheritControl
            bind:overridden={lifetimeOverridden}
            {id}
            label="Session lifetime"
            inherited="1 hour"
            source="the workspace"
          >
            {#snippet control()}
              <DurationInput {id} label="Session lifetime" bind:value={lifetime} min={60} />
            {/snippet}
          </InheritControl>
        {/snippet}
      </SettingRow>
      <SettingRow
        name="Log level"
        why="The least serious event the service writes down"
        unsaved={levelUnsaved}
      >
        {#snippet control({ id, labelledby })}
          <InheritControl
            bind:overridden={levelOverridden}
            {id}
            label="Log level"
            inherited="Info"
            source="the organization"
          >
            {#snippet control()}
              <SegmentedControl
                label="Log level"
                aria-labelledby={labelledby}
                options={levels}
                bind:value={level}
              />
            {/snippet}
          </InheritControl>
        {/snippet}
      </SettingRow>
    </SettingList>
  </Card>
</Example>

<Example
  title="Narrow width"
  note="A long source wraps beside its marker and Override stays in view"
  layout="stack"
>
  <Specimen label="Long source">
    <div class="narrow">
      <InheritControl
        label="Retention"
        inherited="30 days"
        source="the retention policy of the whole organization"
      >
        {#snippet control()}
          <DurationInput label="Retention" value={2_592_000} />
        {/snippet}
      </InheritControl>
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

  .narrow {
    inline-size: min(100%, 16rem);
    max-inline-size: 100%;
  }
</style>
