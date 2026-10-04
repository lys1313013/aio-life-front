<script lang="ts" setup>
import type { McpToolInfo } from '#/api/core/mcp';

import { computed, h, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  AppstoreOutlined,
  BookOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CodeOutlined,
  CopyOutlined,
  KeyOutlined,
  PlayCircleOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Select,
  Switch,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { generateApiKeyApi } from '#/api/core/api-key';
import { callMcpToolApi, getMcpToolsApi } from '#/api/core/mcp';
import { AppModal as Modal } from '#/components/app-modal';
import ContentLoading from '#/components/ContentLoading.vue';

import { toolGroups, toolPresentation } from './presentation';

const tools = ref<McpToolInfo[]>([]);
const loading = ref(true);
const loadError = ref(false);
const searchText = ref('');
const activeGroup = ref('all');
const showGuide = ref(false);
const groups = computed(() =>
  toolGroups.filter(
    (group) =>
      group.value === 'all' ||
      tools.value.some((tool) => toolPresentation(tool).group === group.value),
  ),
);
const filteredTools = computed(() => {
  const keyword = searchText.value.trim().toLowerCase();
  return tools.value.filter((tool) => {
    const info = toolPresentation(tool);
    return (
      (activeGroup.value === 'all' || info.group === activeGroup.value) &&
      `${info.title} ${tool.name} ${tool.description}`
        .toLowerCase()
        .includes(keyword)
    );
  });
});
const groupIcons = {
  time: ClockCircleOutlined,
  plan: CheckOutlined,
  learn: BookOutlined,
  life: AppstoreOutlined,
  other: CodeOutlined,
};
const toolIcon = (tool: McpToolInfo) =>
  groupIcons[toolPresentation(tool).group as keyof typeof groupIcons];
const router = useRouter();
const mcpUrl = `${window.location.origin}/api/mcp`;
const clientConfig = JSON.stringify(
  {
    mcpServers: {
      'aio-life': {
        type: 'streamable-http',
        url: mcpUrl,
        headers: { Authorization: 'Bearer <your-api-key>' },
      },
    },
  },
  null,
  2,
);
const copyText = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value);
    message.success('已复制到剪贴板');
  } catch {
    message.error('复制失败，请手动复制');
  }
};

const apiKeyModalVisible = ref(false);
const apiKeyGenerating = ref(false);
const apiKeyForm = ref({ remark: 'MCP 客户端', expireDays: 0 });
const generatedApiKey = ref('');
const openApiKeyModal = () => {
  showGuide.value = false;
  apiKeyForm.value = { remark: 'MCP 客户端', expireDays: 0 };
  generatedApiKey.value = '';
  apiKeyModalVisible.value = true;
};
const handleGenerateApiKey = async () => {
  if (apiKeyGenerating.value) return;
  apiKeyGenerating.value = true;
  try {
    const data = await generateApiKeyApi(apiKeyForm.value);
    generatedApiKey.value = data.apiKey;
  } finally {
    apiKeyGenerating.value = false;
  }
};
const copyApiKey = () => copyText(generatedApiKey.value);
const loadTools = async () => {
  if (loading.value && tools.value.length > 0) return;
  loading.value = true;
  loadError.value = false;
  try {
    tools.value = await getMcpToolsApi();
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
};

const modalVisible = ref(false);
const modalTool = ref<McpToolInfo | null>(null);
const modalFormValues = ref<Record<string, any>>({});
const modalResult = ref('');
const modalCalling = ref(false);
const modalIsError = ref(false);
const getProperties = (tool: McpToolInfo) =>
  Object.entries(tool.inputSchema?.properties || {}).map(([name, value]) => ({
    name,
    type: value.type || 'unknown',
    description: value.description || '',
    required: tool.inputSchema?.required?.includes(name) || false,
    enum: value.enum,
  }));
const openCallModal = (tool: McpToolInfo) => {
  modalTool.value = tool;
  const values: Record<string, any> = {};
  for (const [key, value] of Object.entries(
    tool.inputSchema?.properties || {},
  )) {
    values[key] = value.enum?.length
      ? value.enum[0]
      : value.type === 'boolean'
        ? false
        : '';
  }
  modalFormValues.value = values;
  modalResult.value = '';
  modalIsError.value = false;
  modalVisible.value = true;
};
const callTool = async () => {
  const tool = modalTool.value;
  if (!tool || modalCalling.value) return;
  const args: Record<string, any> = {};
  for (const prop of getProperties(tool)) {
    const value = modalFormValues.value[prop.name];
    if (value === undefined || value === null || value === '') {
      if (prop.required) {
        message.warning(`请填写 ${prop.name}`);
        return;
      }
      continue;
    }
    if (prop.type === 'array' || prop.type === 'object') {
      try {
        args[prop.name] = typeof value === 'string' ? JSON.parse(value) : value;
      } catch {
        message.warning(`${prop.name} 需要有效的 JSON`);
        return;
      }
    } else {
      args[prop.name] = value;
    }
  }
  modalCalling.value = true;
  modalResult.value = '';
  modalIsError.value = false;
  try {
    const res = await callMcpToolApi(tool.name, args);
    modalResult.value =
      res.content
        ?.map((item) => {
          try {
            return JSON.stringify(JSON.parse(item.text), null, 2);
          } catch {
            return item.text;
          }
        })
        .join('\n') || '无返回内容';
    modalIsError.value = res.isError;
  } catch (error: any) {
    modalResult.value = error?.message || '调用失败';
    modalIsError.value = true;
  } finally {
    modalCalling.value = false;
  }
};
onMounted(loadTools);
</script>

<template>
  <div class="mcp-tools-page">
    <header class="page-header">
      <div class="header-info">
        <h2>MCP 工具</h2>
        <span class="tool-count text-muted-foreground">{{ tools.length }}</span>
      </div>
    </header>

    <section class="connection-bar bg-card">
      <div class="connection-icon text-primary"><CodeOutlined /></div>
      <div class="connection-info">
        <span class="connection-name"
          >AIO Life
          <span class="connection-protocol text-muted-foreground"
            >Streamable HTTP</span
          ></span
        ><code class="connection-url text-muted-foreground">{{ mcpUrl }}</code>
      </div>
      <Button
        type="text"
        class="icon-button"
        aria-label="复制服务地址"
        :icon="h(CopyOutlined)"
        @click="copyText(mcpUrl)"
      />
      <Button
        class="icon-button"
        aria-label="连接配置"
        :icon="h(SettingOutlined)"
        @click="showGuide = true"
      />
    </section>

    <section class="tools-section">
      <div class="tools-toolbar">
        <div class="group-tabs" role="group" aria-label="工具分类">
          <button
            v-for="group in groups"
            :key="group.value"
            type="button"
            class="group-tab"
            :class="{ 'group-tab-active': activeGroup === group.value }"
            :aria-pressed="activeGroup === group.value"
            @click="activeGroup = group.value"
          >
            {{ group.label }}
          </button>
        </div>
        <Input
          v-model:value="searchText"
          class="tool-search"
          aria-label="搜索工具"
          placeholder="搜索名称或描述"
          allow-clear
        >
          <template #prefix>
            <SearchOutlined class="text-muted-foreground" />
          </template>
        </Input>
      </div>
      <div class="list-caption text-muted-foreground">
        <span>工具目录</span><span>{{ filteredTools.length }} 个工具</span>
      </div>
      <ContentLoading v-if="loading && tools.length === 0" min-height="280px" />
      <div v-else-if="loadError" class="load-error">
        <span>工具加载失败</span
        ><Button :loading="loading" @click="loadTools">重试</Button>
      </div>
      <Empty
        v-else-if="filteredTools.length === 0"
        :description="tools.length > 0 ? '没有匹配的工具' : '暂无 MCP 工具'"
        class="empty-state"
      >
        <Button
          v-if="tools.length > 0"
          @click="
            searchText = '';
            activeGroup = 'all';
          "
        >
          清除筛选
        </Button>
      </Empty>
      <div v-else class="tool-list bg-card">
        <button
          v-for="tool in filteredTools"
          :key="tool.name"
          type="button"
          class="tool-row"
          :aria-label="`输入参数并调用 ${tool.name}`"
          @click="openCallModal(tool)"
        >
          <span class="tool-identity"
            ><span class="tool-icon text-muted-foreground"
              ><component :is="toolIcon(tool)" /></span
            ><span class="tool-labels"
              ><span class="tool-title">{{ toolPresentation(tool).title }}</span
              ><code class="tool-name text-muted-foreground">{{
                tool.name
              }}</code></span
            ></span
          >
          <span class="tool-summary text-muted-foreground">{{
            toolPresentation(tool).summary
          }}</span>
          <span class="tool-meta text-muted-foreground">{{
            getProperties(tool).length > 0
              ? `${getProperties(tool).length} 参数`
              : '无参数'
          }}</span>
          <span class="tool-open text-primary"><PlayCircleOutlined /></span>
        </button>
      </div>
    </section>

    <Modal
      v-model:open="showGuide"
      title="连接配置"
      :footer="null"
      width="620px"
    >
      <div class="config-panel">
        <div class="panel-heading">
          <CodeOutlined class="text-primary" />
          <h3 class="panel-title">连接 AIO Life</h3>
        </div>
        <div class="config-address bg-secondary">
          <div class="config-address-info">
            <span class="text-muted-foreground">服务地址</span
            ><code>{{ mcpUrl }}</code>
          </div>
          <Button
            type="text"
            class="icon-button"
            aria-label="复制服务地址"
            :icon="h(CopyOutlined)"
            @click="copyText(mcpUrl)"
          />
        </div>
        <div class="config-facts text-muted-foreground">
          <span>Streamable HTTP</span><span>Bearer API Key</span>
        </div>
        <div class="config-section-heading">
          <span>客户端配置</span
          ><Button
            type="text"
            class="icon-button"
            aria-label="复制客户端配置"
            :icon="h(CopyOutlined)"
            @click="copyText(clientConfig)"
          />
        </div>
        <pre class="guide-config-json bg-secondary">{{ clientConfig }}</pre>
        <div class="key-actions">
          <Button :icon="h(KeyOutlined)" @click="openApiKeyModal">
            生成密钥
          </Button>
          <Button type="link" @click="router.push('/mcp/api-keys')">
            管理 API Key
          </Button>
        </div>
      </div>
    </Modal>

    <Modal
      v-model:open="modalVisible"
      :title="modalTool ? `调用 ${modalTool.name}` : '调用工具'"
      width="640px"
      :busy="modalCalling"
      :confirm-loading="modalCalling"
      ok-text="调用"
      cancel-text="关闭"
      :submit-on-enter="false"
      @ok="callTool"
    >
      <div v-if="modalTool" class="modal-call">
        <div class="panel-heading">
          <component :is="toolIcon(modalTool)" class="text-primary" />
          <h3 class="panel-title">{{ toolPresentation(modalTool).title }}</h3>
        </div>
        <code class="modal-tool-name text-muted-foreground">{{
          modalTool.name
        }}</code>
        <p class="modal-tool-desc text-muted-foreground">
          {{ modalTool.description }}
        </p>
        <div class="config-section-heading">
          <span>输入参数</span
          ><span class="text-muted-foreground">{{
            getProperties(modalTool).length
          }}</span>
        </div>
        <Form
          v-if="getProperties(modalTool).length > 0"
          layout="vertical"
          class="modal-form"
        >
          <Form.Item
            v-for="param in getProperties(modalTool)"
            :key="param.name"
            :required="param.required"
            :extra="param.description"
          >
            <template #label>
              <span>{{ param.name }}</span
              ><code class="param-type text-muted-foreground">{{
                param.type
              }}</code>
            </template>
            <Select
              v-if="param.enum"
              v-model:value="modalFormValues[param.name]"
              :aria-label="param.name"
              :options="
                param.enum.map((e: any) => ({ label: String(e), value: e }))
              "
              placeholder="请选择"
              allow-clear
              :disabled="modalCalling"
            />
            <Switch
              v-else-if="param.type === 'boolean'"
              v-model:checked="modalFormValues[param.name]"
              :aria-label="param.name"
              :disabled="modalCalling"
            />
            <InputNumber
              v-else-if="param.type === 'number' || param.type === 'integer'"
              v-model:value="modalFormValues[param.name]"
              :aria-label="param.name"
              style="width: 100%"
              placeholder="请输入数字"
              :disabled="modalCalling"
            />
            <Input.TextArea
              v-else-if="param.type === 'object' || param.type === 'array'"
              v-model:value="modalFormValues[param.name]"
              :aria-label="param.name"
              :rows="4"
              placeholder="输入 JSON"
              :disabled="modalCalling"
            />
            <Input
              v-else
              v-model:value="modalFormValues[param.name]"
              :aria-label="param.name"
              placeholder="请输入"
              :disabled="modalCalling"
            />
          </Form.Item>
        </Form>
        <p v-else class="no-params text-muted-foreground">
          无需填写参数，可直接调用。
        </p>
        <div v-if="modalResult" class="modal-result" aria-live="polite">
          <div class="config-section-heading">
            <span>{{ modalIsError ? '调用失败' : '返回结果' }}</span
            ><Button
              type="text"
              class="icon-button"
              aria-label="复制返回结果"
              :icon="h(CopyOutlined)"
              @click="copyText(modalResult)"
            />
          </div>
          <pre
            class="result-content bg-secondary"
            :class="{ 'text-destructive': modalIsError }"
            >{{ modalResult }}</pre
          >
        </div>
      </div>
    </Modal>
    <!-- 生成 API Key 弹窗 -->
    <Modal
      v-model:open="apiKeyModalVisible"
      title="生成 API Key"
      :footer="null"
      width="480px"
      :busy="apiKeyGenerating"
      destroy-on-close
    >
      <div v-if="!generatedApiKey" class="api-key-modal">
        <h3 class="panel-title">生成 API Key</h3>
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
        <div
          class="api-key-result-value border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
        >
          <code class="text-blue-600 dark:text-blue-400">{{
            generatedApiKey
          }}</code>
          <Tooltip title="复制">
            <Button
              type="link"
              size="small"
              :icon="h(CopyOutlined)"
              aria-label="复制 API Key"
              @click="copyApiKey"
            />
          </Tooltip>
        </div>
        <div class="api-key-result-usage">
          <div class="guide-section-title text-gray-800 dark:text-gray-200">
            使用方法
          </div>
          <pre
            class="guide-config-json border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
            >{{
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
            }}</pre
          >
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.mcp-tools-page {
  max-width: 1360px;
  margin: 0 auto;
  padding: 20px 24px 32px;
  color: hsl(var(--foreground));
}

.page-header,
.header-info,
.connection-bar,
.tools-toolbar,
.list-caption,
.panel-heading,
.config-section-heading,
.key-actions,
.config-facts {
  display: flex;
  align-items: center;
}

.page-header {
  justify-content: space-between;
  margin-bottom: 16px;
}

.header-info {
  gap: 10px;
}

.header-info h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.tool-count {
  font-size: 13px;
}

.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 44px;
  padding: 0;
  flex-shrink: 0;
}

.connection-bar {
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
}

.connection-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: hsl(var(--primary) / 0.08);
  border-radius: 10px;
  font-size: 21px;
  flex-shrink: 0;
}

.connection-info {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.connection-name {
  font-size: 14px;
  font-weight: 600;
}

.connection-protocol {
  margin-left: 12px;
  font-size: 12px;
  font-weight: 400;
}

.connection-url {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.tools-section {
  margin-top: 24px;
}

.tools-toolbar {
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.group-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.group-tab {
  padding: 0 12px;
  height: 40px;
  border: none;
  border-radius: 8px;
  color: hsl(var(--muted-foreground));
  background: transparent;
  cursor: pointer;
  font-size: 13px;
}

.group-tab:hover {
  color: hsl(var(--foreground));
  background: hsl(var(--accent));
}

.group-tab-active {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 0.09);
  font-weight: 500;
}

.tool-search {
  width: 240px;
  min-height: 36px;
}

.list-caption {
  justify-content: space-between;
  padding: 18px 2px 10px;
  font-size: 12px;
}

.tool-list {
  border-radius: 12px;
  overflow: hidden;
}

.tool-row {
  display: grid;
  width: 100%;
  grid-template-columns: minmax(255px, 0.9fr) minmax(160px, 1.4fr) 64px 36px;
  align-items: center;
  column-gap: 20px;
  padding: 16px;
  border: none;
  border-bottom: 1px solid hsl(var(--border) / 0.55);
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.tool-row:last-child {
  border-bottom: none;
}

.tool-row:hover {
  background: hsl(var(--accent) / 0.6);
}

.tool-row:focus-visible,
.group-tab:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: -2px;
}

.tool-identity {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.tool-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  flex-shrink: 0;
  font-size: 19px;
}

.tool-labels {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 4px;
}

.tool-title {
  font-size: 14px;
  font-weight: 500;
  overflow-wrap: anywhere;
}

.tool-name {
  font-size: 11px;
  overflow-wrap: anywhere;
}

.tool-summary {
  font-size: 13px;
  line-height: 1.6;
}

.tool-meta {
  font-size: 12px;
  text-align: right;
  white-space: nowrap;
}

.tool-open {
  display: flex;
  justify-content: center;
  font-size: 19px;
}

.empty-state,
.load-error {
  padding: 48px 16px;
}

.load-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.config-panel,
.modal-call {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-heading {
  gap: 10px;
  font-size: 20px;
}

.panel-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.config-address {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  padding: 8px 12px;
}

.config-address-info {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}

.config-address-info code {
  overflow-wrap: anywhere;
}

.config-facts {
  gap: 20px;
  font-size: 12px;
}

.config-section-heading {
  justify-content: space-between;
  min-height: 36px;
  font-size: 13px;
  font-weight: 500;
}

.guide-config-json,
.result-content {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 12px;
  border-radius: 8px;
  padding: 14px;
  margin: 0;
  max-height: 320px;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.7;
}

.key-actions {
  gap: 8px;
  padding-top: 4px;
}

.modal-tool-name {
  font-size: 12px;
  overflow-wrap: anywhere;
}

.modal-tool-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
}

.param-type {
  margin-left: 8px;
  font-size: 11px;
  font-weight: 400;
}

.no-params {
  margin: 0;
  padding: 8px 0;
  font-size: 13px;
}

.modal-form :deep(.ant-form-item:last-child) {
  margin-bottom: 0;
}

.api-key-modal,
.api-key-result,
.api-key-result-usage {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.api-key-result-icon,
.api-key-result-tip {
  text-align: center;
}

.api-key-result-tip {
  margin: 0;
  font-size: 12px;
}

.api-key-result-value {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
}

.api-key-result-value code {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}

@media (max-width: 1050px) {
  .tools-toolbar {
    align-items: stretch;
    flex-direction: column-reverse;
    gap: 10px;
  }

  .tool-search {
    width: 100%;
  }

  .tool-row {
    grid-template-columns: minmax(220px, 1fr) minmax(150px, 1fr) 52px 24px;
    gap: 12px;
  }
}

@media (max-width: 640px) {
  .mcp-tools-page {
    padding: 12px;
  }

  .page-header {
    margin-bottom: 12px;
  }

  .header-info h2 {
    font-size: 18px;
  }

  .connection-bar {
    padding: 12px;
    gap: 8px;
  }

  .connection-protocol {
    display: none;
  }

  .tools-section {
    margin-top: 16px;
  }

  .group-tabs {
    flex-wrap: nowrap;
    overflow-x: auto;
  }

  .group-tab {
    padding: 0 10px;
    white-space: nowrap;
    min-height: 44px;
    flex-shrink: 0;
  }

  .tool-row {
    grid-template-columns: minmax(0, 1fr) 56px 24px;
    row-gap: 8px;
    padding: 14px 12px;
  }

  .tool-identity {
    grid-column: 1 / 3;
    grid-row: 1;
    gap: 8px;
  }

  .tool-summary {
    grid-column: 1 / 3;
    grid-row: 2;
    padding-left: 40px;
    font-size: 12px;
  }

  .tool-meta {
    grid-column: 1 / 3;
    grid-row: 3;
    padding-left: 40px;
    text-align: left;
    font-size: 11px;
  }

  .tool-open {
    grid-column: 3;
    grid-row: 1 / 4;
  }
}
</style>
