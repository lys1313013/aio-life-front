/* eslint-disable vue/one-component-per-file -- Lightweight UI primitives for keyboard integration tests. */
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import Modal from '../modal.vue';

vi.mock('@vben-core/shadcn-ui', () => {
  const box = defineComponent({
    setup:
      (_, { slots }) =>
      () =>
        h('div', slots.default?.()),
  });
  return {
    Dialog: box,
    DialogContent: defineComponent({
      setup(_, { slots, expose }) {
        const element = ref();
        expose({ getContentRef: () => ({ $el: element.value }) });
        return () => h('section', { ref: element }, slots.default?.());
      },
    }),
    DialogDescription: box,
    DialogFooter: box,
    DialogHeader: box,
    DialogTitle: box,
    VisuallyHidden: box,
    VbenHelpTooltip: box,
    VbenIconButton: box,
    VbenLoading: box,
    VbenButton: defineComponent({
      props: { disabled: Boolean, loading: Boolean },
      setup:
        (props, { slots }) =>
        () =>
          h(
            'button',
            { disabled: props.disabled || props.loading },
            slots.default?.(),
          ),
    }),
  };
});

const mounted: ReturnType<typeof mount>[] = [];
afterEach(() => {
  mounted.forEach((wrapper) => wrapper.unmount());
  mounted.length = 0;
});

async function render(options = {}) {
  const save = vi.fn();
  const state = ref({
    isOpen: true,
    submitOnEnter: true,
    footer: true,
    showConfirmButton: true,
    ...options,
  });
  const wrapper = mount(Modal, {
    props: {
      modalApi: {
        useStore: () => state,
        onConfirm: save,
        onOpened: vi.fn(),
        onClosed: vi.fn(),
      } as any,
    },
    slots: { default: '<form><input /><textarea /></form>' },
  });
  mounted.push(wrapper);
  await nextTick();
  return { wrapper, save, state };
}

describe('vben modal Enter confirmation', () => {
  it('calls the persistence callback once and leaves multiline input alone', async () => {
    const { wrapper, save } = await render();
    await wrapper.find('input').trigger('keydown', { key: 'Enter' });
    expect(save).toHaveBeenCalledOnce();
    await wrapper.find('textarea').trigger('keydown', { key: 'Enter' });
    await wrapper
      .find('input')
      .trigger('keydown', { key: 'Enter', isComposing: true });
    expect(save).toHaveBeenCalledOnce();
  });

  it.each([
    { submitting: true },
    { loading: true },
    { confirmDisabled: true },
    { confirmLoading: true },
    { submitOnEnter: false },
    { footer: false },
    { showConfirmButton: false },
    { isOpen: false },
  ])('does not confirm unavailable dialogs: %j', async (options) => {
    const { wrapper, save } = await render(options);
    await wrapper.find('input').trigger('keydown', { key: 'Enter' });
    expect(save).not.toHaveBeenCalled();
  });
});
