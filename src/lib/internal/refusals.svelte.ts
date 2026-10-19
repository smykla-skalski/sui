import { getContext, setContext, tick } from 'svelte';
import type { Attachment } from 'svelte/attachments';

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** The first control of a form that its own constraints refuse, in the order the form lists them. */
function firstRefused(form: HTMLFormElement): Element | undefined {
  return [...form.elements].find(
    (element) => (element as Control).willValidate && !(element as Control).validity.valid
  );
}

/**
 * What the browser's own constraint check refused under one error line: a field's, a group's or
 * a self-labelled control's. The browser's bubble takes no style, so each refusal is cancelled
 * and its words, which the browser writes in the reader's language, show in the error line
 * instead. Validation itself stays native: `required`, `pattern`, `min` and `setCustomValidity()`
 * decide, and a refused send still never reaches `onsubmit`.
 */
export class Refusals {
  #refused = $state.raw<readonly (readonly [Control, string])[]>([]);
  #area: HTMLElement | null = null;

  /**
   * The words under the control: the caller's `error` always, else, while the browser refuses
   * the value, the caller's own words for that or the browser's.
   */
  message(error?: string, own?: string): string | undefined {
    if (error) return error;
    const refused = this.#refused[0]?.[1];
    return refused ? (own ?? refused) : undefined;
  }

  /** True while the browser refuses this control's value, so the control marks itself invalid. */
  refuses(control: Element | null | undefined): boolean {
    return this.#refused.some(([each]) => each === control);
  }

  /** On the element that holds the label, the control and the error line, so all of it scrolls into view. */
  readonly area: Attachment<HTMLElement> = (node) => {
    this.#area = node;
    return () => {
      this.#area = null;
    };
  };

  /** On each native control whose refusals this error line says. */
  readonly watch: Attachment<Control> = (control) => {
    const refuse = (event: Event) => this.#refuse(control, event);
    // A fix lifts the error at once, and a value still wrong when the reader commits it gets its
    // new reason then, never mid-typing. Read before the next frame rather than in a microtask,
    // which a trusted event runs between its listeners, so every handler of the event and the
    // update it caused have run and a constraint set with `setCustomValidity()` has caught up.
    const review = (event: Event) =>
      requestAnimationFrame(() => this.#review(event.type === 'change'));
    const reset = () => (this.#refused = []);
    const form = control.form;
    control.addEventListener('invalid', refuse);
    control.addEventListener('input', review);
    control.addEventListener('change', review);
    form?.addEventListener('reset', reset);
    return () => {
      control.removeEventListener('invalid', refuse);
      control.removeEventListener('input', review);
      control.removeEventListener('change', review);
      form?.removeEventListener('reset', reset);
      this.#refused = this.#refused.filter(([each]) => each !== control);
    };
  };

  #refuse(control: Control, event: Event): void {
    event.preventDefault();
    const words = control.validationMessage;
    const at = this.#refused.findIndex(([each]) => each === control);
    this.#refused =
      at < 0 ? [...this.#refused, [control, words]] : this.#refused.with(at, [control, words]);
    // Cancelling the bubble also cancels the browser's move to the first refused control, so a
    // refused send makes that move here, and brings the label and the error line into view too.
    if (!control.form || firstRefused(control.form) !== control) return;
    control.focus({ preventScroll: true, focusVisible: true });
    const area = this.#area ?? control;
    void tick().then(() => area.scrollIntoView({ block: 'nearest' }));
  }

  #review(commit: boolean): void {
    if (this.#refused.length === 0) return;
    this.#refused = this.#refused
      .filter(([control]) => !control.validity.valid)
      .map(([control, words]) => [control, commit ? control.validationMessage : words] as const);
  }
}

const key = Symbol('sui-refusals');

/** Makes this component the error line that the native controls inside it report to. */
export function setRefusals(): Refusals {
  return setContext(key, new Refusals());
}

/** The nearest error line around a control, or nothing when no field holds it. */
export function getRefusals(): Refusals | undefined {
  return getContext<Refusals | undefined>(key);
}
