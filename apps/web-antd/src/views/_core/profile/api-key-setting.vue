<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { message, Modal, Form, Input, Select, Button, Table, Popconfirm } from 'ant-design-vue';
import { getApiKeyListApi, generateApiKeyApi, deleteApiKeyApi } from '#/api';
import dayjs from 'dayjs';

const loading = ref(false);
const dataSource = ref<any[]>([]);
const visible = ref(false);
const confirmLoading = ref(false);

const formState = ref({
  remark: '',
  expireDays: 0,
});

const columns = [
  {
    title: '备注',
    dataIndex: 'remark',
    key: 'remark',
  },
  {
    title: 'API Key',
    dataIndex: 'apiKey',
    key: 'apiKey',
  },
  {
    title: '过期时间',
    dataIndex: 'expiredAt',
    key: 'expiredAt',
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    key: 'createTime',
  },
  {
    title: '操作',
    key: 'action',
  },
];

const fetchList = async () => {
  loading.value = true;
  try {
    const res = await getApiKeyListApi();
    dataSource.value = res;
  } finally {
    loading.value = false;
  }
};

const handleGenerate = async () => {
  if (!formState.value.remark) {
    message.error('请输入备注');
    return;
  }
  confirmLoading.value = true;
  try {
    const data = await generateApiKeyApi(formState.value);
    Modal.success({
      title: '生成成功',
      content: `请妥善保管您的 API Key，关闭后将无法再次查看全文：\n\n${data.apiKey}`,
      okText: '确定',
    });
    visible.value = false;
    formState.value = { remark: '', expireDays: 0 };
    fetchList();
  } finally {
    confirmLoading.value = false;
  }
};

const handleDelete = async (id: number) => {
  try {
    await deleteApiKeyApi(id);
    message.success('删除成功');
    fetchList();
  } catch (error) {
    console.error(error);
  }
};

onMounted(() => {
  fetchList();
});
</script>

<template>
  <div class="p-4">
    <div class="mb-4 flex justify-between items-center">
      <div class="text-lg font-medium">API Key 管理</div>
      <Button type="primary" @click="visible = true">生成新 Key</Button>
    </div>

    <Table :columns="columns" :data-source="dataSource" :loading="loading" row-key="id">
      <template #bodyCell="{ column, record, text }">
        <template v-if="column.key === 'apiKey'">
          <code>{{ record.apiKey.substring(0, 8) }}***{{ record.apiKey.substring(record.apiKey.length - 4) }}</code>
        </template>
        <template v-else-if="column.key === 'expiredAt'">
          {{ text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '永不过期' }}
        </template>
        <template v-else-if="column.key === 'createTime'">
          {{ dayjs(text).format('YYYY-MM-DD HH:mm:ss') }}
        </template>
        <template v-else-if="column.key === 'action'">
          <Popconfirm title="确定要删除该 API Key 吗？" @confirm="handleDelete(record.id)">
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="visible"
      title="生成新 API Key"
      :confirm-loading="confirmLoading"
      @ok="handleGenerate"
    >
      <Form :model="formState" layout="vertical">
        <Form.Item label="备注" name="remark" required>
          <Input v-model:value="formState.remark" placeholder="请输入 API Key 备注" />
        </Form.Item>
        <Form.Item label="有效期" name="expireDays">
          <Select v-model:value="formState.expireDays">
            <Select.Option :value="0">永不过期</Select.Option>
            <Select.Option :value="1">1 天</Select.Option>
            <Select.Option :value="7">7 天</Select.Option>
            <Select.Option :value="30">30 天</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>

<style scoped>
code {
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 4px;
  font-family: monospace;
}
</style>
