<script module lang="ts">
  export const section = {
    title: 'Service worker status',
    order: 105,
    lead: 'Offers a new version once it has installed, and says when the network stops answering. The page keeps its version until the reader reloads.',
    components: ['ServiceWorkerStatus']
  };
</script>

<script lang="ts">
  import {
    Button,
    ServiceWorkerStatus,
    registerServiceWorker,
    type ServiceWorkerContainerLike
  } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  type Listener = (event: { data: unknown }) => void;
  type Simulated = {
    state: string;
    postMessage(message: unknown): void;
    addEventListener(type: 'statechange', listener: () => void): void;
  };

  // A stand-in for `navigator.serviceWorker`, so the prompt shows without a deploy. It installs
  // a version when asked, lets it in when the page posts `skip-waiting`, and reports the network
  // the way the real worker does. Reloading starts the page again on the version let in.
  function simulate() {
    const changes: Listener[] = [];
    const messages: Listener[] = [];
    const found: (() => void)[] = [];
    const quiet = { state: 'activated', postMessage() {}, addEventListener() {} };
    const registration = {
      active: quiet as Simulated,
      waiting: null as Simulated | null,
      installing: null as Simulated | null,
      update: async () => {},
      unregister: async () => true,
      addEventListener: (_type: 'updatefound', listener: () => void) => void found.push(listener)
    };
    const container: ServiceWorkerContainerLike = {
      controller: quiet,
      register: async () => registration,
      getRegistration: async () => registration,
      addEventListener: (type: string, listener: Listener) =>
        void (type === 'message' ? messages : changes).push(listener)
    };

    function deploy(): void {
      const settled: (() => void)[] = [];
      const next: Simulated = {
        state: 'installing',
        addEventListener: (_type, listener) => void settled.push(listener),
        postMessage(message) {
          if ((message as { type?: unknown }).type !== 'skip-waiting') return;
          registration.waiting = null;
          registration.active = next;
          next.state = 'activated';
          for (const listener of changes) listener({ data: null });
        }
      };
      registration.installing = next;
      for (const listener of found) listener();
      registration.installing = null;
      registration.waiting = next;
      next.state = 'installed';
      for (const listener of settled) listener();
    }

    // A report arrives as a message does, after the page has finished registering.
    const network = (online: boolean) =>
      setTimeout(() => {
        for (const listener of messages) listener({ data: { type: 'network', online } });
      });
    return { container, deploy, network };
  }

  let version = $state(1);
  let online = $state(true);
  // The stand-in starts with the reader's first press, so until then the page's own bar is the
  // only one, and a device that really goes offline says so once.
  let page = $state<ReturnType<typeof start> | null>(null);

  function start() {
    const simulated = simulate();
    const worker = registerServiceWorker('service-worker.js', {
      container: simulated.container,
      reload: () => {
        version += 1;
        online = true;
        page = start();
      }
    });
    return { ...simulated, worker };
  }

  function deploy(): void {
    page ??= start();
    page.deploy();
  }

  function toggleNetwork(): void {
    page ??= start();
    online = !online;
    page.network(online);
  }
</script>

<Example
  title="States"
  note="A waiting version, one being let in, offline and back online, drawn in place"
  ground="canvas"
  layout="grid"
>
  <Specimen label="Ready" code={'preview="ready"'}>
    <ServiceWorkerStatus preview="ready" />
  </Specimen>
  <Specimen label="Reloading" code={'preview="reloading"'}>
    <ServiceWorkerStatus preview="reloading" />
  </Specimen>
  <Specimen label="Offline" code={'preview="offline"'}>
    <ServiceWorkerStatus preview="offline" />
  </Specimen>
  <Specimen label="Back online" code={'preview="online"'}>
    <ServiceWorkerStatus preview="online" />
  </Specimen>
</Example>

<Example
  title="Behaviour"
  note="A deployed version waits in the corner until Reload, and losing the network says so until it returns"
>
  <Specimen label={`Version ${version} serves this page`} code="worker.waiting">
    <Button onclick={deploy}>Deploy a new version</Button>
  </Specimen>
  <Specimen label={online ? 'Online' : 'Offline'} code="worker.offline">
    <Button onclick={toggleNetwork}>{online ? 'Lose the network' : 'Bring the network back'}</Button
    >
  </Specimen>
  <ServiceWorkerStatus worker={page?.worker} />
</Example>
