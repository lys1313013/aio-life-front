<script setup lang="ts">
import type { RelationshipReq } from '#/api/relationship';

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

import { createRelationship } from '#/api/relationship';

const props = defineProps<{
  nodes: { id: string; name: string }[];
  open: boolean;
  sourcePersonId: string;
}>();

const emit = defineEmits(['update:open', 'success']);

const relationTypes = [
  { label: '父母', value: '父母' },
  { label: '母亲', value: '母亲' },
  { label: '父亲', value: '父亲' },
  { label: '子女', value: '子女' },
  { label: '配偶', value: '配偶' },
  { label: '兄弟姐妹', value: '兄弟姐妹' },
  { label: '朋友', value: '朋友' },
  { label: '挚友', value: '挚友' },
  { label: '同学', value: '同学' },
  { label: '同事', value: '同事' },
  { label: '老师', value: '老师' },
  { label: '学生', value: '学生' },
  { label: 'mentor', value: 'mentor' },
  { label: '恋人', value: '恋人' },
  { label: '前任', value: '前任' },
  { label: '暗恋', value: '暗恋' },
  { label: '其他', value: '其他' },
];

const relationshipForm = ref<RelationshipReq>({
  sourcePersonId: '',
  targetPersonId: '',
  relationType: '',
  direction: '双向',
  description: '',
  tags: '',
});

const submitLoading = ref(false);

watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      relationshipForm.value = {
        sourcePersonId: props.sourcePersonId,
        targetPersonId: '',
        relationType: '',
        direction: '双向',
        description: '',
        tags: '',
      };
    }
  },
);

const handleRelationshipSubmit = async () => {
  submitLoading.value = true;
  try {
    await createRelationship(relationshipForm.value);
    message.success('添加成功');
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
    title="添加关系"
    :confirm-loading="submitLoading"
    @update:open="$emit('update:open', $event)"
    @ok="handleRelationshipSubmit"
    width="400px"
  >
    <Form layout="vertical">
      <FormItem label="关系类型" required>
        <Select
          v-model:value="relationshipForm.relationType"
          placeholder="选择关系类型"
        >
          <SelectOption
            v-for="opt in relationTypes"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </SelectOption>
        </Select>
      </FormItem>
      <FormItem label="对方人物" required>
        <Select
          v-model:value="relationshipForm.targetPersonId"
          placeholder="选择人物"
        >
          <SelectOption
            v-for="n in nodes.filter((n) => n.id !== sourcePersonId)"
            :key="n.id"
            :value="n.id"
          >
            {{ n.name }}
          </SelectOption>
        </Select>
      </FormItem>
      <FormItem label="方向">
        <Select v-model:value="relationshipForm.direction">
          <SelectOption value="双向">双向</SelectOption>
          <SelectOption value="单向">单向</SelectOption>
        </Select>
      </FormItem>
      <FormItem label="描述">
        <Input.TextArea
          v-model:value="relationshipForm.description"
          placeholder="关系描述"
          :rows="2"
        />
      </FormItem>
      <FormItem label="标签">
        <Input
          v-model:value="relationshipForm.tags"
          placeholder="多个标签用逗号分隔"
        />
      </FormItem>
    </Form>
  </Modal>
</template>
