<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';

import { useUserStore } from '@vben/stores';

import {
  Button,
  Form,
  FormItem,
  Input,
  message,
  Modal,
  Spin,
  Tree,
} from 'ant-design-vue';

import {
  getSecondaryLockMenusApi,
  getSecondaryPasswordStatusApi,
  resetSecondaryPasswordApi,
  sendResetSecondaryPasswordCodeApi,
  setSecondaryPasswordApi,
} from '#/api/core/auth';
import { getAllMenusApi } from '#/api/core/menu';
import MaskedPasswordInput from '#/components/MaskedPasswordInput.vue';
import { useSecondaryLockStore } from '#/store/secondary-lock';

// ── 菜单锁选择 ──
interface MenuTreeNode {
  key: number | string;
  title: string;
  children?: MenuTreeNode[];
}

const treeData = ref<MenuTreeNode[]>([]);
const checkedKeys = ref<Array<number | string>>([]);
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
      key: Number(n.meta.menuId),
      title: n.meta.title,
      children: n.children?.length ? buildTree(n.children) : undefined,
    }));
}

async function loadCheckedMenus() {
  try {
    const ids = await getSecondaryLockMenusApi();
    checkedKeys.value = ids.map(Number);
  } catch (error) {
    console.error('加载菜单锁失败', error);
  }
}

function getCheckedIds(): number[] {
  return checkedKeys.value.map(Number);
}

function onCheck(keys: Array<number | string>) {
  checkedKeys.value = keys;
}

function openSaveModal() {
  savePassword.value = '';
  saveModalOpen.value = true;
}

async function handleSaveMenus() {
  if (!savePassword.value) {
    message.error('请输入二级密码');
    return;
  }
  menuSaving.value = true;
  try {
    const ids = getCheckedIds();
    await useSecondaryLockStore().saveLockedMenus(ids, savePassword.value);
    message.success('菜单锁已保存');
    saveModalOpen.value = false;
    savePassword.value = '';
  } catch (error: any) {
    message.error(error?.message || '保存失败');
  } finally {
    menuSaving.value = false;
  }
}

// ── 二级密码设置 ──
const userStore = useUserStore();
const userEmail = computed(() => userStore.userInfo?.email ?? '');

const hasPassword = ref(false);
const passwordLoading = ref(true);
const passwordSubmitting = ref(false);

const pwdForm = reactive({
  oldPassword: '',
  password: '',
  confirmPassword: '',
});

// 找回密码模式
const showRecovery = ref(false);
const recoverySending = ref(false);
const recoverySubmitting = ref(false);
const recoveryCode = ref('');
const recoveryPassword = ref('');
const recoveryConfirm = ref('');

onMounted(async () => {
  try {
    const [status] = await Promise.all([
      getSecondaryPasswordStatusApi(),
      loadMenuList(),
    ]);
    hasPassword.value = status.hasPassword;
  } finally {
    passwordLoading.value = false;
  }
});

function openPwdModal(recovery = false) {
  showRecovery.value = recovery;
  pwdModalOpen.value = true;
}

async function handleSetPassword() {
  if (!pwdForm.password) {
    message.error('请输入密码');
    return;
  }
  if (pwdForm.password !== pwdForm.confirmPassword) {
    message.error('两次输入的密码不一致');
    return;
  }
  passwordSubmitting.value = true;
  try {
    await setSecondaryPasswordApi({
      oldPassword: hasPassword.value ? pwdForm.oldPassword : undefined,
      password: pwdForm.password,
    });
    message.success(
      hasPassword.value ? '二级密码修改成功' : '二级密码设置成功',
    );
    hasPassword.value = true;
    pwdForm.oldPassword = '';
    pwdForm.password = '';
    pwdForm.confirmPassword = '';
  } catch (error: any) {
    message.error(error?.message || '操作失败');
  } finally {
    passwordSubmitting.value = false;
  }
}

// ── 邮件找回 ──
async function handleSendRecoveryCode() {
  recoverySending.value = true;
  try {
    await sendResetSecondaryPasswordCodeApi();
    message.success(`验证码已发送到 ${userEmail.value}`);
  } catch (error: any) {
    message.error(error?.message || '发送失败');
  } finally {
    recoverySending.value = false;
  }
}

async function handleResetPassword() {
  if (!recoveryCode.value) {
    message.error('请输入验证码');
    return;
  }
  if (!recoveryPassword.value) {
    message.error('请输入新密码');
    return;
  }
  if (recoveryPassword.value !== recoveryConfirm.value) {
    message.error('两次输入的密码不一致');
    return;
  }
  recoverySubmitting.value = true;
  try {
    await resetSecondaryPasswordApi({
      code: recoveryCode.value,
      password: recoveryPassword.value,
    });
    message.success('二级密码已重置');
    showRecovery.value = false;
    recoveryCode.value = '';
    recoveryPassword.value = '';
    recoveryConfirm.value = '';
  } catch (error: any) {
    message.error(error?.message || '重置失败');
  } finally {
    recoverySubmitting.value = false;
  }
}

loadCheckedMenus();
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
      <div class="mt-2 text-center">
        <a
          v-if="hasPassword"
          class="cursor-pointer text-sm text-muted-foreground hover:underline"
          @click="openPwdModal(true)"
        >
          忘记二级密码？
        </a>
      </div>
    </div>

    <!-- 二级密码设置弹窗 -->
    <Modal
      v-model:open="pwdModalOpen"
      :centered="true"
      :footer="null"
      title="二级密码设置"
    >
      <Spin :spinning="passwordLoading">
        <a-alert
          v-if="!hasPassword && !passwordLoading"
          class="mb-4"
          message="尚未设置二级密码，设置后可为菜单加锁保护"
          type="info"
          show-icon
        />
        <Form :model="pwdForm" layout="vertical" @finish="handleSetPassword">
          <FormItem
            v-if="hasPassword"
            label="旧二级密码"
            name="oldPassword"
            :rules="[{ required: true, message: '请输入旧密码' }]"
          >
            <MaskedPasswordInput
              v-model:value="pwdForm.oldPassword"
              placeholder="请输入旧二级密码"
            />
          </FormItem>
          <FormItem
            :label="hasPassword ? '新二级密码' : '二级密码'"
            name="password"
            :rules="[{ required: true, message: '请输入密码' }]"
          >
            <MaskedPasswordInput
              v-model:value="pwdForm.password"
              placeholder="请输入二级密码"
            />
          </FormItem>
          <FormItem
            label="确认密码"
            name="confirmPassword"
            :rules="[{ required: true, message: '请再次输入' }]"
          >
            <MaskedPasswordInput
              v-model:value="pwdForm.confirmPassword"
              placeholder="请再次输入"
            />
          </FormItem>
          <FormItem>
            <Button
              type="primary"
              html-type="submit"
              :loading="passwordSubmitting"
              block
            >
              {{ hasPassword ? '修改二级密码' : '设置二级密码' }}
            </Button>
          </FormItem>
        </Form>

        <!-- 忘记密码 -->
        <div v-if="hasPassword" class="text-center">
          <a
            v-if="!showRecovery"
            class="cursor-pointer text-sm text-muted-foreground hover:underline"
            @click="showRecovery = true"
          >
            忘记二级密码？
          </a>
          <div v-else class="mt-4 border-t border-border pt-4">
            <p class="mb-3 text-sm text-muted-foreground">
              验证码将发送至 {{ userEmail }}
            </p>
            <Form layout="vertical" @finish="handleResetPassword">
              <FormItem
                label="验证码"
                name="code"
                :rules="[{ required: true, message: '请输入验证码' }]"
              >
                <Input
                  v-model:value="recoveryCode"
                  placeholder="请输入邮箱收到的验证码"
                >
                  <template #suffix>
                    <Button
                      type="link"
                      size="small"
                      :loading="recoverySending"
                      @click="handleSendRecoveryCode"
                    >
                      发送验证码
                    </Button>
                  </template>
                </Input>
              </FormItem>
              <FormItem
                label="新密码"
                name="password"
                :rules="[{ required: true, message: '请输入新密码' }]"
              >
                <MaskedPasswordInput
                  v-model:value="recoveryPassword"
                  placeholder="请输入新二级密码"
                />
              </FormItem>
              <FormItem
                label="确认密码"
                name="confirm"
                :rules="[{ required: true, message: '请再次输入' }]"
              >
                <MaskedPasswordInput
                  v-model:value="recoveryConfirm"
                  placeholder="请再次输入"
                />
              </FormItem>
              <FormItem>
                <Button
                  type="primary"
                  html-type="submit"
                  :loading="recoverySubmitting"
                  block
                >
                  重置二级密码
                </Button>
              </FormItem>
            </Form>
            <a
              class="cursor-pointer text-sm text-muted-foreground hover:underline"
              @click="showRecovery = false"
            >
              返回
            </a>
          </div>
        </div>
      </Spin>
    </Modal>

    <!-- 保存菜单锁：验证二级密码弹窗 -->
    <Modal
      v-model:open="saveModalOpen"
      :centered="true"
      :closable="false"
      :confirm-loading="menuSaving"
      :mask-closable="false"
      title="保存菜单锁"
      cancel-text="取消"
      ok-text="确认保存"
      @ok="handleSaveMenus"
    >
      <div class="py-4">
        <p class="mb-4 text-sm text-muted-foreground">
          修改菜单锁需验证二级密码
        </p>
        <MaskedPasswordInput
          v-model:value="savePassword"
          placeholder="请输入二级密码"
          @keydown.enter="handleSaveMenus"
        />
      </div>
    </Modal>
  </div>
</template>
