<script lang="ts">
  import { resolve } from '$app/paths';
  import { Card, Section } from '#lib';
  import { glyphSnippet } from '../kit/glyphs';
  import Page from '../kit/Page.svelte';
  import { families } from '../kit/sections';
</script>

<!-- The way in: every component as a card that leads to its own page, under its family. A card
     summarises one peer and leads to it, the one use a card has on an overview (L-55). -->
<Page title="Kitchen sink" description="Every SUI component on a page of its own, in every state">
  {#each families as members (members[0].family)}
    <Section title={members[0].family} count={members.length}>
      <div class="cards">
        {#each members as { id, meta } (id)}
          <Card
            href="{resolve('/(sink)/[id]', { id })}/"
            title={meta.title}
            description={meta.lead}
            level={3}
          >
            <!-- The page's own symbol, the one its row in the index wears. -->
            {#snippet actions()}<span class="glyph">{@render glyphSnippet(id, 'md')()}</span
              >{/snippet}
          </Card>
        {/each}
      </div>
    </Section>
  {/each}
</Page>

<style>
  .glyph {
    color: var(--sui-text-secondary);
    display: flex;
  }

  .cards {
    display: grid;
    gap: var(--sui-space-4);
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 1fr));
  }
</style>
