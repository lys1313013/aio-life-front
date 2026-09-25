<script setup lang="ts">
import type { TreeProps } from 'ant-design-vue';

import type { SysMenuAdminItem, SysMenuSaveReq } from '#/api/core/menu';

import { computed, onMounted, ref } from 'vue';

import { VbenIcon } from '@vben/common-ui';
import { useAccessStore, useUserStore } from '@vben/stores';

import {
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Popover,
  Select,
  Spin,
  Switch,
  Table,
  Tree,
  TreeSelect,
} from 'ant-design-vue';

import {
  createMenuApi,
  deleteMenuApi,
  getMenuAdminTreeApi,
  getMenuRoleOptionsApi,
  updateMenuApi,
  updateMenuSortApi,
  updateMenuStatusApi,
} from '#/api/core/menu';
import { resetRoutes, router } from '#/router';
import { generateAccess } from '#/router/access';
import { accessRoutes } from '#/router/routes';
import { useAuthStore } from '#/store';

const loading = ref(false);
const list = ref<SysMenuAdminItem[]>([]);

const isDragSortEnabled = ref(false);
const expandedRowKeys = ref<string[]>([]);
const expandedTreeKeys = ref<string[]>([]);
const selectedId = ref<null | string>(null);
const sortingIds = ref<string[]>([]);
const deletingIds = ref<string[]>([]);

const findMenu = (
  id: null | string,
  nodes = list.value,
): SysMenuAdminItem | undefined => {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findMenu(id, node.children ?? []);
    if (child) return child;
  }
};

const selectedMenu = computed(() => findMenu(selectedId.value));
const detailRows = computed(() =>
  selectedMenu.value ? [selectedMenu.value] : [],
);
const treeData = computed(() => {
  const build = (
    nodes: SysMenuAdminItem[],
  ): NonNullable<TreeProps['treeData']> =>
    nodes.map((node) => ({
      key: node.id,
      title: node.meta?.title || node.name,
      iconName: node.meta?.icon,
      inactive: node.status !== 1,
      children: node.children?.length ? build(node.children) : undefined,
    }));
  return build(list.value);
});
const selectMenu = (id: string) => {
  selectedId.value = id;
  if (!expandedRowKeys.value.includes(id)) expandedRowKeys.value.push(id);
};
const handleSelect: TreeProps['onSelect'] = (_keys, { node }) => {
  selectMenu(String(node.key));
};
const isBusy = (id: string) =>
  statusChanging.value[id] === true ||
  deletingIds.value.includes(id) ||
  sortingIds.value.includes(id);

const sortMenus = (nodes: SysMenuAdminItem[]) => {
  nodes.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
};
const removeMenu = (
  id: string,
  nodes = list.value,
): SysMenuAdminItem | undefined => {
  const index = nodes.findIndex((node) => node.id === id);
  if (index !== -1) return nodes.splice(index, 1)[0];
  for (const node of nodes) {
    const removed = removeMenu(id, node.children ?? []);
    if (removed) {
      if (!node.children?.length) delete node.children;
      return removed;
    }
  }
};
const applyMenu = (saved: SysMenuAdminItem) => {
  const previous = findMenu(saved.id);
  // Single-menu responses do not include descendants.
  const updated = { ...previous, ...saved, children: previous?.children };
  const parent =
    updated.parentId === '0' ? undefined : findMenu(updated.parentId);
  if (previous?.parentId === updated.parentId) {
    Object.assign(previous, updated);
  } else {
    removeMenu(updated.id);
    (parent ? (parent.children ??= []) : list.value).push(updated);
  }
  sortMenus(parent?.children ?? list.value);
};
const pruneExpandedKeys = () => {
  const ids = new Set(extractAllRowKeys(list.value));
  expandedTreeKeys.value = expandedTreeKeys.value.filter((id) => ids.has(id));
  expandedRowKeys.value = expandedRowKeys.value.filter((id) => ids.has(id));
};

const editVisible = ref(false);
const saving = ref(false);
const editingId = ref<null | string>(null);
const statusChanging = ref<Record<string, boolean>>({});
const accessStore = useAccessStore();
const userStore = useUserStore();
const authStore = useAuthStore();

const form = ref<SysMenuSaveReq>({
  name: '',
  path: '',
  parentId: '0',
  status: 1,
  sort: 0,
  roles: '',
  component: '',
  redirect: '',
  meta: {},
});

const metaTitle = ref('');
const metaIcon = ref('');
const metaText = ref('{}');

const protectedPaths = new Set(['/system', '/system/menu']);
const isProtectedMenu = (row: { path?: string }) =>
  protectedPaths.has(String(row?.path || ''));

type RoleOption = { label: string; value: string };
const roleOptions = ref<RoleOption[]>([]);
const roleOptionsLoading = ref(false);
const selectableRoleOptions = computed(() => roleOptions.value);

const selectedRoles = ref<string[]>([]);

const columnHelp: Record<string, string> = {
  path: '页面访问地址，如 /record/weread。',
  component: '对应的前端页面组件；BasicLayout 表示布局容器。',
  roles: '可访问此菜单的角色；留空表示不限制角色。',
};

const columns: any[] = [
  { title: '标题', key: 'title', width: 180 },
  {
    title: '路径',
    dataIndex: 'path',
    key: 'path',
    width: 200,
    ellipsis: true,
  },
  {
    title: '组件',
    dataIndex: 'component',
    key: 'component',
    ellipsis: true,
  },
  {
    title: '角色',
    dataIndex: 'roles',
    key: 'roles',
    width: 88,
    ellipsis: true,
  },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 64, align: 'center' },
  {
    title: '启用',
    dataIndex: 'status',
    key: 'status',
    width: 68,
    align: 'center',
  },
  { title: '操作', key: 'action', width: 88, align: 'center' },
];

const parseRoles = (raw?: string) => {
  if (!raw) return [];
  const t = raw.trim();
  if (!t) return [];
  return t
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
};

type ParentTreeNode = {
  children?: ParentTreeNode[];
  key: string;
  title: string;
  value: string;
};

const parentTreeOptions = computed<ParentTreeNode[]>(() => {
  const build = (nodes: SysMenuAdminItem[]): ParentTreeNode[] =>
    nodes
      .filter((x) => x.id !== editingId.value)
      .map((x) => ({
        key: String(x.id),
        title: x.meta?.title ?? x.name,
        value: String(x.id),
        children: x.children?.length ? build(x.children) : undefined,
      }));
  return [
    {
      key: '0',
      title: '根节点 (0)',
      value: '0',
      children: build(list.value),
    },
  ];
});

const load = async () => {
  loading.value = true;
  try {
    list.value = await getMenuAdminTreeApi();
    pruneExpandedKeys();
    if (selectedId.value && !selectedMenu.value) selectedId.value = null;
  } catch {
    // 全局拦截器已提示
  } finally {
    loading.value = false;
  }
};

const extractAllRowKeys = (nodes: SysMenuAdminItem[]): string[] => {
  let keys: string[] = [];
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      keys.push(String(node.id));
      keys = keys.concat(extractAllRowKeys(node.children));
    }
  }
  return keys;
};

const isAllExpanded = computed(() => {
  const keys = extractAllRowKeys(list.value);
  return (
    keys.length > 0 && keys.every((id) => expandedTreeKeys.value.includes(id))
  );
});

const toggleExpandAll = () => {
  expandedTreeKeys.value = isAllExpanded.value
    ? []
    : extractAllRowKeys(list.value);
};

const loadRoleOptions = async () => {
  roleOptionsLoading.value = true;
  try {
    const roles = await getMenuRoleOptionsApi();
    roleOptions.value = (roles || []).map((r) => ({ label: r, value: r }));
  } catch {
    // 全局拦截器已提示
    roleOptions.value = [
      { label: 'admin', value: 'admin' },
      { label: 'user', value: 'user' },
    ];
  } finally {
    roleOptionsLoading.value = false;
  }
};

const refreshAccessibleMenus = async () => {
  const userInfo = userStore.userInfo || (await authStore.fetchUserInfo());
  const userRoles = userInfo.roles ?? [];
  resetRoutes();
  const { accessibleMenus, accessibleRoutes: nextAccessRoutes } =
    await generateAccess({
      roles: userRoles,
      router,
      routes: accessRoutes,
    });
  accessStore.setAccessMenus(accessibleMenus);
  accessStore.setAccessRoutes(nextAccessRoutes);
  accessStore.setIsAccessChecked(true);
};

const openCreate = (parentId = '0') => {
  editingId.value = null;
  form.value = {
    name: '',
    path: '',
    parentId,
    status: 1,
    sort: 0,
    roles: '',
    component: '',
    redirect: '',
    meta: {},
  };
  selectedRoles.value = [];
  metaTitle.value = '';
  metaIcon.value = '';
  metaText.value = '{}';
  editVisible.value = true;
};

const openEdit = (row: any) => {
  const r = row as SysMenuAdminItem;
  editingId.value = String(r.id);
  form.value = {
    id: String(r.id),
    name: r.name,
    path: r.path,
    parentId: r.parentId ? String(r.parentId) : '0',
    status: r.status ?? 1,
    sort: r.sort ?? 0,
    roles: r.roles ?? '',
    component: r.component ?? '',
    redirect: r.redirect ?? '',
    meta: r.meta ?? {},
  };
  const roles = parseRoles(r.roles);
  selectedRoles.value = roles;
  const metaObj = { ...r.meta };
  metaTitle.value = metaObj.title || '';
  metaIcon.value = metaObj.icon || '';
  delete metaObj.title;
  delete metaObj.icon;
  metaText.value =
    Object.keys(metaObj).length > 0 ? JSON.stringify(metaObj, null, 2) : '{}';

  editVisible.value = true;
};

const isProtectedEditing = computed(() => isProtectedMenu(form.value));

const parseMeta = () => {
  const raw = (metaText.value || '').trim();
  if (!raw) return {};
  const obj = JSON.parse(raw) as any;
  if (obj == null || Array.isArray(obj) || typeof obj !== 'object') {
    throw new Error('meta 必须是 JSON 对象');
  }
  return obj as Record<string, any>;
};

const save = async () => {
  saving.value = true;
  try {
    const normalizedSelectedRoles = Array.from(
      new Set(selectedRoles.value.map((x) => x.trim()).filter(Boolean)),
    );
    const parsedMeta = parseMeta();
    if (metaTitle.value) parsedMeta.title = metaTitle.value.trim();
    if (metaIcon.value) parsedMeta.icon = metaIcon.value.trim();

    const payload: SysMenuSaveReq = {
      ...form.value,
      name: form.value.name?.trim(),
      path: form.value.path?.trim(),
      component: form.value.component?.trim(),
      redirect: form.value.redirect?.trim(),
      roles: normalizedSelectedRoles.join(','),
      meta: parsedMeta,
    };
    if (isProtectedMenu(payload)) {
      payload.status = 1;
    }
    if (!payload.name || !payload.path) {
      message.error('name/path 不能为空');
      return;
    }
    const saved =
      editingId.value == null
        ? await createMenuApi(payload)
        : await updateMenuApi(editingId.value, payload);
    applyMenu(saved);
    pruneExpandedKeys();
    if (editingId.value == null) {
      selectMenu(saved.id);
    }
    // Reveal the selected node after creation or a parent change.
    let ancestor = findMenu(selectedId.value)?.parentId;
    while (ancestor && ancestor !== '0') {
      if (!expandedTreeKeys.value.includes(ancestor))
        expandedTreeKeys.value.push(ancestor);
      if (!expandedRowKeys.value.includes(ancestor))
        expandedRowKeys.value.push(ancestor);
      ancestor = findMenu(ancestor)?.parentId;
    }
    editVisible.value = false;
    await refreshAccessibleMenus();
  } catch {
    // 全局拦截器已提示
  } finally {
    saving.value = false;
  }
};

const toggleStatus = async (row: Record<string, any>, status: number) => {
  const id = String(row.id);
  statusChanging.value = { ...statusChanging.value, [id]: true };
  try {
    const saved = await updateMenuStatusApi(id, status);
    applyMenu(saved);
    message.success(status === 1 ? '已启用' : '已禁用');
    await refreshAccessibleMenus();
  } catch {
    // 全局拦截器已提示
    await load();
  } finally {
    statusChanging.value = { ...statusChanging.value, [id]: false };
  }
};

const allowDrop: TreeProps['allowDrop'] = ({
  dragNode,
  dropNode,
  dropPosition,
}) => {
  const source = findMenu(String(dragNode.key));
  const target = findMenu(String(dropNode.key));
  return (
    sortingIds.value.length === 0 &&
    dropPosition !== 0 &&
    !!source &&
    !!target &&
    source.id !== target.id &&
    source.parentId === target.parentId
  );
};

const handleDrop: TreeProps['onDrop'] = async ({
  dragNode,
  node,
  dropPosition,
  dropToGap,
}) => {
  const source = findMenu(String(dragNode.key));
  const target = findMenu(String(node.key));
  if (
    !dropToGap ||
    !node.pos ||
    !source ||
    !target ||
    source.id === target.id ||
    source.parentId !== target.parentId ||
    sortingIds.value.length > 0
  )
    return;
  const siblings =
    source.parentId === '0' ? list.value : findMenu(source.parentId)?.children;
  if (!siblings || siblings.some((item) => isBusy(item.id))) return;
  const ordered = siblings.filter((item) => item.id !== source.id);
  const targetIndex = ordered.findIndex((item) => item.id === target.id);
  const position = dropPosition - Number(node.pos?.split('-').at(-1));
  ordered.splice(targetIndex + (position > 0 ? 1 : 0), 0, source);
  if (ordered.every((item, index) => item.id === siblings[index]?.id)) return;
  const firstSort = Math.min(...siblings.map((item) => item.sort ?? 0));
  const changes = ordered
    .map((item, index) => ({ item, sort: firstSort + index }))
    .filter(({ item, sort }) => item.sort !== sort);
  sortingIds.value = siblings.map((item) => item.id);
  try {
    // Wait for every request before recovering from a partially failed reorder.
    const results = await Promise.allSettled(
      changes.map(({ item, sort }) => updateMenuSortApi(item.id, sort)),
    );
    if (results.some((result) => result.status === 'rejected')) {
      await load();
    } else {
      changes.forEach(({ item, sort }) => {
        item.sort = sort;
      });
      siblings.splice(0, siblings.length, ...ordered);
    }
    await refreshAccessibleMenus();
  } catch {
    // 全局拦截器已提示
  } finally {
    sortingIds.value = [];
  }
};

const handleDelete = async (id: string) => {
  const row = findMenu(id);
  if (!row) return;
  deletingIds.value.push(row.id);
  try {
    await deleteMenuApi(row.id);
    const removedSelection = !!findMenu(selectedId.value, [row]);
    removeMenu(row.id);
    pruneExpandedKeys();
    if (removedSelection) {
      selectedId.value = null;
      if (findMenu(row.parentId)) selectMenu(row.parentId);
    }
    message.success('删除成功');
    await refreshAccessibleMenus();
  } catch {
    // 全局拦截器已提示
  } finally {
    deletingIds.value = deletingIds.value.filter((id) => id !== row.id);
  }
};

onMounted(() => {
  load();
  loadRoleOptions();
});
</script>

<template>
  <div class="menu-page p-3 md:p-4">
    <Spin :spinning="loading">
      <div class="menu-layout rounded-xl bg-background">
        <aside class="menu-sidebar min-w-0" aria-label="菜单导航">
          <div class="menu-toolbar justify-start">
            <Button
              :type="isDragSortEnabled ? 'primary' : 'text'"
              shape="circle"
              :aria-pressed="isDragSortEnabled"
              aria-label="拖拽排序"
              :title="isDragSortEnabled ? '关闭拖拽排序' : '开启拖拽排序'"
              :disabled="loading || sortingIds.length > 0"
              @click="isDragSortEnabled = !isDragSortEnabled"
            >
              <template #icon>
                <VbenIcon icon="lucide:grip-vertical" class="size-4" />
              </template>
            </Button>
            <Button
              type="text"
              shape="circle"
              :aria-label="isAllExpanded ? '全部折叠' : '全部展开'"
              :title="isAllExpanded ? '全部折叠' : '全部展开'"
              :disabled="loading"
              @click="toggleExpandAll"
            >
              <template #icon>
                <svg
                  class="size-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <template v-if="isAllExpanded">
                    <path
                      d="M4 2h16M4 22h16M12 4v6m-3-3 3 3 3-3M12 20v-6m-3 3 3-3 3 3"
                    />
                  </template>
                  <template v-else>
                    <path
                      d="M4 10h16M4 14h16M12 8V2m-3 3 3-3 3 3M12 16v6m-3-3 3 3 3-3"
                    />
                  </template>
                </svg>
              </template>
            </Button>
          </div>

          <div class="menu-tree-scroll">
            <Tree
              v-if="treeData.length > 0"
              class="menu-tree"
              :tree-data="treeData"
              :selected-keys="selectedId ? [selectedId] : []"
              v-model:expanded-keys="expandedTreeKeys"
              :draggable="isDragSortEnabled && sortingIds.length === 0"
              :allow-drop="allowDrop"
              block-node
              @select="handleSelect"
              @drop="handleDrop"
            >
              <template #title="{ key, title, iconName, inactive }">
                <span
                  class="inline-flex max-w-full items-center gap-2"
                  :class="{ 'text-muted-foreground': inactive }"
                >
                  <Spin v-if="isBusy(String(key))" size="small" />
                  <VbenIcon
                    v-else-if="iconName"
                    :icon="iconName"
                    class="size-4 shrink-0"
                  />
                  <span class="truncate" :title="title">{{ title }}</span>
                </span>
              </template>
            </Tree>
            <Empty
              v-else-if="!loading"
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
              description="暂无菜单"
            />
          </div>
        </aside>
        <section class="menu-detail min-w-0" aria-label="菜单明细">
          <div class="menu-toolbar justify-end">
            <Button
              type="text"
              shape="circle"
              aria-label="新增子菜单"
              title="新增子菜单"
              :disabled="!selectedMenu || isBusy(selectedMenu.id)"
              @click="selectedMenu && openCreate(selectedMenu.id)"
            >
              <template #icon>
                <VbenIcon icon="lucide:folder-plus" class="size-4" />
              </template>
            </Button>
            <Button
              type="text"
              shape="circle"
              aria-label="新增菜单"
              title="新增菜单"
              @click="openCreate()"
            >
              <template #icon>
                <VbenIcon icon="lucide:plus" class="size-4" />
              </template>
            </Button>
          </div>
          <Table
            class="menu-table"
            size="small"
            :data-source="detailRows"
            :columns="columns"
            :pagination="false"
            row-key="id"
            v-model:expanded-row-keys="expandedRowKeys"
            table-layout="fixed"
            :scroll="{ x: 920 }"
            :row-class-name="
              (record: SysMenuAdminItem) =>
                record.id === selectedId ? 'menu-selected-row' : ''
            "
          >
            <template #emptyText>
              <Empty
                :image="Empty.PRESENTED_IMAGE_SIMPLE"
                :description="
                  loading ? false : list.length > 0 ? '请选择菜单' : '暂无菜单'
                "
              />
            </template>
            <template #headerCell="{ column }">
              <span class="inline-flex items-center gap-1">
                {{ column.title }}
                <Popover
                  v-if="columnHelp[String(column.key)]"
                  :content="columnHelp[String(column.key)]"
                  :trigger="['hover', 'focus', 'click']"
                >
                  <button
                    type="button"
                    class="inline-flex size-6 items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    :aria-label="`${column.title}说明`"
                  >
                    <VbenIcon icon="lucide:circle-help" class="size-3.5" />
                  </button>
                </Popover>
              </span>
            </template>
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'title'">
                <div class="flex items-center gap-2">
                  <VbenIcon
                    v-if="record.meta?.icon"
                    :icon="record.meta.icon"
                    class="size-4 flex-shrink-0 text-foreground"
                  />
                  <div>
                    <div class="font-medium">
                      {{ record.meta?.title ?? record.name }}
                    </div>
                  </div>
                </div>
              </template>
              <template v-else-if="column.key === 'status'">
                <Switch
                  :checked="record.status === 1"
                  :loading="statusChanging[record.id] === true"
                  :disabled="isProtectedMenu(record) || isBusy(record.id)"
                  @change="toggleStatus(record, $event ? 1 : 0)"
                />
              </template>
              <template v-else-if="column.key === 'sort'">
                <span class="tabular-nums">{{ record.sort }}</span>
              </template>
              <template v-else-if="column.key === 'action'">
                <div class="flex items-center justify-center gap-1">
                  <Button
                    size="small"
                    type="link"
                    :disabled="isBusy(record.id)"
                    @click="openEdit(record)"
                    aria-label="编辑菜单"
                    title="编辑"
                  >
                    <template #icon>
                      <VbenIcon icon="lucide:edit" class="size-4" />
                    </template>
                  </Button>
                  <Popconfirm
                    :title="`确定要删除「${record.meta?.title || record.name}」吗？`"
                    @confirm="handleDelete(record.id)"
                  >
                    <Button
                      danger
                      size="small"
                      type="link"
                      :loading="deletingIds.includes(record.id)"
                      :disabled="isProtectedMenu(record) || isBusy(record.id)"
                      aria-label="删除菜单"
                      title="删除"
                    >
                      <template #icon>
                        <VbenIcon icon="lucide:trash-2" class="size-4" />
                      </template>
                    </Button>
                  </Popconfirm>
                </div>
              </template>
            </template>
          </Table>
        </section>
      </div>
    </Spin>

    <Modal
      v-model:open="editVisible"
      :title="editingId == null ? '新增菜单' : '编辑菜单'"
      :confirm-loading="saving"
      :width="820"
      centered
      @ok="save"
    >
      <Form layout="vertical">
        <div class="mb-3 rounded-md bg-muted/30 p-3">
          <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item label="菜单名称">
              <Input v-model:value="metaTitle" placeholder="例如 时间管理" />
            </Form.Item>
            <Form.Item label="路由名称">
              <Input
                v-model:value="form.name"
                placeholder="例如 TimeManagement"
              />
            </Form.Item>
          </div>
          <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item label="父节点">
              <TreeSelect
                v-model:value="form.parentId"
                :tree-data="parentTreeOptions"
                tree-default-expand-all
                show-search
                allow-clear
              />
            </Form.Item>
            <Form.Item label="路由">
              <Input
                v-model:value="form.path"
                placeholder="例如 /time-management"
              />
            </Form.Item>
          </div>
          <Form.Item label="前端组件">
            <Input
              v-model:value="form.component"
              placeholder="例如 BasicLayout 或 system/menu/index"
            />
          </Form.Item>
          <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item label="菜单图标">
              <div class="flex items-center gap-2">
                <div
                  class="flex size-8 shrink-0 items-center justify-center rounded-md border border-stone-200 text-lg text-stone-600 dark:border-stone-700 dark:text-stone-300"
                  title="图标预览"
                >
                  <VbenIcon
                    v-if="metaIcon.trim()"
                    :icon="metaIcon.trim()"
                    class="size-5"
                    data-testid="menu-icon-preview"
                  />
                </div>
                <Input
                  v-model:value="metaIcon"
                  class="min-w-0 flex-1"
                  placeholder="例如 mdi:clock-outline"
                />
              </div>
            </Form.Item>
            <Form.Item label="Roles（空=所有人可见）">
              <Select
                v-model:value="selectedRoles"
                mode="multiple"
                :options="selectableRoleOptions"
                :loading="roleOptionsLoading"
                allow-clear
                placeholder="选择可访问角色"
              />
              <div class="mt-1 text-xs text-stone-400">
                留空表示所有人可见；选择后表示仅所选角色可见。
              </div>
            </Form.Item>
          </div>
          <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item label="排序 sort">
              <InputNumber
                v-model:value="form.sort"
                class="w-full"
                :min="-9999"
                :max="9999"
              />
            </Form.Item>
            <Form.Item label="启用状态">
              <Switch
                v-model:checked="form.status"
                :checked-value="1"
                :un-checked-value="0"
                :disabled="isProtectedEditing"
                checked-children="启用"
                un-checked-children="禁用"
              />
            </Form.Item>
          </div>
        </div>

        <div class="rounded-md bg-muted/30 p-3">
          <div class="mb-2 text-sm font-semibold">Meta 配置（JSON）</div>
          <div class="mb-2 text-xs text-stone-400">
            其他高级字段：order / hideInMenu / keepAlive / link
          </div>
          <Form.Item class="!mb-0">
            <Input.TextArea
              v-model:value="metaText"
              :auto-size="{ minRows: 7, maxRows: 14 }"
              class="font-mono"
              placeholder="{'order': 1, 'hideInMenu': false}"
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  </div>
</template>

<style scoped>
.menu-page {
  max-width: 1600px;
  margin-inline: auto;
}

.menu-layout {
  display: grid;
  grid-template-columns: 208px minmax(0, 1fr);
  gap: 24px;
  padding: 12px;
}

.menu-toolbar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  height: 36px;
  margin-bottom: 8px;
  gap: 4px;
}

.menu-sidebar {
  position: sticky;
  top: 12px;
  display: flex;
  flex-direction: column;
  align-self: start;
  max-height: calc(100dvh - 180px);
}

.menu-tree-scroll {
  min-height: 0;
  overflow: auto;
}

.menu-tree {
  background: transparent;
}

.menu-tree :deep(.ant-tree-node-content-wrapper) {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  border-radius: 6px;
}

.menu-tree :deep(.ant-tree-title) {
  display: block;
}

.menu-tree :deep(.ant-tree-treenode) {
  padding-bottom: 4px;
}

.menu-table :deep(.ant-table) {
  border-radius: 8px;
}

.menu-table :deep(.ant-table-thead > tr > th) {
  color: hsl(var(--muted-foreground));
  font-weight: 500;
  background: hsl(var(--muted) / 55%);
}

.menu-table :deep(.menu-selected-row > td) {
  background: hsl(var(--primary) / 4%);
}

.menu-table :deep(.ant-table-placeholder .ant-empty) {
  margin-block: 64px;
}

@media (min-width: 768px) and (max-width: 1199px) {
  .menu-layout {
    grid-template-columns: 176px minmax(0, 1fr);
    gap: 16px;
  }
}

@media (max-width: 767px) {
  .menu-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }

  .menu-sidebar {
    position: static;
    max-height: 240px;
  }
}

.menu-table :deep(table) {
  border-collapse: collapse;
}

.menu-table :deep(.ant-table-cell),
.menu-table :deep(.ant-table-container),
.menu-table :deep(.ant-table-tbody),
.menu-table :deep(.ant-table-thead),
.menu-table :deep(.ant-table-tbody > tr),
.menu-table :deep(.ant-table-thead > tr) {
  border: 0 !important;
}

.menu-table :deep(.ant-table-thead > tr > th::before) {
  display: none !important;
}
</style>
