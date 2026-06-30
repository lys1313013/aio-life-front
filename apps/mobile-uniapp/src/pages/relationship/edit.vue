<template>
  <view class="container">
    <view class="form-container">
      <view class="form-item">
        <text class="label">姓名 <text class="required">*</text></text>
        <input class="input" v-model="formData.name" placeholder="姓名" />
      </view>
      <view class="form-item">
        <text class="label">分类</text>
        <input class="input" v-model="formData.category" placeholder="如: 家人、朋友、同事" />
      </view>
      <view class="form-item">
        <text class="label">生日</text>
        <picker mode="date" :value="formData.birthday" @change="onBirthdayChange">
          <view class="picker-value">{{ formData.birthday || '请选择' }}</view>
        </picker>
      </view>
      <view class="form-item">
        <text class="label">手机</text>
        <input class="input" v-model="formData.phone" placeholder="手机号" />
      </view>
      <view class="form-item">
        <text class="label">邮箱</text>
        <input class="input" v-model="formData.email" placeholder="邮箱" />
      </view>
      <view class="form-item">
        <text class="label">描述</text>
        <textarea class="textarea" v-model="formData.description" placeholder="添加描述..." />
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
import { createPerson, updatePerson, type PersonReq } from '../../../api/relationship';

const isEdit = ref(false);
const editId = ref('');
const isSubmitting = ref(false);
const formData = ref<PersonReq>({ name: '', category: '', description: '', birthday: '', phone: '', email: '', notes: '' });

onMounted(() => {
  uni.$on('editPerson', (item: any) => {
    if (item) {
      isEdit.value = true;
      editId.value = item.id;
      formData.value = {
        name: item.name || '',
        category: item.category || '',
        birthday: item.birthday || '',
        phone: item.phone || '',
        email: item.email || '',
        description: item.description || '',
        notes: item.notes || '',
      };
    }
  });
});

const onBirthdayChange = (e: any) => { formData.value.birthday = e.detail.value; };

const handleSubmit = async () => {
  if (!formData.value.name.trim()) { uni.showToast({ title: '姓名不能为空', icon: 'none' }); return; }
  isSubmitting.value = true;
  try {
    if (isEdit.value) {
      await updatePerson(editId.value, formData.value);
    } else {
      await createPerson(formData.value);
    }
    uni.showToast({ title: isEdit.value ? '已更新' : '已创建', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 1000);
  } catch (e) { console.error('保存失败', e); } finally { isSubmitting.value = false; }
};
</script>

<style lang="scss" scoped>
.container { min-height: 100vh; background-color: #f5f6f8; padding: 20rpx; padding-bottom: 140rpx; }
.form-container { background-color: #fff; border-radius: 16rpx; padding: 0 30rpx; }
.form-item { display: flex; flex-direction: column; padding: 30rpx 0; border-bottom: 1rpx solid #f0f0f0; &:last-child { border-bottom: none; } .label { font-size: 28rpx; color: #333; margin-bottom: 16rpx; .required { color: #ff4d4f; } } .input { font-size: 32rpx; color: #333; } .picker-value { font-size: 32rpx; color: #333; } .textarea { width: 100%; height: 150rpx; font-size: 28rpx; background-color: #f9f9f9; padding: 20rpx; border-radius: 8rpx; box-sizing: border-box; } }
.bottom-btn { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 30rpx 60rpx; background-color: #fff; box-shadow: 0 -4rpx 12rpx rgba(0,0,0,0.05); .submit-btn { background-color: #3f51b5; color: #fff; border-radius: 44rpx; font-size: 32rpx; &::after { border: none; } } }
</style>
