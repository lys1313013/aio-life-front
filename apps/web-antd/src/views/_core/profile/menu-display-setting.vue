<script setup lang="ts">
import type { MenuRecordRaw } from '@vben/types';

import type { UserMenuOption, UserMenuPreference } from '#/api/core/menu';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { VbenIcon } from '@vben/common-ui';
import { useAccessStore } from '@vben/stores';
import { generateMenus, mapTree } from '@vben/utils';

import {
  Button,
  Checkbox,
  Empty,
  message,
  Popconfirm,
  Spin,
} from 'ant-design-vue';

import {
  getMenuPreferencesApi,
  resetMenuPreferencesApi,
  saveMenuPreferencesApi,
} from '#/api/core/menu';
import { $t } from '#/locales';
import { useSecondaryLockStore } from '#/store/secondary-lock';
import { filterVisibleMenus } from '#/utils/menu-visibility';

const router = useRouter();
const accessStore = useAccessStore();
const secondaryLockStore = useSecondaryLockStore();
const loading = ref(true);
const saving = ref(false);
const resetting = ref(false);
const failed = ref(false);
const menus = ref<UserMenuOption[]>([]);
const checkedKeys = ref<string[]>([]);
const savedHiddenIds = ref<string[]>([]);
const busy = computed(() => saving.value || resetting.value);

// 从完整授权菜单取图标，已隐藏的项也能显示；复用侧边栏的图标配置。
const menuIcons = computed(() => {
  const icons = new Map<string, MenuRecordRaw['icon']>();
  function collect(items: MenuRecordRaw[]) {
    for (const item of items) {
      if (item.menuId != null && item.icon) {
        icons.set(String(item.menuId), item.icon);
      }
      if (item.children) collect(item.children);
    }
  }
  collect(generateMenus(accessStore.accessRoutes, router));
  return icons;
});

function leafIds(items: UserMenuOption[]): string[] {
  return items.flatMap((item) =>
    item.children.length > 0 ? leafIds(item.children) : [item.id],
  );
}

const hiddenIds = computed(() => {
  const checked = new Set(checkedKeys.value);
  return leafIds(menus.value).filter((id) => !checked.has(id));
});
const dirty = computed(() => {
  const saved = new Set(savedHiddenIds.value);
  return (
    hiddenIds.value.length !== saved.size ||
    hiddenIds.value.some((id) => !saved.has(id))
  );
});
function menuOptions(
  items: UserMenuOption[],
  parents: string[] = [],
): { icon?: MenuRecordRaw['icon']; id: string; title: string }[] {
  return items.flatMap((item) => {
    const titles = [...parents, $t(item.title)];
    return item.children.length > 0
      ? menuOptions(item.children, titles)
      : [
          {
            icon: menuIcons.value.get(item.id),
            id: item.id,
            title: titles.join(' / '),
          },
        ];
  });
}
const checkedIds = computed(() => new Set(checkedKeys.value));
const groups = computed(() =>
  menus.value.map((menu) => {
    const ids = leafIds([menu]);
    const selected = ids.filter((id) => checkedIds.value.has(id)).length;
    return {
      checked: selected === ids.length,
      icon: menuIcons.value.get(menu.id),
      id: menu.id,
      ids,
      indeterminate: selected > 0 && selected < ids.length,
      options: menuOptions(menu.children),
      title: $t(menu.title),
    };
  }),
);

function toggleMenus(ids: string[], checked: boolean) {
  const next = new Set(checkedKeys.value);
  for (const id of ids) {
    if (checked) next.add(id);
    else next.delete(id);
  }
  checkedKeys.value = [...next];
}

function applyPreferences(preference: UserMenuPreference) {
  menus.value = preference.menus;
  savedHiddenIds.value = preference.hiddenMenuIds;
  const hidden = new Set(preference.hiddenMenuIds);
  checkedKeys.value = leafIds(preference.menus).filter((id) => !hidden.has(id));

  // 从完整授权路由重新生成菜单，已隐藏的项可恢复，页面和标签无需关闭。
  const allMenus = generateMenus(accessStore.accessRoutes, router);
  const visible = filterVisibleMenus(allMenus, preference.hiddenMenuIds);
  accessStore.setAccessMenus(
    mapTree(visible, (menu) => ({
      ...menu,
      secondaryLock:
        menu.menuId != null && secondaryLockStore.isMenuLocked(menu.menuId),
    })),
  );
}

async function load() {
  loading.value = true;
  failed.value = false;
  try {
    applyPreferences(await getMenuPreferencesApi());
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    applyPreferences(await saveMenuPreferencesApi(hiddenIds.value));
    message.success('已保存');
  } catch {
    // 请求层显示错误，保留用户勾选以便重试。
  } finally {
    saving.value = false;
  }
}

async function reset() {
  resetting.value = true;
  try {
    applyPreferences(await resetMenuPreferencesApi());
    message.success('已恢复默认');
  } catch {
    // 请求层显示错误，保留原状态。
  } finally {
    resetting.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="menu-display-settings flex w-full min-w-0 flex-col">
    <Spin :spinning="loading">
      <div class="flex min-h-0 flex-1 flex-col">
        <div v-if="failed" class="flex items-center gap-3 py-4">
          <span class="text-muted-foreground">加载失败</span>
          <Button @click="load">重试</Button>
        </div>
        <template v-else-if="!loading">
          <div
            class="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3"
          >
            <span class="text-base font-medium">菜单显示</span>
            <div class="flex items-center gap-2">
              <Popconfirm
                title="恢复默认菜单显示设置？"
                placement="topRight"
                :disabled="busy"
                @confirm="reset"
              >
                <Button type="text" :loading="resetting" :disabled="saving">
                  恢复默认
                </Button>
              </Popconfirm>
              <Button
                type="primary"
                :loading="saving"
                :disabled="!dirty || resetting"
                @click="save"
              >
                保存
              </Button>
            </div>
          </div>
          <div
            v-if="menus.length > 0"
            class="menu-display-scroll min-h-0 overflow-y-auto overscroll-contain"
          >
            <section
              v-for="group in groups"
              :key="group.id"
              :aria-label="group.title"
              class="menu-group"
            >
              <Checkbox
                :checked="group.checked"
                :indeterminate="group.indeterminate"
                :disabled="busy"
                class="menu-group-title"
                @update:checked="toggleMenus(group.ids, $event)"
              >
                <span class="menu-label">
                  <VbenIcon
                    v-if="group.icon"
                    :icon="group.icon"
                    class="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span>{{ group.title }}</span>
                </span>
              </Checkbox>
              <div v-if="group.options.length > 0" class="menu-group-options">
                <Checkbox
                  v-for="option in group.options"
                  :key="option.id"
                  :checked="checkedIds.has(option.id)"
                  :disabled="busy"
                  class="menu-option"
                  :class="{ 'menu-option-wide': option.title.length > 8 }"
                  @update:checked="toggleMenus([option.id], $event)"
                >
                  <span class="menu-label">
                    <VbenIcon
                      v-if="option.icon"
                      :icon="option.icon"
                      class="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span>{{ option.title }}</span>
                  </span>
                </Checkbox>
              </div>
            </section>
          </div>
          <Empty v-else description="暂无可配置菜单" />
        </template>
      </div>
    </Spin>
  </div>
</template>

<style scoped>
.menu-display-settings {
  container-type: inline-size;

  /* 扣除顶栏（含标签栏）、页脚及个人中心卡片的上下内边距。 */
  max-height: calc(
    100dvh - var(--vben-header-height, 0px) - var(--vben-footer-height, 0px) -
      4rem
  );
  min-height: 6rem;
}

.menu-display-settings :deep(.ant-spin-nested-loading),
.menu-display-settings :deep(.ant-spin-container) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

@media (min-width: 1024px) {
  .menu-display-settings {
    max-height: calc(
      100dvh - var(--vben-header-height, 0px) - var(--vben-footer-height, 0px) -
        6rem
    );
  }
}

.menu-display-scroll {
  padding-right: 4px;
  scrollbar-gutter: stable;
}

.menu-group {
  display: grid;
  gap: 4px 20px;
  padding-block: 8px;
}

.menu-group:first-child {
  padding-top: 0;
}

.menu-group-title {
  align-self: start;
  padding-block: 7px;
  font-weight: 600;
}

.menu-group-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 8px;
}

.menu-option {
  min-width: 0;
  min-height: 36px;
  padding: 7px 8px;
  margin-inline-start: 0;
  overflow-wrap: anywhere;
  border-radius: 6px;
  transition: background-color 0.15s;
}

.menu-option:hover {
  background: hsl(var(--accent));
}

.menu-label {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
  vertical-align: middle;
}

.menu-option-wide {
  grid-column: 1 / -1;
}

@container (min-width: 440px) {
  .menu-group-options {
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  }

  .menu-option-wide {
    grid-column: auto;
  }
}

@container (min-width: 560px) {
  .menu-group {
    grid-template-columns: 120px minmax(0, 1fr);
  }
}
</style>
