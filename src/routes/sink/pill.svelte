<script module lang="ts">
  export const section = {
    title: 'Pill',
    lead: 'A status or a standing that nothing presses. A value such as a label, a pattern or a count is a Chip.',
    components: ['Pill']
  };
</script>

<script lang="ts">
  import { Button, Pill, type IconName, type PillTone } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
  import Variants from '../kit/Variants.svelte';

  const tones = ['neutral', 'info', 'success', 'warning', 'danger', 'role'] as const;
  const marks = ['Plain', 'Icon', 'Dot', 'Live'] as const;
  const words: Record<PillTone, string> = {
    neutral: 'Member',
    info: 'Invited',
    success: 'Healthy',
    warning: 'Degraded',
    danger: 'Suspended',
    role: 'Owner'
  };
  const icons: Record<PillTone, IconName> = {
    neutral: 'user',
    info: 'mail',
    success: 'check',
    warning: 'warning',
    danger: 'ban',
    role: 'owner'
  };

  let healthy = $state(true);
  let updates = $state(0);
</script>

<Example
  title="Tones & Marks"
  note="A status wears its word, a dot marks a state true now, and a live dot pulses as it appears unless motion is reduced"
>
  <Variants rows={tones} columns={marks} axis="tone" rowLabel={(tone) => `"${tone}"`}>
    {#snippet cell(tone, mark)}
      <Pill
        {tone}
        icon={mark === 'Icon' ? icons[tone] : undefined}
        dot={mark === 'Dot'}
        live={mark === 'Live'}
      >
        {words[tone]}
      </Pill>
    {/snippet}
  </Variants>
</Example>

<Example
  title="Long Status"
  note="A long status wraps inside the pill, so no word is cut"
  layout="grid"
>
  <Specimen label="Wrapping label">
    <Pill tone="info">Invited to the infrastructure and platform engineering workspace</Pill>
  </Specimen>
</Example>

<Example
  title="Live Updates"
  note="A live dot pulses again once it has been still for 5&nbsp;seconds, each run under 5&nbsp;seconds, so it never needs a pause control"
>
  <Specimen label="Pulses on each update">
    <span class="row">
      <Pill tone="success" live beat={updates}>Syncing</Pill>
      <Button onclick={() => updates++}>Receive an Update</Button>
    </span>
  </Specimen>
</Example>

<Example
  title="Changing Status"
  note="A pill whose state changes in place is a status region, so its new word is spoken"
>
  <Specimen label="Spoken on change">
    <span class="row">
      <Pill role="status" tone={healthy ? 'success' : 'warning'} dot>
        {healthy ? 'Healthy' : 'Degraded'}
      </Pill>
      <Button onclick={() => (healthy = !healthy)}>Change the Status</Button>
    </span>
  </Specimen>
</Example>

<style>
  .row {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-3);
  }
</style>
