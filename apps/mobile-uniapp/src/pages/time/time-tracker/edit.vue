<template>
  <view class="container">
    <view class="form-container">
      <view class="form-item">
        <text class="label">标题 <text class="required">*</text></text>
        <input class="input" v-model="formData.title" placeholder="请输入时迹标题" />
      </view>
      
      <view class="form-item">
        <text class="label">分类 <text class="required">*</text></text>
        <picker :range="categories" range-key="name" :value="categoryIndex" @change="onCategoryChange">
          <view class="picker-value">
            {{ categoryIndex >= 0 ? categories[categoryIndex].name : '请选择分类' }}
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">日期 <text class="required">*</text></text>
        <picker mode="date" :value="formData.date" @change="onDateChange">
          <view class="picker-value">
            {{ formData.date || '请选择日期' }}
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">开始时间 <text class="required">*</text></text>
        <picker mode="time" :value="startTimeStr" @change="onStartTimeChange">
          <view class="picker-value">
            {{ startTimeStr || '请选择开始时间' }}
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">结束时间 <text class="required">*</text></text>
        <picker mode="time" :value="endTimeStr" @change="onEndTimeChange">
          <view class="picker-value">
            {{ endTimeStr || '请选择结束时间' }}
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">备注</text>
        <textarea class="textarea" v-model="formData.description" placeholder="添加一些备注..." :maxlength="500"></textarea>
      </view>
    </view>

    <view class="bottom-btn">
      <button class="submit-btn" @click="handleSubmit" :loading="isSubmitting">保存</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { listCategories, type TimeTrackerCategoryEntity } from '@/api/time-tracker-category';
import { saveTimeRecord, type TimeRecordEntity } from '@/api/time-tracker';

const isSubmitting = ref(false);
const categories = ref<TimeTrackerCategoryEntity[]>([]);
const categoryIndex = ref(-1);

const formData = ref<Partial<TimeRecordEntity>>({
  title: '',
  categoryId: '',
  date: '',
  description: '',
});

const startTimeStr = ref('');
const endTimeStr = ref('');

onMounted(async () => {
  // 设置默认日期为今天
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  formData.value.date = `${yyyy}-${mm}-${dd}`;
  
  // 设置默认时间 (当前时间)
  const hh = String(today.getHours()).padStart(2, '0');
  const min = String(today.getMinutes()).padStart(2, '0');
  startTimeStr.value = `${hh}:${min}`;
  
  // 结束时间默认延后30分钟
  const later = new Date(today.getTime() + 30 * 60000);
  const l_hh = String(later.getHours()).padStart(2, '0');
  const l_min = String(later.getMinutes()).padStart(2, '0');
  endTimeStr.value = `${l_hh}:${l_min}`;

  await loadCategories();
});

const loadCategories = async () => {
  try {
    const res: any = await listCategories();
    categories.value = res?.items || res?.records || res?.list || (Array.isArray(res) ? res : []);
  } catch (e) {
    uni.showToast({ title: '获取分类失败', icon: 'none' });
  }
};

const onCategoryChange = (e: any) => {
  categoryIndex.value = e.detail.value;
  formData.value.categoryId = categories.value[categoryIndex.value].id;
};

const onDateChange = (e: any) => {
  formData.value.date = e.detail.value;
};

const onStartTimeChange = (e: any) => {
  startTimeStr.value = e.detail.value;
};

const onEndTimeChange = (e: any) => {
  endTimeStr.value = e.detail.value;
};

// 将 HH:mm 转换为当天的分钟数
const timeStrToMinutes = (timeStr: string) => {
  if (!timeStr) return 0;
  const [hh, mm] = timeStr.split(':').map(Number);
  return hh * 60 + mm;
};

const handleSubmit = async () => {
  if (!formData.value.title) {
    return uni.showToast({ title: '请输入标题', icon: 'none' });
  }
  if (!formData.value.categoryId) {
    return uni.showToast({ title: '请选择分类', icon: 'none' });
  }
  if (!formData.value.date) {
    return uni.showToast({ title: '请选择日期', icon: 'none' });
  }
  if (!startTimeStr.value || !endTimeStr.value) {
    return uni.showToast({ title: '请选择时间', icon: 'none' });
  }

  const startMin = timeStrToMinutes(startTimeStr.value);
  const endMin = timeStrToMinutes(endTimeStr.value);
  
  let duration = endMin - startMin;
  if (duration < 0) {
    // 跨天情况
    duration += 24 * 60;
  }
  
  if (duration <= 0) {
    return uni.showToast({ title: '结束时间需晚于开始时间', icon: 'none' });
  }

  const submitData = {
    ...formData.value,
    startTime: startMin,
    endTime: endMin,
    duration,
    isManual: 1
  };

  try {
    isSubmitting.value = true;
    await saveTimeRecord(submitData);
    uni.showToast({ title: '保存成功', icon: 'success' });
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  } catch (error) {
    uni.showToast({ title: '保存失败', icon: 'none' });
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
  
  &:last-child {
    border-bottom: none;
  }

  .label {
    font-size: 28rpx;
    color: #333;
    margin-bottom: 16rpx;
    
    .required {
      color: #ff4d4f;
      margin-left: 4rpx;
    }
  }

  .input {
    font-size: 32rpx;
    color: #333;
  }
  
  .picker-value {
    font-size: 32rpx;
    color: #333;
    min-height: 44rpx;
  }

  .textarea {
    width: 100%;
    height: 200rpx;
    font-size: 28rpx;
    color: #333;
    background-color: #f9f9f9;
    padding: 20rpx;
    border-radius: 8rpx;
    box-sizing: border-box;
  }
}

.bottom-btn {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 30rpx 60rpx;
  background-color: #fff;
  box-shadow: 0 -4rpx 12rpx rgba(0, 0, 0, 0.05);
  
  .submit-btn {
    background-color: #007AFF;
    color: #fff;
    border-radius: 44rpx;
    font-size: 32rpx;
    
    &::after {
      border: none;
    }
    
    &:active {
      opacity: 0.8;
    }
  }
}
</style>
