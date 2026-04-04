<script setup lang="ts">
import type { LLMKey } from '#/api/core/llm';

import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';

import { useIsMobile } from '@vben/hooks';

import {
  message as antMessage,
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  Popconfirm,
  Spin,
  Table,
} from 'ant-design-vue';

import {
  deleteLLMKeyApi,
  getLLMKeyListApi,
  saveLLMKeyApi,
  setDefaultLLMKeyApi,
  updateLLMKeyApi,
} from '#/api/core/llm';

const { isMobile } = useIsMobile();
const dropdownRef = ref<HTMLElement | null>(null);

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    showPresetDropdown.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  fetchLLMKeys();
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

const loading = ref(false);
const llmKeys = ref<LLMKey[]>([]);
const formVisible = ref(false);
const formLoading = ref(false);
const showPresetDropdown = ref(false);

const formData = reactive({
  id: '',
  modelName: 'gpt-4o',
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  isDefault: 0,
});

// 预置大模型选项
const presetModels = [
  {
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    baseUrl: 'https://api.openai.com/v1',
    label: 'OpenAI',
    modelListUrl: 'https://platform.openai.com/docs/models',
    value: 'gpt-4o',
  },
  {
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    baseUrl: 'https://api.deepseek.com',
    label: 'DeepSeek',
    modelListUrl: 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing',
    value: 'deepseek-chat',
  },
  {
    apiKeyUrl: 'https://cloud.siliconflow.cn/account/ak',
    baseUrl: 'https://api.siliconflow.cn/v1',
    label: '硅基流动',
    modelListUrl: 'https://docs.siliconflow.cn/models',
    value: 'deepseek-ai/DeepSeek-V3',
  },
  {
    apiKeyUrl: 'https://dashscope.console.aliyun.com/apiKey',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    label: '阿里百炼',
    modelListUrl:
      'https://help.aliyun.com/zh/dashscope/developer-reference/model-list-information',
    value: 'qwen-plus',
  },
  {
    apiKeyUrl: 'https://platform.moonshot.cn/console/api-keys',
    baseUrl: 'https://api.moonshot.cn/v1',
    label: 'Kimi',
    modelListUrl: 'https://platform.moonshot.cn/docs/pricing/models',
    value: 'moonshot-v1-8k',
  },
  {
    apiKeyUrl:
      'https://platform.minimaxi.com/user-center/basic-information/interface-key',
    baseUrl: 'https://api.minimaxi.com/v1',
    label: 'MiniMax',
    modelListUrl: 'https://platform.minimaxi.com/document/models',
    value: 'MiniMax-M2.7',
  },
  {
    apiKeyUrl: 'https://longcat.chat/docs/apiKey',
    baseUrl: 'https://api.longcat.chat/openai',
    label: '美团',
    modelListUrl: 'https://longcat.chat/docs/intro',
    value: 'LongCat-Flash-Chat',
  },
  {
    apiKeyUrl: 'https://www.modelscope.cn/my/api-key',
    baseUrl: 'https://api-inference.modelscope.cn',
    label: '魔搭',
    value: 'qwen-max',
  },
  {
    baseUrl: 'http://localhost:11434/v1',
    label: 'Ollama',
    value: 'llama3.2',
  },
];

const currentPreset = computed(() => {
  return presetModels.find(
    (m) => m.baseUrl === formData.baseUrl || m.value === formData.modelName,
  );
});

const columns = [
  {
    title: '模型名称',
    dataIndex: 'modelName',
    key: 'modelName',
    fixed: 'left',
  },
  { title: 'API Key', dataIndex: 'apiKey', key: 'apiKey' },
  { title: 'Base URL', dataIndex: 'baseUrl', key: 'baseUrl' },
  { title: '状态', dataIndex: 'isDefault', key: 'isDefault' },
  { title: '相关链接', key: 'links' },
  { title: '操作', key: 'action', fixed: 'right' },
];

const fetchLLMKeys = async () => {
  try {
    loading.value = true;
    llmKeys.value = await getLLMKeyListApi();
  } catch (error) {
    console.error('Failed to fetch LLM keys:', error);
    antMessage.error('获取大模型配置失败');
  } finally {
    loading.value = false;
  }
};

const handleAdd = () => {
  Object.assign(formData, {
    id: '',
    modelName: 'gpt-4o',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    isDefault: 0,
  });
  formVisible.value = true;
};

const handleEdit = (key: LLMKey) => {
  Object.assign(formData, key);
  formVisible.value = true;
};

const handleDelete = async (id: string) => {
  try {
    loading.value = true;
    await deleteLLMKeyApi(id);
    antMessage.success('删除成功');
    await fetchLLMKeys();
  } catch (error) {
    console.error('Failed to delete LLM key:', error);
    antMessage.error('删除失败');
  } finally {
    loading.value = false;
  }
};

const handleSetDefault = async (id: string) => {
  try {
    loading.value = true;
    await setDefaultLLMKeyApi(id);
    antMessage.success('设置默认成功');
    await fetchLLMKeys();
  } catch (error) {
    console.error('Failed to set default LLM key:', error);
    antMessage.error('设置默认失败');
  } finally {
    loading.value = false;
  }
};

const handleSubmit = async () => {
  try {
    formLoading.value = true;
    const submitData = {
      ...formData,
      isDefault: formData.isDefault ? 1 : 0,
    };
    if (formData.id) {
      await updateLLMKeyApi(submitData);
      antMessage.success('更新成功');
    } else {
      await saveLLMKeyApi(submitData);
      antMessage.success('保存成功');
    }
    formVisible.value = false;
    await fetchLLMKeys();
  } catch (error) {
    console.error('Failed to save LLM key:', error);
    antMessage.error('保存失败');
  } finally {
    formLoading.value = false;
  }
};

const selectPresetModel = (model: any) => {
  formData.modelName = model.value;
  formData.baseUrl = model.baseUrl;
  showPresetDropdown.value = false;
};

const openUrl = (url: string) => {
  window.open(url, '_blank');
};

const getModelLinks = (record: any) => {
  return presetModels.find(
    (m) => m.baseUrl === record.baseUrl || m.value === record.modelName,
  );
};
</script>

<template>
  <div class="p-4 lg:p-6">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-xl font-bold lg:text-2xl">大模型配置</h1>
      <Button type="primary" @click="handleAdd"> 添加配置 </Button>
    </div>

    <Spin :spinning="loading">
      <Table
        :columns="columns"
        :data-source="llmKeys"
        :scroll="{ x: 'max-content' }"
        row-key="id"
      >
        <template #bodyCell="{ column, record, text }">
          <template v-if="column.key === 'apiKey'">
            {{ record.apiKey ? '******' : '' }}
          </template>
          <template v-else-if="column.key === 'isDefault'">
            <span
              v-if="record.isDefault"
              class="rounded bg-green-100 px-2 py-1 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-300"
            >
              默认
            </span>
            <span
              v-else
              class="rounded bg-gray-100 px-2 py-1 text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-300"
            >
              非默认
            </span>
          </template>
          <template v-else-if="column.key === 'links'">
            <div class="flex flex-col gap-1 text-xs">
              <a
                v-if="getModelLinks(record)?.modelListUrl"
                :href="getModelLinks(record)!.modelListUrl"
                target="_blank"
                class="text-blue-500 hover:underline"
              >
                模型列表
              </a>
              <a
                v-if="getModelLinks(record)?.apiKeyUrl"
                :href="getModelLinks(record)!.apiKeyUrl"
                target="_blank"
                class="text-blue-500 hover:underline"
              >
                获取 Key
              </a>
            </div>
          </template>
          <template v-else-if="column.key === 'action'">
            <div class="flex gap-3">
              <Button type="link" size="small" @click="handleEdit(record)">
                编辑
              </Button>
              <Button
                v-if="!record.isDefault"
                type="link"
                size="small"
                class="!text-green-600"
                @click="handleSetDefault(record.id)"
              >
                设为默认
              </Button>
              <Popconfirm
                title="确定删除吗？"
                @confirm="handleDelete(record.id)"
              >
                <Button type="link" size="small" danger> 删除 </Button>
              </Popconfirm>
            </div>
          </template>
          <template v-else>
            {{ text }}
          </template>
        </template>
      </Table>
    </Spin>

    <!-- 表单弹窗 -->
    <Modal
      v-model:open="formVisible"
      :title="formData.id ? '编辑配置' : '添加配置'"
      :confirm-loading="formLoading"
      @ok="handleSubmit"
    >
      <Form layout="vertical" class="mt-4">
        <Form.Item label="模型名称" required>
          <div class="relative" ref="dropdownRef">
            <Input
              v-model:value="formData.modelName"
              placeholder="请输入或选择模型名称"
              class="pr-10"
            />
            <div
              class="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600"
              @click.stop="showPresetDropdown = !showPresetDropdown"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
            <div
              v-if="showPresetDropdown"
              class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
            >
              <div
                v-for="model in presetModels"
                :key="model.value"
                @click="selectPresetModel(model)"
                class="cursor-pointer px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30"
              >
                <div class="font-medium text-gray-900 dark:text-gray-100">
                  {{ model.label }}
                </div>
                <div
                  class="flex justify-between text-xs text-gray-500 dark:text-gray-400"
                >
                  <span>{{ model.value }}</span>
                  <div class="flex gap-2">
                    <span
                      v-if="model.modelListUrl"
                      class="text-blue-500 hover:underline"
                      @click.stop="openUrl(model.modelListUrl)"
                    >
                      模型列表
                    </span>
                    <span
                      v-if="model.apiKeyUrl"
                      class="text-blue-500 hover:underline"
                      @click.stop="openUrl(model.apiKeyUrl)"
                    >
                      获取 Key
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="currentPreset?.modelListUrl" class="mt-1 text-xs">
            <a
              :href="currentPreset.modelListUrl"
              target="_blank"
              class="text-blue-500 hover:underline"
            >
              查看模型列表
            </a>
          </div>
        </Form.Item>
        <Form.Item label="API Key" required>
          <Input.Password
            v-model:value="formData.apiKey"
            placeholder="请输入 API Key"
          />
          <div v-if="currentPreset?.apiKeyUrl" class="mt-1 text-xs">
            <a
              :href="currentPreset.apiKeyUrl"
              target="_blank"
              class="text-blue-500 hover:underline"
            >
              获取 API Key
            </a>
          </div>
        </Form.Item>
        <Form.Item label="Base URL" required>
          <Input
            v-model:value="formData.baseUrl"
            placeholder="请输入 Base URL"
          />
        </Form.Item>
        <Form.Item>
          <Checkbox
            v-model:checked="formData.isDefault"
            :true-value="1"
            :false-value="0"
          >
            设为默认
          </Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>

<style scoped>
:deep(.ant-table-wrapper) {
  @apply overflow-hidden rounded-xl bg-card;
}
</style>
