<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { Recordable } from '@vben/types';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationForgetPassword, z } from '@vben/common-ui';
import { $t } from '@vben/locales';
import { message } from 'ant-design-vue';

import { resetPasswordApi, sendResetPasswordCodeApi } from '#/api';

defineOptions({ name: 'ForgetPassword' });

const loading = ref(false);
const router = useRouter();

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.email'),
      },
      fieldName: 'email',
      label: $t('authentication.email'),
      rules: z
        .string()
        .min(1, { message: $t('authentication.emailTip') })
        .email($t('authentication.emailValidErrorTip')),
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
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                message.warning($t('authentication.emailTip'));
                throw new Error('Email format is invalid');
              }
              try {
                await sendResetPasswordCodeApi(email);
                message.success($t('authentication.sendCodeSuccess'));
              } catch (error) {
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
  ];
});

async function handleSubmit(value: Recordable<any>) {
  try {
    loading.value = true;
    await resetPasswordApi(value);
    message.success('密码重置成功，请重新登录');
    router.push('/auth/login');
  } catch (error) {
    // console.error('reset password error:', error);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthenticationForgetPassword
    :form-schema="formSchema"
    :loading="loading"
    sub-title="请输入邮箱、验证码和新密码以重置密码"
    submit-button-text="重置密码"
    @submit="handleSubmit"
  />
</template>
