<script lang="ts" setup>
import { ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Input,
  message,
  Popconfirm,
  Tooltip,
  Upload,
} from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { PROGRESS_STATUS } from '#/api/core/progress-status';
import { MovieApi } from '#/api/movie';
import { fetchAuthImageUrl } from '#/utils/file';

const props = defineProps<{
  values?: any;
}>();

const emit = defineEmits(['close', 'table-reload']);

const typeOptions = [
  { label: '电影', value: 1 },
  { label: '剧集', value: 2 },
  { label: '动漫', value: 3 },
  { label: '纪录片', value: 4 },
  { label: '其他', value: 5 },
];

const statusOptions = [
  { label: '想看', value: PROGRESS_STATUS.NOT_STARTED },
  { label: '在看', value: PROGRESS_STATUS.IN_PROGRESS },
  { label: '看过', value: PROGRESS_STATUS.COMPLETED },
  { label: '搁置', value: PROGRESS_STATUS.ON_HOLD },
];

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    formItemClass: 'col-span-2 md:col-span-1 mb-2',
  },
  wrapperClass: 'grid grid-cols-2 gap-x-3',
  layout: 'vertical',
  schema: [
    {
      component: 'Select',
      fieldName: 'type',
      label: '影视类型',
      componentProps: {
        options: typeOptions,
      },
      rules: 'required',
      defaultValue: 1,
    },
    {
      component: 'Select',
      fieldName: 'status',
      label: '观看状态',
      componentProps: {
        options: statusOptions,
      },
      defaultValue: PROGRESS_STATUS.NOT_STARTED,
    },
    {
      component: 'Input',
      fieldName: 'url',
      label: '链接 (支持豆瓣一键解析)',
      formItemClass: 'col-span-2',
      dependencies: {
        show: () => false,
        triggerFields: ['url'],
      },
    },
    {
      component: 'Input',
      fieldName: 'title',
      label: '名称',
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'director',
      label: '导演/演员',
    },
    {
      component: 'InputNumber',
      fieldName: 'currentProgress',
      label: '当前集数/当前时长',
      componentProps: {
        min: 0,
      },
      defaultValue: 0,
    },
    {
      component: 'InputNumber',
      fieldName: 'totalProgress',
      label: '总集数/总时长',
      componentProps: {
        min: 0,
      },
      defaultValue: 0,
    },
    {
      component: 'Input',
      fieldName: 'coverImgUrl',
      label: '封面图片链接',
      dependencies: {
        show: () => false,
        triggerFields: ['coverImgUrl'],
      },
    },
    {
      component: 'Input',
      fieldName: 'fileId',
      label: '封面图片文件ID',
      dependencies: {
        show: () => false,
        triggerFields: ['fileId'],
      },
    },
    {
      fieldName: 'finishTime',
      label: '看完时间',
      component: 'DatePicker',
      componentProps: {
        placeholder: '请选择看完时间',
        showTime: false,
        valueFormat: 'YYYY-MM-DD 00:00:00',
        style: { width: '100%' },
      },
      dependencies: {
        show: (values) => values.status === PROGRESS_STATUS.COMPLETED,
        triggerFields: ['status'],
      },
    },
    {
      component: 'Rate',
      fieldName: 'rating',
      label: '个人评分',
      componentProps: {
        allowClear: true,
        count: 5,
      },
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: '短评/备注',
      formItemClass: 'col-span-2 mb-0 md:col-span-2',
      componentProps: {
        rows: 2,
      },
    },
  ],
  showDefaultActions: false,
});

const previewImg = ref<string>('');
const doubanUrl = ref<string>('');

watch(
  () => props.values,
  (newVal) => {
    if (newVal) {
      formApi.setValues(newVal);
      previewImg.value = '';
      if (newVal.fileId) {
        fetchAuthImageUrl(newVal.fileId).then((url) => {
          previewImg.value = url;
        });
      } else {
        previewImg.value = newVal.coverImgUrl || '';
      }
      doubanUrl.value = newVal.url || '';
    } else {
      formApi.resetForm();
      previewImg.value = '';
      doubanUrl.value = '';
    }
  },
  { immediate: true },
);

const submitLoading = ref(false);
const parseLoading = ref(false);
const uploadLoading = ref(false);

const handleParseDouban = async () => {
  if (!doubanUrl.value) {
    message.warning('请先粘贴豆瓣链接');
    return;
  }
  try {
    parseLoading.value = true;
    const res = await MovieApi.parseDouban(doubanUrl.value);
    if (res) {
      // 将获取到的信息回填到表单中
      const parsedValues: Record<string, any> = {};
      if (res.title) parsedValues.title = res.title;
      if (res.director) parsedValues.director = res.director;
      if (res.type) parsedValues.type = res.type;
      // 每次解析都覆盖封面字段，避免预览已更新但保存仍携带旧 fileId。
      parsedValues.coverImgUrl = res.coverImgUrl || null;
      parsedValues.fileId = res.fileId || null;
      if (res.fileId) {
        previewImg.value = await fetchAuthImageUrl(res.fileId);
      } else if (res.coverImgUrl) {
        previewImg.value = res.coverImgUrl;
      } else {
        previewImg.value = '';
      }
      if (res.totalProgress) parsedValues.totalProgress = res.totalProgress;

      // 自动将链接填入表单的 url 字段
      parsedValues.url = doubanUrl.value;

      if (Object.keys(parsedValues).length > 0) {
        formApi.setValues(parsedValues);
      } else {
        message.warning('未能提取到有效信息');
      }
    }
  } catch (error) {
    console.error('解析豆瓣链接失败:', error);
    message.error('解析失败，请检查链接或稍后重试');
  } finally {
    parseLoading.value = false;
  }
};

const handleUploadCover = async ({ file, onSuccess, onError }: any) => {
  try {
    uploadLoading.value = true;
    const res = await MovieApi.uploadCover(file as File);
    if (res) {
      formApi.setValues({ coverImgUrl: res.fileUrl, fileId: res.id });
      previewImg.value = await fetchAuthImageUrl(res.id);
      message.success('上传海报成功');
      onSuccess?.(res, file);
    }
  } catch (error) {
    message.error('上传封面失败');
    onError?.(error);
  } finally {
    uploadLoading.value = false;
  }
};

const handlePaste = async (e: ClipboardEvent) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.includes('image')) {
      const file = item.getAsFile();
      if (file) {
        e.preventDefault();
        // Upload the pasted file
        await handleUploadCover({ file });
        break;
      }
    }
  }
};

const onSubmit = async () => {
  try {
    const { valid } = await formApi.validate();
    if (!valid) return;

    submitLoading.value = true;
    const values = await formApi.getValues();

    // 兜底逻辑：不管用户是否点击了解析，都以 UI 上的豆瓣链接为准
    values.url = doubanUrl.value;

    if (props.values?.id) {
      await MovieApi.update({ ...values, id: props.values.id } as any);
    } else {
      await MovieApi.save(values as any);
    }
    emit('table-reload');
    emit('close');
  } catch (error) {
    console.error(error);
  } finally {
    submitLoading.value = false;
  }
};

const handleDelete = async () => {
  if (!props.values?.id) return;
  try {
    await MovieApi.remove(props.values.id);
    message.success('删除成功');
    emit('table-reload');
    emit('close');
  } catch (error) {
    console.error(error);
  }
};
</script>

<template>
  <div @paste="handlePaste">
    <div
      class="mb-5 rounded-xl border border-gray-200/80 bg-gray-50/70 p-3.5 dark:border-gray-700 dark:bg-gray-800/40"
    >
      <div class="flex flex-col gap-4 sm:flex-row">
        <div class="flex shrink-0 justify-center sm:block">
          <Upload
            accept="image/*"
            :show-upload-list="false"
            :custom-request="handleUploadCover"
          >
            <div
              class="group relative flex h-28 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <img
                v-if="previewImg"
                :src="previewImg"
                alt="影视封面"
                class="h-full w-full object-cover"
              />
              <div v-else class="flex flex-col items-center text-gray-400">
                <IconifyIcon icon="lucide:image-plus" class="mb-1.5 text-2xl" />
                <span class="text-[11px]">上传封面</span>
                <div class="mt-1.5 flex flex-col items-center gap-1">
                  <kbd
                    class="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-sans text-[8px] leading-none text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  >
                    Ctrl + V
                  </kbd>
                  <span class="text-[9px] leading-none">粘贴封面</span>
                </div>
              </div>
              <div
                v-if="previewImg"
                class="absolute inset-x-0 bottom-0 bg-black/55 py-1 text-center text-[11px] text-white transition-opacity"
                :class="[
                  uploadLoading
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100',
                ]"
              >
                {{ uploadLoading ? '上传中' : '更换' }}
              </div>
            </div>
          </Upload>
        </div>

        <div class="min-w-0 flex-1 self-center">
          <div class="mb-2 flex items-center gap-2">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-200">
              豆瓣条目链接
            </span>
            <Tooltip
              title="支持 movie.douban.com/subject/... 地址，解析后自动填写名称、演职员和封面"
            >
              <IconifyIcon
                icon="lucide:circle-help"
                class="cursor-help text-sm text-gray-400"
              />
            </Tooltip>
          </div>

          <div class="flex items-center gap-2">
            <div class="min-w-0 flex-1">
              <Input
                v-model:value="doubanUrl"
                placeholder="https://movie.douban.com/subject/..."
                allow-clear
                size="small"
              />
            </div>
            <Button
              type="link"
              size="small"
              :loading="parseLoading"
              @click="handleParseDouban"
            >
              解析
            </Button>
          </div>
        </div>
      </div>
    </div>

    <Form />

    <div
      class="mt-5 flex justify-between border-t border-gray-100 pt-4 dark:border-gray-800"
    >
      <div>
        <Popconfirm
          v-if="props.values?.id"
          title="确定要删除吗?"
          ok-text="删除"
          cancel-text="取消"
          @confirm="handleDelete"
        >
          <Button danger>删除</Button>
        </Popconfirm>
      </div>
      <div class="flex gap-2">
        <Button @click="$emit('close')">取消</Button>
        <Button type="primary" :loading="submitLoading" @click="onSubmit">
          保存
        </Button>
      </div>
    </div>
  </div>
</template>
