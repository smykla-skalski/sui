export type Finding = {
  law: string;
  where: string;
  detail: string;
  element?: Element;
};

export type Check = (root: Document) => Finding[];

// Keyed by name so a hot reload of the checks replaces them instead of running both versions.
const checks = new Map<string, Check>();

/** How many checks the audit runs, for the panel's summary. */
export function checkCount(): number {
  return checks.size;
}

export function register(...more: Check[]): void {
  for (const check of more) checks.set(check.name, check);
}

/** A short CSS-ish path that a person can find in devtools. */
export function describe(element: Element): string {
  const parts: string[] = [];
  for (let node: Element | null = element; node && parts.length < 4; node = node.parentElement) {
    const own = [...node.classList].filter((name) => !name.startsWith('svelte-')).slice(0, 2);
    const id = node.id ? `#${node.id}` : '';
    parts.unshift(node.tagName.toLowerCase() + id + own.map((name) => `.${name}`).join(''));
    if (node.id) break;
  }
  return parts.join(' > ');
}

// A run judges a page at rest, so each element is asked once per run. Outside a run, a check
// still gives the page no turn until it returns, so the answers last as long as it does.
let seen: Map<Element, boolean> | undefined;
let running = false;
export function shown(element: Element): boolean {
  if (!seen) {
    seen = new Map();
    if (!running) queueMicrotask(() => (seen = undefined));
  }
  let answer = seen.get(element);
  if (answer === undefined) {
    answer =
      element.checkVisibility({ opacityProperty: false }) && element.getClientRects().length > 0;
    seen.set(element, answer);
  }
  return answer;
}

/**
 * Runs every check and gives the page a turn before each one, so a click or a hover never waits
 * on the whole audit. A run that `stale` says a newer one replaced stops and returns null.
 */
export async function runAudit(
  root: Document = document,
  stale: () => boolean = () => false
): Promise<Finding[] | null> {
  const found: Finding[] = [];
  // A long list skips what is off the screen, whose words then read as none, so the run judges
  // every part as it draws on the screen. A part keeps the height it last drew at afterwards.
  const drawn = root.createElement('style');
  drawn.textContent = '* { content-visibility: visible !important; }';
  root.head.append(drawn);
  running = true;
  seen = undefined;
  try {
    // A timer set from a timer waits at least 4ms, which a hundred checks add up to half a
    // second of; `scheduler.yield` hands the page the same turn without that wait.
    const turn = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
    for (const check of checks.values()) {
      await (turn?.yield?.() ?? new Promise((resolve) => setTimeout(resolve)));
      if (stale()) return null;
      try {
        found.push(...check(root));
      } catch (error) {
        found.push({ law: 'audit', where: check.name || 'check', detail: String(error) });
      }
    }
  } finally {
    running = false;
    seen = undefined;
    drawn.remove();
  }
  return found;
}
