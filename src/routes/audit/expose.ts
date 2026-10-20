import { tick } from 'svelte';
import { runAudit, type Finding } from './audit.js';
import { cutSides, ringReach } from './checks.js';

/**
 * Runs the audit once the page has come to rest: fonts loaded, a frame drawn and every
 * time-based animation ended. A scroll-driven one finishes only when the reader scrolls, so it is
 * left out. A run that `stale` says a newer one replaced returns null.
 */
export async function settledAudit(stale: () => boolean = () => false): Promise<Finding[] | null> {
  await tick();
  await document.fonts.ready;
  await new Promise(requestAnimationFrame);
  await Promise.allSettled(
    document
      .getAnimations()
      .filter(
        (animation) =>
          animation.timeline instanceof DocumentTimeline &&
          animation.effect?.getTiming().iterations !== Infinity
      )
      .map((animation) => animation.finished)
  );
  return runAudit(document, stale);
}

/**
 * Lets a browser test run the page's audit, and weigh each focus ring it tabs to with the ring
 * check's own measure.
 */
export function exposeAudit(run: () => Promise<Finding[] | null> = settledAudit): void {
  Object.assign(window, {
    __suiAudit: async () => {
      let result = await run();
      while (!result) result = await run();
      return result.map(({ law, where, detail }) => ({ law, where, detail }));
    },
    __suiRingCut: (element: Element, look: CSSStyleDeclaration) =>
      cutSides(element, ringReach(look))
  });
}
