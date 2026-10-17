<script module lang="ts">
  export const section = { title: 'Diff block', order: 69 };
</script>

<script lang="ts">
  import { DiffBlock } from '#lib';
  import Example from '../kit/Example.svelte';

  const before = `{
  "prHourlyLimit": 2,
  "automerge": false,
  "labels": ["dependencies"]
}`;

  const after = `{
  "prHourlyLimit": 4,
  "automerge": false,
  "schedule": ["before 6am on monday"]
}`;

  const prepared = [
    { op: ' ', text: 'branch: main' },
    { op: '~', text: 'required_approvals: 2', emphasis: [[20, 21]] },
    { op: '+', text: 'dismiss_stale_reviews: true' },
    { op: '-', text: 'allow_force_push: true' }
  ] as const;
</script>

<Example
  title="From two texts"
  note="Added and removed lines wear their tone and a glyph, and the changed stretch is one step deeper"
  layout="stack"
>
  <DiffBlock
    {before}
    {after}
    lang="json"
    label="renovate.json"
    labels={{ before: 'Template', after: 'Repository' }}
  />
</Example>

<Example
  title="Prepared lines"
  note="Lines diffed elsewhere can carry a change in place, drawn with a tilde"
  layout="stack"
>
  <DiffBlock lines={prepared} lang="yaml" />
</Example>

<Example title="Empty" note="Two empty sides say there is nothing to compare" layout="stack">
  <DiffBlock before="" after="" />
</Example>
