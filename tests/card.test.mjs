import assert from 'node:assert/strict';
import test from 'node:test';
import Card from '../src/lib/components/Card.svelte';
import { render, snippet } from './support/render.mjs';

test('renders only the body when no header or footer is given', () => {
  const { container, getByText } = render(Card, { children: snippet('<p>Body</p>') });

  assert.ok(getByText('Body').closest('.sui-card-body'));
  assert.equal(container.querySelector('.sui-card-header'), null);
  assert.equal(container.querySelector('.sui-card-footer'), null);
});

test('renders heading, description and footer', () => {
  const { container, getByRole, getByText } = render(Card, {
    children: snippet('<p>Body</p>'),
    heading: 'Usage',
    description: 'Last 30 days',
    footer: snippet('<a href="/usage">Details</a>')
  });

  assert.equal(
    getByRole('heading', { level: 2, name: 'Usage' }).closest('.sui-card-header')?.tagName,
    'DIV'
  );
  assert.ok(getByText('Last 30 days').closest('.sui-card-header'));
  assert.ok(getByRole('link', { name: 'Details' }).closest('.sui-card-footer'));
  assert.equal(container.querySelectorAll('.sui-card-header > *').length, 2);
});

test('renders a header with only a description', () => {
  const { queryByRole, getByText } = render(Card, {
    children: snippet('<p>Body</p>'),
    description: 'No heading'
  });

  assert.ok(getByText('No heading').closest('.sui-card-header'));
  assert.equal(queryByRole('heading'), null);
});

test('forwards class and native attributes to the root', () => {
  const { container } = render(Card, {
    children: snippet('<p>Body</p>'),
    class: 'extra',
    role: 'region',
    'aria-label': 'Stats'
  });
  const card = container.firstElementChild;

  assert.ok(card.classList.contains('sui-card'));
  assert.ok(card.classList.contains('extra'));
  assert.equal(card.getAttribute('role'), 'region');
  assert.equal(card.getAttribute('aria-label'), 'Stats');
});
