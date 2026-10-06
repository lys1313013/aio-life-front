import type { CoverTemplate, CoverTemplatePage } from '#/api/bank-card/covers';

import { flushPromises, mount, shallowMount } from '@vue/test-utils';

import { Button, Form, Popconfirm, Select, Switch } from 'ant-design-vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppModal } from '#/components/app-modal';
import CoverPicker from '#/views/bank-card/cover-picker.vue';

import CoverPage from './index.vue';

const api = vi.hoisted(() => ({
  moveBankCardCover: vi.fn(),
  listCoverTemplates: vi.fn(),
  listCoverBanks: vi.fn(),
  deleteCoverTemplate: vi.fn(),
  setCoverEnabled: vi.fn(),
  saveCoverTemplate: vi.fn(),
  uploadTemplateCover: vi.fn(),
}));
vi.mock('#/api/bank-card/covers', () => api);
vi.mock('#/api/bank-card/order', () => ({
  moveBankCardCover: api.moveBankCardCover,
}));
vi.mock('./cover-preview.vue', () => ({ default: { template: '<div />' } }));
vi.mock('#/views/bank-card/cover-picker.vue', () => ({
  default: { template: '<div />' },
}));

const original: CoverTemplate = {
  id: '1',
  name: '原卡面',
  bankId: '2',
  bankName: '银行',
  cardType: 'debit',
  fileId: '3',
  sourceUrl: null,
  isEnabled: 1,
  sortOrder: 0,
  usageCount: 0,
};
const wrappers: ReturnType<typeof shallowMount>[] = [];
function pageResult(
  items: CoverTemplate[],
  total = items.length,
): CoverTemplatePage {
  return { items, total };
}
let reachBottom: () => void;
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}
async function render(realButtons = false) {
  const wrapper = (realButtons ? mount : shallowMount)(CoverPage, {
    global: {
      renderStubDefaultSlot: true,
      stubs: {
        AppModal: true,
        AForm: {
          props: ['disabled', 'model'],
          methods: {
            clearValidate: vi.fn(),
            validate: vi.fn().mockResolvedValue(undefined),
          },
          template: '<form><slot /></form>',
        },
        APopconfirm: {
          props: ['disabled'],
          inheritAttrs: false,
          emits: ['confirm'],
          template: '<div><slot /></div>',
        },
        AInput: { inheritAttrs: false, template: '<input />' },
        AInputNumber: { inheritAttrs: false, template: '<input />' },
        ASelect: {
          props: ['disabled', 'value', 'options'],
          emits: ['update:value'],
          inheritAttrs: false,
          template: '<div />',
        },
        AButton: realButtons
          ? false
          : {
              emits: ['click'],
              template: '<button @click="$emit(\'click\')"><slot /></button>',
            },
      },
    },
  });
  wrappers.push(wrapper);
  await flushPromises();
  return wrapper;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        reachBottom = () => callback([{ isIntersecting: true }]);
      }
      disconnect() {}
      observe() {}
    },
  );
  api.listCoverTemplates.mockImplementation(async () =>
    pageResult([{ ...original }]),
  );
  api.listCoverBanks.mockResolvedValue([]);
  api.deleteCoverTemplate.mockResolvedValue(undefined);
  api.setCoverEnabled.mockImplementation(async (_id, isEnabled) => ({
    ...original,
    isEnabled,
  }));
});
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('公共卡面操作 loading', () => {
  it('启停只在开关显示 loading，同时阻止删除和重复启停', async () => {
    const wrapper = await render(true);
    const update = deferred<CoverTemplate>();
    api.setCoverEnabled.mockReturnValueOnce(update.promise);
    const toggle = wrapper.findComponent(Switch);
    toggle.vm.$emit('change', false);
    await flushPromises();
    const deletion = wrapper
      .findAllComponents(Button)
      .find((button) => button.attributes('aria-label') === '删除原卡面')!;
    expect(toggle.props('loading')).toBe(true);
    expect(toggle.props('disabled')).toBe(true);
    expect(deletion.props('loading')).toBe(false);
    expect(deletion.props('disabled')).toBe(true);
    expect(deletion.find('[role="img"][aria-label="delete"]').exists()).toBe(
      true,
    );
    toggle.vm.$emit('change', false);
    wrapper.findComponent(Popconfirm).vm.$emit('confirm');
    expect(api.setCoverEnabled).toHaveBeenCalledTimes(1);
    expect(api.deleteCoverTemplate).not.toHaveBeenCalled();
    update.resolve({ ...original, isEnabled: 0 });
    await flushPromises();
    expect(toggle.props('loading')).toBe(false);
    expect(toggle.props('disabled')).toBe(false);
    expect(deletion.props('disabled')).toBe(false);
  });

  it('删除时 spinner 替换删除图标，开关只禁用且不显示 loading', async () => {
    const wrapper = await render(true);
    const pending = deferred<void>();
    api.deleteCoverTemplate.mockReturnValueOnce(pending.promise);
    wrapper.findComponent(Popconfirm).vm.$emit('confirm');
    await flushPromises();
    const deletion = wrapper.get('.cover-delete');
    expect(deletion.classes()).toContain('ant-btn-loading');
    expect(deletion.classes()).toContain('ant-btn-icon-only');
    expect(deletion.findAll('svg')).toHaveLength(1);
    expect(deletion.find('[aria-label="loading"]').exists()).toBe(true);
    expect(deletion.find('[aria-label="delete"]').exists()).toBe(false);
    const toggle = wrapper.findComponent(Switch);
    expect(toggle.props('loading')).toBe(false);
    expect(toggle.props('disabled')).toBe(true);
    toggle.vm.$emit('change', false);
    expect(api.setCoverEnabled).not.toHaveBeenCalled();
    pending.resolve();
    await flushPromises();
    expect(wrapper.find('.cover-item').exists()).toBe(false);
  });
});

describe('公共卡面查询与修改交错', () => {
  it('删除期间刷新得到的旧列表不能复活删除项', async () => {
    const wrapper = await render();
    const deletion = deferred<void>();
    const list = deferred<CoverTemplatePage>();
    api.deleteCoverTemplate.mockReturnValueOnce(deletion.promise);
    wrapper.findComponent(Popconfirm).vm.$emit('confirm');
    api.listCoverTemplates.mockReturnValueOnce(list.promise);
    await wrapper.get('[aria-label="刷新卡面"]').trigger('click');
    deletion.resolve();
    await flushPromises();
    expect(wrapper.find('.cover-item').exists()).toBe(false);
    list.resolve(pageResult([{ ...original }]));
    await flushPromises();
    expect(wrapper.find('.cover-item').exists()).toBe(false);
  });
  it('启停结果不被旧列表回滚', async () => {
    const wrapper = await render();
    const update = deferred<CoverTemplate>();
    const list = deferred<CoverTemplatePage>();
    api.setCoverEnabled.mockReturnValueOnce(update.promise);
    wrapper.findComponent(Switch).vm.$emit('change', false);
    api.listCoverTemplates.mockReturnValueOnce(list.promise);
    await wrapper.get('[aria-label="刷新卡面"]').trigger('click');
    update.resolve({ ...original, isEnabled: 0 });
    await flushPromises();
    list.resolve(pageResult([{ ...original }]));
    await flushPromises();
    expect(wrapper.findComponent(Switch).props('checked')).toBe(false);
  });
  it('后发查询优先，过期错误不覆盖成功状态', async () => {
    const wrapper = await render();
    const old = deferred<CoverTemplatePage>();
    api.listCoverTemplates.mockReturnValueOnce(old.promise);
    await wrapper.get('[aria-label="刷新卡面"]').trigger('click');
    api.listCoverTemplates.mockResolvedValueOnce(
      pageResult([{ ...original, name: '新卡面' }]),
    );
    await wrapper.get('[aria-label="刷新卡面"]').trigger('click');
    await flushPromises();
    old.reject(new Error('offline'));
    await flushPromises();
    expect(wrapper.text()).toContain('新卡面');
    expect(wrapper.text()).not.toContain('加载失败');
  });
  it('失败保留现有卡片，删除进行中不重复提交', async () => {
    const wrapper = await render();
    const deletion = deferred<void>();
    api.deleteCoverTemplate.mockReturnValueOnce(deletion.promise);
    const confirm = wrapper.findComponent(Popconfirm);
    confirm.vm.$emit('confirm');
    confirm.vm.$emit('confirm');
    expect(api.deleteCoverTemplate).toHaveBeenCalledTimes(1);
    // 页面 mutation 的失败仍由请求层提示；列表失败在页面可重试。
    api.listCoverTemplates.mockRejectedValueOnce(new Error('offline'));
    await wrapper.get('[aria-label="刷新卡面"]').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('原卡面');
    expect(wrapper.text()).toContain('加载失败');
    deletion.resolve();
    await flushPromises();
  });
});

describe('公共卡面上传期间的表单', () => {
  it('允许继续填写和取消，仅阻止最终保存', async () => {
    const wrapper = await render();
    await wrapper.get('[aria-label="新增公共卡面"]').trigger('click');
    wrapper.findComponent(CoverPicker).vm.$emit('pending', true);
    await flushPromises();
    const modal = wrapper.findComponent(AppModal);
    expect(wrapper.findComponent(Form).props('disabled')).toBe(false);
    expect(modal.props('okButtonProps')).toEqual({ disabled: true });
    expect(modal.props('cancelButtonProps')).toEqual({ disabled: false });
    modal.vm.$emit('ok');
    await flushPromises();
    expect(api.saveCoverTemplate).not.toHaveBeenCalled();
    modal.vm.$emit('update:open', false);
    await flushPromises();
    expect(wrapper.findComponent(CoverPicker).attributes('active')).toBe(
      'false',
    );
  });
});

describe('公共卡面使用次数与编辑限制', () => {
  it.each([0])(
    '使用次数为 %j 时允许修改银行和类型并保存',
    async (usageCount) => {
      api.listCoverTemplates.mockResolvedValueOnce(
        pageResult([{ ...original, usageCount }]),
      );
      api.saveCoverTemplate.mockResolvedValueOnce({
        ...original,
        bankId: '4',
        cardType: 'credit',
        usageCount,
      });
      const wrapper = await render();
      await wrapper.get('[aria-label="编辑原卡面"]').trigger('click');
      const selects = wrapper.findComponent(Form).findAllComponents(Select);
      expect(selects).toHaveLength(2);
      expect(selects.map((select) => select.props('disabled'))).toEqual([
        false,
        false,
      ]);
      expect(wrapper.findComponent(Popconfirm).props('disabled')).toBeFalsy();
      selects[0]!.vm.$emit('update:value', '4');
      selects[1]!.vm.$emit('update:value', 'credit');
      wrapper.findComponent(AppModal).vm.$emit('ok');
      await flushPromises();
      expect(api.saveCoverTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ bankId: '4', cardType: 'credit' }),
        original.id,
      );
      expect(wrapper.findComponent(AppModal).props('open')).toBe(false);
    },
  );
  it.each([1, 2_147_483_647])(
    '使用次数为 %j 时锁定银行、类型和删除',
    async (usageCount) => {
      api.listCoverTemplates.mockResolvedValueOnce(
        pageResult([{ ...original, usageCount }]),
      );
      const wrapper = await render();
      await wrapper.get('[aria-label="编辑原卡面"]').trigger('click');
      const selects = wrapper.findComponent(Form).findAllComponents(Select);
      expect(selects.map((select) => select.props('disabled'))).toEqual([
        true,
        true,
      ]);
      expect(wrapper.findComponent(Popconfirm).props('disabled')).toBe(true);
      expect(wrapper.findComponent(Form).props('disabled')).toBe(false);
    },
  );
});

describe('公共卡面滚动分页', () => {
  function mockLayout(columns: number, height = 700) {
    vi.stubGlobal('innerHeight', height);
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      gridTemplateColumns: Array.from({ length: columns }, () => '280px').join(
        ' ',
      ),
      rowGap: '28px',
    } as CSSStyleDeclaration);
  }
  it.each([
    [1, 24],
    [2, 24],
    [3, 24],
    [5, 25],
    [6, 24],
    [7, 28],
  ])('%i 列布局首批按整行请求 %i 张', async (columns, size) => {
    mockLayout(columns);
    const pending = deferred<CoverTemplatePage>();
    api.listCoverTemplates.mockReturnValueOnce(pending.promise);
    const wrapper = await render();
    expect(api.listCoverTemplates).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, size }),
    );
    expect(wrapper.findAll('.cover-placeholder')).toHaveLength(size);
    pending.resolve(pageResult([{ ...original }]));
    await flushPromises();
    expect(wrapper.findAll('.cover-placeholder')).toHaveLength(0);
  });
  it('高屏首批覆盖可视区域，并遵守接口每页上限', async () => {
    mockLayout(5, 1800);
    const wrapper = await render();
    expect(api.listCoverTemplates).toHaveBeenLastCalledWith(
      expect.objectContaining({ size: 40 }),
    );
    vi.stubGlobal('innerHeight', 10_000);
    await wrapper.get('[aria-label="刷新卡面"]').trigger('click');
    expect(api.listCoverTemplates).toHaveBeenLastCalledWith(
      expect.objectContaining({ size: 100 }),
    );
  });
  it('窗口变宽后分页仍使用原批量，刷新才重新计算', async () => {
    mockLayout(5);
    api.listCoverTemplates.mockResolvedValueOnce(
      pageResult(
        Array.from({ length: 25 }, (_, i) => ({ ...original, id: String(i) })),
        100,
      ),
    );
    const wrapper = await render();
    mockLayout(6);
    const pending = deferred<CoverTemplatePage>();
    api.listCoverTemplates.mockReturnValueOnce(pending.promise);
    reachBottom();
    reachBottom();
    await flushPromises();
    expect(api.listCoverTemplates).toHaveBeenCalledTimes(2);
    expect(api.listCoverTemplates).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, size: 25 }),
    );
    expect(wrapper.findAll('.cover-item')).toHaveLength(25);
    expect(wrapper.findAll('.cover-placeholder')).toHaveLength(25);
    pending.reject(new Error('offline'));
    await flushPromises();
    expect(wrapper.findAll('.cover-placeholder')).toHaveLength(0);
    expect(wrapper.findAll('.cover-item')).toHaveLength(25);
    await wrapper.get('[aria-label="刷新卡面"]').trigger('click');
    expect(api.listCoverTemplates).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, size: 24 }),
    );
  });
  const firstPage = Array.from({ length: 24 }, (_, index) => ({
    ...original,
    id: String(index + 1),
    name: `卡面${index + 1}`,
  }));
  it('首屏只请求一页，触底去重并停止在末页', async () => {
    api.listCoverTemplates.mockResolvedValueOnce(pageResult(firstPage, 25));
    const wrapper = await render();
    expect(api.listCoverTemplates).toHaveBeenCalledTimes(1);
    expect(api.listCoverTemplates).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, size: 24 }),
    );
    const next = deferred<CoverTemplatePage>();
    api.listCoverTemplates.mockReturnValueOnce(next.promise);
    reachBottom();
    reachBottom();
    expect(api.listCoverTemplates).toHaveBeenCalledTimes(2);
    expect(api.listCoverTemplates).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
    expect(wrapper.findAll('.cover-item')).toHaveLength(24);
    next.resolve(pageResult([firstPage[23]!, { ...original, id: '25' }], 25));
    await flushPromises();
    expect(wrapper.findAll('.cover-item')).toHaveLength(25);
    reachBottom();
    expect(api.listCoverTemplates).toHaveBeenCalledTimes(2);
  });
  it('分页失败保留已有卡面，仅在底部重试失败页', async () => {
    api.listCoverTemplates.mockResolvedValueOnce(pageResult(firstPage, 48));
    const wrapper = await render();
    api.listCoverTemplates.mockRejectedValueOnce(new Error('offline'));
    reachBottom();
    await flushPromises();
    expect(wrapper.findAll('.cover-item')).toHaveLength(24);
    reachBottom();
    expect(api.listCoverTemplates).toHaveBeenCalledTimes(2);
    api.listCoverTemplates.mockResolvedValueOnce(pageResult([], 24));
    await wrapper.get('[aria-label="重试加载卡面"]').trigger('click');
    await flushPromises();
    expect(api.listCoverTemplates).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
    expect(wrapper.findAll('.cover-item')).toHaveLength(24);
    reachBottom();
    expect(api.listCoverTemplates).toHaveBeenCalledTimes(3);
  });
  it('筛选重置页码，旧分页响应不能混入新列表', async () => {
    api.listCoverTemplates.mockResolvedValueOnce(pageResult(firstPage, 48));
    const wrapper = await render();
    const old = deferred<CoverTemplatePage>();
    api.listCoverTemplates.mockReturnValueOnce(old.promise);
    reachBottom();
    api.listCoverTemplates.mockResolvedValueOnce(
      pageResult([
        { ...original, id: '99', cardType: 'credit', name: '信用卡面' },
      ]),
    );
    wrapper.findAllComponents(Select)[1]!.vm.$emit('update:value', 'credit');
    await flushPromises();
    expect(api.listCoverTemplates).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, cardType: 'credit' }),
    );
    old.resolve(pageResult([{ ...original, id: '25' }], 48));
    await flushPromises();
    expect(wrapper.findAll('.cover-item')).toHaveLength(1);
    expect(wrapper.text()).toContain('信用卡面');
  });
  it('离页后的响应不继续分页', async () => {
    const pending = deferred<CoverTemplatePage>();
    api.listCoverTemplates.mockReturnValueOnce(pending.promise);
    const wrapper = await render();
    wrapper.unmount();
    pending.resolve(pageResult(firstPage, 48));
    await flushPromises();
    reachBottom();
    expect(api.listCoverTemplates).toHaveBeenCalledTimes(1);
  });
});

describe('公共卡面排序保存', () => {
  it('方向键触发排序，保存时暂停分页并显示局部 loading，失败恢复', async () => {
    api.listCoverTemplates.mockResolvedValueOnce(
      pageResult([
        { ...original, id: '9007199254740993', name: '卡面甲', sortOrder: 0 },
        { ...original, id: '9007199254740994', name: '卡面乙', sortOrder: 10 },
      ]),
    );
    const wrapper = await render();
    const request = deferred<[]>();
    api.moveBankCardCover.mockReturnValueOnce(request.promise);
    await wrapper
      .findAll('.cover-item [role="button"]')[0]!
      .trigger('keydown', { key: 'ArrowDown' });
    expect(api.moveBankCardCover).toHaveBeenCalledWith({
      id: '9007199254740993',
      targetId: '9007199254740994',
      after: true,
    });
    expect(wrapper.findAll('.cover-name').map((node) => node.text())).toEqual([
      '卡面乙',
      '卡面甲',
    ]);
    expect(wrapper.find('.cover-item[aria-busy="true"]').exists()).toBe(true);
    reachBottom();
    expect(api.listCoverTemplates).toHaveBeenCalledTimes(1);
    request.reject(new Error('offline'));
    await flushPromises();
    expect(wrapper.findAll('.cover-name').map((node) => node.text())).toEqual([
      '卡面甲',
      '卡面乙',
    ]);
    expect(wrapper.find('.cover-item[aria-busy="true"]').exists()).toBe(false);
  });
});
