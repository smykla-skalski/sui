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
  /* Drawn in place, so the sink needs no network: a portrait, and a logo on a clear ground. */
  const portrait =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjNmY4ZmIzIi8+PGNpcmNsZSBjeD0iMzIiIGN5PSIyNiIgcj0iMTIiIGZpbGw9IiNmMWRjYzgiLz48cGF0aCBkPSJNOCA2NGMyLTE1IDEyLTIzIDI0LTIzczIyIDggMjQgMjN6IiBmaWxsPSIjMzQ1MDZmIi8+PC9zdmc+';
  const logo =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHBhdGggZD0iTTMyIDZsMjIgMTN2MjZMMzIgNTggMTAgNDVWMTl6IiBmaWxsPSIjMmY4ZjZkIi8+PHBhdGggZD0iTTMyIDE4bDEyIDd2MTRsLTEyIDctMTItN1YyNXoiIGZpbGw9IiNiZmU4ZDYiLz48L3N2Zz4=';
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
  title="Pictures"
  note="A picture covers the initials drawn under it, and a logo's clear ground shows the tint"
>
  <Specimen label="Person" code="src">
    <Avatar name="Grace Hopper" src={portrait} size={32} />
  </Specimen>
  <Specimen label="Workspace" code={'src shape="workspace"'}>
    <Avatar name="Platform Team" src={logo} shape="workspace" size={32} />
  </Specimen>
</Example>

<Example
  title="Fallbacks"
  note="A picture that does not load shows the initials under it, and a missing name draws them from the handle"
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

<Example title="Narrow width" note="A long name or handle wraps and keeps every word">
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
