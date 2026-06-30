<template>
  <view class="container">
    <view class="timeline" v-if="thoughts.length > 0">
      <view
        class="thought-item"
        v-for="item in thoughts"
        :key="item.id"
        @click="onEditThought(item)"
        @longpress="onDeleteThought(item)"
      >
        <view class="time-header">
          <text class="time">{{ formatTime(item.createTime) }}</text>
          <text class="pin-badge" v-if="item.isPinned">已固定</text>
        </view>
        <view class="bubble">
          <text class="content">{{ item.content }}</text>
        </view>
      </view>
    </view>
    <view v-else class="empty">
      <text>暂无闪念，快记录下你的灵感吧</text>
    </view>

    <uni-fab
      horizontal="right"
      vertical="bottom"
      :pattern="{ buttonColor: '#FF9800' }"
      @fabClick="onAddThought"
    />

    <!-- Add/Edit Popup -->
    <uni-popup ref="formPopup" type="bottom" background-color="#fff">
      <view class="popup-content">
        <view class="popup-header">
          <text class="popup-title">{{ isEdit ? '编辑闪念' : '新建闪念' }}</text>
          <uni-icons type="closeempty" size="24" @click="closeForm" />
        </view>
        <view class="popup-body">
          <textarea
            class="thought-input"
            v-model="formData.content"
            placeholder="记录你的灵感..."
            :maxlength="500"
          />
          <view class="switch-row">
            <text class="switch-label">固定在首页</text>
            <switch :checked="formData.isPinned === 1" @change="formData.isPinned = $event.detail.value ? 1 : 0" />
          </view>
        </view>
        <view class="popup-footer">
          <button class="submit-btn primary" @click="submitForm" :loading="submitting">保存</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { queryThoughts, saveThought, updateThought, deleteThought } from '../../../api/think';

const thoughts = ref<any[]>([]);
const formPopup = ref<any>(null);
const isEdit = ref(false);
const editId = ref('');
const submitting = ref(false);
const formData = ref({ content: '', isPinned: 0 });

const loadThoughts = async () => {
  try {
    const res = await queryThoughts({ page: 1, pageSize: 50, condition: {} });
    thoughts.value = res.items || res.records || res.list || (Array.isArray(res) ? res : []);
  } catch (e) {
    console.error('加载闪念失败', e);
  }
};

const formatTime = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const onAddThought = () => {
  isEdit.value = false;
  editId.value = '';
  formData.value = { content: '', isPinned: 0 };
  formPopup.value?.open();
};

const onEditThought = (item: any) => {
  isEdit.value = true;
  editId.value = item.id;
  formData.value = { content: item.content || '', isPinned: item.isPinned ?? 0 };
  formPopup.value?.open();
};

const onDeleteThought = (item: any) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条闪念吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteThought({ ids: [item.id] });
          uni.showToast({ title: '已删除', icon: 'success' });
          loadThoughts();
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' });
        }
      }
    }
  });
};

const closeForm = () => {
  formPopup.value?.close();
};

const submitForm = async () => {
  if (!formData.value.content.trim()) {
    uni.showToast({ title: '内容不能为空', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    if (isEdit.value) {
      await updateThought({ id: editId.value, ...formData.value });
    } else {
      await saveThought(formData.value);
    }
    uni.showToast({ title: isEdit.value ? '已更新' : '已保存', icon: 'success' });
    closeForm();
    loadThoughts();
  } catch (e) {
    console.error('保存闪念失败', e);
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  loadThoughts();
});
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 30rpx 20rpx 120rpx;
}
.timeline {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
}
.thought-item {
  display: flex;
  flex-direction: column;
  .time-header {
    margin-bottom: 10rpx;
    padding-left: 10rpx;
    display: flex;
    align-items: center;
    justify-content: space-between;
    .time {
      font-size: 24rpx;
      color: #888;
    }
    .pin-badge {
      font-size: 20rpx;
      color: #f5a623;
      background-color: #fff8e1;
      padding: 2rpx 12rpx;
      border-radius: 8rpx;
    }
  }
  .bubble {
    background-color: #fff;
    border-radius: 16rpx;
    padding: 24rpx;
    box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
    .content {
      font-size: 28rpx;
      color: #333;
      line-height: 1.6;
      word-break: break-all;
    }
  }
}
.empty {
  padding: 100rpx 0;
  text-align: center;
  color: #999;
}

.popup-content {
  padding: 30rpx;
  border-top-left-radius: 24rpx;
  border-top-right-radius: 24rpx;
  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30rpx;
    .popup-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
  }
  .popup-body {
    margin-bottom: 30rpx;
    .thought-input {
      background: #f5f5f5;
      padding: 20rpx;
      border-radius: 12rpx;
      font-size: 28rpx;
      width: 100%;
      min-height: 200rpx;
      box-sizing: border-box;
      margin-bottom: 20rpx;
    }
    .switch-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16rpx 0;
      .switch-label {
        font-size: 28rpx;
        color: #333;
      }
    }
  }
  .popup-footer {
    .submit-btn {
      width: 100%;
      border-radius: 12rpx;
    }
    .primary {
      background-color: #FF9800;
      color: #fff;
    }
  }
}
</style>
