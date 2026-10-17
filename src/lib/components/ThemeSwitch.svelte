<script module lang="ts">
  export type ThemeChoice = 'light' | 'dark' | 'system';

  const STORAGE_KEY = 'sui:theme';
  const choices: ReadonlyArray<string> = ['light', 'dark', 'system'];

  function stored(): ThemeChoice | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved && choices.includes(saved) ? (saved as ThemeChoice) : null;
    } catch {
      return null;
    }
  }

  /** One choice per page, so every switch on it shows the same thing. */
  const shared = $state<{ choice: ThemeChoice | null }>({ choice: null });

  const isChoice = (value: unknown): value is ThemeChoice =>
    typeof value === 'string' && choices.includes(value);

  function store(choice: string) {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // A private window or blocked storage still switches the theme for this visit.
    }
  }
</script>

<script lang="ts">
  import type { HTMLFieldsetAttributes } from 'svelte/elements';
  import SegmentedControl, { type SegmentOption } from './SegmentedControl.svelte';

  let {
    value = $bindable('system'),
    name,
    system = true,
    label = 'Theme',
    hideLabel = true,
    lightLabel = 'Light',
    darkLabel = 'Dark',
    systemLabel = 'System',
    onchange,
    class: className = ''
  }: {
    /** The choice shown before a stored one is read. A stored choice wins. */
    value?: ThemeChoice;
    /**
     * Offers System as a third choice. Without it the switch shows the system's theme
     * until the reader picks one, and follows the system until then.
     */
    system?: boolean;
    /** The radio group's name, unique on the page. Two switches under one name are one group. */
    name?: string;
    /** Names the group. Its options already say what they are, so it is spoken, not drawn. */
    label?: string;
    /** Set false to draw `label` above the options. */
    hideLabel?: boolean;
    lightLabel?: string;
    darkLabel?: string;
    systemLabel?: string;
    /** Hears each choice the reader makes, once per change of choice. */
    onchange?: (choice: ThemeChoice) => void;
    class?: HTMLFieldsetAttributes['class'];
  } = $props();

  const options: SegmentOption[] = $derived([
    { value: 'light', label: lightLabel, icon: 'sun' },
    { value: 'dark', label: darkLabel, icon: 'moon' },
    ...(system ? [{ value: 'system', label: systemLabel, icon: 'system' } as const] : [])
  ]);

  let reported: ThemeChoice | null = null;

  // A press on the option already shown is a choice too: in a two-way switch that follows a
  // dark system, Dark is shown before anything is chosen, and pressing it must keep it dark.
  function pick(event: Event): void {
    const field = event.target;
    if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) return;
    const choice = field.value;
    if (!isChoice(choice)) return;
    shared.choice = choice;
    store(choice);
    if (reported === choice) return;
    reported = choice;
    onchange?.(choice);
  }

  // The system's own theme, which a two-way switch shows while nothing is chosen.
  let systemDark = $state(false);
  $effect(() => {
    const query = matchMedia('(prefers-color-scheme: dark)');
    const read = () => (systemDark = query.matches);
    read();
    query.addEventListener('change', read);
    return () => query.removeEventListener('change', read);
  });

  const shown = $derived(!system && value === 'system' ? (systemDark ? 'dark' : 'light') : value);

  $effect(() => {
    shared.choice ??= stored() ?? value;
  });

  $effect(() => {
    if (shared.choice) value = shared.choice;
  });

  $effect(() => {
    const choice = shared.choice;
    if (!choice) return;
    const root = document.documentElement;
    const query = matchMedia('(prefers-color-scheme: dark)');
    const wanted = () => (choice === 'system' ? (query.matches ? 'dark' : 'light') : choice);
    const apply = () => {
      if (root.dataset.suiTheme !== wanted()) root.dataset.suiTheme = wanted();
    };
    apply();
    // A theme set on the root from elsewhere is an explicit choice, so the switch shows it
    // instead of claiming a choice the page no longer wears.
    const observer = new MutationObserver(() => {
      const theme = root.dataset.suiTheme;
      if ((theme === 'light' || theme === 'dark') && theme !== wanted()) shared.choice = theme;
    });
    observer.observe(root, { attributeFilter: ['data-sui-theme'] });
    query.addEventListener('change', apply);
    return () => {
      observer.disconnect();
      query.removeEventListener('change', apply);
    };
  });
</script>

<!--
@component
Light, dark or follow the system, all three visible at once, or a select with the same three
when the room is too narrow, as every `SegmentedControl` does. Without `system` it offers light
and dark only, and shows the system's theme, following it live, until the reader picks one;
pressing the option already shown keeps it as the choice. It owns the page's theme: it sets
`data-sui-theme` on the root element, keeps the choice in local storage under `sui:theme`, and
reads it back on the next visit.

Every switch on a page shares one choice, and a theme set on the root from elsewhere shows as
that explicit choice. A page that renders on the server paints its default theme until this
mounts, so set the stored theme from a small script in the document head to avoid a flash.

- Semantics: a `SegmentedControl` of native radios named `label`, or its fallback `select`.
- Content: two or three options, each a sun, moon or system glyph beside its word.
- States: those of `SegmentedControl`; the thumb marks the theme the page wears, which is the system's until a choice is made.
- Keyboard: Tab reaches the group and the arrow keys choose, as in any radio group; Space on the shown option makes it the choice.
- Pointer and touch: a press or a thumb drag chooses; on a phone or a coarse pointer each option is 44 by 44px.
- Focus: stays on the option pressed, and moves to the select or back when the control changes form.
- Responsive: turns into a select when its three words do not fit.
- Accessibility: every option shows its word beside its glyph; `label` names the group for assistive technology.
- Localization: `label`, `lightLabel`, `darkLabel` and `systemLabel` are props with English defaults; the segments follow the reading direction.
- Performance: one media-query listener and one attribute observer per switch, on a page with one shared choice.
- Analytics: `onchange` hears each choice once, including a press that keeps the shown theme.
- Failure: with storage blocked, as in a private window, the theme still switches for this visit and is not remembered.
-->

<SegmentedControl
  bind:value={
    () => shown,
    (next) => {
      if (isChoice(next)) shared.choice = next;
    }
  }
  {name}
  {label}
  {hideLabel}
  {options}
  class={className}
  onclick={pick}
  onchange={pick}
/>
