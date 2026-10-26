<script module lang="ts">
  export const section = {
    title: 'Link list',
    lead: "Links to other pages about the same thing, such as a pane's related pages. Things a reader opens with their standings are an ObjectList.",
    components: ['LinkList']
  };
</script>

<script lang="ts">
  import { LinkList, Section, type LinkListItem } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const related: LinkListItem[] = [
    { href: '#link-list', label: 'Changes from this check' },
    { href: '#link-list', label: 'Previous check #4170' }
  ];

  const noted: LinkListItem[] = [
    { href: '#link-list', label: 'Changes from this check', note: 'Three repositories differ' },
    { href: '#link-list', label: 'Previous check #4170', note: 'Finished yesterday, all matched' },
    {
      href: 'https://docs.github.com/en/rest',
      label: 'GitHub REST API reference',
      note: 'How the sync reads repository settings'
    }
  ];

  const long: LinkListItem[] = [
    {
      href: '#link-list',
      label: 'Every change made to the saved settings of acme/api since it was connected',
      note: 'Labels and notes wrap at their own edge'
    },
    { href: '#link-list', label: 'Previous check #4170' }
  ];
</script>

<Example
  title="Links"
  note="Links stand on the heading's edge with no bullets, one target plus 4px apart, and one that leaves the product says so"
  layout="grid"
>
  <Specimen label="Plain">
    <LinkList links={related} aria-label="Related" />
  </Specimen>
  <Specimen label="With notes and an external link" code="note external">
    <LinkList links={noted} aria-label="Related" />
  </Specimen>
</Example>

<Example
  title="Long words"
  note="A label or note that does not fit wraps at its own edge"
  layout="stack"
>
  <Specimen label="Wrapped">
    <div class="narrow">
      <LinkList links={long} aria-label="Related" />
    </div>
  </Specimen>
</Example>

<Example
  title="In a section"
  note="In a pane's aside, the list hangs from its section heading, which names it"
  layout="stack"
  ground="canvas"
>
  <Specimen>
    <div class="aside">
      <Section title="Related" id="link-list-related" level={4}>
        <LinkList links={related} aria-labelledby="link-list-related" />
      </Section>
    </div>
  </Specimen>
</Example>

<Example title="Right to left" note="The list starts at the inline start and the arrow mirrors">
  <Specimen label="With notes and an external link" code={'dir="rtl"'}>
    <div dir="rtl">
      <LinkList links={noted} aria-label="Related" />
    </div>
  </Specimen>
</Example>

<style>
  .narrow {
    inline-size: min(100%, 20rem);
  }

  .aside {
    inline-size: min(100%, 20rem);
  }
</style>
