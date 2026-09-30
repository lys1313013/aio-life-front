import type {
  VbenFormSchema as FormSchema,
  VbenFormProps,
} from '@vben/common-ui';

import type { ComponentType } from './component';

import { setupVbenForm, useVbenForm as useForm, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

async function initSetupVbenForm() {
  setupVbenForm<ComponentType>({
    config: {
      // ant design vue组件库默认都是 v-model:value
      baseModelPropName: 'value',

      // 一些组件是 v-model:checked 或者 v-model:fileList
      modelPropNameMap: {
        Checkbox: 'checked',
        Radio: 'checked',
        Switch: 'checked',
        Upload: 'fileList',
      },
    },
    defineRules: {
      // 输入项目必填国际化适配
      required: (value, _params, ctx) => {
        if (value === undefined || value === null || value.length === 0) {
          return $t('ui.formRules.required', [ctx.label]);
        }
        return true;
      },
      // 选择项目必填国际化适配
      selectRequired: (value, _params, ctx) => {
        if (value === undefined || value === null) {
          return $t('ui.formRules.selectRequired', [ctx.label]);
        }
        return true;
      },
    },
  });
}

const useVbenForm = useForm<ComponentType>;

/** Application dialog form preset. Existing page/search forms remain unchanged. */
function useAppForm(
  options: VbenFormProps<ComponentType> & { columns?: 1 | 2 },
) {
  const { columns = 1, commonConfig, wrapperClass, ...rest } = options;
  return useForm<ComponentType>({
    layout: 'vertical',
    showDefaultActions: false,
    ...rest,
    wrapperClass: [
      'app-form-fields',
      columns === 2 ? 'app-form-fields-2' : 'grid-cols-1',
      wrapperClass,
    ]
      .filter(Boolean)
      .join(' '),
    commonConfig: {
      formItemClass: 'pb-0 min-w-0',
      labelClass: 'text-xs font-medium text-muted-foreground mb-2',
      ...commonConfig,
      componentProps: { size: 'large', ...commonConfig?.componentProps },
    },
  });
}

export { initSetupVbenForm, useAppForm, useVbenForm, z };

export type VbenFormSchema = FormSchema<ComponentType>;
export type { VbenFormProps };
