import assert from 'node:assert/strict';
import test from 'node:test';
import userEvent from '@testing-library/user-event';
import Button from '../src/lib/components/Button.svelte';
import { render, snippet } from './support/render.mjs';

test('renders a native button with defaults', () => {
  const { getByRole } = render(Button, { children: snippet('<span>Save</span>') });
  const button = getByRole('button', { name: 'Save' });

  assert.equal(button.type, 'button');
  assert.equal(button.dataset.variant, 'primary');
  assert.equal(button.dataset.size, 'md');
  assert.equal(button.disabled, false);
  assert.equal(button.hasAttribute('aria-busy'), false);
  assert.ok(button.classList.contains('sui-button'));
});

test('forwards variant, size, type, class and native attributes', () => {
  const { getByRole } = render(Button, {
    children: snippet('<span>Delete</span>'),
    variant: 'danger',
    size: 'sm',
    type: 'submit',
    class: 'extra',
    title: 'Delete item'
  });
  const button = getByRole('button', { name: 'Delete' });

  assert.equal(button.type, 'submit');
  assert.equal(button.dataset.variant, 'danger');
  assert.equal(button.dataset.size, 'sm');
  assert.equal(button.title, 'Delete item');
  assert.ok(button.classList.contains('sui-button'));
  assert.ok(button.classList.contains('extra'));
});

test('calls onclick when clicked and reachable by keyboard', async () => {
  const user = userEvent.setup({ document });
  let clicks = 0;
  const { getByRole } = render(Button, {
    children: snippet('<span>Save</span>'),
    onclick: () => clicks++
  });
  const button = getByRole('button', { name: 'Save' });

  await user.tab();
  assert.equal(document.activeElement, button);
  await user.keyboard('{Enter}');
  await user.keyboard(' ');
  await user.click(button);

  assert.equal(clicks, 3);
});

test('disabled buttons ignore clicks', async () => {
  const user = userEvent.setup({ document });
  let clicks = 0;
  const { getByRole } = render(Button, {
    children: snippet('<span>Save</span>'),
    disabled: true,
    onclick: () => clicks++
  });

  await user.click(getByRole('button', { name: 'Save' }));
  assert.equal(clicks, 0);
});

test('loading disables the button and shows a hidden spinner', async () => {
  const user = userEvent.setup({ document });
  let clicks = 0;
  const { getByRole, container } = render(Button, {
    children: snippet('<span>Save</span>'),
    loading: true,
    onclick: () => clicks++
  });
  const button = getByRole('button', { name: 'Save' });

  assert.equal(button.disabled, true);
  assert.equal(button.getAttribute('aria-busy'), 'true');
  assert.equal(container.querySelector('.sui-button-spinner')?.getAttribute('aria-hidden'), 'true');

  await user.click(button);
  assert.equal(clicks, 0);
});
