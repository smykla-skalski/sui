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
    class: className = ''
  }: {
    /** The choice shown before a stored one is read. A stored choice wins. */
    value?: ThemeChoice;
    /** The radio group's name, unique on the page. Two switches under one name are one group. */
    name?: string;
    class?: HTMLFieldsetAttributes['class'];
  } = $props();

  const options: SegmentOption[] = [
    { value: 'light', label: 'Light', icon: 'sun' },
    { value: 'dark', label: 'Dark', icon: 'moon' },
    { value: 'system', label: 'System', icon: 'system' }
  ];

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
Light, dark or follow the system, all three visible at once. It owns the page's theme: it
sets `data-sui-theme` on the root element, keeps the choice in local storage under
`sui:theme`, and reads it back on the next visit. System follows the operating system live,
so a reader who switches the system to dark sees the page follow without a reload.

Every switch on a page shares one choice, and a theme set on the root from elsewhere shows as
that explicit choice. A page that renders on the server paints its default theme until this
mounts, so set the stored theme from a small script in the document head to avoid a flash.
-->

<SegmentedControl
  bind:value={
    () => value,
    (next) => {
      if (isChoice(next)) shared.choice = next;
    }
  }
  {name}
  label="Theme"
  {options}
  class={className}
  onchange={(event) => store((event.target as HTMLInputElement).value)}
/>
