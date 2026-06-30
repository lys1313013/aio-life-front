<template>
  <view class="wardrobe-page">
    <view class="header">
      <text class="title">我的衣柜</text>
      <text class="count">共 {{ wardrobeList.length }} 件</text>
    </view>

    <view class="grid-container">
      <view class="grid-item" v-for="item in wardrobeList" :key="item.id" @click="handleEdit(item)" @longpress="handleDelete(item)">
        <view class="image-wrap">
          <image v-if="item.fileId" class="wardrobe-img" :src="getAuthImageUrl(item.fileId)" mode="aspectFill" />
          <view v-else class="placeholder-icon">
            <text>👕</text>
          </view>
        </view>
        <view class="info">
          <text class="name">{{ item.name || '未知衣物' }}</text>
          <text class="season" v-if="item.season">{{ item.season }}</text>
        </view>
      </view>
    </view>

    <!-- FAB for adding wardrobe item -->
    <uni-fab
      ref="fab"
      :pattern="fabPattern"
      :content="fabContent"
      horizontal="right"
      vertical="bottom"
      direction="horizontal"
      @trigger="triggerFab"
      @fabClick="fabClick"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getWardrobeItems, deleteWardrobeItem, type WardrobeItemVO } from '@/api/wardrobe';
import { fetchAuthImageUrl } from '@/utils/file';

const wardrobeList = ref<WardrobeItemVO[]>([]);
const authImageUrls = ref<Record<string, string>>({});

const fabPattern = {
  color: '#7A7E83',
  backgroundColor: '#fff',
  selectedColor: '#007AFF',
  buttonColor: '#8b5cf6',
  iconColor: '#fff'
};

const fabContent = [
  {
    iconPath: '/static/add.png',
    selectedIconPath: '/static/add-active.png',
    text: '添加衣物',
    active: false
  }
];

const getAuthImageUrl = (fileId?: number | string | null) => {
  if (!fileId) return '';
  const key = String(fileId);
  if (authImageUrls.value[key]) return authImageUrls.value[key];
  fetchAuthImageUrl(fileId).then((url) => {
    authImageUrls.value[key] = url;
  });
  return '';
};

const loadData = async () => {
  try {
    const res: any = await getWardrobeItems({});
    const list = res?.list || res?.records || res?.items || (Array.isArray(res) ? res : []);
    if (list.length > 0) {
      wardrobeList.value = list;
      // 预加载图片
      list.forEach((item: WardrobeItemVO) => {
        if (item.fileId) fetchAuthImageUrl(item.fileId);
      });
    } else {
      wardrobeList.value = [];
    }
  } catch (e) {
    console.error('Failed to load wardrobe:', e);
    wardrobeList.value = [];
  }
};

const triggerFab = (e: any) => {
  uni.navigateTo({ url: '/pages/goods/wardrobe/edit' });
};

const fabClick = () => {
  uni.navigateTo({ url: '/pages/goods/wardrobe/edit' });
};

const handleEdit = (item: WardrobeItemVO) => {
  uni.$emit('editWardrobe', item);
  uni.navigateTo({ url: '/pages/goods/wardrobe/edit' });
};

const handleDelete = (item: WardrobeItemVO) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除「${item.name}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteWardrobeItem(item.id);
          uni.showToast({ title: '已删除', icon: 'success' });
          loadData();
        } catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }); }
      }
    }
  });
};

onMounted(() => {
  loadData();
});
</script>

<style lang="scss" scoped>
.wardrobe-page {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 30rpx;
  padding-bottom: 120rpx;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;

  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: #333;
  }

  .count {
    font-size: 26rpx;
    color: #666;
    background-color: #e5e7eb;
    padding: 4rpx 16rpx;
    border-radius: 20rpx;
  }
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 30rpx;
}

.grid-item {
  background-color: #fff;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);

  .image-wrap {
    width: 100%;
    height: 300rpx;
    background-color: #f3f4f6;
    display: flex;
    justify-content: center;
    align-items: center;

    .wardrobe-img {
      width: 100%;
      height: 100%;
    }

    .placeholder-icon {
      font-size: 100rpx;
    }
  }

  .info {
    padding: 20rpx;

    .name {
      display: block;
      font-size: 28rpx;
      font-weight: 600;
      color: #333;
      margin-bottom: 12rpx;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .season {
      display: inline-block;
      font-size: 22rpx;
      color: #8b5cf6;
      background-color: rgba(139, 92, 246, 0.1);
      padding: 4rpx 12rpx;
      border-radius: 8rpx;
    }
  }
}
</style>
