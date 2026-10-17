<script module lang="ts">
  export const section = {
    title: 'Avatar',
    order: 83,
    lead: 'Who or what a row is about, a circle for a person and a rounded square for a workspace. With the name and handle beside it, use IdentityRow.',
    components: ['Avatar', 'IdentityRow']
  };
</script>

<script lang="ts">
  import { Avatar, IdentityRow } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
  import Variants from '../kit/Variants.svelte';

  const shapes = ['person', 'workspace'] as const;
  const sizes = ['20', '24', '28', '32', '40', '48'] as const;

  /* Bytes no browser can decode, so the fallback shows without a request that fails. */
  const broken = 'data:image/png;base64,AAAA';
</script>

<Example
  title="Shapes and sizes"
  note="Without a picture, initials sit on the brand tint at a type step for each size"
>
  <Variants
    rows={sizes}
    columns={shapes}
    axis="size"
    rowLabel={(size) => `{${size}}`}
    columnLabel={(shape) => (shape === 'person' ? 'Person' : 'Workspace')}
  >
    {#snippet cell(size, shape)}
      <Avatar name={shape === 'person' ? 'Ada Lovelace' : 'Platform Team'} {shape} size={+size} />
    {/snippet}
  </Variants>
</Example>

<Example
  title="Fallbacks"
  note="A picture that does not load, or a missing name, still draws initials"
>
  <Specimen label="Picture does not load" code="src">
    <Avatar name="Alan Turing" src={broken} size={32} />
  </Specimen>
  <Specimen label="Workspace picture does not load" code={'src shape="workspace"'}>
    <Avatar name="Radia Perlman" src={broken} shape="workspace" size={32} />
  </Specimen>
  <Specimen label="Handle without a name" code={'name="" handle'}>
    <Avatar name="" handle="octocat" size={32} />
  </Specimen>
</Example>

<Example title="Identity row" note="The name with the handle in mono under it" layout="grid">
  <Specimen label="Person" code="handle">
    <IdentityRow name="Ada Lovelace" handle="@ada" />
  </Specimen>
  <Specimen label="Workspace" code={'handle shape="workspace"'}>
    <IdentityRow name="Platform Team 01" handle="platform-team" shape="workspace" />
  </Specimen>
  <Specimen label="Name alone">
    <IdentityRow name="Barbara Liskov" />
  </Specimen>
</Example>

<Example
  title="Narrow width"
  note="A long name or handle ends in an ellipsis and shows in full in a tooltip"
>
  <Specimen label="Long name in 16rem">
    <div class="narrow">
      <IdentityRow
        name="Maria Gaetana Agnesi de la Cruz Montgomery-Wellington"
        handle="@maria-gaetana-agnesi-de-la-cruz"
      />
    </div>
  </Specimen>
</Example>

<style>
  .narrow {
    inline-size: min(100%, 16rem);
  }
</style>
