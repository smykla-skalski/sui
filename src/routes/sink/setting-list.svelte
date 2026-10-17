<script module lang="ts">
  export const section = {
    title: 'Setting list',
    order: 108,
    lead: 'The settings of one card, each a row with its name, a why line and its controls. A short form stacks Fields instead.',
    components: ['SettingList', 'SettingRow']
  };
</script>

<script lang="ts">
  import {
    Card,
    Checkbox,
    DurationInput,
    PatternEntries,
    SegmentedControl,
    SettingList,
    SettingRow,
    TextInput
  } from '#lib';
  import Example from '../kit/Example.svelte';

  const levels = [
    { value: 'debug', label: 'Debug' },
    { value: 'info', label: 'Info' },
    { value: 'warn', label: 'Warnings' },
    { value: 'error', label: 'Errors' }
  ];

  const saved = {
    retry: false,
    level: 'info',
    prefix: '/bot',
    session: 3600,
    ignore: ['vendor/**']
  };

  // Two neighbours start changed, so the sink always shows adjacent unsaved rows.
  let retry = $state(true);
  let level = $state<string | null>('debug');
  let prefix = $state(saved.prefix);
  let session = $state(saved.session);
  let ignore = $state([...saved.ignore]);
</script>

<Example
  title="In a card"
  note="A checkbox, a segmented control, a field, a duration, a list and a read-only fact, with the two changed rows 1px apart"
  layout="stack"
  ground="canvas"
>
  <Card title="Runtime" level={4}>
    <SettingList>
      <SettingRow
        name="Retry failed checks"
        why="Runs a failed check once more before reporting it"
        unsaved={retry !== saved.retry}
        onclear={retry !== saved.retry ? () => (retry = saved.retry) : undefined}
      >
        {#snippet control({ id, describedby })}
          <Checkbox {id} aria-describedby={describedby} bare bind:checked={retry} />
        {/snippet}
      </SettingRow>
      <SettingRow
        name="Log level"
        why="The least serious event the service writes down"
        unsaved={level !== saved.level}
        onclear={level !== saved.level ? () => (level = saved.level) : undefined}
      >
        {#snippet control({ describedby })}
          <SegmentedControl
            label="Log level"
            aria-describedby={describedby}
            options={levels}
            bind:value={level}
          />
        {/snippet}
      </SettingRow>
      <SettingRow
        name="Command prefix"
        why="What a comment starts with to reach the bot"
        unsaved={prefix !== saved.prefix}
      >
        {#snippet control({ id, describedby })}
          <span class="prefix">
            <TextInput {id} aria-describedby={describedby} mono bind:value={prefix} />
          </span>
        {/snippet}
      </SettingRow>
      <SettingRow
        name="Session lifetime"
        why="How long a sign-in lasts before it is asked for again"
        unsaved={session !== saved.session}
      >
        {#snippet control({ id, describedby })}
          <DurationInput
            {id}
            aria-describedby={describedby}
            label="Session lifetime"
            bind:value={session}
            min={60}
          />
        {/snippet}
      </SettingRow>
      <SettingRow
        name="Paths the bot never formats, even when a rule in a parent workspace asks it to"
        why="Every file under these patterns is left exactly as it was committed, which keeps generated and vendored code untouched"
        unsaved={JSON.stringify(ignore) !== JSON.stringify(saved.ignore)}
      >
        {#snippet control()}
          <PatternEntries bind:value={ignore} addLabel="Add a path pattern" />
        {/snippet}
      </SettingRow>
      <SettingRow name="Merge method" why="Set by the organization and read only here">
        {#snippet control()}
          <span class="fact">Squash</span>
        {/snippet}
      </SettingRow>
    </SettingList>
  </Card>
</Example>

<Example
  title="Narrow width"
  note="Below a readable copy width the controls take the next line, and the checkbox stays beside its copy"
  layout="stack"
  ground="canvas"
>
  <div class="narrow">
    <Card title="Runtime" level={4}>
      <SettingList>
        <SettingRow
          name="Retry failed checks"
          why="Runs a failed check once more before reporting it"
          unsaved={retry !== saved.retry}
        >
          {#snippet control({ id, describedby })}
            <Checkbox {id} aria-describedby={describedby} bare bind:checked={retry} />
          {/snippet}
        </SettingRow>
        <SettingRow
          name="Log level"
          why="The least serious event the service writes down"
          unsaved={level !== saved.level}
        >
          {#snippet control({ describedby })}
            <SegmentedControl
              label="Log level"
              aria-describedby={describedby}
              options={levels}
              bind:value={level}
            />
          {/snippet}
        </SettingRow>
        <SettingRow
          name="Session lifetime"
          why="How long a sign-in lasts before it is asked for again"
          unsaved={session !== saved.session}
        >
          {#snippet control({ id, describedby })}
            <DurationInput
              {id}
              aria-describedby={describedby}
              label="Session lifetime"
              bind:value={session}
              min={60}
            />
          {/snippet}
        </SettingRow>
      </SettingList>
    </Card>
  </div>
</Example>

<style>
  .prefix {
    display: grid;
    inline-size: 8rem;
  }

  .fact {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-flat) var(--sui-sans);
    text-box: trim-both cap alphabetic;
  }

  .narrow {
    inline-size: min(100%, 16rem);
    max-inline-size: 100%;
  }
</style>
