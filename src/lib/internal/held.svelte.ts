import { getContext, setContext, tick, untrack } from 'svelte';

/**
 * How work that runs on a form holds the controls in it. `firm`, for a busy dialog or a pane
 * whose save bar is saving: the owner has moved focus to the busy action first, so the controls
 * are disabled, out of the tab order and out of reach of a press, as WCAG and the HTML `disabled`
 * state expect of a control that cannot be used. `soft`, for a setting row whose own change is
 * saving: the control the reader just changed holds focus, so the controls stay focusable and
 * refuse changes as a read-only or `aria-disabled` control does (L-89). Both dim as a busy button
 * does (L-40), and the work's own container says it is busy with `aria-busy`.
 */
export type Hold = 'firm' | 'soft';

const areas = $state<{ area: Element; firm: boolean }[]>([]);

/**
 * Holds every control in `area` until the returned function runs. It is called from an effect
 * or an attachment, which must not come to depend on the list it changes.
 */
export function hold(area: Element, firm = false): () => void {
  const entry = { area, firm };
  untrack(() => areas.push(entry));
  return () =>
    untrack(() => {
      const index = areas.findIndex((each) => each.area === area && each.firm === firm);
      if (index !== -1) areas.splice(index, 1);
    });
}

/**
 * How `node` is held, or null: by an area it stands in, or by the components around it that
 * `holdAround()` read. Read it in a `$derived` to follow the hold.
 */
export function held(node: Element | null | undefined, around?: () => Hold | null): Hold | null {
  let found = around?.() ?? null;
  if (found === 'firm' || node == null) return found;
  for (const { area, firm } of areas) {
    if (!area.contains(node)) continue;
    if (firm) return 'firm';
    found = 'soft';
  }
  return found;
}

const key = Symbol('sui-held');

/**
 * Lets the controls inside this component read its hold while they render, on the server too,
 * so an area that is busy when the page loads paints held from its first frame. An area found
 * in the page after mount, such as a save bar's pane, holds them only from then. A hold here is
 * soft: a firm one waits until `holdForWork` has moved focus to the busy action.
 */
export function provideHold(busy: () => boolean): void {
  const outer = holdAround();
  setContext(key, () => outer() ?? (busy() ? 'soft' : null));
}

/** The hold of the components around this one, for `held`. Call it while the component starts. */
export function holdAround(): () => Hold | null {
  return getContext<(() => Hold | null) | undefined>(key) ?? (() => null);
}

/**
 * Holds `area` while its work runs, from an effect or an attachment. A control inside it that
 * holds focus hands focus to the busy action first, which keeps it as a busy button does, so the
 * hold is firm and disabling the controls never drops focus to the page (L-89). With no busy
 * action the hold is soft. Once the work ends, focus goes back to the control it came from,
 * unless the reader has moved it on.
 */
export function holdForWork(
  area: HTMLElement,
  busyAction: () => HTMLElement | null | undefined
): () => void {
  let release: (() => void) | undefined;
  let action: HTMLElement | null | undefined;
  let from: HTMLElement | null = null;
  let ended = false;
  // A press on a disabled control would move focus off the busy action to whatever holds it,
  // the dialog or the page. A disabled control hears only the pointer's press, so refusing that
  // keeps focus put.
  const keep = (event: PointerEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    const control = target?.closest('label')?.control ?? target?.closest(':disabled');
    if (control?.matches(':disabled')) event.preventDefault();
  };
  // The busy action draws its state in the same update as the area, so it is found once that
  // update has landed.
  void tick().then(() => {
    if (ended) return;
    action = busyAction();
    const focused = document.activeElement;
    if (action && focused instanceof HTMLElement && area.contains(focused) && focused !== action) {
      from = focused;
      // Focus leaves a field the reader was typing in, so the move shows its ring.
      action.focus({ preventScroll: true, focusVisible: true });
    }
    release = hold(area, Boolean(action));
    if (action) area.addEventListener('pointerdown', keep, true);
  });
  return () => {
    ended = true;
    release?.();
    area.removeEventListener('pointerdown', keep, true);
    const back = from;
    if (back)
      void tick().then(() => {
        if (back.isConnected && document.activeElement === action)
          back.focus({ preventScroll: true, focusVisible: true });
      });
  };
}
