<script setup lang="ts">
import type { PersonDetailVO } from '#/api/relationship';

import {
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue';
import { Button, Empty, Popconfirm, Spin } from 'ant-design-vue';

import { getRelationColor } from '../constants';

defineProps<{
  detail: null | PersonDetailVO;
  loading?: boolean;
  showClose?: boolean;
}>();

const emit = defineEmits<{
  (e: 'add-relationship'): void;
  (e: 'close'): void;
  (e: 'delete-person', id: string): void;
  (e: 'delete-relationship', targetId: string): void;
  (e: 'edit', id: string): void;
}>();
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div
      class="flex shrink-0 items-center justify-between border-b border-border px-4 py-3"
    >
      <span class="truncate text-base font-medium text-card-foreground">
        {{ detail?.name || '人物详情' }}
      </span>
      <CloseOutlined
        v-if="showClose"
        class="cursor-pointer text-muted-foreground"
        @click="emit('close')"
      />
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto p-4">
      <Spin :spinning="loading ?? false">
        <template v-if="detail">
          <div class="mb-6">
            <h4 class="mb-3 text-sm font-semibold text-card-foreground">
              基本信息
            </h4>
            <div class="space-y-2 text-sm text-muted-foreground">
              <p v-if="detail.category">
                <strong class="text-card-foreground">分类：</strong
                >{{ detail.category }}
              </p>
              <p v-if="detail.description">
                <strong class="text-card-foreground">简介：</strong
                >{{ detail.description }}
              </p>
              <p v-if="detail.birthday">
                <strong class="text-card-foreground">生日：</strong
                >{{ detail.birthday }}
              </p>
              <p v-if="detail.phone">
                <strong class="text-card-foreground">电话：</strong
                >{{ detail.phone }}
              </p>
              <p v-if="detail.email">
                <strong class="text-card-foreground">邮箱：</strong
                >{{ detail.email }}
              </p>
              <p v-if="detail.tags">
                <strong class="text-card-foreground">标签：</strong
                >{{ detail.tags }}
              </p>
              <p v-if="detail.notes">
                <strong class="text-card-foreground">备注：</strong
                >{{ detail.notes }}
              </p>
            </div>
          </div>

          <div class="mb-6">
            <div class="mb-3 flex items-center justify-between">
              <h4 class="text-sm font-semibold text-card-foreground">
                关系 ({{ detail.relationships?.length || 0 }})
              </h4>
              <Button
                size="small"
                type="link"
                @click="emit('add-relationship')"
              >
                <PlusOutlined /> 添加关系
              </Button>
            </div>
            <div
              v-if="detail.relationships?.length"
              class="flex flex-col gap-2"
            >
              <div
                v-for="rel in detail.relationships"
                :key="rel.id"
                class="flex items-center justify-between rounded bg-secondary px-3 py-2"
              >
                <div class="text-sm">
                  <span
                    class="font-medium"
                    :style="{ color: getRelationColor(rel.relationType) }"
                  >
                    {{ rel.relationType }}
                  </span>
                  <span class="text-card-foreground">
                    → {{ rel.target?.name }}</span
                  >
                </div>
                <DeleteOutlined
                  class="cursor-pointer text-red-500"
                  @click="emit('delete-relationship', rel.target?.id || '')"
                />
              </div>
            </div>
            <Empty
              v-else
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
              description="暂无关系"
            />
          </div>

          <div class="flex gap-2">
            <Button @click="emit('edit', detail.id)">
              <EditOutlined /> 编辑
            </Button>
            <Popconfirm
              title="确定删除此人物？"
              @confirm="emit('delete-person', detail.id)"
            >
              <Button danger type="primary"> <DeleteOutlined /> 删除 </Button>
            </Popconfirm>
          </div>
        </template>
      </Spin>
    </div>
  </div>
</template>
