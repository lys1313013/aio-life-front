<template>
  <view class="container">
    <view class="form-container">
      <view class="form-item">
        <text class="label">交易对象 <text class="required">*</text></text>
        <input class="input" v-model="formData.counterparty" placeholder="商家/对象" />
      </view>
      <view class="form-item">
        <text class="label">金额 <text class="required">*</text></text>
        <input class="input" v-model.number="formData.amt" type="digit" placeholder="0.00" />
      </view>
      <view class="form-item">
        <text class="label">分类</text>
        <input class="input" v-model="formData.category || formData.expDesc" placeholder="如: 餐饮、交通" />
      </view>
      <view class="form-item">
        <text class="label">日期</text>
        <picker mode="date" :value="formData.expTime" @change="onDateChange">
          <view class="picker-value">{{ formData.expTime || '请选择' }}</view>
        </picker>
      </view>
      <view class="form-item">
        <text class="label">备注</text>
        <textarea class="textarea" v-model="formData.expDesc" placeholder="添加描述..." />
      </view>
    </view>
    <view class="bottom-btn">
      <button class="submit-btn" @click="handleSubmit" :loading="isSubmitting">保存</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { insertData, updateData } from '@/api/expense';

const isEdit = ref(false);
const editId = ref('');
const isSubmitting = ref(false);

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
};

const formData = ref<any>({ counterparty: '', amt: undefined, expDesc: '', expTime: todayStr() });

onMounted(() => {
  uni.$on('editExpense', (item: any) => {
    if (item) {
      isEdit.value = true;
      editId.value = item.id;
      formData.value = {
        counterparty: item.counterparty || item.expDesc || '',
        amt: item.amt || item.transactionAmt || item.amount,
        expDesc: item.expDesc || '',
        expTime: item.expTime || item.date || todayStr(),
      };
    }
  });
});

const onDateChange = (e: any) => { formData.value.expTime = e.detail.value; };

const handleSubmit = async () => {
  if (!formData.value.counterparty.trim()) { uni.showToast({ title: '请输入交易对象', icon: 'none' }); return; }
  if (!formData.value.amt && formData.value.amt !== 0) { uni.showToast({ title: '请输入金额', icon: 'none' }); return; }
  isSubmitting.value = true;
  try {
    const payload = { ...formData.value, amt: Number(formData.value.amt) };
    if (isEdit.value) {
      payload.id = editId.value;
      await updateData(payload);
    } else {
      await insertData(payload);
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
.bottom-btn { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 30rpx 60rpx; background-color: #fff; box-shadow: 0 -4rpx 12rpx rgba(0,0,0,0.05); .submit-btn { background-color: #ef4444; color: #fff; border-radius: 44rpx; font-size: 32rpx; &::after { border: none; } } }
</style>
