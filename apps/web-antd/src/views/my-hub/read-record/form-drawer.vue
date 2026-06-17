<script lang="ts" setup>
import { ref, watch } from 'vue';

import { useVbenForm } from '#/adapter/form';
import { ReadRecordApi } from '#/api/readRecord';
import { Button, message, Upload, Popconfirm, Input } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';

const props = defineProps<{
  values?: any;
}>();

const emit = defineEmits(['close', 'table-reload']);

const typeOptions = [
  { label: '书籍', value: 1 },
  { label: '文章/网页', value: 2 },
];

const statusOptions = [
  { label: '未开始', value: 0 },
  { label: '阅读中', value: 1 },
  { label: '已完成', value: 2 },
  { label: '搁置', value: 3 },
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
      label: '阅读类型',
      componentProps: {
        options: typeOptions,
      },
      rules: 'required',
      defaultValue: 1,
    },
    {
      component: 'Select',
      fieldName: 'status',
      label: '阅读状态',
      componentProps: {
        options: statusOptions,
      },
      defaultValue: 0,
    },
    {
      component: 'Input',
      fieldName: 'url',
      label: '链接 (支持豆瓣一键解析)',
      formItemClass: 'col-span-2',
      dependencies: {
        show: () => false,
        triggerFields: ['url']
      }
    },
    {
      component: 'Input',
      fieldName: 'title',
      label: '标题',
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'author',
      label: '作者',
      dependencies: {
        show: (values) => values.type === 1,
        triggerFields: ['type'],
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'currentProgress',
      label: '当前页数/当前进度',
      componentProps: {
        min: 0,
      },
      defaultValue: 0,
    },
    {
      component: 'InputNumber',
      fieldName: 'totalProgress',
      label: '总页数/总进度(%)',
      componentProps: {
        min: 0,
      },
      defaultValue: 0,
    },
    {
      component: 'Input',
      fieldName: 'coverImg',
      label: '封面图片链接',
      dependencies: {
        show: () => false,
        triggerFields: ['coverImg']
      }
    },
    {
      fieldName: 'finishTime',
      label: '完成时间',
      component: 'DatePicker',
      componentProps: {
        placeholder: '请选择完成时间',
        showTime: true,
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
        style: { width: '100%' },
      },
      dependencies: {
        show: (values) => values.status === 2,
        triggerFields: ['status']
      }
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: '书评',
      formItemClass: 'col-span-2 mb-0',
      componentProps: {
        rows: 2,
      }
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
      previewImg.value = newVal.coverImg || '';
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
    const res = await ReadRecordApi.parseDouban(doubanUrl.value);
    if (res) {
      // 将获取到的信息回填到表单中
      const parsedValues: Record<string, any> = {};
      if (res.title) parsedValues.title = res.title;
      if (res.author) parsedValues.author = res.author;
      if (res.coverImg) {
        parsedValues.coverImg = res.coverImg;
        previewImg.value = res.coverImg;
      }
      if (res.totalProgress) parsedValues.totalProgress = res.totalProgress;
      
      // 自动将链接填入表单的 url 字段
      parsedValues.url = doubanUrl.value;
      
      if (Object.keys(parsedValues).length > 0) {
        formApi.setValues(parsedValues);
        message.success('已提取豆瓣信息并回填');
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
    const res = await ReadRecordApi.uploadCover(file as File);
    if (res) {
      formApi.setValues({ coverImg: res });
      previewImg.value = res;
      message.success('上传封面成功');
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
      await ReadRecordApi.update({ ...values, id: props.values.id } as any);
      message.success('更新成功');
    } else {
      await ReadRecordApi.save(values as any);
      message.success('添加成功');
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
    await ReadRecordApi.remove(props.values.id);
    message.success('删除成功');
    emit('table-reload');
    emit('close');
  } catch (error) {
    console.error(error);
  }
};
</script>

<template>
  <div class="px-1 py-1" @paste="handlePaste">
    <!-- 未上传封面时的占位提示 -->
    <div v-if="!previewImg" class="mb-4 flex flex-col items-center justify-center py-6 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg mx-2 bg-gray-50/30 dark:bg-gray-800/20 hover:bg-gray-50 transition-colors">
      <IconifyIcon icon="lucide:image-plus" class="text-gray-400 text-2xl mb-2" />
      <div class="text-xs text-gray-400 text-center px-4 leading-relaxed">
        可直接 <span class="text-gray-500 dark:text-gray-300 font-medium">Ctrl+V</span> 粘贴图片<br/>
        或通过豆瓣链接一键解析
      </div>
    </div>
    <div v-if="previewImg" class="mb-4 flex flex-col items-center justify-center relative">
      <div class="group relative w-24 h-32 overflow-hidden rounded shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-md">
        <img :src="previewImg" class="w-full h-full object-cover" />
        
        <!-- 悬浮提示更换封面 -->
        <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-300">
          <Upload
            accept="image/*"
            :show-upload-list="false"
            :custom-request="handleUploadCover"
          >
            <Button size="small" type="primary" ghost class="text-white border-white hover:text-white hover:border-white text-xs px-2 py-0 h-6">
              更换封面
            </Button>
          </Upload>
          <span class="text-white/90 font-medium text-[10px] mt-2 scale-90">或 Ctrl+V 粘贴</span>
        </div>
      </div>
      <div class="text-[10px] text-gray-400 mt-2 transition-opacity duration-300">
        ( 支持 Ctrl+V 粘贴替换 )
      </div>
    </div>

    <!-- 极简豆瓣解析提示区 -->
    <div class="mb-4 flex items-center justify-between rounded-lg bg-gray-50 p-2 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
      <div class="flex items-center gap-3">
        <IconifyIcon icon="mdi:douban" class="text-[#007722] text-xl" />
        <div class="flex-1 w-full min-w-[200px]">
          <Input 
            v-model:value="doubanUrl" 
            placeholder="在此粘贴豆瓣链接一键解析" 
            allow-clear
            size="small"
            class="text-xs"
          />
        </div>
      </div>
      <div class="flex gap-2 shrink-0 ml-2">
        <Upload
          v-if="!previewImg"
          accept="image/*"
          :show-upload-list="false"
          :custom-request="handleUploadCover"
        >
          <Button size="small" shape="round" :loading="uploadLoading">
            上传图片
          </Button>
        </Upload>
        <Button 
          type="primary" 
          size="small"
          shape="round"
          class="bg-[#007722] hover:bg-[#007722]/80 border-none"
          :loading="parseLoading"
          @click="handleParseDouban"
        >
          解析
        </Button>
      </div>
    </div>

    <Form />

    <!-- 底部操作区 -->
    <div class="mt-4 flex justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
      <div>
        <Popconfirm
          v-if="props.values?.id"
          title="确定要删除吗?"
          ok-text="删除"
          cancel-text="取消"
          @confirm="handleDelete"
        >
          <Button danger shape="round">删除</Button>
        </Popconfirm>
      </div>
      <div class="flex gap-3">
        <Button shape="round" @click="$emit('close')">取消</Button>
        <Button shape="round" type="primary" :loading="submitLoading" @click="onSubmit">
          保存
        </Button>
      </div>
    </div>
  </div>
</template>
