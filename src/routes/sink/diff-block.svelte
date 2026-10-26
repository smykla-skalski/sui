<script module lang="ts">
  export const section = {
    title: 'Diff block',
    lead: 'A small unified diff that shows an excerpt worth reading, never a whole file. Code with nothing to compare is a CodeBlock.',
    components: ['DiffBlock']
  };
</script>

<script lang="ts">
  import { DiffBlock } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

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
  title="Sources"
  note="Added and removed lines wear their tone and a glyph, and the changed stretch is one step deeper"
  layout="stack"
  ground="canvas"
>
  <Specimen label="From two texts" code="before after labels">
    <DiffBlock
      {before}
      {after}
      lang="json"
      label="renovate.json"
      labels={{ before: 'Template', after: 'Repository' }}
    />
  </Specimen>
  <Specimen label="Prepared lines, one changed in place" code="lines">
    <DiffBlock lines={prepared} lang="yaml" />
  </Specimen>
</Example>

<Example
  title="Empty"
  note="Two empty sides say there is nothing to compare"
  layout="stack"
  ground="canvas"
>
  <Specimen label="No changes" code={'before="" after=""'}>
    <DiffBlock before="" after="" />
  </Specimen>
</Example>
