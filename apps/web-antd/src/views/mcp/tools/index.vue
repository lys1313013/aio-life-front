<script lang="ts" setup>
import type { McpToolInfo } from '#/api/core/mcp';

import { h, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { CaretRightOutlined, CopyOutlined, SearchOutlined } from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Collapse,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Spin,
  Switch,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { callMcpToolApi, getMcpToolsApi } from '#/api/core/mcp';
import { generateApiKeyApi } from '#/api/core/api-key';

const tools = ref<McpToolInfo[]>([]);
const loading = ref(true);
const searchText = ref('');
const filteredTools = ref<McpToolInfo[]>([]);
const showGuide = ref(true);

// 弹窗状态
const modalVisible = ref(false);
const modalTool = ref<McpToolInfo | null>(null);
const modalFormValues = ref<Record<string, any>>({});
const modalResult = ref('');
const modalCalling = ref(false);
const modalIsError = ref(false);

// MCP 配置信息
const router = useRouter();
const mcpUrl = `${window.location.origin}/api/mcp`;

const copyUrl = async () => {
  try {
    await navigator.clipboard.writeText(mcpUrl);
    message.success('已复制到剪贴板');
  } catch {
    message.error('复制失败，请手动复制');
  }
};

// API Key 生成
const apiKeyModalVisible = ref(false);
const apiKeyGenerating = ref(false);
const apiKeyForm = ref({ remark: 'MCP 客户端', expireDays: 0 });
const generatedApiKey = ref('');

const openApiKeyModal = () => {
  apiKeyForm.value = { remark: 'MCP 客户端', expireDays: 0 };
  generatedApiKey.value = '';
  apiKeyModalVisible.value = true;
};

const handleGenerateApiKey = async () => {
  apiKeyGenerating.value = true;
  try {
    const data = await generateApiKeyApi(apiKeyForm.value);
    generatedApiKey.value = data.apiKey;
  } finally {
    apiKeyGenerating.value = false;
  }
};

const copyApiKey = async () => {
  try {
    await navigator.clipboard.writeText(generatedApiKey.value);
    message.success('已复制到剪贴板');
  } catch {
    message.error('复制失败，请手动复制');
  }
};

const filterTools = () => {
  const keyword = searchText.value.toLowerCase();
  if (!keyword) {
    filteredTools.value = tools.value;
    return;
  }
  filteredTools.value = tools.value.filter(
    (t) =>
      t.name.toLowerCase().includes(keyword) ||
      t.description.toLowerCase().includes(keyword),
  );
};

const loadTools = async () => {
  loading.value = true;
  try {
    const res = await getMcpToolsApi();
    tools.value = res;
    filterTools();
  } catch (error: any) {
    message.error(error?.message || '加载 MCP 工具失败');
  } finally {
    loading.value = false;
  }
};

const getProperties = (tool: McpToolInfo) => {
  const props = tool.inputSchema?.properties;
  if (!props) return [];
  return Object.entries(props).map(([key, val]: [string, any]) => ({
    name: key,
    type: val.type || 'unknown',
    description: val.description || '',
    required: tool.inputSchema?.required?.includes(key) || false,
    enum: val.enum,
  }));
};

const openCallModal = (tool: McpToolInfo) => {
  modalTool.value = tool;

  // 初始化表单值
  const values: Record<string, any> = {};
  const props = tool.inputSchema?.properties;
  if (props) {
    for (const [key, val] of Object.entries<any>(props)) {
      if (val.enum?.length) {
        values[key] = val.enum[0];
      } else
        switch (val.type) {
          case 'array': {
            values[key] = ''; // 用户可以输入 JSON 字符串

            break;
          }
          case 'boolean': {
            values[key] = false;

            break;
          }
          case 'integer':
          case 'number': {
            values[key] = undefined;

            break;
          }
          default: {
            values[key] = '';
          }
        }
    }
  }
  modalFormValues.value = values;

  modalResult.value = '';
  modalCalling.value = false;
  modalIsError.value = false;
  modalVisible.value = true;
};

const callTool = async () => {
  const tool = modalTool.value;
  if (!tool) return;
  modalCalling.value = true;
  modalResult.value = '';
  modalIsError.value = false;
  try {
    const args: Record<string, any> = {};
    for (const prop of getProperties(tool)) {
      const val = modalFormValues.value[prop.name];
      if (val !== undefined && val !== '') {
        if (prop.type === 'array' || prop.type === 'object') {
          try {
            args[prop.name] = typeof val === 'string' ? JSON.parse(val) : val;
          } catch {
            args[prop.name] = val; // 解析失败则直接传字符串
          }
        } else {
          args[prop.name] = val;
        }
      }
    }
    const res = await callMcpToolApi(tool.name, args);
    const text =
      res.content
        ?.map((c) => {
          try {
            // 尝试格式化 JSON 字符串
            const jsonObj = JSON.parse(c.text);
            return JSON.stringify(jsonObj, null, 2);
          } catch {
            return c.text;
          }
        })
        .join('\n') || '无返回内容';
    modalResult.value = text;
    modalIsError.value = res.isError;
  } catch (error: any) {
    modalResult.value = error?.message || '调用失败';
    modalIsError.value = true;
  } finally {
    modalCalling.value = false;
  }
};

const getTypeColor = (type: string) => {
  const map: Record<string, string> = {
    string: 'blue',
    integer: 'green',
    number: 'orange',
    boolean: 'purple',
    array: 'cyan',
    object: 'geekblue',
  };
  return map[type] || 'default';
};

onMounted(() => {
  loadTools();
});
</script>

<template>
  <div class="mcp-tools-page">
    <div class="page-header">
      <div class="header-info">
        <h2>MCP 工具</h2>
        <span class="tool-count text-gray-400">共 {{ filteredTools.length }} 个工具</span>
      </div>
      <Input
        v-model:value="searchText"
        placeholder="搜索工具名称或描述"
        allow-clear
        style="width: 240px"
        size="small"
        @input="filterTools"
      >
        <template #prefix>
          <SearchOutlined />
        </template>
      </Input>
    </div>

    <!-- 配置指南 -->
    <Card
      v-if="showGuide"
      class="guide-card"
      size="small"
      :bordered="true"
    >
      <template #title>
        <div class="guide-title-row">
          <span class="guide-title">配置指南</span>
          <Tag color="green">MCP 服务端</Tag>
        </div>
      </template>
      <template #extra>
        <Button type="link" size="small" @click="showGuide = false">收起</Button>
      </template>

      <div class="guide-body">
        <!-- 基本连接信息 -->
        <div class="guide-section">
          <div class="guide-item">
            <span class="guide-label text-gray-500">服务地址</span>
            <div class="guide-url">
              <code class="guide-code bg-gray-100 dark:bg-gray-800">{{ mcpUrl }}</code>
              <Tooltip title="复制地址">
                <Button type="link" size="small" :icon="h(CopyOutlined)" @click="copyUrl" />
              </Tooltip>
            </div>
          </div>
          <div class="guide-item">
            <span class="guide-label text-gray-500">传输类型</span>
            <Tag color="blue">Streamable HTTP</Tag>
          </div>
          <div class="guide-item">
            <span class="guide-label text-gray-500">认证方式</span>
            <div class="guide-auth">
              <code class="guide-code bg-gray-100 dark:bg-gray-800">Authorization: Bearer &lt;API Key&gt;</code>
              <div class="guide-hint text-gray-400">
                <Button type="link" size="small" class="guide-generate-btn" @click="openApiKeyModal">
                  生成密钥
                </Button>
                <span>或前往 <span class="guide-link text-blue-600 dark:text-blue-400" @click="router.push('/profile')">个人中心</span> 管理</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 客户端配置示例 -->
        <div class="guide-section">
          <div class="guide-section-title text-gray-800 dark:text-gray-200">客户端配置</div>
          <pre class="guide-config-json border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">{{
            JSON.stringify(
              {
                mcpServers: {
                  'aio-life': {
                    type: 'streamable-http',
                    url: mcpUrl,
                    headers: {
                      Authorization: 'Bearer <your-api-key>',
                    },
                  },
                },
              },
              null,
              2,
            )
          }}</pre>
        </div>
      </div>
    </Card>

    <div
      v-if="!showGuide"
      class="guide-collapsed bg-gray-50 text-gray-500 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
      @click="showGuide = true"
    >
      <span>配置指南</span>
      <Tag color="green" size="small">MCP 服务端</Tag>
      <span class="guide-expand-link text-blue-600 dark:text-blue-400">展开</span>
    </div>

    <Spin :spinning="loading">
      <Empty
        v-if="!loading && filteredTools.length === 0"
        description="暂无 MCP 工具"
      />

      <div v-else class="tools-grid">
        <Card
          v-for="tool in filteredTools"
          :key="tool.name"
          class="tool-card"
          :bordered="true"
          size="small"
        >
          <template #title>
            <div class="tool-title">
              <code class="tool-name bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">{{ tool.name }}</code>
            </div>
          </template>
          <template #extra>
            <Tag color="blue" size="small">
              {{ getProperties(tool).length }} 参数
            </Tag>
          </template>

          <p class="tool-desc text-gray-500">{{ tool.description }}</p>

          <Collapse v-if="getProperties(tool).length > 0" ghost size="small">
            <Collapse.Panel key="params">
              <template #header>
                <span class="schema-header text-gray-500"> 输入参数 </span>
              </template>
              <div class="params-list">
                <div
                  v-for="param in getProperties(tool)"
                  :key="param.name"
                  class="param-item bg-gray-50 dark:bg-gray-800"
                >
                  <div class="param-row">
                    <code class="param-name text-gray-800 dark:text-gray-200">{{ param.name }}</code>
                    <Tag :color="getTypeColor(param.type)" size="small">
                      {{ param.type }}
                    </Tag>
                    <Tag v-if="param.required" color="red" size="small">
                      必填
                    </Tag>
                  </div>
                  <p v-if="param.description" class="param-desc text-gray-400">
                    {{ param.description }}
                  </p>
                  <div v-if="param.enum" class="param-enum">
                    <span class="enum-label text-gray-400">可选值：</span>
                    <Tag v-for="val in param.enum" :key="val" size="small">
                      {{ val }}
                    </Tag>
                  </div>
                </div>
              </div>
            </Collapse.Panel>
          </Collapse>

          <div v-else class="no-params text-gray-300 dark:text-gray-600">该工具无需输入参数</div>

          <div class="card-footer border-t border-gray-100 dark:border-gray-700">
            <a class="action-btn primary text-blue-600 dark:text-blue-400" @click.stop="openCallModal(tool)">
              <CaretRightOutlined /> 调用
            </a>
          </div>
        </Card>
      </div>
    </Spin>

    <!-- 模拟调用弹窗 -->
    <Modal
      v-model:open="modalVisible"
      :title="modalTool ? `调用 - ${modalTool.name}` : '调用'"
      :footer="null"
      width="480px"
      destroy-on-close
    >
      <div v-if="modalTool" class="modal-call">
        <p v-if="modalTool.description" class="modal-tool-desc text-gray-500">{{ modalTool.description }}</p>

        <div class="modal-actions">
          <span class="modal-label text-gray-800 dark:text-gray-200">参数配置</span>
          <Button type="primary" size="small" :loading="modalCalling" @click="callTool">调用</Button>
        </div>

        <Form
          v-if="getProperties(modalTool).length > 0"
          layout="vertical"
          class="modal-form"
        >
          <Form.Item
            v-for="param in getProperties(modalTool)"
            :key="param.name"
            :label="param.name"
            :required="param.required"
            :extra="param.description"
          >
            <Select
              v-if="param.enum"
              v-model:value="modalFormValues[param.name]"
              :options="param.enum.map((e: any) => ({ label: e, value: e }))"
              placeholder="请选择"
              allow-clear
              size="small"
            />
            <Switch
              v-else-if="param.type === 'boolean'"
              v-model:checked="modalFormValues[param.name]"
              size="small"
            />
            <InputNumber
              v-else-if="param.type === 'number' || param.type === 'integer'"
              v-model:value="modalFormValues[param.name]"
              style="width: 100%"
              placeholder="请输入数字"
              size="small"
            />
            <Input
              v-else
              v-model:value="modalFormValues[param.name]"
              placeholder="请输入"
              size="small"
            />
          </Form.Item>
        </Form>
        <div v-else class="no-params text-gray-300 dark:text-gray-600">该工具无需输入参数</div>

        <div v-if="modalResult" class="modal-result">
          <div class="result-label text-gray-800 dark:text-gray-200">返回结果</div>
          <pre
            class="result-content border"
            :class="modalIsError
              ? 'text-red-500 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/30 dark:border-red-800'
              : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'"
          >{{
            modalResult
          }}</pre>
        </div>
      </div>
    </Modal>

    <!-- 生成 API Key 弹窗 -->
    <Modal
      v-model:open="apiKeyModalVisible"
      title="生成 API Key"
      :footer="null"
      width="480px"
      destroy-on-close
    >
      <div v-if="!generatedApiKey" class="api-key-modal">
        <Form :model="apiKeyForm" layout="vertical">
          <Form.Item label="备注" name="remark">
            <Input
              v-model:value="apiKeyForm.remark"
              placeholder="输入备注，方便识别"
            />
          </Form.Item>
          <Form.Item label="有效期" name="expireDays">
            <Select v-model:value="apiKeyForm.expireDays">
              <Select.Option :value="0">永不过期</Select.Option>
              <Select.Option :value="30">30 天</Select.Option>
              <Select.Option :value="90">90 天</Select.Option>
              <Select.Option :value="365">365 天</Select.Option>
            </Select>
          </Form.Item>
        </Form>
        <Button
          type="primary"
          block
          :loading="apiKeyGenerating"
          @click="handleGenerateApiKey"
        >
          生成
        </Button>
      </div>
      <div v-else class="api-key-result">
        <div class="api-key-result-icon">
          <Tag color="success">生成成功</Tag>
        </div>
        <p class="api-key-result-tip text-gray-400">
          请复制并妥善保管您的 API Key，关闭后将无法再次查看完整密钥。
        </p>
        <div class="api-key-result-value border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <code class="text-blue-600 dark:text-blue-400">{{ generatedApiKey }}</code>
          <Tooltip title="复制">
            <Button type="link" size="small" :icon="h(CopyOutlined)" @click="copyApiKey" />
          </Tooltip>
        </div>
        <div class="api-key-result-usage">
          <div class="guide-section-title text-gray-800 dark:text-gray-200">使用方法</div>
          <pre class="guide-config-json border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">{{
            JSON.stringify(
              {
                mcpServers: {
                  'aio-life': {
                    type: 'streamable-http',
                    url: mcpUrl,
                    headers: {
                      Authorization: `Bearer ${generatedApiKey}`,
                    },
                  },
                },
              },
              null,
              2,
            )
          }}</pre>
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.mcp-tools-page {
  padding: 12px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.header-info {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.header-info h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.tool-count {
  font-size: 13px;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}

.tool-card {
  border-radius: 8px;
  transition: box-shadow 0.2s;
}

.tool-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-name {
  font-size: 13px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
}

.tool-desc {
  margin: 0 0 8px;
  font-size: 12px;
  line-height: 1.5;
}

.schema-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.params-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.param-item {
  padding: 6px 10px;
  border-radius: 6px;
}

.param-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.param-name {
  font-size: 13px;
  font-weight: 500;
}

.param-desc {
  margin: 4px 0 0;
  font-size: 11px;
}

.param-enum {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.enum-label {
  font-size: 12px;
}

.no-params {
  font-size: 13px;
  text-align: center;
  padding: 12px 0;
}

.card-footer {
  margin-top: 8px;
  padding-top: 8px;
  display: flex;
  gap: 16px;
}

.action-btn {
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.action-btn.primary {
  font-weight: 500;
}

/* 弹窗 */
.modal-call {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.modal-tool-desc {
  margin: 0;
  font-size: 13px;
}

.modal-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-label {
  font-size: 13px;
  font-weight: 500;
}

/* small 控件下收紧行距（antd 默认 24px 偏松） */
.modal-form :deep(.ant-form-item) {
  margin-bottom: 12px;
}

.modal-result {
  margin-top: 4px;
}

.result-label {
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 6px;
}

.result-content {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 11px;
  border-radius: 6px;
  padding: 10px;
  margin: 0;
  max-height: 240px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 配置指南 */
.guide-card {
  margin-bottom: 16px;
  border-radius: 8px;
}

.guide-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.guide-title {
  font-size: 14px;
  font-weight: 600;
}

.guide-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.guide-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.guide-section-title {
  font-size: 13px;
  font-weight: 500;
}

.guide-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.guide-label {
  font-size: 13px;
  min-width: 64px;
  line-height: 28px;
  flex-shrink: 0;
}

.guide-url {
  display: flex;
  align-items: center;
  gap: 4px;
}

.guide-code {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  word-break: break-all;
}

.guide-auth {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.guide-hint {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.guide-generate-btn {
  padding: 0 4px;
  font-size: 12px;
  height: auto;
}

.guide-link {
  cursor: pointer;
}

.guide-link:hover {
  text-decoration: underline;
}

.guide-config-json {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 11px;
  border-radius: 6px;
  padding: 12px;
  margin: 0;
  max-height: 300px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.6;
}

.guide-collapsed {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s;
}

.guide-expand-link {
  margin-left: auto;
  font-size: 12px;
}

/* API Key 弹窗 */
.api-key-modal {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.api-key-result {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.api-key-result-icon {
  text-align: center;
}

.api-key-result-tip {
  margin: 0;
  font-size: 12px;
  text-align: center;
}

.api-key-result-value {
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 6px;
  padding: 8px 12px;
}

.api-key-result-value code {
  flex: 1;
  font-size: 13px;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  word-break: break-all;
}

.api-key-result-usage {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (max-width: 768px) {
  .tools-grid {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .page-header .ant-input {
    width: 100% !important;
  }

  .guide-item {
    flex-direction: column;
    gap: 4px;
  }

  .guide-config-json {
    font-size: 10px;
    max-height: 220px;
  }
}
</style>
