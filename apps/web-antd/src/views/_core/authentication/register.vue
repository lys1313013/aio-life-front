<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { Recordable } from '@vben/types';

import { computed, h, ref } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationRegister, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { message, Modal } from 'ant-design-vue';

import { registerApi, sendEmailCodeApi } from '#/api/core/auth';

defineOptions({ name: 'Register' });

const loading = ref(false);
const router = useRouter();

const policyVisible = ref(false);
const policyType = ref<'privacy' | 'terms'>('privacy');

function openPolicy(type: 'privacy' | 'terms', event: Event) {
  event.preventDefault();
  event.stopPropagation();
  policyType.value = type;
  policyVisible.value = true;
}

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.usernameTip'),
      },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z.string().min(1, { message: $t('authentication.usernameTip') }),
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.email'),
      },
      fieldName: 'email',
      label: $t('authentication.email'),
      rules: z.string().email({ message: $t('authentication.emailTip') }),
    },
    {
      component: 'VbenPinInput',
      componentProps: {
        codeLength: 6,
        createText: (countdown: number) => {
          const text =
            countdown > 0
              ? $t('authentication.sendText', [countdown])
              : $t('authentication.sendCode');
          return text;
        },
        placeholder: $t('authentication.code'),
      },
      dependencies: {
        triggerFields: ['email'],
        componentProps(values) {
          return {
            handleSendCode: async () => {
              const { email } = values;
              if (!email) {
                message.warning($t('authentication.emailTip'));
                throw new Error('Email is required');
              }
              // 简单校验邮箱格式
              if (!/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(email)) {
                message.warning($t('authentication.emailTip'));
                throw new Error('Email format is invalid');
              }
              try {
                await sendEmailCodeApi(email);
                message.success($t('authentication.sendCodeSuccess'));
              } catch (error) {
                // message.error($t('authentication.sendCodeFailed'));
                throw error;
              }
            },
          };
        },
      },
      fieldName: 'code',
      label: $t('authentication.code'),
      rules: z.string().length(6, {
        message: $t('authentication.codeTip', [6]),
      }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        passwordStrength: true,
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      renderComponentContent() {
        return {
          strengthText: () => $t('authentication.passwordStrength'),
        };
      },
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.confirmPassword'),
      },
      dependencies: {
        rules(values) {
          const { password } = values;
          return z
            .string({ required_error: $t('authentication.passwordTip') })
            .min(1, { message: $t('authentication.passwordTip') })
            .refine((value) => value === password, {
              message: $t('authentication.confirmPasswordTip'),
            });
        },
        triggerFields: ['password'],
      },
      fieldName: 'confirmPassword',
      label: $t('authentication.confirmPassword'),
    },
    {
      component: 'VbenCheckbox',
      fieldName: 'agreePolicy',
      renderComponentContent: () => ({
        default: () =>
          h('span', [
            $t('authentication.agree'),
            h(
              'a',
              {
                class: 'vben-link ml-1',
                onClick: (e: Event) => openPolicy('privacy', e),
              },
              $t('authentication.privacyPolicy'),
            ),
            ' & ',
            h(
              'a',
              {
                class: 'vben-link',
                onClick: (e: Event) => openPolicy('terms', e),
              },
              $t('authentication.terms'),
            ),
          ]),
      }),
      rules: z.boolean().refine((value) => !!value, {
        message: $t('authentication.agreeTip'),
      }),
    },
  ];
});

async function handleSubmit(value: Recordable<any>) {
  try {
    loading.value = true;
    await registerApi(value);
    message.success($t('authentication.registerSuccess'));
    router.push('/auth/login');
  } catch {
    // console.error('register error:', error);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthenticationRegister
    :form-schema="formSchema"
    :loading="loading"
    @submit="handleSubmit"
  />
  <Modal
    v-model:open="policyVisible"
    :title="
      policyType === 'privacy'
        ? $t('authentication.privacyPolicy')
        : $t('authentication.terms')
    "
    :footer="null"
    centered
    width="600px"
  >
    <div class="policy-content">
      <template v-if="policyType === 'privacy'">
        <h4>1. 信息收集</h4>
        <p>
          注册邮箱仅用于账号验证、登录与密码找回；你主动接入的第三方平台（GitHub、LeetCode、CSDN
          等）凭据仅用于同步你的公开数据。
        </p>
        <h4>2. 数据存储</h4>
        <p>
          你的所有记录数据均存储于本站私有部署的服务器中，不会出售、共享给任何第三方。密码经加密存储，敏感数据（如密码管理器内容）加密后保存。
        </p>
        <h4>3. Cookie 与本地存储</h4>
        <p>仅用于维持登录状态与界面偏好设置，不用于任何跟踪或广告用途。</p>
        <h4>4. 数据权利</h4>
        <p>
          你可以随时导出或删除自己的数据；注销账号后，相关数据将被彻底删除。
        </p>
      </template>
      <template v-else>
        <h4>1. 账号责任</h4>
        <p>
          你需妥善保管账号与密码，对账号下的所有操作负责。注册即表示你提供的信息真实有效。
        </p>
        <h4>2. 合法使用</h4>
        <p>
          不得利用本服务存储、传播违法违规内容，不得攻击、干扰服务的正常运行。违规账号将被停用。
        </p>
        <h4>3. 服务变更</h4>
        <p>本服务可能随版本迭代调整功能，重要变更将通过站内通知告知。</p>
        <h4>4. 免责声明</h4>
        <p>
          本服务按“现状”提供，因不可抗力或第三方平台接口变更导致的数据同步异常，本站不承担相应责任，请自行备份重要数据。
        </p>
      </template>
    </div>
  </Modal>
</template>

<style scoped>
.policy-content {
  max-height: 60vh;
  overflow-y: auto;
  line-height: 1.8;
}

.policy-content h4 {
  margin: 12px 0 4px;
  font-weight: 600;
}

.policy-content h4:first-child {
  margin-top: 0;
}

.policy-content p {
  margin: 0;
  color: hsl(var(--muted-foreground));
}
</style>
