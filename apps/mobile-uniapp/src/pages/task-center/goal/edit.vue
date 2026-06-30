<template>
  <view class="container">
    <view class="form-container">
      <view class="form-item">
        <text class="label">标题 <text class="required">*</text></text>
        <input class="input" v-model="formData.title" placeholder="请输入目标标题" />
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
          <view class="picker-value" :style="{ color: getStatusColor(statusIndex) }">{{ statusOptions[statusIndex] }}</view>
        </picker>
      </view>

      <view class="form-row">
        <view class="form-item half">
          <text class="label">目标值</text>
          <input class="input" v-model.number="formData.targetValue" type="number" placeholder="100" />
        </view>
        <view class="form-item half">
          <text class="label">当前值</text>
          <input class="input" v-model.number="formData.currentValue" type="number" placeholder="0" />
        </view>
      </view>

      <view class="form-item">
        <text class="label">开始日期</text>
        <picker mode="date" :value="formData.startDate" @change="onStartDateChange">
          <view class="picker-value">{{ formData.startDate || '请选择' }}</view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">结束日期</text>
        <picker mode="date" :value="formData.endDate" @change="onEndDateChange">
          <view class="picker-value">{{ formData.endDate || '请选择' }}</view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">描述</text>
        <textarea class="textarea" v-model="formData.description" placeholder="添加描述..." />
      </view>
    </view>

    <view class="bottom-btn">
      <button class="submit-btn" @click="handleSubmit" :loading="isSubmitting">保存</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { createGoal, updateGoal } from '@/api/goal';

const isEdit = ref(false);
const editId = ref<number | undefined>();
const isSubmitting = ref(false);

const typeOptions = ['年度目标', '月度目标', '每日目标'];
const typeIndex = ref(0);
const statusOptions = ['待开始', '进行中', '已完成', '已放弃'];
const statusIndex = ref(0);

const formData = ref({
  title: '',
  targetValue: undefined as number | undefined,
  currentValue: undefined as number | undefined,
  description: '',
  startDate: '',
  endDate: '',
});

const onStartDateChange = (e: any) => { formData.value.startDate = e.detail.value; };
const onEndDateChange = (e: any) => { formData.value.endDate = e.detail.value; };

const getStatusColor = (idx: number) => {
  const colors = ['#909399', '#409eff', '#67c23a', '#f56c6c'];
  return colors[idx] || '#333';
};

onMounted(() => {
  uni.$on('editGoal', (item: any) => {
    if (item) {
      isEdit.value = true;
      editId.value = item.id;
      formData.value = {
        title: item.title || '',
        targetValue: item.targetValue,
        currentValue: item.currentValue,
        description: item.description || '',
        startDate: item.startDate || '',
        endDate: item.endDate || '',
      };
      typeIndex.value = (item.type != null) ? item.type - 1 : 0;
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
      type: typeIndex.value + 1,
      status: statusIndex.value,
      targetValue: formData.value.targetValue,
      currentValue: formData.value.currentValue,
      description: formData.value.description.trim(),
      startDate: formData.value.startDate,
      endDate: formData.value.endDate,
    };
    if (isEdit.value && editId.value) {
      payload.id = editId.value;
      await updateGoal(payload);
    } else {
      await createGoal(payload);
    }
    uni.showToast({ title: isEdit.value ? '已更新' : '已创建', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 1000);
  } catch (e) {
    console.error('保存目标失败', e);
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f5f6f8;
  padding: 20rpx;
  padding-bottom: 140rpx;
}
.form-container {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 0 30rpx;
}
.form-item {
  display: flex;
  flex-direction: column;
  padding: 30rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  &:last-child { border-bottom: none; }
  .label { font-size: 28rpx; color: #333; margin-bottom: 16rpx; .required { color: #ff4d4f; } }
  .input { font-size: 32rpx; color: #333; }
  .picker-value { font-size: 32rpx; color: #333; min-height: 44rpx; }
  .textarea {
    width: 100%; height: 160rpx; font-size: 28rpx; color: #333;
    background-color: #f9f9f9; padding: 20rpx; border-radius: 8rpx; box-sizing: border-box;
  }
}
.form-row {
  display: flex;
  gap: 20rpx;
  .half { flex: 1; }
}
.bottom-btn {
  position: fixed; bottom: 0; left: 0; right: 0;
  padding: 20rpx 30rpx 60rpx; background-color: #fff;
  box-shadow: 0 -4rpx 12rpx rgba(0,0,0,0.05);
  .submit-btn {
    background: linear-gradient(135deg, #ff5a5f, #ff7e82);
    color: #fff; border-radius: 44rpx; font-size: 32rpx;
    &::after { border: none; }
  }
}
</style>
