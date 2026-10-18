import { serveSink } from './sink.mjs';

/** @type {{ close: () => Promise<void> } | undefined} */
let server;

/** One sink for every browser test file, so each file starts only its own browser. */
export async function globalSetup() {
  const sink = await serveSink();
  server = sink.server;
  process.env.SUI_SINK_URL = sink.url;
}

export async function globalTeardown() {
  await server?.close();
}
