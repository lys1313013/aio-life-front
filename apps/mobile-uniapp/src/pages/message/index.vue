<template>
  <view class="container">
    <view class="header">
      <text class="title">消息</text>
      <text class="subtitle" v-if="messages.length > 0">共 {{ messages.length }} 条</text>
    </view>

    <view class="message-list" v-if="messages.length > 0">
      <view
        class="message-item"
        v-for="msg in messages"
        :key="msg.id"
        :class="{ unread: !msg.isRead }"
        @click="onMarkRead(msg)"
        @longpress="onDelete(msg)"
      >
        <view class="msg-left">
          <view class="dot" v-if="!msg.isRead"></view>
          <view class="msg-content">
            <text class="msg-title">{{ msg.title }}</text>
            <text class="msg-text">{{ msg.content }}</text>
            <text class="msg-time">{{ formatTime(msg.createTime) }}</text>
          </view>
        </view>
        <view class="msg-badge" v-if="msg.type === 0">
          <text class="badge-text">系统</text>
        </view>
        <view class="msg-badge user-badge" v-else>
          <text class="badge-text">用户</text>
        </view>
      </view>
    </view>

    <view class="empty-state" v-else-if="!loading">
      <uni-icons type="chat" size="64" color="#ddd" />
      <text class="empty-text">暂无消息</text>
    </view>

    <view v-if="messages.length > 0" class="actions">
      <button class="action-btn" @click="onReadAll" size="mini">全部已读</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getMessageList, markAsRead, markAllAsRead, deleteMessage, type MessageEntity } from '../../api/message';

const messages = ref<MessageEntity[]>([]);
const loading = ref(false);

const loadMessages = async () => {
  loading.value = true;
  try {
    const res = await getMessageList();
    messages.value = Array.isArray(res) ? res : [];
  } catch (e) {
    console.error('加载消息失败', e);
  } finally {
    loading.value = false;
  }
};

const formatTime = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) {
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
  return `${d.getMonth() + 1}-${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const onMarkRead = async (msg: MessageEntity) => {
  if (msg.isRead) return;
  try {
    await markAsRead(msg.id);
    msg.isRead = true;
  } catch (e) {
    console.error('标记已读失败', e);
  }
};

const onReadAll = async () => {
  uni.showModal({
    title: '提示',
    content: '确定将所有消息标记为已读？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await markAllAsRead();
          messages.value.forEach((m) => { m.isRead = true; });
          uni.showToast({ title: '已全部标记已读', icon: 'success' });
        } catch (e) {
          uni.showToast({ title: '操作失败', icon: 'none' });
        }
      }
    }
  });
};

const onDelete = (msg: MessageEntity) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除这条消息吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteMessage(msg.id);
          uni.showToast({ title: '已删除', icon: 'success' });
          loadMessages();
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' });
        }
      }
    }
  });
};

onMounted(() => {
  loadMessages();
});
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f5f6f8;
}
.header {
  padding: 32rpx;
  background-color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  .title {
    font-size: 40rpx;
    font-weight: bold;
    color: #333;
  }
  .subtitle {
    font-size: 24rpx;
    color: #999;
  }
}
.message-list {
  padding: 20rpx;
}
.message-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03);

  &.unread {
    background: #f0f7ff;
    border-left: 6rpx solid #007AFF;
  }

  .msg-left {
    display: flex;
    align-items: flex-start;
    flex: 1;
    min-width: 0;

    .dot {
      width: 12rpx;
      height: 12rpx;
      background: #007AFF;
      border-radius: 50%;
      margin-right: 16rpx;
      margin-top: 12rpx;
      flex-shrink: 0;
    }
    .msg-content {
      flex: 1;
      .msg-title {
        display: block;
        font-size: 30rpx;
        font-weight: 500;
        color: #333;
        margin-bottom: 8rpx;
      }
      .msg-text {
        display: block;
        font-size: 26rpx;
        color: #666;
        margin-bottom: 8rpx;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
      }
      .msg-time {
        font-size: 22rpx;
        color: #bbb;
      }
    }
  }

  .msg-badge {
    background: #f0f0f0;
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
    margin-left: 16rpx;
    flex-shrink: 0;
    .badge-text {
      font-size: 20rpx;
      color: #888;
    }
    &.user-badge {
      background: #e6f7ff;
      .badge-text { color: #1890ff; }
    }
  }
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 160rpx;
  .empty-text {
    margin-top: 24rpx;
    font-size: 28rpx;
    color: #999;
  }
}
.actions {
  display: flex;
  justify-content: center;
  padding: 20rpx;
  .action-btn {
    background: #f0f0f0;
    color: #666;
    border: none;
    font-size: 24rpx;
  }
}
</style>
