<script setup lang="ts">
import type { WechatWebCredentials } from '#/api/core/wechat-web';

import { computed, onMounted, ref } from 'vue';

import { useUserStore } from '@vben/stores';

import { Button, Input, message, Popconfirm, Spin } from 'ant-design-vue';

import { closeAccount } from '#/api/core/legal';
import { getUserInfoApi } from '#/api/core/user';
import { AppModal } from '#/components/app-modal';
import LegalPolicyContent from '#/components/legal-policy/LegalPolicyContent.vue';
import { useLegalPolicy } from '#/components/legal-policy/use-legal-policy';
import { useAuthStore } from '#/store';

import ClosureWechatVerification from './closure-wechat-verification.vue';

const emit = defineEmits<{ exportData: [] }>();
const auth = useAuthStore();
const userStore = useUserStore();
const { policy, loading, error, load } = useLegalPolicy();
const closureOpen = ref(false);
const kind = ref<'privacy' | 'terms'>('privacy');
const policyOpen = ref(false);
const confirmation = ref('');
const method = ref('password');
const password = ref('');
const saving = ref(false);
const accountLoading = ref(false);
const accountReady = ref(false);
const credentials = ref<null | WechatWebCredentials>(null);
const qrRevision = ref(0);
const hasPassword = computed(() => userStore.userInfo?.hasPassword === true);
const wechatBound = computed(() => userStore.userInfo?.wechatBound === true);
const canClose = computed(
  () =>
    accountReady.value &&
    confirmation.value === '注销账号' &&
    (method.value === 'password' ? !!password.value : !!credentials.value),
);
onMounted(load);
function openPolicy(value: 'privacy' | 'terms') {
  kind.value = value;
  policyOpen.value = true;
}
async function openClosure() {
  if (accountLoading.value) return;
  accountLoading.value = true;
  accountReady.value = false;
  try {
    const user = await getUserInfoApi();
    userStore.setUserInfo(user);
    accountReady.value = true;
    method.value = user.hasPassword ? 'password' : 'wechat';
    password.value = '';
    confirmation.value = '';
    credentials.value = null;
    closureOpen.value = true;
  } finally {
    accountLoading.value = false;
  }
}
function resetClosure() {
  if (saving.value) return;
  closureOpen.value = false;
  password.value = '';
  confirmation.value = '';
  credentials.value = null;
  qrRevision.value++;
}
async function submit() {
  if (!canClose.value || saving.value) return;
  saving.value = true;
  try {
    await closeAccount({
      confirmation: confirmation.value,
      password: method.value === 'password' ? password.value : undefined,
      wechatScene:
        method.value === 'wechat' ? credentials.value?.scene : undefined,
      wechatBrowserSecret:
        method.value === 'wechat'
          ? credentials.value?.browserSecret
          : undefined,
    });
    closureOpen.value = false;
    password.value = '';
    confirmation.value = '';
    credentials.value = null;
    await auth.finishAccountClosure();
    message.success('注销已受理，账号已停用，后台将持续清理相关数据');
  } catch {
    // 全局拦截器提示接口错误；一次性微信凭据可能已消费，重试前重新验证。
    if (method.value === 'wechat') {
      credentials.value = null;
      qrRevision.value++;
    }
  } finally {
    saving.value = false;
  }
}
</script>
<template>
  <section class="w-full max-w-2xl space-y-6">
    <div class="flex flex-wrap gap-3">
      <Button @click="openPolicy('privacy')">隐私政策</Button>
      <Button @click="openPolicy('terms')">服务条款</Button>
      <Button @click="emit('exportData')">导出数据</Button>
    </div>
    <div class="space-y-3">
      <h2 class="font-semibold">注销账号</h2>
      <p class="text-sm text-muted-foreground">
        注销不可撤销。受理后所有设备退出，账号及个人数据将进入后台清理流程，请先导出需要保留的数据。
      </p>
      <Button danger :loading="accountLoading" @click="openClosure">
        注销账号
      </Button>
    </div>
    <AppModal
      v-model:open="policyOpen"
      :title="kind === 'privacy' ? '隐私政策' : '服务条款'"
      :footer="null"
      centered
      :width="640"
    >
      <Spin :spinning="loading">
        <div v-if="error" role="alert">
          {{ error }}<Button @click="load">重试</Button>
        </div>
        <div class="max-h-[65vh] overflow-y-auto">
          <LegalPolicyContent v-if="policy" :policy="policy" :kind="kind" />
        </div>
      </Spin>
    </AppModal>
    <AppModal
      :open="closureOpen"
      title="注销账号"
      :footer="null"
      :closable="!saving"
      :mask-closable="!saving"
      :keyboard="!saving"
      :submit-on-enter="false"
      centered
      :width="480"
      @cancel="resetClosure"
    >
      <div class="space-y-4">
        <p>
          账号将立即停用。后台会清理生活记录、第三方绑定、API
          Key、密码库、附件、导出文件和关系图谱，失败会重试。第三方平台账号不会被删除。
        </p>
        <div v-if="hasPassword && wechatBound" class="flex flex-wrap gap-2">
          <Button
            :type="method === 'password' ? 'primary' : 'default'"
            :disabled="saving"
            @click="method = 'password'"
          >
            密码验证
          </Button>
          <Button
            :type="method === 'wechat' ? 'primary' : 'default'"
            :disabled="saving"
            @click="method = 'wechat'"
          >
            微信验证
          </Button>
        </div>
        <div v-if="method === 'password'" class="space-y-2">
          <label for="closure-password">当前登录密码</label>
          <Input.Password
            id="closure-password"
            v-model:value="password"
            autocomplete="current-password"
            :disabled="saving"
          />
        </div>
        <ClosureWechatVerification
          v-if="method === 'wechat'"
          :key="qrRevision"
          :disabled="saving"
          @verified="credentials = $event"
        />
        <div class="space-y-2">
          <label for="closure-confirmation">输入“注销账号”确认</label>
          <Input
            id="closure-confirmation"
            v-model:value="confirmation"
            :disabled="saving"
            autocomplete="off"
          />
        </div>
        <div class="flex flex-wrap justify-end gap-2">
          <Button :disabled="saving" @click="resetClosure">取消</Button>
          <Popconfirm
            title="注销不可撤销，确定停用账号并清理数据？"
            ok-text="确认注销"
            cancel-text="取消"
            :disabled="!canClose || saving"
            :ok-button-props="{ loading: saving, danger: true }"
            @confirm="submit"
          >
            <Button
              danger
              type="primary"
              :disabled="!canClose"
              :loading="saving"
            >
              注销账号
            </Button>
          </Popconfirm>
        </div>
      </div>
    </AppModal>
  </section>
</template>
