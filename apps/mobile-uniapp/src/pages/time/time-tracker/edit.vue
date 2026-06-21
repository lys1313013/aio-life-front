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

      <!-- 关联记录选择 (阅读/观影) -->
      <view class="form-item" v-if="currentRelateType">
        <text class="label">关联记录 <text class="required">*</text></text>
        <picker :range="relateRecordList" range-key="title" :value="relateRecordIndex" @change="onRelateRecordChange">
          <view class="picker-value">
            {{ relateRecordIndex >= 0 ? relateRecordList[relateRecordIndex].title : '请选择关联记录' }}
          </view>
        </picker>
      </view>

      <!-- 运动明细 -->
      <view class="form-item" v-if="isExerciseCategory">
        <view class="exercise-header">
          <text class="label">运动明细</text>
          <text class="add-btn" @click="addExercise">+ 添加</text>
        </view>
        <view class="exercise-list">
          <view class="exercise-row" v-for="(item, index) in formData.exercises" :key="index">
            <view class="exercise-col type-col">
              <picker :range="exerciseTypeOptions" range-key="dictLabel" @change="(e: any) => onExerciseTypeChange(e, index)">
                <view class="picker-value exercise-picker">{{ getExerciseTypeName(item.exerciseTypeId) }}</view>
              </picker>
            </view>
            <view class="exercise-col count-col">
              <input type="number" class="input" v-model="item.exerciseCount" placeholder="数量/时长" />
            </view>
            <view class="exercise-col action-col" @click="removeExercise(index)">
              <uni-icons type="trash" size="20" color="#ff4d4f" />
            </view>
          </view>
        </view>
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
import { saveTimeRecord, getRelateTypes, type TimeRecordEntity } from '@/api/time-tracker';
import { getByDictType } from '@/api/userDictType';
import { listActiveRead } from '@/api/read';
import { MovieApi } from '@/api/movie';

const isSubmitting = ref(false);
const categories = ref<TimeTrackerCategoryEntity[]>([]);
const categoryIndex = ref(-1);

const formData = ref<Partial<TimeRecordEntity>>({
  title: '',
  categoryId: '',
  date: '',
  description: '',
  exercises: [],
  relateId: '',
  relateType: 0,
});

const exerciseTypeOptions = ref<any[]>([]);
const relateTypeList = ref<any[]>([]);
const relateRecordList = ref<any[]>([]);
const relateRecordIndex = ref(-1);

const isExerciseCategory = computed(() => {
  if (categoryIndex.value < 0) return false;
  const cat = categories.value[categoryIndex.value];
  return cat?.name === '运动' || cat?.id === 'exercise';
});

const currentRelateType = computed(() => {
  if (categoryIndex.value < 0 || relateTypeList.value.length === 0) return 0;
  const cat = categories.value[categoryIndex.value];
  const matchedEnum = relateTypeList.value.find((e: any) => cat.name.includes(e.label));
  return matchedEnum ? Number(matchedEnum.value) : 0;
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

  try {
    const dictRes = await getByDictType('exercise_type');
    if (dictRes && dictRes.dictDetailList) {
      exerciseTypeOptions.value = dictRes.dictDetailList;
    }
    const relRes: any = await getRelateTypes();
    if (relRes) {
      relateTypeList.value = relRes?.items || relRes?.records || relRes?.list || (Array.isArray(relRes) ? relRes : []);
    }
  } catch (e) {
    console.error('加载字典或关联类型失败', e);
  }
});

const loadCategories = async () => {
  try {
    const res: any = await listCategories();
    categories.value = res?.items || res?.records || res?.list || (Array.isArray(res) ? res : []);
  } catch (e) {
    uni.showToast({ title: '获取分类失败', icon: 'none' });
  }
};

const onCategoryChange = async (e: any) => {
  categoryIndex.value = e.detail.value;
  formData.value.categoryId = categories.value[categoryIndex.value].id;
  
  if (isExerciseCategory.value && (!formData.value.exercises || formData.value.exercises.length === 0)) {
    formData.value.exercises = [{ exerciseTypeId: '', exerciseCount: undefined }];
  }
  
  const relType = currentRelateType.value;
  if (relType) {
    formData.value.relateType = relType;
    await loadRelateRecords(relType);
  } else {
    formData.value.relateId = '';
    formData.value.relateType = 0;
  }
};

const loadRelateRecords = async (relType: number) => {
  try {
    let data: any[] = [];
    if (relType === 1) {
      const res: any = await listActiveRead();
      data = res?.items || res?.records || res?.list || (Array.isArray(res) ? res : []);
    } else if (relType === 2) {
      const res: any = await MovieApi.listActive();
      data = res?.items || res?.records || res?.list || (Array.isArray(res) ? res : []);
    }
    relateRecordList.value = data;
    relateRecordIndex.value = -1;
  } catch (error) {
    console.error('获取关联数据失败', error);
  }
};

const onRelateRecordChange = (e: any) => {
  relateRecordIndex.value = e.detail.value;
  const item = relateRecordList.value[relateRecordIndex.value];
  formData.value.relateId = item.id;
  if (!formData.value.title) {
    formData.value.title = item.title;
  }
};

const getExerciseTypeName = (val: string) => {
  const item = exerciseTypeOptions.value.find((o: any) => o.dictValue === val);
  return item ? item.dictLabel : '请选择';
};

const onExerciseTypeChange = (e: any, index: number) => {
  const selectedIdx = e.detail.value;
  if (formData.value.exercises && formData.value.exercises[index]) {
    formData.value.exercises[index].exerciseTypeId = exerciseTypeOptions.value[selectedIdx].dictValue;
  }
};

const addExercise = () => {
  if (!formData.value.exercises) formData.value.exercises = [];
  formData.value.exercises.push({ exerciseTypeId: '', exerciseCount: undefined });
};

const removeExercise = (index: number) => {
  if (formData.value.exercises) {
    formData.value.exercises.splice(index, 1);
  }
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

  const submitData: Partial<TimeRecordEntity> = {
    ...formData.value,
    startTime: startMin,
    endTime: endMin,
    duration,
    isManual: 1
  };
  
  if (isExerciseCategory.value) {
    submitData.exercises = formData.value.exercises?.filter((e: any) => e.exerciseTypeId) || [];
  } else {
    delete submitData.exercises;
  }
  
  if (!currentRelateType.value) {
    delete submitData.relateId;
    delete submitData.relateType;
  }

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

.exercise-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;

  .label {
    margin-bottom: 0;
  }
  .add-btn {
    font-size: 28rpx;
    color: #007AFF;
  }
}

.exercise-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;

  .exercise-row {
    display: flex;
    align-items: center;
    gap: 16rpx;
    background-color: #f9f9f9;
    padding: 16rpx;
    border-radius: 8rpx;

    .exercise-col {
      &.type-col {
        flex: 1.5;
        border-right: 1rpx solid #eee;
      }
      &.count-col {
        flex: 1;
      }
      &.action-col {
        width: 60rpx;
        display: flex;
        justify-content: center;
      }

      .exercise-picker {
        font-size: 28rpx;
        color: #333;
      }

      .input {
        font-size: 28rpx;
      }
    }
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
