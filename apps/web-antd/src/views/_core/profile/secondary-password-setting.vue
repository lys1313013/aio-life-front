<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';

import { Button, Checkbox, Form, FormItem, Input, InputPassword, message, Spin } from 'ant-design-vue';

import { getAllMenusApi } from '#/api/core/menu';
import { useUserStore } from '@vben/stores';

import {
  getSecondaryLockMenusApi,
  getSecondaryPasswordStatusApi,
  resetSecondaryPasswordApi,
  sendResetSecondaryPasswordCodeApi,
  setSecondaryPasswordApi,
} from '#/api/core/auth';
import { useSecondaryLockStore } from '#/store/secondary-lock';

// ── 密码设置 ──
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

async function handleSetPassword() {
  if (!pwdForm.password) { message.error('请输入密码'); return; }
  if (pwdForm.password !== pwdForm.confirmPassword) { message.error('两次输入的密码不一致'); return; }
  passwordSubmitting.value = true;
  try {
    await setSecondaryPasswordApi({
      oldPassword: hasPassword.value ? pwdForm.oldPassword : undefined,
      password: pwdForm.password,
    });
    message.success(hasPassword.value ? '二级密码修改成功' : '二级密码设置成功');
    hasPassword.value = true;
    pwdForm.oldPassword = '';
    pwdForm.password = '';
    pwdForm.confirmPassword = '';
  } catch (e: any) { message.error(e?.message || '操作失败'); }
  finally { passwordSubmitting.value = false; }
}

// ── 邮件找回 ──
async function handleSendRecoveryCode() {
  recoverySending.value = true;
  try {
    await sendResetSecondaryPasswordCodeApi();
    message.success('验证码已发送到 ' + userEmail.value);
  } catch (e: any) { message.error(e?.message || '发送失败'); }
  finally { recoverySending.value = false; }
}

async function handleResetPassword() {
  if (!recoveryCode.value) { message.error('请输入验证码'); return; }
  if (!recoveryPassword.value) { message.error('请输入新密码'); return; }
  if (recoveryPassword.value !== recoveryConfirm.value) { message.error('两次输入的密码不一致'); return; }
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
  } catch (e: any) { message.error(e?.message || '重置失败'); }
  finally { recoverySubmitting.value = false; }
}

// ── 菜单锁选择 ──
interface FlatMenu {
  id: number;
  title: string;
  path: string;
  indent: number;
}

const flatMenus = ref<FlatMenu[]>([]);
const checkedMap = reactive<Record<number, boolean>>({});
const menuLoading = ref(true);
const menuSaving = ref(false);

async function loadMenuList() {
  try {
    const tree = await getAllMenusApi();
    const flat: FlatMenu[] = [];
    flattenMenuTree(tree, 0, flat);
    flatMenus.value = flat;
  } finally {
    menuLoading.value = false;
  }
}

function flattenMenuTree(nodes: any[], depth: number, result: FlatMenu[]) {
  for (const node of nodes) {
    const menuId = node.meta?.menuId ?? node.id;
    const title = node.meta?.title ?? node.name ?? '';
    if (menuId != null && title) {
      result.push({ id: Number(menuId), title, path: node.path ?? '', indent: depth });
    }
    if (node.children?.length) {
      flattenMenuTree(node.children, depth + 1, result);
    }
  }
}

async function loadCheckedMenus() {
  try {
    const ids = await getSecondaryLockMenusApi();
    // 先清空再赋值，确保响应式更新
    Object.keys(checkedMap).forEach((k) => delete checkedMap[Number(k)]);
    for (const id of ids) {
      checkedMap[id] = true;
    }
  } catch (e) {
    console.error('加载菜单锁失败', e);
  }
}

function getCheckedIds(): number[] {
  return Object.entries(checkedMap)
    .filter(([, v]) => v)
    .map(([k]) => Number(k));
}

async function handleSaveMenus() {
  menuSaving.value = true;
  try {
    const ids = getCheckedIds();
    await useSecondaryLockStore().saveLockedMenus(ids);
    message.success('菜单锁已保存');
  } catch (e: any) { message.error(e?.message || '保存失败'); }
  finally { menuSaving.value = false; }
}

loadCheckedMenus();
</script>

<template>
  <div class="max-w-lg space-y-8">
    <!-- 密码设置 -->
    <Spin :spinning="passwordLoading">
      <div class="bg-card border-border rounded-lg border p-4">
        <h3 class="mb-4 text-base font-medium">二级密码</h3>
        <a-alert
          v-if="!hasPassword && !passwordLoading"
          class="mb-4"
          message="尚未设置二级密码，设置后可对菜单加锁保护"
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
            <InputPassword v-model:value="pwdForm.oldPassword" placeholder="请输入旧二级密码" />
          </FormItem>
          <FormItem
            :label="hasPassword ? '新二级密码' : '二级密码'"
            name="password"
            :rules="[{ required: true, message: '请输入密码' }]"
          >
            <InputPassword v-model:value="pwdForm.password" placeholder="请输入二级密码" />
          </FormItem>
          <FormItem
            label="确认密码"
            name="confirmPassword"
            :rules="[{ required: true, message: '请再次输入' }]"
          >
            <InputPassword v-model:value="pwdForm.confirmPassword" placeholder="请再次输入" />
          </FormItem>
          <FormItem>
            <Button type="primary" html-type="submit" :loading="passwordSubmitting" block>
              {{ hasPassword ? '修改二级密码' : '设置二级密码' }}
            </Button>
          </FormItem>
        </Form>

        <!-- 忘记密码 -->
        <div v-if="hasPassword" class="text-center">
          <a
            v-if="!showRecovery"
            class="text-muted-foreground cursor-pointer text-sm hover:underline"
            @click="showRecovery = true"
          >
            忘记二级密码？
          </a>
          <div v-else class="border-border mt-4 border-t pt-4">
            <p class="text-muted-foreground mb-3 text-sm">
              验证码将发送至 {{ userEmail }}
            </p>
            <Form layout="vertical" @finish="handleResetPassword">
              <FormItem label="验证码" name="code" :rules="[{ required: true, message: '请输入验证码' }]">
                <Input v-model:value="recoveryCode" placeholder="请输入邮箱收到的验证码">
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
              <FormItem label="新密码" name="password" :rules="[{ required: true, message: '请输入新密码' }]">
                <InputPassword v-model:value="recoveryPassword" placeholder="请输入新二级密码" />
              </FormItem>
              <FormItem label="确认密码" name="confirm" :rules="[{ required: true, message: '请再次输入' }]">
                <InputPassword v-model:value="recoveryConfirm" placeholder="请再次输入" />
              </FormItem>
              <FormItem>
                <Button type="primary" html-type="submit" :loading="recoverySubmitting" block>
                  重置二级密码
                </Button>
              </FormItem>
            </Form>
            <a
              class="text-muted-foreground cursor-pointer text-sm hover:underline"
              @click="showRecovery = false"
            >
              返回
            </a>
          </div>
        </div>
      </div>
    </Spin>

    <!-- 菜单锁选择 -->
    <div class="bg-card border-border rounded-lg border p-4">
      <h3 class="mb-1 text-base font-medium">菜单锁</h3>
      <p class="text-muted-foreground mb-4 text-sm">
        勾选的菜单在访问时需要输入二级密码
      </p>
      <Spin :spinning="menuLoading">
        <div class="max-h-80 overflow-y-auto">
          <div
            v-for="menu in flatMenus"
            :key="menu.id"
            :style="{ paddingLeft: `${menu.indent * 20}px` }"
            class="hover:bg-secondary rounded px-2 py-1.5 transition-colors"
          >
            <Checkbox v-model:checked="checkedMap[menu.id]">
              {{ menu.title }}
            </Checkbox>
          </div>
          <div v-if="flatMenus.length === 0 && !menuLoading" class="text-muted-foreground py-4 text-center text-sm">
            暂无菜单数据
          </div>
        </div>
        <Button
          class="mt-4"
          type="primary"
          :loading="menuSaving"
          block
          @click="handleSaveMenus"
        >
          保存菜单锁
        </Button>
      </Spin>
    </div>
  </div>
</template>
