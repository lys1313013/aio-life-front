<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Button, Form, Input, Modal, Popconfirm, Select, Table, message } from 'ant-design-vue';
import { getUserBindListApi, addUserBindApi, updateUserBindApi, deleteUserBindApi, type UserBindEntity } from '#/api/core/user-bind';

const columns = [
  { title: '平台', dataIndex: 'platform', key: 'platform' },
  { title: '账号/用户名', dataIndex: 'platformUsername', key: 'platformUsername' },
  { title: '绑定时间', dataIndex: 'createTime', key: 'createTime' },
  { title: '操作', key: 'action' },
];

const data = ref<UserBindEntity[]>([]);
const loading = ref(false);
const modalVisible = ref(false);
const modalLoading = ref(false);

const formState = ref<UserBindEntity>({
  platform: 'github',
  platformUsername: '',
  accessToken: '',
});

const platformOptions = [
  { label: 'GitHub', value: 'github' },
  { label: 'LeetCode', value: 'leetcode' },
  { label: '扇贝单词', value: 'shanbay' },
];

const fetchList = async () => {
  loading.value = true;
  try {
    data.value = await getUserBindListApi();
  } finally {
    loading.value = false;
  }
};

const handleAdd = () => {
  formState.value = { platform: 'github', platformUsername: '', accessToken: '' };
  modalVisible.value = true;
};

const handleEdit = (record: UserBindEntity) => {
  formState.value = { ...record, accessToken: '' }; // 编辑时不回显Token
  modalVisible.value = true;
};

const handleDelete = async (id: number) => {
  try {
    await deleteUserBindApi(id);
    message.success('删除成功');
    fetchList();
  } catch (error) {
    // error handled by request interceptor usually
  }
};

const handleOk = async () => {
  modalLoading.value = true;
  try {
    if (formState.value.id) {
      await updateUserBindApi(formState.value);
    } else {
      await addUserBindApi(formState.value);
    }
    message.success('保存成功');
    modalVisible.value = false;
    fetchList();
  } finally {
    modalLoading.value = false;
  }
};

onMounted(() => {
  fetchList();
});
</script>

<template>
  <div class="p-4">
    <div class="mb-4">
      <Button type="primary" @click="handleAdd">新增绑定</Button>
    </div>
    
    <Table :columns="columns" :dataSource="data" :loading="loading" rowKey="id">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <Button type="link" @click="handleEdit(record)">编辑</Button>
          <Popconfirm
            title="确定要删除此绑定吗？"
            ok-text="确定"
            cancel-text="取消"
            @confirm="handleDelete(record.id)"
          >
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </template>
        <template v-else-if="column.key === 'platform'">
          {{ platformOptions.find(p => p.value === record.platform)?.label || record.platform }}
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="modalVisible"
      title="绑定账号"
      @ok="handleOk"
      :confirmLoading="modalLoading"
    >
      <Form layout="vertical" :model="formState">
        <Form.Item label="平台" required>
          <Select v-model:value="formState.platform" :options="platformOptions" />
        </Form.Item>
        <Form.Item label="账号/用户名" required>
          <Input v-model:value="formState.platformUsername" />
        </Form.Item>
        <Form.Item label="Access Token">
          <Input.Password v-model:value="formState.accessToken" placeholder="若不修改请留空" />
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>
