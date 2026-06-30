<template>
  <view class="container">
    <view class="form-container">
      <view class="form-item">
        <text class="label">标题 <text class="required">*</text></text>
        <input class="input" v-model="formData.title" placeholder="如: 学习强国" />
      </view>
      <view class="form-item">
        <text class="label">网址</text>
        <input class="input" v-model="formData.website" placeholder="https://example.com" />
      </view>
      <view class="form-item">
        <text class="label">用户名</text>
        <input class="input" v-model="formData.username" placeholder="账号" />
      </view>
      <view class="form-item">
        <text class="label">密码</text>
        <input class="input" v-model="formData.password" placeholder="密码" />
      </view>
      <view class="form-item">
        <text class="label">分类</text>
        <input class="input" v-model="formData.category" placeholder="如: 工作、社交" />
      </view>
      <view class="form-item">
        <text class="label">备注</text>
        <textarea class="textarea" v-model="formData.remark" placeholder="添加备注..." />
      </view>
      <view class="switch-row">
        <text class="switch-label">收藏</text>
        <switch :checked="formData.favorite" @change="formData.favorite = $event.detail.value" />
      </view>
    </view>
    <view class="bottom-btn">
      <button class="submit-btn" @click="handleSubmit" :loading="isSubmitting">保存</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { createPasswordVault, updatePasswordVault } from '@/api/password';

const isEdit = ref(false);
const editId = ref<number | undefined>();
const isSubmitting = ref(false);
const formData = ref<any>({ title: '', website: '', username: '', password: '', category: '', remark: '', favorite: false });

onMounted(() => {
  uni.$on('editPassword', (item: any) => {
    if (item) {
      isEdit.value = true;
      editId.value = item.id;
      formData.value = {
        title: item.title || '',
        website: item.website || '',
        username: item.username || '',
        password: item.password || '',
        category: item.category || '',
        remark: item.remark || '',
        favorite: item.favorite || false,
      };
    }
  });
});

const handleSubmit = async () => {
  if (!formData.value.title.trim()) { uni.showToast({ title: '标题不能为空', icon: 'none' }); return; }
  isSubmitting.value = true;
  try {
    if (isEdit.value) {
      await updatePasswordVault({ id: editId.value, ...formData.value, title: formData.value.title.trim() });
    } else {
      await createPasswordVault({ title: formData.value.title.trim(), ...formData.value });
    }
    uni.showToast({ title: isEdit.value ? '已更新' : '已保存', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 1000);
  } catch (e) { console.error('保存失败', e); } finally { isSubmitting.value = false; }
};
</script>

<style lang="scss" scoped>
.container { min-height: 100vh; background-color: #f5f6f8; padding: 20rpx; padding-bottom: 140rpx; }
.form-container { background-color: #fff; border-radius: 16rpx; padding: 0 30rpx; }
.form-item { display: flex; flex-direction: column; padding: 30rpx 0; border-bottom: 1rpx solid #f0f0f0; &:last-child { border-bottom: none; } .label { font-size: 28rpx; color: #333; margin-bottom: 16rpx; .required { color: #ff4d4f; } } .input { font-size: 32rpx; color: #333; } .textarea { width: 100%; height: 150rpx; font-size: 28rpx; background-color: #f9f9f9; padding: 20rpx; border-radius: 8rpx; box-sizing: border-box; } }
.switch-row { display: flex; justify-content: space-between; align-items: center; padding: 30rpx 0; .switch-label { font-size: 28rpx; color: #333; } }
.bottom-btn { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 30rpx 60rpx; background-color: #fff; box-shadow: 0 -4rpx 12rpx rgba(0,0,0,0.05); .submit-btn { background-color: #5856d6; color: #fff; border-radius: 44rpx; font-size: 32rpx; &::after { border: none; } } }
</style>
