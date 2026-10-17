export type Finding = {
  law: string;
  where: string;
  detail: string;
  element?: Element;
};

export type Check = (root: Document) => Finding[];

// Keyed by name so a hot reload of the checks replaces them instead of running both versions.
const checks = new Map<string, Check>();

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

export function shown(element: Element): boolean {
  return element.checkVisibility({ opacityProperty: false }) && element.getClientRects().length > 0;
}

export function runAudit(root: Document = document): Finding[] {
  return [...checks.values()].flatMap((check) => {
    try {
      return check(root);
    } catch (error) {
      return [{ law: 'audit', where: check.name || 'check', detail: String(error) }];
    }
  });
}
