<template>
  <view class="container">
    <view class="form-container">
      <view class="form-item">
        <text class="label">名称 <text class="required">*</text></text>
        <input class="input" v-model="formData.name" placeholder="设备名称" />
      </view>
      <view class="form-item">
        <text class="label">品牌</text>
        <input class="input" v-model="formData.brand" placeholder="品牌" />
      </view>
      <view class="form-item">
        <text class="label">购买价格</text>
        <input class="input" v-model.number="formData.purchasePrice" type="digit" placeholder="5999.00" />
      </view>
      <view class="form-item">
        <text class="label">备注</text>
        <textarea class="textarea" v-model="formData.remark" placeholder="添加描述..." />
      </view>
    </view>
    <view class="bottom-btn">
      <button class="submit-btn" @click="handleSubmit" :loading="isSubmitting">保存</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { insertOrUpdate } from '@/api/device';

const isEdit = ref(false);
const editId = ref('');
const isSubmitting = ref(false);
const formData = ref<any>({ name: '', brand: '', purchasePrice: undefined, remark: '' });

onMounted(() => {
  uni.$on('editDevice', (item: any) => {
    if (item) {
      isEdit.value = true;
      editId.value = item.id;
      formData.value = {
        name: item.name || '',
        brand: item.brand || '',
        purchasePrice: item.purchasePrice,
        remark: item.remark || '',
      };
    }
  });
});

const handleSubmit = async () => {
  if (!formData.value.name.trim()) { uni.showToast({ title: '名称不能为空', icon: 'none' }); return; }
  isSubmitting.value = true;
  try {
    const payload: any = { ...formData.value, name: formData.value.name.trim(), purchasePrice: formData.value.purchasePrice ? Number(formData.value.purchasePrice) : undefined };
    if (isEdit.value) payload.id = editId.value;
    await insertOrUpdate(payload);
    uni.showToast({ title: isEdit.value ? '已更新' : '已保存', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 1000);
  } catch (e) { console.error('保存失败', e); } finally { isSubmitting.value = false; }
};
</script>

<style lang="scss" scoped>
.container { min-height: 100vh; background-color: #f5f6f8; padding: 20rpx; padding-bottom: 140rpx; }
.form-container { background-color: #fff; border-radius: 16rpx; padding: 0 30rpx; }
.form-item { display: flex; flex-direction: column; padding: 30rpx 0; border-bottom: 1rpx solid #f0f0f0; &:last-child { border-bottom: none; } .label { font-size: 28rpx; color: #333; margin-bottom: 16rpx; .required { color: #ff4d4f; } } .input { font-size: 32rpx; color: #333; } .textarea { width: 100%; height: 150rpx; font-size: 28rpx; background-color: #f9f9f9; padding: 20rpx; border-radius: 8rpx; box-sizing: border-box; } }
.bottom-btn { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 30rpx 60rpx; background-color: #fff; box-shadow: 0 -4rpx 12rpx rgba(0,0,0,0.05); .submit-btn { background-color: #3b82f6; color: #fff; border-radius: 44rpx; font-size: 32rpx; &::after { border: none; } } }
</style>
