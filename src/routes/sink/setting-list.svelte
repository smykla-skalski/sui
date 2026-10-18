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
    Switch,
    TextInput
  } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

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
  const ignoreChanged = $derived(JSON.stringify(ignore) !== JSON.stringify(saved.ignore));

  // A reset hands back a way to put the change back, so the row can offer Undo.
  function resetter<T>(read: () => T, write: (value: T) => void, start: T) {
    return () => {
      const was = read();
      write(start);
      return () => write(was);
    };
  }

  let mirror = $state(true);
  let mirrorPending = $state(false);
  let mirrorError = $state<string | null>(null);

  // The service takes a moment and refuses to turn mirroring off, so both states show. A flip
  // while one is on its way is ignored rather than disabling the focused switch.
  function flipMirror(next: boolean) {
    if (mirrorPending) return;
    mirror = next;
    mirrorError = null;
    mirrorPending = true;
    setTimeout(() => {
      mirrorPending = false;
      if (!next) {
        mirror = true;
        mirrorError = 'Mirroring stays on while a release is open';
      }
    }, 1200);
  }
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
        onclear={retry !== saved.retry
          ? resetter(
              () => retry,
              (value) => (retry = value),
              saved.retry
            )
          : undefined}
        resettable
      >
        {#snippet control({ id, describedby })}
          <Checkbox {id} aria-describedby={describedby} bare bind:checked={retry} />
        {/snippet}
      </SettingRow>
      <SettingRow
        name="Log level"
        why="The least serious event the service writes down"
        unsaved={level !== saved.level}
        onclear={level !== saved.level
          ? resetter(
              () => level,
              (value) => (level = value),
              saved.level
            )
          : undefined}
        resettable
      >
        {#snippet control({ labelledby, describedby })}
          <SegmentedControl
            label="Log level"
            aria-labelledby={labelledby}
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
        onclear={prefix !== saved.prefix
          ? resetter(
              () => prefix,
              (value) => (prefix = value),
              saved.prefix
            )
          : undefined}
        resettable
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
        onclear={session !== saved.session
          ? resetter(
              () => session,
              (value) => (session = value),
              saved.session
            )
          : undefined}
        resettable
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
        unsaved={ignoreChanged}
        onclear={ignoreChanged
          ? resetter(
              () => ignore,
              (value) => (ignore = value),
              [...saved.ignore]
            )
          : undefined}
        resettable
        stacked
      >
        {#snippet control({ labelledby })}
          <PatternEntries
            bind:value={ignore}
            addLabel="Add a path pattern"
            aria-labelledby={labelledby}
          />
        {/snippet}
      </SettingRow>
      <SettingRow name="Merge method" readonly reason="Set by the organization and read only here">
        {#snippet control()}
          <span class="fact">Squash</span>
        {/snippet}
      </SettingRow>
    </SettingList>
  </Card>
</Example>

<Example
  title="States"
  note="A change that takes effect at once says it is saving and why it was refused, and a locked row says why"
  layout="stack"
  ground="canvas"
>
  <Card title="Delivery" level={4}>
    <SettingList>
      <SettingRow
        name="Mirror to the backup region"
        why="Copies every event to a second region as it arrives"
        pending={mirrorPending}
        error={mirrorError}
      >
        {#snippet control({ id, describedby, invalid })}
          <Switch
            {id}
            aria-describedby={describedby}
            bare
            {invalid}
            bind:checked={() => mirror, flipMirror}
          />
        {/snippet}
      </SettingRow>
      <SettingRow
        name="Retry failed checks"
        why="Runs a failed check once more before reporting it"
        disabled
        reason="Locked until the save finishes"
      >
        {#snippet control({ id, describedby, disabled })}
          <Checkbox {id} aria-describedby={describedby} bare checked {disabled} />
        {/snippet}
      </SettingRow>
    </SettingList>
  </Card>
</Example>

<Example
  title="List states"
  note="While the settings load, when they fail and when there is nothing to set, the list says so in the rows' place"
  layout="grid"
  ground="canvas"
>
  <Specimen label="Loading" code="loading">
    <Card title="Webhooks" level={4}><SettingList loading /></Card>
  </Specimen>
  <Specimen label="Failed" code="error onretry">
    <Card title="Webhooks" level={4}>
      <SettingList error="The server did not answer in time" onretry={() => {}} />
    </Card>
  </Specimen>
  <Specimen label="Nothing to set" code="empty">
    <Card title="Webhooks" level={4}><SettingList empty /></Card>
  </Specimen>
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
          {#snippet control({ labelledby, describedby })}
            <SegmentedControl
              label="Log level"
              aria-labelledby={labelledby}
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

  /* The snap's spare pixel goes above the words, as it does above a row's name, so the words
     end one inset above the card's foot when the fact closes it. */
  .fact {
    align-content: end;
    block-size: var(--sui-block-snap-even);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-flat)
      var(--sui-sans);
    text-box: trim-both cap alphabetic;
  }

  .narrow {
    inline-size: min(100%, 16rem);
    max-inline-size: 100%;
  }
</style>
