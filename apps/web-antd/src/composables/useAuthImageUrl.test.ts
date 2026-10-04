import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { fetchAuthImageUrl } from '#/utils/file';

import { useAuthImageUrl } from './useAuthImageUrl';

vi.mock('#/utils/file', () => ({ fetchAuthImageUrl: vi.fn() }));
const images: Array<{
  onerror: (() => void) | null;
  onload: (() => void) | null;
  src: string;
}> = [];
const wrappers: Array<ReturnType<typeof mount>> = [];
beforeEach(() => {
  images.length = 0;
  vi.mocked(fetchAuthImageUrl).mockReset();
  vi.stubGlobal(
    'Image',
    class {
      onerror = null;
      onload = null;
      src = '';
      constructor() {
        images.push(this);
      }
    },
  );
});
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount());
  vi.unstubAllGlobals();
});
function render(
  fileId = ref('private'),
  publicUrl = ref<string | undefined>(undefined),
) {
  let result!: ReturnType<typeof useAuthImageUrl>;
  const wrapper = mount(
    defineComponent({
      setup() {
        result = useAuthImageUrl(
          () => fileId.value,
          () => publicUrl.value,
        );
        return () => null;
      },
    }),
  );
  wrappers.push(wrapper);
  return result;
}
it('公共图片直接使用服务端URL且加载期间保留loading，不下载鉴权Blob', () => {
  const url = 'https://example.test/api/public/images/a.png';
  const result = render(ref('a'), ref(url));
  expect(images[0]?.src).toBe(url);
  expect(result.loading.value).toBe(true);
  expect(fetchAuthImageUrl).not.toHaveBeenCalled();
  images[0]?.onload?.();
  expect(result.blobUrl.value).toBe(url);
  expect(result.loading.value).toBe(false);
});
it('临时上传和私人图片继续鉴权加载', async () => {
  vi.mocked(fetchAuthImageUrl).mockResolvedValue('blob:private');
  const result = render();
  await flushPromises();
  expect(fetchAuthImageUrl).toHaveBeenCalledWith('private');
  expect(result.blobUrl.value).toBe('blob:private');
  expect(images).toHaveLength(0);
});
it('换图和离页后旧图片事件不能覆盖新状态', async () => {
  const publicUrl = ref<string | undefined>('https://example.test/old.png');
  const result = render(ref('a'), publicUrl);
  const oldLoad = images[0]?.onload;
  publicUrl.value = 'https://example.test/new.png';
  await flushPromises();
  oldLoad?.();
  expect(result.blobUrl.value).toBe('');
  images[1]?.onload?.();
  expect(result.blobUrl.value).toBe(publicUrl.value);
  expect(images[0]?.onload).toBeNull();
});
it('公共图片失败可重试，相同地址不附加随机参数', async () => {
  const id = ref('a');
  const url = ref('https://example.test/a.png');
  const result = render(id, url);
  images[0]?.onerror?.();
  expect(result.error.value).toBe(true);
  expect(result.loading.value).toBe(false);
  id.value = 'retry';
  await flushPromises();
  expect(result.error.value).toBe(false);
  expect(images[1]?.src).toBe(url.value);
  images[1]?.onload?.();
  expect(result.blobUrl.value).toBe(url.value);
});
