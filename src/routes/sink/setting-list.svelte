<script module lang="ts">
  export const section = {
    title: 'Setting List',
    lead: 'The settings of one section, each a row with its name, a why line and its controls. A short form stacks Fields instead.',
    components: ['SettingList', 'SettingRow']
  };
</script>

<script lang="ts">
  import {
    Checkbox,
    DurationInput,
    PatternEntries,
    Section,
    SegmentedControl,
    SettingList,
    SettingRow,
    Switch,
    Textarea,
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
    ignore: ['vendor/**'],
    footer: 'Formatted by smyklot'
  };

  // Two neighbours start changed, so the sink always shows adjacent unsaved rows.
  let retry = $state(true);
  let level = $state<string | null>('debug');
  let prefix = $state(saved.prefix);
  let session = $state(saved.session);
  let ignore = $state([...saved.ignore]);
  let footer = $state(saved.footer);
  const ignoreChanged = $derived(JSON.stringify(ignore) !== JSON.stringify(saved.ignore));

  // A reset hands back a way to put the change back, so the row can offer Undo.
  function resetter<T>(read: () => T, write: (value: T) => void, start: T) {
    return () => {
      const was = read();
      write(start);
      return () => write(was);
    };
  }

  // The narrow example shows the same three rows, so both share their resets.
  const clearRetry = $derived(
    retry !== saved.retry
      ? resetter(
          () => retry,
          (value) => (retry = value),
          saved.retry
        )
      : undefined
  );
  const clearLevel = $derived(
    level !== saved.level
      ? resetter(
          () => level,
          (value) => (level = value),
          saved.level
        )
      : undefined
  );
  const clearSession = $derived(
    session !== saved.session
      ? resetter(
          () => session,
          (value) => (session = value),
          saved.session
        )
      : undefined
  );

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
  title="In a Section"
  --example-max="54rem"
  note="A checkbox, a segmented control, a field, a duration, a list and a read-only fact, with a 5 px strip between the changed rows"
  layout="stack"
  ground="canvas"
>
  <Section title="Runtime" level={4}>
    <SettingList>
      <SettingRow
        name="Retry failed checks"
        why="Runs a failed check once more before reporting it"
        unsaved={retry !== saved.retry}
        onclear={clearRetry}
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
        onclear={clearLevel}
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
        onclear={clearSession}
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
            addLabel="Add a Path Pattern"
            aria-labelledby={labelledby}
          />
        {/snippet}
      </SettingRow>
      <SettingRow
        name="Commit footer"
        why="Closes every commit the bot makes"
        unsaved={footer !== saved.footer}
        onclear={footer !== saved.footer
          ? resetter(
              () => footer,
              (value) => (footer = value),
              saved.footer
            )
          : undefined}
        resettable
        stacked
      >
        {#snippet control({ id, describedby })}
          <Textarea {id} aria-describedby={describedby} rows={2} bind:value={footer} />
        {/snippet}
      </SettingRow>
      <SettingRow name="Merge method" readonly reason="Set by the organization and read only here">
        {#snippet control()}
          <span class="fact">Squash</span>
        {/snippet}
      </SettingRow>
    </SettingList>
  </Section>
</Example>

<Example
  title="States"
  --example-max="54rem"
  note="A change that takes effect at once says it is saving and why it was refused, and a locked row says why"
  layout="stack"
  ground="canvas"
>
  <Section title="Delivery" level={4}>
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
        name="Sign each payload"
        why="Adds a signature header that a receiver can check"
        pending
      >
        {#snippet control({ id, describedby })}
          <Switch {id} aria-describedby={describedby} bare checked pending />
        {/snippet}
      </SettingRow>
      <SettingRow
        name="Compress payloads"
        why="Sends each event gzipped when the receiver accepts it"
        error="The receiver at hooks.example.com does not accept gzip"
      >
        {#snippet control({ id, describedby, invalid })}
          <Switch {id} aria-describedby={describedby} bare {invalid} />
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
  </Section>
</Example>

<div class="wide-last">
  <Example
    title="List States"
    --example-max="54rem"
    --specimen-min="20rem"
    note="While the settings load, when they fail and when there is nothing to set, the list says so in the rows’ place"
    layout="grid"
    ground="canvas"
  >
    <Specimen label="Loading">
      <Section title="Webhooks" level={4}><SettingList loading /></Section>
    </Specimen>
    <Specimen label="Failed">
      <Section title="Webhooks" level={4}>
        <SettingList error="The server did not answer in time" onretry={() => {}} />
      </Section>
    </Specimen>
    <Specimen label="Nothing to set">
      <Section title="Webhooks" level={4}><SettingList empty /></Section>
    </Specimen>
  </Example>
</div>

<div class="fill">
  <Example
    title="Narrow Width"
    note="Below a readable copy width the controls take the next line under the copy, with their reset beside them"
    layout="stack"
    ground="canvas"
    --example-max="calc(21.4375rem + 2 * var(--sui-space-6))"
  >
    <div class="narrow">
      <Section title="Runtime" level={4}>
        <SettingList>
          <SettingRow
            name="Retry failed checks"
            why="Runs a failed check once more before reporting it"
            unsaved={retry !== saved.retry}
            onclear={clearRetry}
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
            onclear={clearLevel}
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
            name="Session lifetime"
            why="How long a sign-in lasts before it is asked for again"
            unsaved={session !== saved.session}
            onclear={clearSession}
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
        </SettingList>
      </Section>
    </div>
  </Example>
</div>

<style>
  .prefix {
    display: grid;
    inline-size: 8rem;
  }

  /* The snap's spare pixel goes above the words, as it does above a row's name, so the words
     end on the list's foot, where the section's rhythm measures from, when the fact closes it. */
  .fact {
    align-content: end;
    block-size: var(--sui-block-snap-even);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-flat)
      var(--sui-sans);
    padding-block-start: var(--sui-block-snap-spare-even);
    text-box: trim-both cap alphabetic;
  }

  /* Two states share a line at a list's readable width, and the third takes the next line
     whole rather than leaving a hole beside it. */
  .wide-last :global(.specimen:last-child) {
    grid-column: 1 / -1;
  }

  .narrow {
    inline-size: min(100%, 21.4375rem);
    max-inline-size: 100%;
  }

  /* On a wide page the list keeps a 375px phone's column, as the narrow examples of the other
     editors do, with the stage's 24px pad. A phone's own column is already under the row's 25rem
     break, so there the frame and the list fill it, as every other frame does (L-55), and leave
     no empty band beside the rows. */
  @media (max-width: 47.9375rem) {
    .fill :global(.example) {
      --example-max: none;
    }

    .narrow {
      inline-size: 100%;
    }
  }
</style>
