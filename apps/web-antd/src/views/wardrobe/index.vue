<script setup lang="ts">
import type {
  CategoryVO,
  WardrobeItemReq,
  WardrobeItemVO,
  WardrobeStatsVO,
} from '#/api/wardrobe';

import { computed, onMounted, ref } from 'vue';

import { PlusOutlined } from '@ant-design/icons-vue';
import { Card, Col, Empty, message, Row, Spin, Statistic } from 'ant-design-vue';

import {
  deleteWardrobeItem,
  getCategories,
  getWardrobeItems,
  getWardrobeStats,
  saveWardrobeItem,
  updateWardrobeItem,
} from '#/api/wardrobe';

import FilterBar from './components/FilterBar.vue';
import ItemCard from './components/ItemCard.vue';
import ItemForm from './components/ItemForm.vue';

const loading = ref(false);
const items = ref<WardrobeItemVO[]>([]);
const categories = ref<CategoryVO[]>([]);
const stats = ref<null | WardrobeStatsVO>(null);

// 筛选条件
const selectedCategoryId = ref<number>();
const selectedSeason = ref<string>();
const keyword = ref<string>();

// 表单弹窗
const formVisible = ref(false);
const editingItem = ref<null | WardrobeItemVO>(null);

const filteredItems = computed(() => {
  let result = items.value;
  if (selectedCategoryId.value) {
    result = result.filter((i) => i.categoryId === selectedCategoryId.value);
  }
  if (selectedSeason.value) {
    result = result.filter((i) => i.season?.includes(selectedSeason.value!));
  }
  if (keyword.value) {
    const k = keyword.value.toLowerCase();
    result = result.filter(
      (i) =>
        i.name.toLowerCase().includes(k) ||
        i.color?.toLowerCase().includes(k) ||
        i.brand?.toLowerCase().includes(k),
    );
  }
  return result;
});

const fetchData = async () => {
  loading.value = true;
  try {
    const [itemsData, categoriesData, statsData] = await Promise.all([
      getWardrobeItems({}),
      getCategories(),
      getWardrobeStats(),
    ]);
    items.value = itemsData;
    categories.value = categoriesData;
    stats.value = statsData;
  } catch {
    message.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const handleAdd = () => {
  editingItem.value = null;
  formVisible.value = true;
};

const handleEdit = (item: WardrobeItemVO) => {
  editingItem.value = item;
  formVisible.value = true;
};

const handleDelete = async (id: number) => {
  try {
    await deleteWardrobeItem(id);
    message.success('删除成功');
    await fetchData();
  } catch {
    message.error('删除失败');
  }
};

const handleSave = async (data: WardrobeItemReq) => {
  try {
    if (data.id) {
      await updateWardrobeItem(data.id, data);
      message.success('更新成功');
    } else {
      await saveWardrobeItem(data);
      message.success('添加成功');
    }
    formVisible.value = false;
    await fetchData();
  } catch {
    message.error('保存失败');
  }
};

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div class="wardrobe-page">
    <Spin :spinning="loading">
      <!-- 统计卡片 -->
      <Row :gutter="16" class="stats-row">
        <Col :span="6">
          <Card size="small">
            <Statistic title="衣物总数" :value="stats?.totalCount || 0" />
          </Card>
        </Col>
        <Col :span="6">
          <Card size="small">
            <Statistic
              title="总价值"
              :value="stats?.totalValue || 0"
              prefix="¥"
              :precision="2"
            />
          </Card>
        </Col>
        <Col :span="6">
          <Card size="small">
            <Statistic
              title="平均价格"
              :value="stats?.avgPrice || 0"
              prefix="¥"
              :precision="2"
            />
          </Card>
        </Col>
        <Col :span="6">
          <Card size="small">
            <div class="season-stat">
              <span class="stat-label">季节分布:</span>
              <span
                v-for="(count, season) in stats?.seasonCount"
                :key="season"
                class="season-item"
              >
                {{ season }}:{{ count }}
              </span>
            </div>
          </Card>
        </Col>
      </Row>

      <!-- 筛选栏 -->
      <FilterBar
        v-model:selected-category-id="selectedCategoryId"
        v-model:selected-season="selectedSeason"
        v-model:keyword="keyword"
        :categories="categories"
      />

      <!-- 设备墙 -->
      <div class="wardrobe-grid">
        <Empty v-if="filteredItems.length === 0" description="暂无衣物" />
        <Row v-else :gutter="[16, 16]">
          <Col
            v-for="item in filteredItems"
            :key="item.id"
            :xs="12"
            :sm="8"
            :md="6"
            :lg="4"
          >
            <ItemCard :item="item" @edit="handleEdit" @delete="handleDelete" />
          </Col>
        </Row>
      </div>

      <!-- 添加按钮 -->
      <div class="add-btn" @click="handleAdd">
        <PlusOutlined />
      </div>
    </Spin>

    <!-- 表单弹窗 -->
    <ItemForm
      v-model:visible="formVisible"
      :item="editingItem"
      :categories="categories"
      @save="handleSave"
    />
  </div>
</template>

<style scoped>
.wardrobe-page {
  padding: 16px;
  min-height: 100%;
}

.stats-row {
  margin-bottom: 16px;
}

.season-stat {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.stat-label {
  font-weight: 500;
}

.season-item {
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.wardrobe-grid {
  margin-bottom: 80px;
}

.add-btn {
  position: fixed;
  right: 32px;
  bottom: 32px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #1890ff;
  color: #fff;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgb(24, 144, 255, 0.4);
  z-index: 100;
}

.add-btn:hover {
  background: #40a9ff;
}
</style>
