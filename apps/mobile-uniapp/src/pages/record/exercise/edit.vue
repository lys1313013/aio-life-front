<template>
  <view class="container">
    <view class="form-container">
      <view class="form-item">
        <text class="label">运动类型 <text class="required">*</text></text>
        <picker :range="exerciseTypeOptions" range-key="dictLabel" :value="exerciseTypeIndex" @change="onExerciseTypeChange">
          <view class="picker-value">{{ exerciseTypeLabel }}</view>
        </picker>
      </view>

      <view class="form-row">
        <view class="form-item half">
          <text class="label">数量/时长 <text class="required">*</text></text>
          <input class="input" v-model.number="formData.exerciseCount" type="number" placeholder="100" />
        </view>
        <view class="form-item half">
          <text class="label">消耗(千卡)</text>
          <input class="input" v-model.number="formData.calories" type="number" placeholder="300" />
        </view>
      </view>

      <view class="form-item">
        <text class="label">日期 <text class="required">*</text></text>
        <picker mode="date" :value="formData.exerciseDate" @change="onDateChange">
          <view class="picker-value">{{ formData.exerciseDate || '请选择' }}</view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">时长(分钟)</text>
        <input class="input" v-model.number="formData.duration" type="number" placeholder="45" />
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
import { ref, computed, getCurrentInstance, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { add, update } from '@/api/exercise';
import { getByDictType } from '@/api/userDictType';

const isEdit = ref(false);
const editId = ref('');
const isSubmitting = ref(false);

const exerciseTypeOptions = ref<any[]>([]);
const exerciseTypeIndex = ref(0);

const exerciseTypeLabel = computed(() => {
  return exerciseTypeOptions.value[exerciseTypeIndex.value]?.dictLabel || '请选择运动类型';
});

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
};

const formData = ref({
  exerciseTypeId: '',
  exerciseCount: undefined as number | undefined,
  exerciseDate: todayStr(),
  duration: undefined as number | undefined,
  calories: undefined as number | undefined,
  remark: '',
});

// 待回显的编辑记录：eventChannel 接收后先暂存，待字典选项加载完成后再回显匹配
let pendingEditItem: any = null;

// 回显编辑记录，必须在 exerciseTypeOptions 加载完成后调用，保证运动类型匹配正确
const applyEditItem = (item: any) => {
  isEdit.value = true;
  editId.value = item.id;
  formData.value = {
    exerciseTypeId: item.exerciseTypeId || '',
    exerciseCount: item.exerciseCount,
    exerciseDate: item.exerciseDate || todayStr(),
    duration: item.duration,
    calories: item.calories,
    remark: item.remark || '',
  };
  // 后端返回的是 Long(id)，按 String(id) 匹配选项
  const idx = exerciseTypeOptions.value.findIndex((o: any) => String(o.id) === String(item.exerciseTypeId));
  exerciseTypeIndex.value = idx >= 0 ? idx : 0;
};

onMounted(async () => {
  try {
    const dictRes = await getByDictType('exercise_type');
    if (dictRes?.dictDetailList) {
      exerciseTypeOptions.value = dictRes.dictDetailList;
    }
  } catch (e) {
    console.error('加载运动类型失败', e);
  }

  // 字典就绪后回显，保持「接收记录 → 加载字典 → 回显匹配」的顺序
  if (pendingEditItem) {
    applyEditItem(pendingEditItem);
    pendingEditItem = null;
  }
});

// 页面加载时通过 eventChannel 接收列表页传来的待编辑记录（uni.navigateTo success 中 emit，
// emit 先于 on 注册也会被缓冲补发，无时序问题，且随页面销毁自动回收，无监听泄漏）
onLoad(() => {
  // uniapp 未在 ComponentPublicInstance 类型上声明 getOpenerEventChannel，需断言
  const eventChannel = (getCurrentInstance()?.proxy as any)?.getOpenerEventChannel?.();
  eventChannel?.on('editExercise', (item: any) => {
    if (!item) return;
    pendingEditItem = item;
    // 兜底：字典已加载完才直接回显，否则等 onMounted 加载完字典后统一回显
    if (exerciseTypeOptions.value.length > 0) {
      applyEditItem(pendingEditItem);
      pendingEditItem = null;
    }
  });
});

const onExerciseTypeChange = (e: any) => {
  exerciseTypeIndex.value = e.detail.value;
  const option = exerciseTypeOptions.value[exerciseTypeIndex.value];
  // 提交 user_dict_data.id（后端 Long 字段），与 web-antd / dashboard 一致
  formData.value.exerciseTypeId = option ? String(option.id) : '';
};

const onDateChange = (e: any) => { formData.value.exerciseDate = e.detail.value; };

const handleSubmit = async () => {
  if (!formData.value.exerciseTypeId) {
    uni.showToast({ title: '请选择运动类型', icon: 'none' });
    return;
  }
  if (!formData.value.exerciseCount && formData.value.exerciseCount !== 0) {
    uni.showToast({ title: '请输入数量/时长', icon: 'none' });
    return;
  }
  isSubmitting.value = true;
  try {
    const payload: any = { ...formData.value };
    if (isEdit.value) {
      payload.id = editId.value;
      await update(payload);
    } else {
      await add(payload);
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
  .textarea { width: 100%; height: 150rpx; font-size: 28rpx; background-color: #f9f9f9; padding: 20rpx; border-radius: 8rpx; box-sizing: border-box; }
}
.form-row { display: flex; gap: 20rpx; .half { flex: 1; } }
.bottom-btn {
  position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 30rpx 60rpx; background-color: #fff;
  box-shadow: 0 -4rpx 12rpx rgba(0,0,0,0.05);
  .submit-btn { background: linear-gradient(135deg, #2979ff, #4facfe); color: #fff; border-radius: 44rpx; font-size: 32rpx; &::after { border: none; } }
}
</style>
