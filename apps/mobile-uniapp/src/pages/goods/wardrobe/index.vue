<template>
  <view class="wardrobe-page">
    <view class="header">
      <text class="title">我的衣柜</text>
      <text class="count">共 {{ wardrobeList.length }} 件</text>
    </view>

    <view class="grid-container">
      <view class="grid-item" v-for="item in wardrobeList" :key="item.id">
        <view class="image-wrap">
          <image v-if="item.photoUrls && item.photoUrls.length > 0" class="wardrobe-img" :src="item.photoUrls[0]" mode="aspectFill" />
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
import { getWardrobeItems, type WardrobeItemVO } from '@/api/wardrobe';

const wardrobeList = ref<WardrobeItemVO[]>([]);

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

const loadData = async () => {
  try {
    const res: any = await getWardrobeItems({});
    const list = res?.list || res?.records || res?.items || (Array.isArray(res) ? res : []);
    if (list.length > 0) {
      wardrobeList.value = list;
    } else {
      wardrobeList.value = [];
    }
  } catch (e) {
    console.error('Failed to load wardrobe:', e);
    wardrobeList.value = [];
  }
};

const triggerFab = (e: any) => {
  uni.showToast({ title: '添加衣物', icon: 'none' });
};

const fabClick = () => {
  uni.showToast({ title: '添加衣物', icon: 'none' });
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
