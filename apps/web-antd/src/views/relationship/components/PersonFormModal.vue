<script setup lang="ts">
import type { PersonReq } from '#/api/relationship';

import { ref, watch } from 'vue';

import {
  Form,
  FormItem,
  Input,
  message,
  Modal,
  Select,
  SelectOption,
} from 'ant-design-vue';

import { createPerson, updatePerson } from '#/api/relationship';

const props = defineProps<{
  editingPersonId: null | string;
  initialData?: null | PersonReq;
  open: boolean;
}>();

const emit = defineEmits(['update:open', 'success']);

const categoryOptions = [
  { label: '亲属', value: '亲属' },
  { label: '社会', value: '社会' },
  { label: '情感', value: '情感' },
  { label: '其他', value: '其他' },
];

const personForm = ref<PersonReq>({
  name: '',
  avatar: '',
  category: '',
  description: '',
  tags: '',
  birthday: '',
  phone: '',
  email: '',
  socialLinks: '',
  notes: '',
});

const submitLoading = ref(false);

watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      if (props.editingPersonId && props.initialData) {
        personForm.value = { ...props.initialData };
      } else {
        personForm.value = {
          name: '',
          avatar: '',
          category: '',
          description: '',
          tags: '',
          birthday: '',
          phone: '',
          email: '',
          socialLinks: '',
          notes: '',
        };
      }
    }
  },
);

const handlePersonSubmit = async () => {
  submitLoading.value = true;
  try {
    if (props.editingPersonId) {
      await updatePerson(props.editingPersonId, personForm.value);
      message.success('更新成功');
    } else {
      await createPerson(personForm.value);
      message.success('添加成功');
    }
    emit('success');
    emit('update:open', false);
  } catch (error) {
    message.error('保存失败');
    console.error(error);
  } finally {
    submitLoading.value = false;
  }
};
</script>

<template>
  <Modal
    :open="open"
    :title="editingPersonId ? '编辑人物' : '添加人物'"
    :confirm-loading="submitLoading"
    @update:open="$emit('update:open', $event)"
    @ok="handlePersonSubmit"
    width="500px"
  >
    <Form layout="vertical">
      <FormItem label="姓名" required>
        <Input v-model:value="personForm.name" placeholder="请输入姓名" />
      </FormItem>
      <FormItem label="分类">
        <Select v-model:value="personForm.category" placeholder="请选择分类">
          <SelectOption
            v-for="opt in categoryOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </SelectOption>
        </Select>
      </FormItem>
      <FormItem label="简介">
        <Input.TextArea
          v-model:value="personForm.description"
          placeholder="简短描述"
          :rows="2"
        />
      </FormItem>
      <FormItem label="标签">
        <Input
          v-model:value="personForm.tags"
          placeholder="多个标签用逗号分隔"
        />
      </FormItem>
      <FormItem label="生日">
        <Input
          v-model:value="personForm.birthday"
          placeholder="如：1990-01-01"
        />
      </FormItem>
      <FormItem label="电话">
        <Input v-model:value="personForm.phone" placeholder="手机号" />
      </FormItem>
      <FormItem label="邮箱">
        <Input v-model:value="personForm.email" placeholder="邮箱" />
      </FormItem>
      <FormItem label="备注">
        <Input.TextArea
          v-model:value="personForm.notes"
          placeholder="其他备注"
          :rows="2"
        />
      </FormItem>
    </Form>
  </Modal>
</template>
