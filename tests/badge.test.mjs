import assert from 'node:assert/strict';
import test from 'node:test';
import Badge from '../src/lib/components/Badge.svelte';
import { render, snippet } from './support/render.mjs';

test('renders children with the neutral tone by default', () => {
  const { getByText } = render(Badge, { children: snippet('<span>Draft</span>') });
  const badge = getByText('Draft').parentElement;

  assert.equal(badge.tagName, 'SPAN');
  assert.equal(badge.dataset.tone, 'neutral');
  assert.ok(badge.classList.contains('sui-badge'));
});

test('applies tone, class and native attributes', () => {
  for (const tone of ['success', 'warning', 'danger']) {
    const { getByText } = render(Badge, {
      children: snippet(`<span>${tone}</span>`),
      tone,
      class: 'extra',
      title: `${tone} status`
    });
    const badge = getByText(tone).parentElement;

    assert.equal(badge.dataset.tone, tone);
    assert.equal(badge.title, `${tone} status`);
    assert.ok(badge.classList.contains('sui-badge'));
    assert.ok(badge.classList.contains('extra'));
  }
});
