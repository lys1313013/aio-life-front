/** Handle plain Enter without stealing editor, picker or button keyboard actions. */
export function handleEnterSubmit(
  event: KeyboardEvent,
  submit: () => void,
  disabled = false,
) {
  if (
    event.key !== 'Enter' ||
    event.defaultPrevented ||
    event.isComposing ||
    event.keyCode === 229 ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  )
    return;
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const scope = target.closest('[data-enter-submit-scope]');
  if (scope && scope !== event.currentTarget) return;
  if (
    target.closest(
      [
        'textarea',
        '[contenteditable]:not([contenteditable="false"])',
        'button',
        'a',
        'select',
        '[role="button"]',
        '[role="combobox"]',
        '[role="listbox"]',
        '[role="menu"]',
        '[role="switch"]',
        '[role="checkbox"]',
        '[role="radio"]',
        '[aria-expanded="true"]',
        '[data-enter-submit="ignore"]',
        '.ant-select',
        '.ant-picker',
        '.ant-mentions',
        '.ant-cascader',
        '.ant-popover',
        '.ant-dropdown',
        'input[type="checkbox"]',
        'input[type="radio"]',
        'input[type="file"]',
        'input[type="submit"]',
        'input[type="button"]',
        'input[type="range"]',
        'input[type="color"]',
      ].join(','),
    )
  )
    return;
  // Capture prevents native form submission and old field handlers firing twice.
  event.preventDefault();
  event.stopPropagation();
  if (!disabled && !event.repeat) submit();
}
