<template>
  <view class="container">
    <view class="form-container">
      <view class="form-item">
        <text class="label">标题 <text class="required">*</text></text>
        <input class="input" v-model="formData.title" placeholder="书名/文章名" />
      </view>

      <view class="form-item">
        <text class="label">类型</text>
        <picker :range="typeOptions" :value="typeIndex" @change="typeIndex = $event.detail.value">
          <view class="picker-value">{{ typeOptions[typeIndex] }}</view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">状态</text>
        <picker :range="statusOptions" :value="statusIndex" @change="statusIndex = $event.detail.value">
          <view class="picker-value">{{ statusOptions[statusIndex] }}</view>
        </picker>
      </view>

      <view class="form-row">
        <view class="form-item half">
          <text class="label">总页数</text>
          <input class="input" v-model.number="formData.totalProgress" type="number" placeholder="300" />
        </view>
        <view class="form-item half">
          <text class="label">已读页数</text>
          <input class="input" v-model.number="formData.currentProgress" type="number" placeholder="120" />
        </view>
      </view>

      <view class="form-item">
        <text class="label">作者</text>
        <input class="input" v-model="formData.author" placeholder="作者" />
      </view>

      <view class="form-item">
        <text class="label">链接</text>
        <input class="input" v-model="formData.url" placeholder="链接" />
      </view>

      <view class="form-item">
        <text class="label">备注</text>
        <textarea class="textarea" v-model="formData.remark" placeholder="添加备注..." />
      </view>
    </view>

    <view class="bottom-btn">
      <button class="submit-btn" @click="handleSubmit" :loading="isSubmitting">保存</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { saveReadApi, updateReadApi } from '@/api/read';

const isEdit = ref(false);
const editId = ref('');
const isSubmitting = ref(false);

const typeOptions = ['书籍', '文章', '论文'];
const typeIndex = ref(0);
const statusOptions = ['未开始', '阅读中', '已读完', '搁置'];
const statusIndex = ref(0);

const formData = ref({
  title: '',
  author: '',
  url: '',
  remark: '',
  totalProgress: undefined as number | undefined,
  currentProgress: undefined as number | undefined,
});

onMounted(() => {
  uni.$on('editRead', (item: any) => {
    if (item) {
      isEdit.value = true;
      editId.value = item.id;
      formData.value = {
        title: item.title || '',
        author: item.author || '',
        url: item.url || '',
        remark: item.remark || '',
        totalProgress: item.totalProgress,
        currentProgress: item.currentProgress,
      };
      typeIndex.value = item.type != null ? item.type : 0;
      statusIndex.value = item.status != null ? item.status : 0;
    }
  });
});

const handleSubmit = async () => {
  if (!formData.value.title.trim()) {
    uni.showToast({ title: '标题不能为空', icon: 'none' });
    return;
  }
  isSubmitting.value = true;
  try {
    const payload: any = {
      title: formData.value.title.trim(),
      type: typeIndex.value,
      status: statusIndex.value,
      totalProgress: formData.value.totalProgress,
      currentProgress: formData.value.currentProgress,
      author: formData.value.author.trim(),
      url: formData.value.url.trim(),
      remark: formData.value.remark.trim(),
    };
    if (isEdit.value) {
      payload.id = editId.value;
      await updateReadApi(payload);
    } else {
      await saveReadApi(payload);
    }
    uni.showToast({ title: isEdit.value ? '已更新' : '已保存', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 1000);
  } catch (e) {
    console.error('保存失败', e);
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style lang="scss" scoped>
.container { min-height: 100vh; background-color: #f5f6f8; padding: 20rpx; padding-bottom: 140rpx; }
.form-container { background-color: #fff; border-radius: 16rpx; padding: 0 30rpx; }
.form-item {
  display: flex; flex-direction: column; padding: 30rpx 0; border-bottom: 1rpx solid #f0f0f0;
  &:last-child { border-bottom: none; }
  .label { font-size: 28rpx; color: #333; margin-bottom: 16rpx; .required { color: #ff4d4f; } }
  .input { font-size: 32rpx; color: #333; }
  .picker-value { font-size: 32rpx; color: #333; min-height: 44rpx; }
  .textarea { width: 100%; height: 160rpx; font-size: 28rpx; background-color: #f9f9f9; padding: 20rpx; border-radius: 8rpx; box-sizing: border-box; }
}
.form-row { display: flex; gap: 20rpx; .half { flex: 1; } }
.bottom-btn {
  position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 30rpx 60rpx; background-color: #fff;
  box-shadow: 0 -4rpx 12rpx rgba(0,0,0,0.05);
  .submit-btn { background-color: #4CAF50; color: #fff; border-radius: 44rpx; font-size: 32rpx; &::after { border: none; } }
}
</style>
