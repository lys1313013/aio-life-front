<template>
  <view class="container">
    <view class="person-list" v-if="personList.length > 0">
      <view class="person-card" v-for="item in personList" :key="item.id" @click="onClickPerson(item)">
        <view class="avatar">
          <image v-if="item.avatar" :src="item.avatar" mode="aspectFill" />
          <text v-else class="initial">{{ item.name.charAt(0) }}</text>
        </view>
        <view class="info">
          <view class="header">
            <text class="name">{{ item.name }}</text>
            <text class="category" v-if="item.category">{{ item.category }}</text>
          </view>
          <text class="desc" v-if="item.description">{{ item.description }}</text>
          <view class="relations" v-if="item.relationships && item.relationships.length > 0">
            <text class="relation-tag" v-for="rel in item.relationships" :key="rel.id">
              {{ rel.relationType }}: {{ rel.target.name }}
            </text>
          </view>
        </view>
      </view>
    </view>
    <view v-else class="empty">
      <text>暂无人物关系数据</text>
    </view>

    <!-- FAB -->
    <uni-fab
      horizontal="right"
      vertical="bottom"
      :pattern="{ buttonColor: '#3f51b5' }"
      @fabClick="onAddPerson"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getPersons, type PersonDetailVO } from '../../../api/relationship';

const personList = ref<any[]>([]);

const loadPersonList = async () => {
  try {
    // 这里我们调用获取图谱的接口或者人员列表，展示一下
    const res = await getPersons();
    // 假设 res 是 GraphData 结构或者直接的人员列表
    // 为了移动端展示，我们将 nodes 当作人员列表
    if (res && (res as any).nodes) {
      personList.value = (res as any).nodes;
    } else if (Array.isArray(res)) {
      personList.value = res;
    }
  } catch (e) {
    console.error('加载人物列表失败', e);
  }
};

const onClickPerson = (item: any) => {
  uni.showToast({ title: `查看: ${item.name}`, icon: 'none' });
};

const onAddPerson = () => {
  uni.showToast({ title: '添加人物', icon: 'none' });
};

onMounted(() => {
  loadPersonList();
});
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;
  padding-bottom: 120rpx;
}

.person-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.person-card {
  display: flex;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
  
  .avatar {
    width: 100rpx;
    height: 100rpx;
    border-radius: 50%;
    background-color: #e8eaf6;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-right: 30rpx;
    overflow: hidden;
    flex-shrink: 0;
    
    image {
      width: 100%;
      height: 100%;
    }
    
    .initial {
      font-size: 40rpx;
      color: #3f51b5;
      font-weight: bold;
    }
  }
  
  .info {
    flex: 1;
    
    .header {
      display: flex;
      align-items: center;
      margin-bottom: 12rpx;
      
      .name {
        font-size: 32rpx;
        font-weight: bold;
        color: #333;
        margin-right: 16rpx;
      }
      
      .category {
        font-size: 20rpx;
        color: #3f51b5;
        background-color: #e8eaf6;
        padding: 2rpx 12rpx;
        border-radius: 20rpx;
      }
    }
    
    .desc {
      font-size: 26rpx;
      color: #666;
      margin-bottom: 16rpx;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
    }
    
    .relations {
      display: flex;
      flex-wrap: wrap;
      gap: 10rpx;
      
      .relation-tag {
        font-size: 22rpx;
        color: #888;
        background-color: #f5f5f5;
        padding: 4rpx 12rpx;
        border-radius: 8rpx;
      }
    }
  }
}

.empty {
  padding: 100rpx 0;
  text-align: center;
  color: #999;
}
</style>
