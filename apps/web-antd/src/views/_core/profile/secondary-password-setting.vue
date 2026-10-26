<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

import { useAccessStore } from '@vben/stores';

import { Button, message, Spin, Tree } from 'ant-design-vue';

import {
  getSecondaryLockMenusApi,
  getSecondaryPasswordStatusApi,
} from '#/api/core/auth';
import { getAllMenusApi } from '#/api/core/menu';
import { AppModal as Modal } from '#/components/app-modal';
import NumericPasswordPad from '#/components/NumericPasswordPad.vue';
import SecondaryPasswordEditor from '#/components/SecondaryPasswordEditor.vue';
import { useSecondaryLockStore } from '#/store/secondary-lock';
// ── 菜单锁选择 ──
interface MenuTreeNode {
  key: string;
  title: string;
  children?: MenuTreeNode[];
}

const treeData = ref<MenuTreeNode[]>([]);
const checkedKeys = ref<string[]>([]);
const menuLoading = ref(true);
const menuSaving = ref(false);

// 保存菜单锁弹窗
const saveModalOpen = ref(false);
const savePassword = ref('');

// 二级密码设置弹窗
const pwdModalOpen = ref(false);

async function loadMenuList() {
  try {
    const tree = await getAllMenusApi();
    treeData.value = buildTree(tree);
  } finally {
    menuLoading.value = false;
  }
}

function buildTree(nodes: any[]): MenuTreeNode[] {
  return (nodes || [])
    .filter((n) => n.meta?.menuId != null && n.meta?.title)
    .map((n) => ({
      key: String(n.meta.menuId),
      title: n.meta.title,
      children: n.children?.length ? buildTree(n.children) : undefined,
    }));
}

async function loadCheckedMenus() {
  try {
    const ids = await getSecondaryLockMenusApi();
    checkedKeys.value = ids.map(String);
  } catch (error) {
    console.error('加载菜单锁失败', error);
  }
}

function getCheckedIds(): string[] {
  return [...checkedKeys.value];
}

function onCheck(keys: Array<number | string>) {
  checkedKeys.value = keys.map(String);
}

function openSaveModal() {
  savePassword.value = '';
  saveModalOpen.value = true;
}

async function handleSaveMenus() {
  if (!/^\d{4,}$/.test(savePassword.value)) {
    message.error('至少输入 4 位纯数字');
    return;
  }
  menuSaving.value = true;
  try {
    const ids = getCheckedIds();
    await useSecondaryLockStore().saveLockedMenus(ids, savePassword.value);
    message.success('菜单锁已保存');
    saveModalOpen.value = false;
    savePassword.value = '';
  } catch {
    // 请求客户端统一提示，保留密码以便重试。
  } finally {
    menuSaving.value = false;
  }
}

const hasPassword = ref(false);
const passwordLoading = ref(true);
const editorMode = ref<'change' | 'create' | 'recovery'>('create');
const access = useAccessStore();
watch(
  () => access.accessToken,
  () => {
    saveModalOpen.value = false;
    pwdModalOpen.value = false;
    savePassword.value = '';
  },
);
watch(saveModalOpen, () => {
  savePassword.value = '';
});
function openPwdModal(recovery = false) {
  saveModalOpen.value = false;
  editorMode.value = recovery
    ? 'recovery'
    : hasPassword.value
      ? 'change'
      : 'create';
  pwdModalOpen.value = true;
}
onMounted(async () => {
  try {
    const [status] = await Promise.all([
      getSecondaryPasswordStatusApi(),
      loadMenuList(),
      loadCheckedMenus(),
    ]);
    hasPassword.value = status.hasPassword;
  } finally {
    passwordLoading.value = false;
  }
});
</script>
<template>
  <div class="max-w-lg space-y-8">
    <!-- 菜单锁（主功能） -->
    <div class="rounded-lg border border-border bg-card p-4">
      <h3 class="mb-1 text-base font-medium">菜单锁</h3>
      <p class="mb-2 text-sm text-muted-foreground">
        勾选的菜单在访问时需要输入二级密码解锁
      </p>
      <Spin :spinning="menuLoading">
        <div class="max-h-80 overflow-y-auto">
          <Tree
            :checked-keys="checkedKeys"
            :tree-data="treeData"
            checkable
            :selectable="false"
            :default-expand-all="false"
            block-line
            @update:checked-keys="onCheck"
          />
          <div
            v-if="treeData.length === 0 && !menuLoading"
            class="py-4 text-center text-sm text-muted-foreground"
          >
            暂无菜单数据
          </div>
        </div>
      </Spin>
      <div class="mt-3">
        <Button type="primary" block @click="openSaveModal">
          保存菜单锁
        </Button>
        <p
          v-if="!hasPassword && !passwordLoading"
          class="mt-2 text-center text-sm text-muted-foreground"
        >
          尚未设置二级密码，请先在下方「二级密码」卡片设置
        </p>
      </div>
    </div>

    <!-- 二级密码设置 -->
    <div class="rounded-lg border border-border bg-card p-4">
      <h3 class="mb-1 text-base font-medium">二级密码</h3>
      <p class="mb-4 text-sm text-muted-foreground">
        菜单锁解锁所需密码，可在此设置或修改
      </p>
      <Button type="default" block @click="openPwdModal(false)">
        {{ hasPassword ? '修改二级密码' : '设置二级密码' }}
      </Button>
      <div class="mt-2 text-right">
        <a
          v-if="hasPassword"
          class="cursor-pointer text-sm text-muted-foreground hover:underline"
          @click="openPwdModal(true)"
        >
          忘记二级密码？
        </a>
      </div>
    </div>

    <SecondaryPasswordEditor
      v-model:open="pwdModalOpen"
      :mode="editorMode"
      @saved="hasPassword = true"
    />
    <Modal
      v-model:open="saveModalOpen"
      :width="320"
      :footer="false"
      :busy="menuSaving"
      :body-style="{ padding: '16px' }"
      title="保存菜单锁"
    >
      <NumericPasswordPad
        v-model:value="savePassword"
        title="二级密码"
        :busy="menuSaving"
        recovery
        @submit="handleSaveMenus"
        @recover="openPwdModal(true)"
      />
    </Modal>
  </div>
</template>
