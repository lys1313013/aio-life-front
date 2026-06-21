<template>
  <view class="container">
    <uni-list v-if="memos.length > 0">
      <uni-list-item
        v-for="item in memos"
        :key="item.id"
        :title="item.title"
        :note="item.content ? item.content.substring(0, 50) + (item.content.length > 50 ? '...' : '') : '无内容'"
        :rightText="formatDate(item.updateTime)"
        clickable
        @click="onClickMemo(item)"
      />
    </uni-list>
    <view v-else class="empty">
      <text>暂无备忘录</text>
    </view>

    <!-- FAB for adding new memo -->
    <uni-fab
      horizontal="right"
      vertical="bottom"
      :pattern="{ buttonColor: '#007AFF' }"
      @fabClick="onAddMemo"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getMemoListApi, type Memo } from '../../../api/memo';

const memos = ref<Memo[]>([]);

const loadMemos = async () => {
  try {
    const res: any = await getMemoListApi();
    const list = res?.items || res?.records || res?.list || (Array.isArray(res) ? res : []);
    memos.value = list;
  } catch (error) {
    console.error('加载备忘录失败', error);
  }
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}-${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const onClickMemo = (item: Memo) => {
  uni.showToast({ title: `查看: ${item.title}`, icon: 'none' });
};

const onAddMemo = () => {
  uni.showToast({ title: '添加备忘录', icon: 'none' });
};

onMounted(() => {
  loadMemos();
});
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 120rpx;
}
.empty {
  padding: 100rpx 0;
  text-align: center;
  color: #999;
}
</style>
