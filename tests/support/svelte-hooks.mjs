import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { compile } from 'svelte/compiler';

// Resolve Svelte's client runtime instead of its server build so components can mount.
export async function resolve(specifier, context, nextResolve) {
  return nextResolve(specifier, { ...context, conditions: ['browser', ...context.conditions] });
}

export async function load(url, context, nextLoad) {
  if (!url.endsWith('.svelte')) return nextLoad(url, context);

  const filename = fileURLToPath(url);
  const { js } = compile(await readFile(filename, 'utf8'), { filename, generate: 'client' });
  return { format: 'module', source: js.code, shortCircuit: true };
}
