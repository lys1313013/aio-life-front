<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { Recordable } from '@vben/types';

import { computed, h, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationRegister, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Button, message } from 'ant-design-vue';

import { registerApi, sendEmailCodeApi } from '#/api/core/auth';
import { AppModal as Modal } from '#/components/app-modal';
import LegalPolicyContent from '#/components/legal-policy/LegalPolicyContent.vue';
import { useLegalPolicy } from '#/components/legal-policy/use-legal-policy';

defineOptions({ name: 'Register' });

const loading = ref(false);
const {
  policy,
  loading: policyLoading,
  error: policyError,
  load: loadPolicy,
} = useLegalPolicy();
onMounted(loadPolicy);
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
        triggerFields: ['email', 'agreePolicy'],
        componentProps(values) {
          return {
            handleSendCode: async () => {
              if (!values.agreePolicy || !policy.value) {
                message.warning('请先加载并同意隐私政策和服务条款');
                throw new Error('Policy acceptance required');
              }
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
  if (loading.value) return;
  if (!value.agreePolicy || !policy.value) {
    message.warning('请先加载并同意隐私政策和服务条款');
    return;
  }
  try {
    loading.value = true;
    await registerApi({
      ...value,
      agreedPolicy: true,
      policyVersion: policy.value.version,
    });
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
    :loading="loading || policyLoading"
    @submit="handleSubmit"
  />
  <div v-if="policyError" class="mt-3" role="alert">
    {{ policyError
    }}<Button :loading="policyLoading" @click="loadPolicy">重新加载协议</Button>
  </div>
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
    <div class="max-h-[60vh] overflow-y-auto">
      <LegalPolicyContent v-if="policy" :policy="policy" :kind="policyType" />
      <p v-else role="alert">协议尚未加载，请关闭后重试。</p>
    </div>
  </Modal>
</template>
