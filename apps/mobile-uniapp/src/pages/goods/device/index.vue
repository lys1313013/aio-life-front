<template>
  <view class="device-page">
    <view class="header">
      <text class="title">我的设备</text>
      <text class="count">共 {{ deviceList.length }} 台</text>
    </view>

    <view class="grid-container">
      <view class="grid-item" v-for="item in deviceList" :key="item.id" @click="handleEdit(item)" @longpress="handleDelete(item)">
        <view class="image-wrap">
          <image v-if="item.fileId" class="device-img" :src="getAuthImageUrl(item.fileId)" mode="aspectFill" />
          <view v-else class="placeholder-icon">
            <text>📱</text>
          </view>
        </view>
        <view class="info">
          <text class="name">{{ item.name || '未知设备' }}</text>
          <text class="brand">{{ item.brand || '未知品牌' }}</text>
          <text class="price" v-if="item.purchasePrice">¥{{ item.purchasePrice }}</text>
        </view>
      </view>
    </view>

    <!-- FAB for adding device -->
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
import { query, deleteData } from '@/api/device';
import { fetchAuthImageUrl } from '@/utils/file';

const deviceList = ref<any[]>([]);
const authImageUrls = ref<Record<string, string>>({});

const getAuthImageUrl = (fileId?: number | string | null) => {
  if (!fileId) return '';
  const key = String(fileId);
  if (authImageUrls.value[key]) return authImageUrls.value[key];
  fetchAuthImageUrl(fileId).then((url) => {
    authImageUrls.value[key] = url;
  });
  return '';
};

const fabPattern = {
  color: '#7A7E83',
  backgroundColor: '#fff',
  selectedColor: '#007AFF',
  buttonColor: '#3b82f6',
  iconColor: '#fff'
};

const fabContent = [
  {
    iconPath: '/static/add.png',
    selectedIconPath: '/static/add-active.png',
    text: '添加设备',
    active: false
  }
];

const loadData = async () => {
  try {
    const res = await query({ pageNum: 1, pageSize: 50, condition: {} });
    const list = res?.list || res?.records || res?.items || (Array.isArray(res) ? res : []);
    if (list.length > 0) {
      deviceList.value = list;
      list.forEach((item: any) => {
        if (item.fileId) fetchAuthImageUrl(item.fileId);
      });
    } else {
      deviceList.value = [];
    }
  } catch (e) {
    console.error('Failed to load devices:', e);
    deviceList.value = [];
  }
};

const triggerFab = (e: any) => {
  uni.navigateTo({ url: '/pages/goods/device/edit' });
};

const fabClick = () => {
  uni.navigateTo({ url: '/pages/goods/device/edit' });
};

const handleEdit = (item: any) => {
  uni.$emit('editDevice', item);
  uni.navigateTo({ url: '/pages/goods/device/edit' });
};

const handleDelete = (item: any) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除「${item.name}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteData(item.id);
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
.device-page {
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
    height: 240rpx;
    background-color: #f3f4f6;
    display: flex;
    justify-content: center;
    align-items: center;

    .device-img {
      width: 100%;
      height: 100%;
    }

    .placeholder-icon {
      font-size: 80rpx;
    }
  }

  .info {
    padding: 20rpx;

    .name {
      display: block;
      font-size: 28rpx;
      font-weight: 600;
      color: #333;
      margin-bottom: 8rpx;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .brand {
      display: block;
      font-size: 24rpx;
      color: #999;
      margin-bottom: 12rpx;
    }

    .price {
      display: block;
      font-size: 28rpx;
      color: #ef4444;
      font-weight: 500;
    }
  }
}
</style>
