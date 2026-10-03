import { flushPromises, shallowMount } from '@vue/test-utils';

import { Button, message, RadioGroup, Slider } from 'ant-design-vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppModal } from '#/components/app-modal';
import { fetchAuthImageUrl } from '#/utils/file';

import CoverPicker from './cover-picker.vue';

vi.mock('#/api/bank-card', () => ({ uploadCover: vi.fn() }));
vi.mock('#/utils/file', () => ({ fetchAuthImageUrl: vi.fn() }));

const wrappers: ReturnType<typeof shallowMount>[] = [];
const decode = vi.fn();
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}
async function render(uploadFn: (file: File) => Promise<{ id: string }>) {
  const wrapper = shallowMount(CoverPicker, {
    props: { active: true, fileId: 'original', uploadFn },
    global: { renderStubDefaultSlot: true },
  });
  wrappers.push(wrapper);
  await select(wrapper);
  return wrapper;
}
async function select(wrapper: ReturnType<typeof shallowMount>) {
  const input = wrapper.get('input');
  Object.defineProperty(input.element, 'files', {
    configurable: true,
    value: [new File(['image'], 'cover.png', { type: 'image/png' })],
  });
  await input.trigger('change');
}
beforeEach(() => {
  decode.mockResolvedValue(undefined);
  vi.stubGlobal(
    'Image',
    class {
      decode = decode;
      height = 605;
      naturalHeight = 605;
      naturalWidth = 960;
      src = '';
      width = 960;
    },
  );
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:cover');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
    rotate: vi.fn(),
    translate: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => {
    cb(new Blob(['cropped'], { type: 'image/png' }));
  });
  vi.spyOn(message, 'error').mockImplementation(() => (() => {}) as never);
});
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('卡面非阻塞上传', () => {
  it('慢上传时关闭裁剪窗，仅卡面按钮 loading，重复确认只上传一次', async () => {
    const upload = deferred<{ id: string }>();
    const uploadFn = vi.fn(() => upload.promise);
    const wrapper = await render(uploadFn);
    const modal = wrapper.findComponent(AppModal);
    modal.vm.$emit('ok');
    modal.vm.$emit('ok');
    await flushPromises();
    expect(modal.props('open')).toBe(false);
    expect(wrapper.findComponent(Button).props('loading')).toBe(true);
    expect(uploadFn).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('change')).toBeUndefined();
    expect(wrapper.emitted('pending')?.at(-1)).toEqual([true]);
    upload.resolve({ id: 'new' });
    await flushPromises();
    expect(wrapper.emitted('change')).toEqual([['new']]);
    expect(wrapper.emitted('pending')?.at(-1)).toEqual([false]);
  });
  it('失败保留待上传文件和保存限制，重试不重新处理图片也不重复弹错误', async () => {
    const uploadFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ id: 'retry' });
    const wrapper = await render(uploadFn);
    wrapper.findComponent(AppModal).vm.$emit('ok');
    await flushPromises();
    expect(wrapper.text()).toContain('上传失败，重试');
    expect(wrapper.emitted('pending')?.at(-1)).toEqual([true]);
    expect(message.error).not.toHaveBeenCalled();
    wrapper.findComponent(Button).vm.$emit('click');
    await flushPromises();
    expect(uploadFn.mock.calls[1]?.[0]).toBe(uploadFn.mock.calls[0]?.[0]);
    expect(decode).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('change')).toEqual([['retry']]);
  });
  it('放弃失败的上传保留原卡面，并解除保存限制', async () => {
    const wrapper = await render(
      vi.fn().mockRejectedValue(new Error('offline')),
    );
    wrapper.findComponent(AppModal).vm.$emit('ok');
    await flushPromises();
    wrapper.findAllComponents(Button)[1]!.vm.$emit('click');
    await flushPromises();
    expect(wrapper.emitted('change')).toBeUndefined();
    expect(wrapper.emitted('pending')?.at(-1)).toEqual([false]);
    expect(wrapper.text()).not.toContain('上传失败');
  });
  it('关闭后重开，旧上传响应不能覆盖新卡面或解除新上传状态', async () => {
    const old = deferred<{ id: string }>();
    const current = deferred<{ id: string }>();
    const uploadFn = vi
      .fn()
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(current.promise);
    const wrapper = await render(uploadFn);
    wrapper.findComponent(AppModal).vm.$emit('ok');
    await flushPromises();
    await wrapper.setProps({ active: false });
    await wrapper.setProps({ active: true });
    await select(wrapper);
    wrapper.findComponent(AppModal).vm.$emit('ok');
    await flushPromises();
    old.resolve({ id: 'stale' });
    await flushPromises();
    expect(wrapper.emitted('change')).toBeUndefined();
    expect(wrapper.findComponent(Button).props('loading')).toBe(true);
    expect(wrapper.emitted('pending')?.at(-1)).toEqual([true]);
    current.resolve({ id: 'current' });
    await flushPromises();
    expect(wrapper.emitted('change')).toEqual([['current']]);
  });
  it('本地处理失败保留裁剪窗并解除保存限制', async () => {
    decode.mockRejectedValueOnce(new Error('图片解码失败'));
    const uploadFn = vi.fn();
    const wrapper = await render(uploadFn);
    wrapper.findComponent(AppModal).vm.$emit('ok');
    await flushPromises();
    expect(wrapper.findComponent(AppModal).props('open')).toBe(true);
    expect(uploadFn).not.toHaveBeenCalled();
    expect(message.error).toHaveBeenCalledWith('图片解码失败');
    expect(wrapper.emitted('pending')?.at(-1)).toEqual([false]);
  });
});

describe('卡面旋转', () => {
  it.each([
    ['向右旋转90度', 1, 90, 'contain', 1],
    ['向左旋转90度', 1, 270, 'contain', 1],
    ['向右旋转90度', 2, 180, 'contain', 1],
    ['向右旋转90度', 4, 0, 'contain', 1],
    ['向右旋转90度', 1, 90, 'cover', 1.5],
  ] as const)(
    '%s，点击%s次，导出%s度/%s/%s',
    async (label, turns, angle, mode, zoom) => {
      vi.stubGlobal(
        'Image',
        class {
          decode = decode;
          naturalHeight = 960;
          naturalWidth = 605;
          src = '';
        },
      );
      const uploadFn = vi.fn().mockResolvedValue({ id: 'rotated' });
      const wrapper = await render(uploadFn);
      for (let i = 0; i < turns; i++)
        wrapper
          .findAllComponents(Button)
          .find((button) => button.attributes('aria-label') === label)!
          .vm.$emit('click');
      wrapper.findComponent(RadioGroup).vm.$emit('update:value', mode);
      await flushPromises();
      if (mode === 'cover')
        wrapper.findComponent(Slider).vm.$emit('update:value', zoom);
      await flushPromises();
      expect(wrapper.get('img').attributes('style')).toContain(
        `rotate(${angle}deg)`,
      );
      wrapper.findComponent(AppModal).vm.$emit('ok');
      await flushPromises();
      const context = vi.mocked(HTMLCanvasElement.prototype.getContext).mock
        .results[0]!.value;
      expect(context.translate).toHaveBeenCalledWith(480, 302.5);
      expect(context.rotate).toHaveBeenCalledWith((angle * Math.PI) / 180);
      const scale = angle % 180 === 0 ? 605 / 960 : zoom;
      expect(context.drawImage).toHaveBeenCalledWith(
        expect.anything(),
        (-605 * scale) / 2,
        (-960 * scale) / 2,
        605 * scale,
        960 * scale,
      );
      expect(uploadFn).toHaveBeenCalledTimes(1);
    },
  );

  it('重新选图归零，处理中旋转按钮禁用', async () => {
    const processing = deferred<void>();
    const wrapper = await render(vi.fn().mockResolvedValue({ id: 'new' }));
    wrapper
      .findAllComponents(Button)
      .find((button) => button.attributes('aria-label') === '向右旋转90度')!
      .vm.$emit('click');
    await wrapper.setProps({ active: false });
    await wrapper.setProps({ active: true });
    await select(wrapper);
    expect(wrapper.get('img').attributes('style')).toContain('rotate(0deg)');
    decode.mockReturnValueOnce(processing.promise);
    wrapper.findComponent(AppModal).vm.$emit('ok');
    await flushPromises();
    const rotateButtons = wrapper
      .findAllComponents(Button)
      .filter((button) => button.attributes('aria-label')?.endsWith('90度'));
    expect(rotateButtons).toHaveLength(2);
    expect(rotateButtons.every((button) => button.props('disabled'))).toBe(
      true,
    );
    processing.resolve();
    await flushPromises();
  });
});

describe('已有卡面调整', () => {
  async function existing(
    uploadFn = vi.fn().mockResolvedValue({ id: 'rotated' }),
  ) {
    const wrapper = shallowMount(CoverPicker, {
      props: { active: true, fileId: 'original', uploadFn },
      global: { renderStubDefaultSlot: true },
    });
    wrappers.push(wrapper);
    wrapper
      .findAllComponents(Button)
      .find((button) => button.attributes('aria-label') === '旋转已有卡面')!
      .vm.$emit('click');
    await flushPromises();
    return wrapper;
  }
  it('直接加载原图并旋转上传，不再提供恢复默认按钮，不撤销共享图片URL', async () => {
    vi.mocked(fetchAuthImageUrl).mockResolvedValue('blob:existing');
    const uploadFn = vi.fn().mockResolvedValue({ id: 'rotated' });
    const wrapper = await existing(uploadFn);
    expect(fetchAuthImageUrl).toHaveBeenCalledWith('original');
    expect(wrapper.find('[aria-label="恢复默认卡面"]').exists()).toBe(false);
    expect(wrapper.get('img').attributes('src')).toBe('blob:existing');
    expect(wrapper.emitted('pending')?.at(-1)).toEqual([true]);
    wrapper
      .findAllComponents(Button)
      .find((button) => button.attributes('aria-label') === '向右旋转90度')!
      .vm.$emit('click');
    wrapper.findComponent(AppModal).vm.$emit('ok');
    await flushPromises();
    expect(uploadFn).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('change')).toEqual([['rotated']]);
    wrapper.findComponent(AppModal).vm.$emit('afterClose');
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith('blob:existing');
  });
  it('取消调整不修改原图，释放保存限制', async () => {
    vi.mocked(fetchAuthImageUrl).mockResolvedValue('blob:existing');
    const wrapper = await existing();
    wrapper.findComponent(AppModal).vm.$emit('update:open', false);
    await flushPromises();
    wrapper.findComponent(AppModal).vm.$emit('afterClose');
    expect(wrapper.emitted('change')).toBeUndefined();
    expect(wrapper.emitted('pending')?.at(-1)).toEqual([false]);
  });
  it('图片加载失败可再次打开，原卡面保留', async () => {
    vi.mocked(fetchAuthImageUrl)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue('blob:existing');
    const wrapper = await existing();
    expect(wrapper.findComponent(AppModal).props('open')).toBe(false);
    expect(wrapper.emitted('pending')?.at(-1)).toEqual([false]);
    expect(wrapper.emitted('change')).toBeUndefined();
    wrapper
      .findAllComponents(Button)
      .find((button) => button.attributes('aria-label') === '旋转已有卡面')!
      .vm.$emit('click');
    await flushPromises();
    expect(wrapper.findComponent(AppModal).props('open')).toBe(true);
  });
  it.each(['close', 'file'])(
    '加载中%s后旧图片响应不能重新打开调整窗',
    async (action) => {
      const pending = deferred<string>();
      vi.mocked(fetchAuthImageUrl).mockReturnValueOnce(pending.promise);
      const wrapper = await existing();
      await wrapper.setProps(
        action === 'close' ? { active: false } : { fileId: 'another' },
      );
      pending.resolve('blob:stale');
      await flushPromises();
      expect(wrapper.findComponent(AppModal).props('open')).toBe(false);
      expect(wrapper.emitted('change')).toBeUndefined();
      expect(wrapper.emitted('pending')?.at(-1)).toEqual([false]);
    },
  );
});
