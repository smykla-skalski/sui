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
    const saved = stored();
    if (saved) value = saved;
  });

  $effect(() => {
    const root = document.documentElement;
    if (value !== 'system') {
      root.dataset.suiTheme = value;
      return;
    }
    const query = matchMedia('(prefers-color-scheme: dark)');
    const follow = () => (root.dataset.suiTheme = query.matches ? 'dark' : 'light');
    follow();
    query.addEventListener('change', follow);
    return () => query.removeEventListener('change', follow);
  });
</script>

<!--
@component
Light, dark or follow the system, all three visible at once. It owns the page's theme: it
sets `data-sui-theme` on the root element, keeps the choice in local storage under
`sui:theme`, and reads it back on the next visit. System follows the operating system live,
so a reader who switches the system to dark sees the page follow without a reload.

Use one per page. A page that renders on the server paints its default theme until this
mounts, so set the stored theme from a small script in the document head to avoid a flash.
-->

<SegmentedControl
  bind:value={
    () => value,
    (next) => {
      if (next === 'light' || next === 'dark' || next === 'system') value = next;
    }
  }
  {name}
  label="Theme"
  {options}
  class={className}
  onchange={(event) => store((event.target as HTMLInputElement).value)}
/>
