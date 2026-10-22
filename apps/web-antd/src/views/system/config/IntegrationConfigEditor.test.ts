import type { SystemConfigVO } from '#/api/system/system-config';

import { flushPromises, mount } from '@vue/test-utils';

import { afterEach, describe, expect, it } from 'vitest';

import Editor from './IntegrationConfigEditor.vue';

const config = (
  key = 'typesafe.recommendation',
  configured = true,
): SystemConfigVO => ({
  configKey: key,
  configType: 'JSON',
  configValue: JSON.stringify({
    apiKeyConfigured: configured,
    requestTimeoutMs: 2300,
  }),
  description: '',
  updateTime: '',
});
const wrappers: ReturnType<typeof mount>[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});
function editor(key = 'typesafe.recommendation') {
  const wrapper = mount(Editor, {
    props: { config: config(key), saving: false },
  });
  wrappers.push(wrapper);
  return wrapper;
}
async function submit(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('form').trigger('submit');
  await flushPromises();
}

describe('第三方接口系统配置', () => {
  it('typesafe 回填实际参数，提交时不包含密文和 MBTI 字段', async () => {
    const wrapper = editor();
    const key = wrapper.get('input[aria-label="API Key"]');
    expect(key.element).toHaveProperty('value', '');
    expect(key.attributes('placeholder')).toBe('已配置，留空保留');
    await wrapper.get('input[aria-label="模型"]').setValue('new-model');
    await wrapper.get('input[aria-label="数据缓存时长（毫秒）"]').setValue('0');
    await submit(wrapper);
    expect(JSON.parse(wrapper.emitted('save')![0]![0] as string)).toEqual({
      apiKey: '',
      clearApiKey: false,
      enabled: true,
      model: 'new-model',
      requestTimeoutMs: 2300,
      dataCacheTtlMs: 0,
    });
  });

  it('保存过程中禁用并阻止重复提交，失败保留输入，成功后清空密钥', async () => {
    const wrapper = editor('mbti.api');
    const key = wrapper.get('input[aria-label="API Key"]');
    await key.setValue('replacement-secret');
    await wrapper
      .get('input[aria-label="接口地址"]')
      .setValue('https://new.example.com');
    await submit(wrapper);
    expect(JSON.parse(wrapper.emitted('save')![0]![0] as string)).toEqual({
      apiKey: 'replacement-secret',
      clearApiKey: false,
      baseUrl: 'https://new.example.com',
    });
    await wrapper.setProps({ saving: true });
    await submit(wrapper);
    expect(wrapper.emitted('save')).toHaveLength(1);
    expect(key.attributes()).toHaveProperty('disabled');
    await wrapper.setProps({ saving: false });
    expect(key.element).toHaveProperty('value', 'replacement-secret');
    await wrapper.setProps({ config: config('mbti.api') });
    expect(key.element).toHaveProperty('value', '');
  });

  it('明确清除密钥，不同时提交新密钥', async () => {
    const wrapper = editor();
    const key = wrapper.get('input[aria-label="API Key"]');
    await key.setValue('replacement-secret');
    await wrapper.get('input[type="checkbox"]').setValue(true);
    expect(key.element).toHaveProperty('value', '');
    expect(key.attributes()).toHaveProperty('disabled');
    await submit(wrapper);
    expect(JSON.parse(wrapper.emitted('save')![0]![0] as string)).toMatchObject(
      { apiKey: '', clearApiKey: true },
    );
  });
});
