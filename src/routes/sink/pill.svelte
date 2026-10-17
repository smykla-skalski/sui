<script module lang="ts">
  export const section = {
    title: 'Pill',
    order: 80,
    lead: 'A status or a standing that nothing presses. A value such as a label, a pattern or a count is a Chip.',
    components: ['Pill']
  };
</script>

<script lang="ts">
  import { Pill, type IconName, type PillTone } from '#lib';
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
</script>

<Example
  title="Tones and marks"
  note="A status wears its word, a dot marks a state true now, and a live dot pulses unless motion is reduced"
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
