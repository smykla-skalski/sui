<script lang="ts">
  import { Link, SegmentedControl, type SegmentOption } from '#lib';

  type Width = 'phone' | 'tablet' | 'desktop';

  let {
    href,
    source,
    title,
    width = 'desktop'
  }: {
    /** The layout page's own address, as `resolve` gives it. */
    href: string;
    /** The page's file, from the repository root. */
    source: string;
    /** Names the frame for a screen reader. */
    title: string;
    /** The window the frame starts as. */
    width?: Width;
  } = $props();

  const REPOSITORY = 'https://github.com/smykla-skalski/sui/blob/main/';

  /** A real window's width in CSS pixels, so the page meets the breakpoints that window would. */
  const WINDOWS: Record<Width, number> = { phone: 375, tablet: 768, desktop: 1440 };
  const BORDER = 2;

  const widths: SegmentOption[] = [
    { value: 'phone', label: 'Phone' },
    { value: 'tablet', label: 'Tablet' },
    { value: 'desktop', label: 'Desktop' }
  ];

  // svelte-ignore state_referenced_locally
  let chosen = $state<string | null>(width);
  let frame = $state<HTMLIFrameElement | null>(null);
  let room = $state(0);

  const viewport = $derived(WINDOWS[(chosen ?? width) as Width]);
  // A stage narrower than the window shows the whole page scaled down, never a cut of it.
  const scale = $derived(Math.min(1, (room - BORDER) / viewport));

  /** The page in the frame wears the theme the sink wears, as it would in its own tab. */
  function mirror() {
    const root = frame?.contentDocument?.documentElement;
    if (!root) return;
    const theme = document.documentElement.dataset.suiTheme;
    if (theme) root.dataset.suiTheme = theme;
    else delete root.dataset.suiTheme;
  }

  $effect(() => {
    const observer = new MutationObserver(mirror);
    observer.observe(document.documentElement, { attributeFilter: ['data-sui-theme'] });
    return () => observer.disconnect();
  });
</script>

<!--
A layout page in a frame of its own: a whole document, with its own viewport, landmarks and
top layer, so the shell answers to the frame's width as it would to a window's, and its drawer
and bars stay inside it. The kitchen sink never draws a shell inline.
-->

<div class="preview">
  <div class="tools">
    <SegmentedControl label="Preview width" hideLabel options={widths} bind:value={chosen} />
    <span class="links">
      <Link {href} standalone>Open full page</Link>
      <Link href={REPOSITORY + source} standalone>Source</Link>
    </span>
  </div>
  <div class="room" bind:clientWidth={room}>
    <!-- Until the stage is measured, as in the server render, the frame fills it unscaled. -->
    <div class="screen" style:inline-size={room ? `${viewport * scale + BORDER}px` : undefined}>
      <iframe
        bind:this={frame}
        class="frame"
        src={href}
        {title}
        loading="lazy"
        onload={mirror}
        style:inline-size={room ? `${viewport}px` : undefined}
        style:block-size={room ? `calc(100% / ${scale})` : undefined}
        style:scale={room ? scale : undefined}
      ></iframe>
    </div>
  </div>
</div>

<style>
  .preview {
    display: grid;
    gap: var(--sui-space-3);
    min-inline-size: 0;
  }

  .tools {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-3) var(--sui-space-4);
    justify-content: space-between;
  }

  .links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-4);
  }

  .room {
    display: grid;
    justify-items: center;
    min-inline-size: 0;
  }

  .screen {
    background: var(--sui-canvas);
    block-size: 36rem;
    border: var(--sui-stroke) solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-surface);
    box-sizing: border-box;
    inline-size: 100%;
    overflow: hidden;
  }

  .frame {
    block-size: 100%;
    border: 0;
    display: block;
    inline-size: 100%;
    transform-origin: 0 0;
  }
</style>
