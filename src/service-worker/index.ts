import { dev, version } from '$app/env';
import { assets, immutable, prerendered } from '$app/manifest';
import { self } from '$app/service-worker';
import { serve } from '#lib/service-worker/index.ts';

serve(self, {
  dev,
  version,
  immutable,
  assets,
  prerendered,
  // The previews of open pull requests live under the main deployment, each its own app.
  never: [/^pr-\d+\//]
});
