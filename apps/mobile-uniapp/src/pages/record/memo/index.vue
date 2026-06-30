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
        @longpress.native="onDeleteMemo(item)"
      />
    </uni-list>
    <view v-else class="empty">
      <text>暂无备忘录</text>
    </view>

    <uni-fab
      horizontal="right"
      vertical="bottom"
      :pattern="{ buttonColor: '#007AFF' }"
      @fabClick="onAddMemo"
    />

    <uni-popup ref="formPopup" type="bottom" background-color="#fff">
      <view class="popup-content">
        <view class="popup-header">
          <text class="popup-title">{{ isEdit ? '编辑备忘录' : '新建备忘录' }}</text>
          <uni-icons type="closeempty" size="24" @click="closeForm" />
        </view>
        <view class="popup-body">
          <input class="form-input" v-model="formData.title" placeholder="标题" />
          <textarea
            class="form-textarea"
            v-model="formData.content"
            placeholder="内容..."
          />
          <view class="switch-row">
            <text class="switch-label">隐藏内容</text>
            <switch :checked="formData.hiddenContent" @change="formData.hiddenContent = $event.detail.value" />
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
import { getMemoListApi, createMemoApi, updateMemoApi, deleteMemoApi, type Memo } from '../../../api/memo';

const memos = ref<Memo[]>([]);
const formPopup = ref<any>(null);
const isEdit = ref(false);
const editId = ref('');
const submitting = ref(false);
const formData = ref({ title: '', content: '', hiddenContent: false });

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

const onAddMemo = () => {
  isEdit.value = false;
  editId.value = '';
  formData.value = { title: '', content: '', hiddenContent: false };
  formPopup.value?.open();
};

const onClickMemo = (item: Memo) => {
  isEdit.value = true;
  editId.value = item.id;
  formData.value = {
    title: item.title || '',
    content: item.content || '',
    hiddenContent: item.hiddenContent || false
  };
  formPopup.value?.open();
};

const onDeleteMemo = (item: Memo) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除「${item.title}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteMemoApi(item.id);
          uni.showToast({ title: '已删除', icon: 'success' });
          loadMemos();
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
  if (!formData.value.title.trim()) {
    uni.showToast({ title: '标题不能为空', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    if (isEdit.value) {
      await updateMemoApi({ id: editId.value, ...formData.value });
    } else {
      await createMemoApi(formData.value);
    }
    uni.showToast({ title: isEdit.value ? '已更新' : '已保存', icon: 'success' });
    closeForm();
    loadMemos();
  } catch (e) {
    console.error('保存备忘录失败', e);
  } finally {
    submitting.value = false;
  }
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
    .form-input {
      background: #f5f5f5;
      padding: 20rpx;
      border-radius: 12rpx;
      font-size: 28rpx;
      margin-bottom: 16rpx;
    }
    .form-textarea {
      background: #f5f5f5;
      padding: 20rpx;
      border-radius: 12rpx;
      font-size: 28rpx;
      width: 100%;
      min-height: 200rpx;
      box-sizing: border-box;
      margin-bottom: 16rpx;
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
      background-color: #007AFF;
      color: #fff;
    }
  }
}
</style>
