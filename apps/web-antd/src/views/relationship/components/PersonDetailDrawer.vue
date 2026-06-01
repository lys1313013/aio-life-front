<script setup lang="ts">
import type { PersonDetailVO } from '#/api/relationship';

import { ref } from 'vue';

import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue';
import { Button, Drawer, Empty, message, Popconfirm } from 'ant-design-vue';

import { deletePerson, deleteRelationship } from '#/api/relationship';

const props = defineProps<{
  open: boolean;
  personDetail: null | PersonDetailVO;
}>();

const emit = defineEmits([
  'update:open',
  'refresh',
  'open-relationship-form',
  'edit-person',
]);

const deleteLoading = ref(false);

const handleDeletePerson = async (id: string) => {
  deleteLoading.value = true;
  try {
    await deletePerson(id);
    message.success('删除成功');
    emit('update:open', false);
    emit('refresh');
  } catch (error) {
    message.error('删除失败');
    console.error(error);
  } finally {
    deleteLoading.value = false;
  }
};

const handleDeleteRelationship = async (targetId: string) => {
  if (!props.personDetail) return;
  try {
    await deleteRelationship({
      sourcePersonId: props.personDetail.id,
      targetPersonId: targetId,
      relationType: '', // 满足 TS 类型要求
    });
    message.success('删除成功');
    emit('refresh'); // 触发父组件重新获取详情和图谱
  } catch (error) {
    message.error('删除失败');
    console.error(error);
  }
};
</script>

<template>
  <Drawer
    :open="open"
    :title="personDetail?.name || '人物详情'"
    width="400"
    @update:open="$emit('update:open', $event)"
  >
    <template v-if="personDetail">
      <div class="person-detail">
        <div class="detail-section">
          <h4>基本信息</h4>
          <p v-if="personDetail.category">
            <strong>分类：</strong>{{ personDetail.category }}
          </p>
          <p v-if="personDetail.description">
            <strong>简介：</strong>{{ personDetail.description }}
          </p>
          <p v-if="personDetail.birthday">
            <strong>生日：</strong>{{ personDetail.birthday }}
          </p>
          <p v-if="personDetail.phone">
            <strong>电话：</strong>{{ personDetail.phone }}
          </p>
          <p v-if="personDetail.email">
            <strong>邮箱：</strong>{{ personDetail.email }}
          </p>
          <p v-if="personDetail.tags">
            <strong>标签：</strong>{{ personDetail.tags }}
          </p>
          <p v-if="personDetail.notes">
            <strong>备注：</strong>{{ personDetail.notes }}
          </p>
        </div>

        <div class="detail-section">
          <div class="section-header">
            <h4>关系 ({{ personDetail.relationships?.length || 0 }})</h4>
            <Button
              type="link"
              size="small"
              @click="$emit('open-relationship-form')"
            >
              <PlusOutlined /> 添加关系
            </Button>
          </div>
          <div
            v-if="personDetail.relationships?.length"
            class="relationship-list"
          >
            <div
              v-for="rel in personDetail.relationships"
              :key="rel.id"
              class="relationship-item"
            >
              <div class="rel-info">
                <span class="rel-type">{{ rel.relationType }}</span>
                <span class="rel-name"> → {{ rel.target?.name }}</span>
              </div>
              <div class="rel-actions">
                <DeleteOutlined
                  class="delete-icon"
                  @click="handleDeleteRelationship(rel.target?.id || '')"
                />
              </div>
            </div>
          </div>
          <Empty
            v-else
            description="暂无关系"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
        </div>

        <div class="detail-actions">
          <Button @click="$emit('edit-person', personDetail.id)">
            <EditOutlined /> 编辑
          </Button>
          <Popconfirm
            title="确定删除此人物？"
            @confirm="handleDeletePerson(personDetail.id)"
          >
            <Button type="primary" danger :loading="deleteLoading">
              <DeleteOutlined /> 删除
            </Button>
          </Popconfirm>
        </div>
      </div>
    </template>
  </Drawer>
</template>

<style scoped>
.person-detail {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-section h4 {
  margin-bottom: 12px;
  font-weight: 600;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 8px;
}

.detail-section p {
  margin-bottom: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 12px;
}

.section-header h4 {
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
}

.relationship-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.relationship-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background-color: #fafafa;
  border-radius: 4px;
}

.rel-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rel-type {
  color: #1890ff;
  background: #e6f7ff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.rel-name {
  font-weight: 500;
}

.rel-actions .delete-icon {
  color: #ff4d4f;
  cursor: pointer;
  transition: opacity 0.2s;
}

.rel-actions .delete-icon:hover {
  opacity: 0.8;
}

.detail-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 16px;
}

/* 适配夜间模式 */
@media (prefers-color-scheme: dark) {
  .detail-section h4,
  .section-header {
    border-color: #303030;
  }

  .relationship-item {
    background-color: #1f1f1f;
  }

  .rel-type {
    color: #177ddc;
    background: #112840;
  }
}
</style>
