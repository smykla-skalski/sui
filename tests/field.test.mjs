import assert from 'node:assert/strict';
import test from 'node:test';
import userEvent from '@testing-library/user-event';
import Field from '../src/lib/components/Field.svelte';
import { flushSync, render } from './support/render.mjs';

test('labels a text input and leaves it valid by default', () => {
  const { getByLabelText } = render(Field, { label: 'Name' });
  const input = getByLabelText('Name');

  assert.equal(input.tagName, 'INPUT');
  assert.equal(input.type, 'text');
  assert.equal(input.value, '');
  assert.ok(input.id);
  assert.equal(input.hasAttribute('aria-invalid'), false);
  assert.equal(input.hasAttribute('aria-describedby'), false);
});

test('generated ids are unique per instance', () => {
  const first = render(Field, { label: 'First' }).getByLabelText('First');
  const second = render(Field, { label: 'Second' }).getByLabelText('Second');

  assert.notEqual(first.id, second.id);
});

test('describes the input with hint, error and caller-provided ids', () => {
  const { getByLabelText, getByText } = render(Field, {
    label: 'Email',
    id: 'email',
    type: 'email',
    hint: 'We never share it',
    error: 'Email is required',
    'aria-describedby': 'external'
  });
  const input = getByLabelText('Email');

  assert.equal(input.id, 'email');
  assert.equal(input.type, 'email');
  assert.equal(input.getAttribute('aria-invalid'), 'true');
  assert.equal(input.getAttribute('aria-describedby'), 'external email-hint email-error');
  assert.equal(getByText('We never share it').id, 'email-hint');
  assert.equal(getByText('Email is required').id, 'email-error');
});

test('forwards class and native input attributes', () => {
  const { getByLabelText } = render(Field, {
    label: 'Search',
    class: 'extra',
    placeholder: 'Find…',
    disabled: true,
    name: 'q'
  });
  const input = getByLabelText('Search');

  assert.ok(input.classList.contains('sui-field-input'));
  assert.ok(input.classList.contains('extra'));
  assert.equal(input.placeholder, 'Find…');
  assert.equal(input.name, 'q');
  assert.equal(input.disabled, true);
});

test('typing updates the value and fires oninput', async () => {
  const user = userEvent.setup({ document });
  const values = [];
  const { getByLabelText } = render(Field, {
    label: 'Name',
    value: 'A',
    oninput: (event) => values.push(event.currentTarget.value)
  });
  const input = getByLabelText('Name');

  assert.equal(input.value, 'A');
  await user.click(getByLabelText('Name'));
  assert.equal(document.activeElement, input);
  await user.keyboard('da');

  assert.equal(input.value, 'Ada');
  assert.deepEqual(values, ['Ad', 'Ada']);
});

test('clicking the label focuses the input', async () => {
  const user = userEvent.setup({ document });
  const { getByLabelText, getByText } = render(Field, { label: 'Name' });

  await user.click(getByText('Name'));
  assert.equal(document.activeElement, getByLabelText('Name'));
});

test('typing writes back to a bound value', async () => {
  const user = userEvent.setup({ document });
  let value = '';
  const { getByLabelText } = render(Field, {
    label: 'Name',
    get value() {
      return value;
    },
    set value(next) {
      value = next;
    }
  });

  await user.type(getByLabelText('Name'), 'Ada');
  flushSync();
  assert.equal(value, 'Ada');
});
