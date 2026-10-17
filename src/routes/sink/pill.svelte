<script module lang="ts">
  export const section = {
    title: 'Pill',
    order: 80,
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
</script>

<Example
  title="Tones and marks"
  note="A status wears its word, a dot marks a state true now, and a live dot pulses once unless motion is reduced"
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
  title="Long status"
  note="A long status wraps inside the pill, so no word is cut"
  layout="grid"
>
  <Specimen label="Wrapping label">
    <Pill tone="info">Invited to the infrastructure and platform engineering workspace</Pill>
  </Specimen>
</Example>

<Example
  title="Changing status"
  note="A pill whose state changes in place is a status region, so its new word is spoken"
>
  <Specimen label="Spoken on change" code={'role="status" dot'}>
    <span class="row">
      <Pill role="status" tone={healthy ? 'success' : 'warning'} dot>
        {healthy ? 'Healthy' : 'Degraded'}
      </Pill>
      <Button onclick={() => (healthy = !healthy)}>Change the status</Button>
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
