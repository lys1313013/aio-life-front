<template>
  <view class="container">
    <view class="header">
      <text class="title">欢迎使用 AIO-Life</text>
      <text class="subtitle">记录生活，管理日常</text>
    </view>

    <view class="form-container">
      <view class="input-group">
        <text class="label">用户名</text>
        <input 
          class="input" 
          type="text" 
          v-model="formData.username" 
          placeholder="请输入用户名" 
          placeholder-class="placeholder"
        />
      </view>
      <view class="input-group">
        <text class="label">密码</text>
        <input 
          class="input" 
          type="password" 
          v-model="formData.password" 
          placeholder="请输入密码" 
          placeholder-class="placeholder"
        />
      </view>
      <button class="btn-login" :loading="loading" @click="handleLogin">登 录</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useUserStore } from '../../store/user';
import { post } from '../../utils/request';

const userStore = useUserStore();

onShow(() => {
  // 防止已经登录的情况下，不小心通过返回键回到登录页
  if (userStore.token) {
    uni.switchTab({ url: '/pages/dashboard/index' });
  }
});

const formData = reactive({
  username: '',
  password: ''
});

const loading = ref(false);

const handleLogin = async () => {
  if (!formData.username || !formData.password) {
    uni.showToast({ title: '请输入用户名和密码', icon: 'none' });
    return;
  }

  loading.value = true;
  try {
    // 调用 Web 端一致的登录接口
    const res: any = await post('/auth/login', formData, { custom: { noAuth: true } });
    if (res && res.accessToken) {
      userStore.setToken(res.accessToken);
      uni.showToast({ title: '登录成功', icon: 'success' });
      // 登录成功后跳转到首页
      setTimeout(() => {
        uni.switchTab({ url: '/pages/dashboard/index' });
      }, 1000);
    }
  } catch (error) {
    // 错误在 request 拦截器中已经抛出提示
    console.error('Login failed:', error);
  } finally {
    loading.value = false;
  }
};
</script>

<style lang="scss" scoped>
.container {
  padding: 60rpx 40rpx;
  background-color: #ffffff;
  min-height: 100vh;
}

.header {
  margin-top: 100rpx;
  margin-bottom: 80rpx;
  .title {
    font-size: 56rpx;
    font-weight: bold;
    color: #333;
    display: block;
    margin-bottom: 20rpx;
  }
  .subtitle {
    font-size: 30rpx;
    color: #888;
  }
}

.form-container {
  .input-group {
    margin-bottom: 40rpx;
    .label {
      font-size: 28rpx;
      color: #333;
      margin-bottom: 16rpx;
      display: block;
      font-weight: 500;
    }
    .input {
      height: 88rpx;
      background-color: #f5f6f8;
      border-radius: 16rpx;
      padding: 0 24rpx;
      font-size: 30rpx;
      color: #333;
    }
    .placeholder {
      color: #b2b2b2;
    }
  }

  .btn-login {
    margin-top: 60rpx;
    height: 96rpx;
    line-height: 96rpx;
    background-color: #007aff;
    color: #ffffff;
    border-radius: 48rpx;
    font-size: 32rpx;
    font-weight: 500;
    
    &:active {
      opacity: 0.8;
    }
    
    &::after {
      border: none;
    }
  }
}
</style>
