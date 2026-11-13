<script module lang="ts">
  export const section = {
    title: 'Avatar',
    lead: 'Who or what a row is about, a circle for a person and a rounded square for a workspace. With the name and handle beside it, use IdentityRow.',
    components: ['Avatar', 'IdentityRow']
  };
</script>

<script lang="ts">
  import { Avatar, IdentityRow, ObjectList, ObjectRow, Section } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
  import Variants from '../kit/Variants.svelte';

  const kinds = ['person', 'workspace', 'picture'] as const;
  const kindLabels = {
    person: 'shape="person"',
    workspace: 'shape="workspace"',
    picture: 'src="…"'
  };
  const sizes = ['20', '24', '28', '32', '40', '48'] as const;

  /* Bytes no browser can decode, so the fallback shows without a request that fails. */
  const broken = 'data:image/png;base64,AAAA';
  /* Drawn in place, so the sink needs no network: a portrait, and a ring of a logo whose middle
     is clear. */
  const portrait =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjYzlhMjdlIi8+PGNpcmNsZSBjeD0iMzIiIGN5PSIyNiIgcj0iMTIiIGZpbGw9IiNmMWRjYzgiLz48cGF0aCBkPSJNMjAgMjZhMTIgMTIgMCAwIDEgMjQgMGMtMy01LTcuNS03LTEyLTdzLTkgMi0xMiA3eiIgZmlsbD0iIzRhMzQyNiIvPjxwYXRoIGQ9Ik04IDY0YzItMTUgMTItMjMgMjQtMjNzMjIgOCAyNCAyM3oiIGZpbGw9IiMzNDUwNmYiLz48L3N2Zz4=';
  const logo =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHBhdGggZD0iTTMyIDlsMjAgMTEuNXYyM0wzMiA1NSAxMiA0My41di0yM3oiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzJmOGY2ZCIgc3Ryb2tlLXdpZHRoPSI3IiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+';
</script>

<Example
  title="Shapes & Sizes"
  note="Without a picture, initials sit on the brand tint at a type step for each size, and a picture covers them at every size"
>
  <Variants rows={kinds} columns={sizes} rowLabel={(kind) => kindLabels[kind]}>
    {#snippet cell(kind, size)}
      {#if kind === 'picture'}
        <Avatar name="Grace Hopper" src={portrait} size={+size} />
      {:else}
        <Avatar
          name={kind === 'person' ? 'Ada Lovelace' : 'Platform Team'}
          shape={kind}
          size={+size}
        />
      {/if}
    {/snippet}
  </Variants>
</Example>

<Example
  title="Pictures & Fallbacks"
  note="A picture covers the initials, and one that does not load shows them. Without a name the handle gives the initials, and with neither a question mark"
  layout="grid"
  --specimen-min="9rem"
  --specimen-max="9rem"
>
  <Specimen label="Person">
    <Avatar name="Grace Hopper" src={portrait} size={32} />
  </Specimen>
  <Specimen label="Person, not loaded">
    <Avatar name="Alan Turing" src={broken} size={32} />
  </Specimen>
  <Specimen label="Workspace">
    <Avatar name="Platform Team" src={logo} shape="workspace" size={32} />
  </Specimen>
  <Specimen label="Workspace, not loaded">
    <Avatar name="Data Team" src={broken} shape="workspace" size={32} />
  </Specimen>
  <Specimen label="Handle without a name">
    <Avatar name="" handle="@kwame" size={32} />
  </Specimen>
  <Specimen label="No name or handle">
    <Avatar name="" size={32} />
  </Specimen>
</Example>

<Example title="Identity Row" note="The name with the handle in mono under it" layout="pairs">
  <Specimen label="Person">
    <IdentityRow name="Ada Lovelace" handle="@ada" />
  </Specimen>
  <Specimen label="Workspace">
    <IdentityRow name="Platform Team" handle="platform-team" shape="workspace" />
  </Specimen>
  <Specimen label="With a picture">
    <IdentityRow name="Grace Hopper" handle="@grace" src={portrait} />
  </Specimen>
  <Specimen label="Picture not loaded">
    <IdentityRow name="Alan Turing" handle="@alan" src={broken} />
  </Specimen>
  <Specimen label="Workspace with a logo">
    <IdentityRow name="Infra Team" handle="infra-team" src={logo} shape="workspace" />
  </Specimen>
  <Specimen label="Name alone">
    <IdentityRow name="Barbara Liskov" />
  </Specimen>
</Example>

<Example
  title="In a List"
  note="Identity rows in an object list, where the open one stands on the current plate"
  layout="stack"
>
  <Specimen label="One open">
    <Section title="Members" level={4}>
      <ObjectList>
        <ObjectRow href="#avatar" current>
          {#snippet main()}
            <IdentityRow name="Grace Hopper" handle="@grace" src={portrait} />
          {/snippet}
        </ObjectRow>
        <ObjectRow href="#avatar">
          {#snippet main()}
            <IdentityRow name="Ada Lovelace" handle="@ada" />
          {/snippet}
        </ObjectRow>
        <ObjectRow href="#avatar">
          {#snippet main()}
            <IdentityRow name="Platform Team" handle="platform-team" shape="workspace" />
          {/snippet}
        </ObjectRow>
      </ObjectList>
    </Section>
  </Specimen>
</Example>

<Example title="Narrow Width" note="A long name or handle wraps and keeps every word">
  <Specimen label="Long name in 16 rem">
    <div class="narrow">
      <IdentityRow
        name="Maria Gaetana Agnesi de la Cruz Montgomery-Wellington"
        handle="@maria-gaetana-agnesi-de-la-cruz"
      />
    </div>
  </Specimen>
</Example>

<style>
  /* The bound the name wraps in, drawn so the wrap reads as the point of the example. */
  .narrow {
    box-sizing: border-box;
    border: var(--sui-stroke) dashed var(--sui-border-subtle);
    border-radius: var(--sui-radius-control);
    inline-size: min(100%, 16rem);
    padding: var(--sui-space-2);
  }
</style>
