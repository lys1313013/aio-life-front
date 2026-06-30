<template>
  <view class="container">
    <view class="form-container">
      <view class="form-item">
        <text class="label">来源 <text class="required">*</text></text>
        <input class="input" v-model="formData.remark" placeholder="收入来源" />
      </view>
      <view class="form-item">
        <text class="label">金额 <text class="required">*</text></text>
        <input class="input" v-model.number="formData.amt" type="digit" placeholder="0.00" />
      </view>
      <view class="form-item">
        <text class="label">分类</text>
        <input class="input" v-model="formData.category" placeholder="如: 工资、奖金" />
      </view>
      <view class="form-item">
        <text class="label">日期</text>
        <picker mode="date" :value="formData.incDate" @change="onDateChange">
          <view class="picker-value">{{ formData.incDate || '请选择' }}</view>
        </picker>
      </view>
    </view>
    <view class="bottom-btn">
      <button class="submit-btn" @click="handleSubmit" :loading="isSubmitting">保存</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { insertOrUpdate } from '@/api/income';

const isEdit = ref(false);
const editId = ref('');
const isSubmitting = ref(false);

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
};

const formData = ref<any>({ remark: '', amt: undefined, category: '', incDate: todayStr() });

onMounted(() => {
  uni.$on('editIncome', (item: any) => {
    if (item) {
      isEdit.value = true;
      editId.value = item.id;
      formData.value = {
        remark: item.remark || item.category || '',
        amt: item.amt || item.amount,
        category: item.category || '',
        incDate: item.incDate || item.date || todayStr(),
      };
    }
  });
});

const onDateChange = (e: any) => { formData.value.incDate = e.detail.value; };

const handleSubmit = async () => {
  if (!formData.value.remark.trim()) { uni.showToast({ title: '请输入来源', icon: 'none' }); return; }
  if (!formData.value.amt && formData.value.amt !== 0) { uni.showToast({ title: '请输入金额', icon: 'none' }); return; }
  isSubmitting.value = true;
  try {
    const payload = { ...formData.value, amt: Number(formData.value.amt) };
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
.form-item { display: flex; flex-direction: column; padding: 30rpx 0; border-bottom: 1rpx solid #f0f0f0; &:last-child { border-bottom: none; } .label { font-size: 28rpx; color: #333; margin-bottom: 16rpx; .required { color: #ff4d4f; } } .input { font-size: 32rpx; color: #333; } .picker-value { font-size: 32rpx; color: #333; } }
.bottom-btn { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 30rpx 60rpx; background-color: #fff; box-shadow: 0 -4rpx 12rpx rgba(0,0,0,0.05); .submit-btn { background-color: #10b981; color: #fff; border-radius: 44rpx; font-size: 32rpx; &::after { border: none; } } }
</style>
