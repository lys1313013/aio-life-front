<script lang="ts" setup>
import type { McpToolInfo } from '#/api/core/mcp';

import { onMounted, ref } from 'vue';

import { CaretRightOutlined, SearchOutlined } from '@ant-design/icons-vue';
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
} from 'ant-design-vue';

import { callMcpToolApi, getMcpToolsApi } from '#/api/core/mcp';

const tools = ref<McpToolInfo[]>([]);
const loading = ref(true);
const searchText = ref('');
const filteredTools = ref<McpToolInfo[]>([]);

// 弹窗状态
const modalVisible = ref(false);
const modalTool = ref<McpToolInfo | null>(null);
const modalFormValues = ref<Record<string, any>>({});
const modalResult = ref('');
const modalCalling = ref(false);
const modalIsError = ref(false);

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
        <span class="tool-count">共 {{ filteredTools.length }} 个工具</span>
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
              <code class="tool-name">{{ tool.name }}</code>
            </div>
          </template>
          <template #extra>
            <Tag color="blue" size="small">
              {{ getProperties(tool).length }} 参数
            </Tag>
          </template>

          <p class="tool-desc">{{ tool.description }}</p>

          <Collapse v-if="getProperties(tool).length > 0" ghost size="small">
            <Collapse.Panel key="params">
              <template #header>
                <span class="schema-header"> 输入参数 </span>
              </template>
              <div class="params-list">
                <div
                  v-for="param in getProperties(tool)"
                  :key="param.name"
                  class="param-item"
                >
                  <div class="param-row">
                    <code class="param-name">{{ param.name }}</code>
                    <Tag :color="getTypeColor(param.type)" size="small">
                      {{ param.type }}
                    </Tag>
                    <Tag v-if="param.required" color="red" size="small">
                      必填
                    </Tag>
                  </div>
                  <p v-if="param.description" class="param-desc">
                    {{ param.description }}
                  </p>
                  <div v-if="param.enum" class="param-enum">
                    <span class="enum-label">可选值：</span>
                    <Tag v-for="val in param.enum" :key="val" size="small">
                      {{ val }}
                    </Tag>
                  </div>
                </div>
              </div>
            </Collapse.Panel>
          </Collapse>

          <div v-else class="no-params">该工具无需输入参数</div>

          <div class="card-footer">
            <a class="action-btn primary" @click.stop="openCallModal(tool)">
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
      width="560px"
      destroy-on-close
    >
      <div v-if="modalTool" class="modal-call">
        <p class="modal-tool-desc">{{ modalTool.description }}</p>

        <div class="modal-toolbar">
          <span class="modal-label">参数配置</span>
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
            />
            <Switch
              v-else-if="param.type === 'boolean'"
              v-model:checked="modalFormValues[param.name]"
            />
            <InputNumber
              v-else-if="param.type === 'number' || param.type === 'integer'"
              v-model:value="modalFormValues[param.name]"
              style="width: 100%"
              placeholder="请输入数字"
            />
            <Input
              v-else
              v-model:value="modalFormValues[param.name]"
              placeholder="请输入"
            />
          </Form.Item>
        </Form>
        <div v-else class="no-params">该工具无需输入参数</div>

        <Button
          type="primary"
          block
          :loading="modalCalling"
          class="modal-call-btn"
          @click="callTool"
        >
          调用
        </Button>

        <div v-if="modalResult" class="modal-result">
          <div class="result-label">返回结果</div>
          <pre class="result-content" :class="{ 'is-error': modalIsError }">{{
            modalResult
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
  color: #999;
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

.tool-card:hover {
  box-shadow: 0 2px 12px rgb(0 0 0 / 8%);
}

.tool-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-name {
  font-size: 13px;
  font-weight: 600;
  color: #1677ff;
  background: #f0f5ff;
  padding: 1px 6px;
  border-radius: 4px;
}

.tool-desc {
  margin: 0 0 8px;
  font-size: 12px;
  color: #666;
  line-height: 1.5;
}

.schema-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
}

.collapse-icon {
  font-size: 10px;
}

.params-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.param-item {
  padding: 6px 10px;
  background: #fafafa;
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
  color: #333;
}

.param-desc {
  margin: 4px 0 0;
  font-size: 11px;
  color: #999;
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
  color: #999;
}

.no-params {
  font-size: 13px;
  color: #ccc;
  text-align: center;
  padding: 12px 0;
}

.card-footer {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  gap: 16px;
}

.action-btn {
  font-size: 12px;
  color: #666;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.action-btn:hover {
  color: #1677ff;
}

.action-btn.primary {
  color: #1677ff;
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
  color: #666;
}

.modal-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-label {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.modal-textarea {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 12px;
}

.modal-call-btn {
  margin-top: 4px;
}

.modal-result {
  margin-top: 4px;
}

.result-label {
  font-size: 12px;
  font-weight: 500;
  color: #333;
  margin-bottom: 6px;
}

.result-content {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 11px;
  background: #f7f8fa;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 10px;
  margin: 0;
  max-height: 240px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.result-content.is-error {
  color: #ff4d4f;
  border-color: #ffccc7;
  background: #fff2f0;
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
}
</style>
