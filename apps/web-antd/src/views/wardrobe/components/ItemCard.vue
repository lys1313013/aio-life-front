<script setup lang="ts">
import type { WardrobeItemVO } from '#/api/wardrobe';

import { computed } from 'vue';

import { DeleteOutlined, EditOutlined } from '@ant-design/icons-vue';
import { Card, Image, Popconfirm, Tooltip } from 'ant-design-vue';

const props = defineProps<{
  item: WardrobeItemVO;
}>();

const emit = defineEmits<{
  delete: [id: number];
  edit: [item: WardrobeItemVO];
}>();

const coverImage = computed(() => {
  if (props.item.photoUrls && props.item.photoUrls.length > 0) {
    return props.item.photoUrls[0];
  }
  return null;
});
</script>

<template>
  <Card class="wardrobe-item-card" hoverable @click="emit('edit', item)">
    <template #cover>
      <div class="card-image">
        <Image
          v-if="coverImage"
          :src="coverImage"
          :preview="false"
          class="item-image"
        />
        <div v-else class="no-image">
          <span>无图片</span>
        </div>
      </div>
    </template>
    <CardMeta>
      <template #title>
        <div class="card-title">
          <span class="item-name">{{ item.name }}</span>
          <div class="card-actions" @click.stop>
            <Tooltip title="编辑">
              <EditOutlined class="action-icon" @click="emit('edit', item)" />
            </Tooltip>
            <Popconfirm
              title="确定删除这件衣物吗?"
              @confirm="emit('delete', item.id!)"
            >
              <Tooltip title="删除">
                <DeleteOutlined class="action-icon delete" />
              </Tooltip>
            </Popconfirm>
          </div>
        </div>
      </template>
      <template #description>
        <div class="card-desc">
          <span v-if="item.categoryName" class="tag">{{
            item.categoryName
          }}</span>
          <span
            v-if="item.color"
            class="color-dot"
            :style="{ background: item.color }"
          >
            {{ item.color }}
          </span>
        </div>
      </template>
    </CardMeta>
  </Card>
</template>

<style scoped>
.wardrobe-item-card {
  cursor: pointer;
}

.card-image {
  height: 180px;
  overflow: hidden;
  background: #f5f5f5;
}

.item-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-image {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}

.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.action-icon {
  cursor: pointer;
  padding: 4px;
}

.action-icon:hover {
  color: #1890ff;
}

.action-icon.delete:hover {
  color: #ff4d4f;
}

.card-desc {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tag {
  font-size: 12px;
  color: #666;
}

.color-dot {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #fff;
}
</style>
