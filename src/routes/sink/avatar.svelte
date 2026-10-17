<script module lang="ts">
  export const section = { title: 'Avatar', order: 83 };
</script>

<script lang="ts">
  import { Avatar, IdentityRow } from '#lib';
  import Example from '../kit/Example.svelte';

  const sizes = [20, 24, 28, 32, 40, 48];

  /* Bytes no browser can decode, so the fallback shows without a request that fails. */
  const broken = 'data:image/png;base64,AAAA';
</script>

<Example title="Initials" note="Without a picture, initials sit on the brand tint at a type step">
  {#each sizes as size (size)}
    <Avatar name="Ada Lovelace" {size} />
  {/each}
</Example>

<Example title="Person and workspace" note="A person is a circle and a workspace a rounded square">
  <Avatar name="Grace Hopper" size={32} />
  <Avatar name="Platform Team 01" shape="workspace" size={32} />
  <Avatar name="" handle="octocat" size={32} />
  <Avatar name="Infrastructure" shape="workspace" size={48} />
</Example>

<Example title="Broken picture" note="A picture that does not load falls back to initials">
  <Avatar name="Alan Turing" src={broken} size={32} />
  <Avatar name="Radia Perlman" src={broken} shape="workspace" size={32} />
</Example>

<Example title="Identity row" note="The name with the handle in mono under it" layout="stack">
  <IdentityRow name="Ada Lovelace" handle="@ada" />
  <IdentityRow name="Platform Team 01" handle="platform-team" shape="workspace" />
  <IdentityRow name="Barbara Liskov" />
  <div class="narrow">
    <IdentityRow
      name="Maria Gaetana Agnesi de la Cruz Montgomery-Wellington"
      handle="@maria-gaetana-agnesi-de-la-cruz"
    />
  </div>
</Example>

<style>
  .narrow {
    inline-size: min(100%, 16rem);
  }
</style>
