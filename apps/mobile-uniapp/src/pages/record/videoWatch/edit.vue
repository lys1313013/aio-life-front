<template>
  <view class="container">
    <view class="form-container">
      <view class="form-item">
        <text class="label">标题 <text class="required">*</text></text>
        <input class="input" v-model="formData.title" placeholder="视频标题" />
      </view>
      <view class="form-item">
        <text class="label">状态</text>
        <picker :range="statusOptions" :value="statusIndex" @change="statusIndex = $event.detail.value">
          <view class="picker-value">{{ statusOptions[statusIndex] }}</view>
        </picker>
      </view>
      <view class="form-item">
        <text class="label">B站链接</text>
        <input class="input" v-model="formData.url" placeholder="https://bilibili.com/video/..." />
      </view>
      <view class="form-item">
        <text class="label">BV号</text>
        <input class="input" v-model="formData.bvid" placeholder="BVxxxx" />
      </view>
      <view class="form-row">
        <view class="form-item half">
          <text class="label">总集数</text>
          <input class="input" v-model.number="formData.episodes" type="number" placeholder="12" />
        </view>
        <view class="form-item half">
          <text class="label">已看集数</text>
          <input class="input" v-model.number="formData.currentEpisode" type="number" placeholder="5" />
        </view>
      </view>
      <view class="form-item">
        <text class="label">备注</text>
        <textarea class="textarea" v-model="formData.notes" placeholder="添加备注..." />
      </view>
    </view>
    <view class="bottom-btn">
      <button class="submit-btn" @click="handleSubmit" :loading="isSubmitting">保存</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { insertBVideo, updateBiVideo } from '@/api/bilibili-video';

const isEdit = ref(false);
const editId = ref('');
const isSubmitting = ref(false);
const statusOptions = ['completed', 'in-progress', 'watched'];
const statusTexts = ['已看完', '观看中', '看了一点'];
const statusIndex = ref(0);

const formData = ref<any>({ title: '', url: '', bvid: '', episodes: undefined, currentEpisode: undefined, notes: '' });

onMounted(() => {
  uni.$on('editVideo', (item: any) => {
    if (item) {
      isEdit.value = true;
      editId.value = item.id;
      formData.value = {
        title: item.title || '',
        url: item.url || '',
        bvid: item.bvid || '',
        episodes: item.episodes,
        currentEpisode: item.currentEpisode,
        notes: item.notes || '',
      };
      const idx = statusOptions.indexOf(item.status);
      statusIndex.value = idx >= 0 ? idx : 0;
    }
  });
});

const handleSubmit = async () => {
  if (!formData.value.title.trim()) { uni.showToast({ title: '标题不能为空', icon: 'none' }); return; }
  isSubmitting.value = true;
  try {
    const progress = (formData.value.episodes && formData.value.currentEpisode)
      ? Math.floor((formData.value.currentEpisode / formData.value.episodes) * 100) : 0;
    const payload: any = { ...formData.value, title: formData.value.title.trim(), status: statusOptions[statusIndex.value], progress };
    if (isEdit.value) {
      await updateBiVideo(editId.value, payload);
    } else {
      await insertBVideo(payload);
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
.form-row { display: flex; gap: 20rpx; .half { flex: 1; } }
.bottom-btn { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 30rpx 60rpx; background-color: #fff; box-shadow: 0 -4rpx 12rpx rgba(0,0,0,0.05); .submit-btn { background-color: #fb7299; color: #fff; border-radius: 44rpx; font-size: 32rpx; &::after { border: none; } } }
</style>
