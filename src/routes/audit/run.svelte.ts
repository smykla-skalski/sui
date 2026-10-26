import type { Finding } from './audit.js';
import { settledAudit } from './expose.js';

/**
 * The page's law audit as the reader runs it. A run measures the whole page, which takes seconds,
 * and any result goes stale with the next edit, so it runs only when asked and is never kept.
 */
export class AuditRun {
  findings = $state<Finding[] | null>(null);
  running = $state(false);
  #runs = 0;

  async measure() {
    // Only the newest run reports.
    const run = ++this.#runs;
    this.running = true;
    const result = await settledAudit(() => run !== this.#runs);
    if (!result) return;
    this.findings = result;
    this.running = false;
  }
}
