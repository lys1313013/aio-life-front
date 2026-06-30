<template>
  <view class="container">
    <view class="form-container">
      <view class="form-item">
        <text class="label">标题 <text class="required">*</text></text>
        <input class="input" v-model="formData.title" placeholder="如: 恋爱纪念日" />
      </view>
      <view class="form-item">
        <text class="label">类型</text>
        <picker :range="typeOptions" :value="typeIndex" @change="typeIndex = $event.detail.value">
          <view class="picker-value">{{ typeOptions[typeIndex] }}</view>
        </picker>
      </view>
      <view class="form-item">
        <text class="label">日期 <text class="required">*</text></text>
        <picker mode="date" :value="formData.targetDate" @change="onDateChange">
          <view class="picker-value">{{ formData.targetDate || '请选择' }}</view>
        </picker>
      </view>
      <view class="form-item">
        <text class="label">图标</text>
        <input class="input" v-model="formData.icon" placeholder="🎉" />
      </view>
      <view class="form-item">
        <text class="label">颜色</text>
        <input class="input" v-model="formData.color" placeholder="#E91E63" />
      </view>
      <view class="form-item">
        <text class="label">备注</text>
        <textarea class="textarea" v-model="formData.note" placeholder="添加备注..." />
      </view>
    </view>
    <view class="bottom-btn">
      <button class="submit-btn" @click="handleSubmit" :loading="isSubmitting">保存</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { createAnniversaryRecord, updateAnniversaryRecord } from '@/api/anniversary';

const isEdit = ref(false);
const editId = ref('');
const isSubmitting = ref(false);
const typeOptions = ['纪念日', '倒计时'];
const typeIndex = ref(0);

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
};

const formData = ref({ title: '', targetDate: todayStr(), icon: '🎉', color: '#E91E63', note: '' });

onMounted(() => {
  uni.$on('editAnniversary', (item: any) => {
    if (item) {
      isEdit.value = true;
      editId.value = item.id;
      formData.value = {
        title: item.title || '',
        targetDate: item.targetDate || todayStr(),
        icon: item.icon || '🎉',
        color: item.color || '#E91E63',
        note: item.note || '',
      };
      typeIndex.value = item.type === 'countdown' ? 1 : 0;
    }
  });
});

const onDateChange = (e: any) => { formData.value.targetDate = e.detail.value; };

const handleSubmit = async () => {
  if (!formData.value.title.trim()) { uni.showToast({ title: '标题不能为空', icon: 'none' }); return; }
  isSubmitting.value = true;
  try {
    const type = typeIndex.value === 1 ? 'countdown' : 'anniversary';
    if (isEdit.value) {
      await updateAnniversaryRecord({ id: editId.value, ...formData.value, type });
    } else {
      await createAnniversaryRecord({ ...formData.value, type });
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
.bottom-btn { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 30rpx 60rpx; background-color: #fff; box-shadow: 0 -4rpx 12rpx rgba(0,0,0,0.05); .submit-btn { background-color: #E91E63; color: #fff; border-radius: 44rpx; font-size: 32rpx; &::after { border: none; } } }
</style>
