/* eslint-disable vue/one-component-per-file -- Mock UI primitives used only by these behavior tests. */
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import AppModal from './AppModal.vue';
import AppModalDelete from './AppModalDelete.vue';
import AppModalFooter from './AppModalFooter.vue';

vi.mock('ant-design-vue', () => ({
  Modal: defineComponent({
    props: {
      open: Boolean,
      closable: Boolean,
      keyboard: Boolean,
      maskClosable: Boolean,
      title: { type: String, default: '' },
    },
    emits: ['cancel'],
    setup:
      (props, { slots, emit }) =>
      () =>
        props.open
          ? h(
              'section',
              {
                'data-modal': '',
                onClick: (event: MouseEvent) => {
                  if (
                    event.target === event.currentTarget &&
                    props.maskClosable
                  )
                    emit('cancel', event);
                },
                onKeydown: () => emit('cancel', new MouseEvent('click')),
              },
              slots.default?.(),
            )
          : null,
  }),
  Popconfirm: defineComponent({
    name: 'MockPopconfirm',
    props: { disabled: Boolean },
    emits: ['confirm'],
    setup:
      (_props, { slots }) =>
      () =>
        h('div', slots.default?.()),
  }),
  Button: defineComponent({
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
}));

const mounted: ReturnType<typeof mount>[] = [];
function render(
  props: Record<string, unknown> = {},
  slots: Record<string, (() => ReturnType<typeof h>) | string> = {},
) {
  const wrapper = mount(AppModal, {
    props: { open: true, ...props },
    slots,
    attachTo: document.body,
  });
  mounted.push(wrapper);
  return wrapper;
}
afterEach(() => {
  mounted.forEach((wrapper) => wrapper.unmount());
  mounted.length = 0;
  document.body.innerHTML = '';
});

describe('application modal behavior', () => {
  it('keeps a semantic name and closes the controlled model from cancel', async () => {
    const wrapper = render({ title: '编辑活动' });
    expect(wrapper.attributes('aria-label')).toBe('编辑活动');
    expect(wrapper.find('section').text()).not.toContain('编辑活动');
    await wrapper.findAll('button')[0]!.trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });

  it('closes on backdrop click by default without closing for clicks inside', async () => {
    const wrapper = render(
      {},
      { default: '<div class="form-content">表单内容</div>' },
    );
    await wrapper.find('.form-content').trigger('click');
    expect(wrapper.emitted('cancel')).toBeUndefined();
    await wrapper.find('section').trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });

  it.each(['maskClosable', 'mask-closable'])(
    'honors an explicit %s=false override',
    async (attribute) => {
      const wrapper = render({ [attribute]: false });
      await wrapper.find('section').trigger('click');
      expect(wrapper.emitted('cancel')).toBeUndefined();
      await wrapper.find('button').trigger('click');
      expect(wrapper.emitted('update:open')).toEqual([[false]]);
    },
  );

  it.each(['busy', 'confirmLoading'])(
    'blocks backdrop clicks during %s and restores dismissal after completion',
    async (state) => {
      const wrapper = render({ [state]: true });
      await wrapper.find('section').trigger('click');
      expect(wrapper.emitted('cancel')).toBeUndefined();
      await wrapper.setProps({ [state]: false });
      await wrapper.find('section').trigger('click');
      expect(wrapper.emitted('update:open')).toEqual([[false]]);
    },
  );

  it('confirmation emits once and leaves closing to the successful business handler', async () => {
    const wrapper = render();
    await wrapper.findAll('button')[1]!.trigger('click');
    expect(wrapper.emitted('ok')).toHaveLength(1);
    expect(wrapper.emitted('update:open')).toBeUndefined();
    await wrapper.setProps({ confirmLoading: true });
    expect(
      wrapper.findAll('button').every((button) => button.element.disabled),
    ).toBe(true);
    await wrapper.find('section').trigger('keydown');
    expect(wrapper.emitted('cancel')).toBeUndefined();
  });

  it('gives footerless content an explicit close action', async () => {
    const wrapper = render({ footer: null });
    expect(wrapper.findAll('button')).toHaveLength(1);
    expect(wrapper.find('button').text()).toBe('关闭');
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });

  it('omits the whole footer when explicitly disabled and still supports backdrop dismissal', async () => {
    const wrapper = render(
      { footer: false },
      { default: '<div>分类选项</div>' },
    );
    expect(wrapper.find('.app-modal-footer').exists()).toBe(false);
    expect(wrapper.findAll('button')).toHaveLength(0);
    await wrapper.find('section').trigger('click');
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });

  it('teleports nested form actions once, propagates busy state and restores fallback on unmount', async () => {
    const Child = defineComponent({
      props: { loading: Boolean, show: Boolean },
      setup: (props) => () =>
        props.show
          ? h(AppModalFooter, {
              confirmLoading: props.loading,
              confirmText: '导入',
            })
          : null,
    });
    const show = ref(true);
    const wrapper = render(
      { footer: null },
      { default: () => h(Child, { show: show.value, loading: true }) },
    );
    await nextTick();
    await nextTick();
    expect(wrapper.find('.app-modal-body button').exists()).toBe(false);
    expect(
      wrapper.findAll<HTMLButtonElement>('.app-modal-footer button'),
    ).toHaveLength(2);
    expect(wrapper.find('.app-modal-footer').text()).toContain('导入');
    expect(
      wrapper
        .findAll<HTMLButtonElement>('.app-modal-footer button')
        .every((button) => button.element.disabled),
    ).toBe(true);
    await wrapper.find('section').trigger('keydown');
    expect(wrapper.emitted('cancel')).toBeUndefined();
    show.value = false;
    await nextTick();
    await nextTick();
    expect(wrapper.find('.app-modal-footer').text()).toBe('关闭');
    expect(wrapper.find('button').element.disabled).toBe(false);
  });

  it('preserves caller footer slots and disabled button props', async () => {
    const cancel = vi.fn();
    const wrapper = render({
      cancelButtonProps: { disabled: true },
      onCancel: cancel,
    });
    await wrapper.find('section').trigger('keydown');
    expect(cancel).not.toHaveBeenCalled();
    const custom = render({}, { footer: '<button>自定义操作</button>' });
    expect(custom.findAll('button')).toHaveLength(1);
    expect(custom.find('button').text()).toBe('自定义操作');
  });
  it('isolates footers and busy state in nested dialogs', async () => {
    const nested = ref(true);
    const wrapper = render(
      {},
      {
        default: () =>
          h('div', [
            h(AppModalFooter, { confirmText: '外层保存' }),
            nested.value
              ? h(
                  AppModal,
                  { open: true, title: '内层' },
                  {
                    default: () =>
                      h(AppModalFooter, {
                        confirmText: '内层保存',
                        confirmLoading: true,
                      }),
                  },
                )
              : null,
          ]),
      },
    );
    await nextTick();
    await nextTick();
    const nestedModal = wrapper.findComponent(AppModal);
    expect(nestedModal.find('.app-modal-footer').text()).toContain('内层保存');
    expect(
      wrapper
        .findAll<HTMLButtonElement>('button')
        .find((button) => button.text() === '外层保存')?.element.disabled,
    ).toBe(false);
    nested.value = false;
    await nextTick();
    expect(wrapper.findAll('button')).toHaveLength(2);
    expect(wrapper.find('.app-modal-footer').text()).toContain('外层保存');
  });

  it.each([false, true])(
    'locks the shell while deletion is pending and releases on failure=%s',
    async (fails) => {
      let finish!: () => void;
      let reject!: (reason: Error) => void;
      const action = vi.fn(
        () =>
          new Promise<void>((resolve, rejectPromise) => {
            finish = resolve;
            reject = rejectPromise;
          }),
      );
      const wrapper = render(
        {},
        { 'footer-leading': () => h(AppModalDelete, { action }) },
      );
      const popup = wrapper.findComponent({ name: 'MockPopconfirm' });
      const onConfirm = popup.vm.$attrs.onConfirm as
        | (() => Promise<void>)
        | undefined;
      // Read the event listener directly so a rejected API promise can be asserted without swallowing it.
      const handler = (popup.vm.$.vnode.props?.onConfirm ||
        onConfirm) as () => Promise<void>;
      const request = handler();
      const settled = request.catch((error) => error);
      await nextTick();
      await handler();
      expect(action).toHaveBeenCalledTimes(1);
      expect(
        wrapper.findAll('button').every((button) => button.element.disabled),
      ).toBe(true);
      await wrapper.find('section').trigger('keydown');
      expect(wrapper.emitted('cancel')).toBeUndefined();
      if (fails) reject(new Error('network'));
      else finish();
      await settled;
      await nextTick();
      expect(
        wrapper.findAll('button').every((button) => !button.element.disabled),
      ).toBe(true);
    },
  );
});
