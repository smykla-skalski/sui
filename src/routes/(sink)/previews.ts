// Every preview shares one host, main at the root and each pull request under /pr-<number>,
// and the deploy lists the pull requests that have one in /previews.json.

export type Preview = { number: number; title: string };

/** The preview a path is in: `/pr-<number>`, or '' for main at the root. */
export const previewOf = (pathname: string) => /^\/pr-\d+(?=\/|$)/.exec(pathname)?.[0] ?? '';

/** The picker's choices, main and then the pull requests newest first, or none while no pull request has a preview. */
export function previewOptions(previews: readonly Preview[]) {
  if (!previews.length) return [];
  return [
    { value: '', label: 'main' },
    ...previews
      .toSorted((a, b) => b.number - a.number)
      .map(({ number, title }) => ({ value: `/pr-${number}`, label: `#${number} ${title}` }))
  ];
}

/** The page at `at` in the preview `target`, with its query and section. */
export function previewUrl(target: string, at: Pick<Location, 'pathname' | 'search' | 'hash'>) {
  return target + at.pathname.slice(previewOf(at.pathname).length) + at.search + at.hash;
}
