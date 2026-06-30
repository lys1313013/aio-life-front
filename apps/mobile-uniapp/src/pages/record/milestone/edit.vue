<template>
  <view class="container">
    <view class="form-container">
      <view class="form-item">
        <text class="label">标题 <text class="required">*</text></text>
        <input class="input" v-model="formData.title" placeholder="里程碑标题" />
      </view>
      <view class="form-item">
        <text class="label">类型</text>
        <input class="input" v-model="formData.type" placeholder="如: 学业、工作、生活" />
      </view>
      <view class="form-item">
        <text class="label">日期 <text class="required">*</text></text>
        <picker mode="date" :value="formData.date" @change="onDateChange">
          <view class="picker-value">{{ formData.date || '请选择' }}</view>
        </picker>
      </view>
      <view class="form-item">
        <text class="label">描述</text>
        <textarea class="textarea" v-model="formData.description" placeholder="添加描述..." />
      </view>
      <view class="form-item">
        <text class="label">标签 (逗号分隔)</text>
        <input class="input" v-model="tagsInput" placeholder="如: 重要, 成就感" />
      </view>
    </view>
    <view class="bottom-btn">
      <button class="submit-btn" @click="handleSubmit" :loading="isSubmitting">保存</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { createMilestone, updateMilestone } from '@/api/milestone';

const isEdit = ref(false);
const editId = ref<number | undefined>();
const isSubmitting = ref(false);
const tagsInput = ref('');

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
};

const formData = ref<any>({ title: '', type: '', date: todayStr(), description: '' });

onMounted(() => {
  uni.$on('editMilestone', (item: any) => {
    if (item) {
      isEdit.value = true;
      editId.value = item.id;
      formData.value = {
        title: item.title || '',
        type: item.type || '',
        date: item.date || todayStr(),
        description: item.description || '',
      };
      try {
        tagsInput.value = JSON.parse(item.tags || '[]').join(', ');
      } catch { tagsInput.value = item.tags || ''; }
    }
  });
});

const onDateChange = (e: any) => { formData.value.date = e.detail.value; };

const handleSubmit = async () => {
  if (!formData.value.title.trim()) { uni.showToast({ title: '标题不能为空', icon: 'none' }); return; }
  isSubmitting.value = true;
  try {
    const tags = tagsInput.value.split(',').map((t: string) => t.trim()).filter(Boolean);
    const payload: any = { ...formData.value, title: formData.value.title.trim(), tags: JSON.stringify(tags) };
    if (isEdit.value) {
      payload.id = editId.value;
      await updateMilestone(payload);
    } else {
      await createMilestone(payload);
    }
    uni.showToast({ title: isEdit.value ? '已更新' : '已保存', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 1000);
  } catch (e) { console.error('保存失败', e); } finally { isSubmitting.value = false; }
};
</script>

<style lang="scss" scoped>
.container { min-height: 100vh; background-color: #f5f6f8; padding: 20rpx; padding-bottom: 140rpx; }
.form-container { background-color: #fff; border-radius: 16rpx; padding: 0 30rpx; }
.form-item { display: flex; flex-direction: column; padding: 30rpx 0; border-bottom: 1rpx solid #f0f0f0; &:last-child { border-bottom: none; } .label { font-size: 28rpx; color: #333; margin-bottom: 16rpx; .required { color: #ff4d4f; } } .input { font-size: 32rpx; color: #333; } .picker-value { font-size: 32rpx; color: #333; } .textarea { width: 100%; height: 150rpx; font-size: 28rpx; background-color: #f9f9f9; padding: 20rpx; border-radius: 8rpx; box-sizing: border-box; } }
.bottom-btn { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 30rpx 60rpx; background-color: #fff; box-shadow: 0 -4rpx 12rpx rgba(0,0,0,0.05); .submit-btn { background-color: #9c27b0; color: #fff; border-radius: 44rpx; font-size: 32rpx; &::after { border: none; } } }
</style>
