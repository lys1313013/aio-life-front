import type { SystemConfigVO } from '#/api/system/system-config';

import { flushPromises, mount } from '@vue/test-utils';

import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_MAP_SOURCE } from '#/constants/footprint-map';

import Editor from './FootprintMapConfigEditor.vue';

const config = (configured = false): SystemConfigVO => ({
  configKey: 'footprints.baidu',
  configType: 'JSON',
  configValue: JSON.stringify({
    serviceAkConfigured: configured,
  }),
  description: '生活足迹地图',
  updateTime: '',
});
const wrappers: ReturnType<typeof mount>[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});
function editor(configured = false) {
  const wrapper = mount(Editor, {
    props: { config: config(configured), saving: false },
  });
  wrappers.push(wrapper);
  return wrapper;
}

describe('生活足迹地图配置', () => {
  it('服务端 AK 不回填，留空提交时保留已有配置', async () => {
    const wrapper = editor(true);
    const secret = wrapper.get('input[aria-label="百度地图服务端 AK"]');
    expect(
      wrapper.find('input[aria-label="百度地图浏览器端 AK"]').exists(),
    ).toBe(false);
    expect(secret.element).toHaveProperty('value', '');
    expect(secret.attributes('placeholder')).toBe('已配置，留空保留');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(JSON.parse(wrapper.emitted('save')![0]![0] as string)).toEqual({
      serviceAk: '',
      timeoutMs: 5000,
      clearServiceAk: false,
      tileUrl: DEFAULT_MAP_SOURCE.url,
      tileAttribution: DEFAULT_MAP_SOURCE.attribution,
      tileAttributionUrl: DEFAULT_MAP_SOURCE.attributionUrl,
      tileCoordinateSystem: 'WGS84',
    });
  });

  it('保存过程中不重复提交，失败保留输入，成功后清空密钥输入', async () => {
    const wrapper = editor();
    const secret = wrapper.get('input[aria-label="百度地图服务端 AK"]');
    await secret.setValue('synthetic-service');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(
      JSON.parse(wrapper.emitted('save')![0]![0] as string).serviceAk,
    ).toBe('synthetic-service');
    await wrapper.setProps({ saving: true });
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.emitted('save')).toHaveLength(1);
    expect(secret.attributes()).toHaveProperty('disabled');
    await wrapper.setProps({ saving: false });
    expect(secret.element).toHaveProperty('value', 'synthetic-service');
    await wrapper.setProps({ config: config(true) });
    expect(secret.element).toHaveProperty('value', '');
    expect(secret.attributes('placeholder')).toBe('已配置，留空保留');
  });

  it('显式清除会移除输入并禁用新 AK，避免同时提交冲突指令', async () => {
    const wrapper = editor(true);
    const secret = wrapper.get('input[aria-label="百度地图服务端 AK"]');
    await secret.setValue('synthetic-service');
    await wrapper.get('input[type="checkbox"]').setValue(true);
    expect(secret.element).toHaveProperty('value', '');
    expect(secret.attributes()).toHaveProperty('disabled');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(JSON.parse(wrapper.emitted('save')![0]![0] as string)).toMatchObject(
      {
        serviceAk: '',
        timeoutMs: 5000,
        clearServiceAk: true,
      },
    );
  });
});
