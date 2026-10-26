import { error } from '@sveltejs/kit';
import { sections } from '../../kit/sections';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => sections.map(({ id }) => ({ id }));

export const load: PageLoad = ({ params }) => {
  const section = sections.find(({ id }) => id === params.id);
  if (!section) error(404, 'No component of that name');
  return { section };
};
