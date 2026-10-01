import { afterEach, describe, expect, it, vi } from 'vitest';

import { handleEnterSubmit } from '../enter-submit';

function press(markup: string, init: KeyboardEventInit = {}, disabled = false) {
  const root = document.createElement('div');
  root.dataset.enterSubmitScope = '';
  root.innerHTML = markup;
  document.body.append(root);
  const save = vi.fn();
  root.addEventListener(
    'keydown',
    (event) => handleEnterSubmit(event, save, disabled),
    true,
  );
  const event = new KeyboardEvent('keydown', {
    key: 'Enter',
    bubbles: true,
    cancelable: true,
    ...init,
  });
  root.querySelector('[data-target]')!.dispatchEvent(event);
  return { save, event };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('enter submission', () => {
  it('submits a text input once and prevents native submit', () => {
    const { save, event } = press('<input data-target>');
    expect(save).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it.each([
    '<textarea data-target></textarea>',
    '<div contenteditable="true"><span data-target></span></div>',
    '<input role="combobox" data-target>',
    '<div class="ant-picker"><input data-target></div>',
    '<div class="ant-select"><input data-target></div>',
    '<button data-target>取消</button>',
    '<input type="checkbox" data-target>',
    '<div data-enter-submit="ignore"><input data-target></div>',
    '<div data-enter-submit-scope><input data-target></div>',
  ])('preserves widget and nested scope behavior: %s', (markup) => {
    const { save, event } = press(markup);
    expect(save).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it.each([
    { isComposing: true },
    { keyCode: 229 },
    { ctrlKey: true },
    { shiftKey: true },
    { metaKey: true },
    { altKey: true },
  ])('ignores composition and modified Enter: %j', (init) => {
    const { save, event } = press('<input data-target>', init);
    expect(save).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it.each([{ repeat: true }, {}])(
    'blocks repeat or disabled submission including native submit',
    (init) => {
      const { save, event } = press('<input data-target>', init, !init.repeat);
      expect(save).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(true);
    },
  );
});
