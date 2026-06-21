<template>
  <scroll-view scroll-y class="container scroll-area">
    <!-- 用户信息区域 -->
    <view class="user-card" @click="handleNavigate('/pages/system/user/index')">
      <view class="avatar">
        <uni-icons type="person-filled" size="40" color="#a0cfff"></uni-icons>
      </view>
      <view class="user-info">
        <text class="nickname">{{ userStore.userInfo?.realName || userStore.userInfo?.username || '未登录' }}</text>
        <text class="desc">{{ userStore.userInfo?.email || 'AIO-Life 记录点滴' }}</text>
      </view>
      <view class="user-arrow">
        <uni-icons type="right" size="16" color="#ccc"></uni-icons>
      </view>
    </view>

    <!-- 应用大厅分组 -->
    <view class="group-panel" v-for="group in appGroups" :key="group.title">
      <view class="group-header">
        <text class="group-title">{{ group.title }}</text>
      </view>
      <view class="group-body grid-layout">
        <view 
          class="app-item" 
          v-for="app in group.apps" 
          :key="app.name"
          @click="handleNavigate(app.path)"
        >
          <view class="app-icon-wrap" :style="{ color: app.color || '#007aff' }">
            <view class="iconify-icon" :style="getIconifyStyle(app.icon)"></view>
          </view>
          <text class="app-name">{{ app.name }}</text>
        </view>
      </view>
    </view>
    
    <!-- 退出登录 -->
    <view class="logout-btn" @click="handleLogout" v-if="userStore.token">
      <text class="logout-text">退出登录</text>
    </view>

    <view style="height: 40rpx;"></view>
  </scroll-view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from '../../../store/user';

const userStore = useUserStore();

const appGroups = ref([
  {
    title: '任务',
    apps: [
      { name: '待办', path: '/pages/task-center/todo/index', icon: 'lucide:check-square', color: '#1890ff' },
      { name: '目标', path: '/pages/task-center/goal/index', icon: 'lucide:target', color: '#ff5a5f' },
    ]
  },
  {
    title: '时间',
    apps: [
      { name: '时迹', path: '/pages/time/time-tracker/index', icon: 'lucide:clock', color: '#34c759' },
      { name: '我的分类', path: '/pages/time/my-categories/index', icon: 'lucide:layers', color: '#af52de' },
      { name: '分类管理', path: '/pages/time/category-admin/index', icon: 'lucide:settings-2', color: '#ff9500' },
    ]
  },
  {
    title: '记录',
    apps: [
      { name: '运动', path: '/pages/record/exercise/index', icon: 'lucide:activity', color: '#ff2d55' },
      { name: '密码', path: '/pages/record/password/index', icon: 'lucide:key', color: '#5856d6' },
      { name: '视频观看', path: '/pages/record/videoWatch/index', icon: 'lucide:video', color: '#5ac8fa' },
      { name: '闪念', path: '/pages/record/think/index', icon: 'lucide:lightbulb', color: '#ffcc00' },
      { name: '笔记', path: '/pages/record/memo/index', icon: 'lucide:book-open', color: '#4cd964' },
      { name: '活动', path: '/pages/record/performance/index', icon: 'lucide:award', color: '#ff3b30' },
      { name: '里程碑', path: '/pages/record/milestone/index', icon: 'lucide:flag', color: '#8e8e93' },
      { name: '纪念日', path: '/pages/record/anniversary/index', icon: 'lucide:calendar-heart', color: '#ff2d55' },
      { name: '观影', path: '/pages/record/movie/index', icon: 'lucide:film', color: '#007aff' },
      { name: '阅读', path: '/pages/record/read/index', icon: 'lucide:book', color: '#ff9500' },
      { name: '关系图谱', path: '/pages/relationship/graph/index', icon: 'lucide:share-2', color: '#5856d6' },
    ]
  },
  {
    title: '财务',
    apps: [
      { name: '概览', path: '/pages/finance/dashboard/index', icon: 'lucide:pie-chart', color: '#ff9500' },
      { name: '收入', path: '/pages/finance/income/index', icon: 'lucide:trending-up', color: '#34c759' },
      { name: '支出', path: '/pages/finance/expense/index', icon: 'lucide:trending-down', color: '#ff3b30' },
      { name: '账单导入', path: '/pages/finance/import/index', icon: 'lucide:file-down', color: '#007aff' },
    ]
  },
  {
    title: '物品',
    apps: [
      { name: '设备墙', path: '/pages/goods/device/index', icon: 'lucide:smartphone', color: '#5ac8fa' },
      { name: '衣柜', path: '/pages/goods/wardrobe/index', icon: 'lucide:shirt', color: '#af52de' },
    ]
  },
  {
    title: '编程',
    apps: [
      { name: 'Github', path: '/pages/coding/github/index', icon: 'mdi:github', color: '#333333' },
      { name: 'LeetCode', path: '/pages/coding/leetcode/index', icon: 'simple-icons:leetcode', color: '#ffa116' },
      { name: 'CSDN', path: '/pages/coding/csdn/index', icon: 'simple-icons:csdn', color: '#fc5531' },
    ]
  },
  {
    title: '配置',
    apps: [
      { name: '字典类型', path: '/pages/config-management/sysDictType/index', icon: 'lucide:book-type', color: '#ff9500' },
      { name: '字典数据', path: '/pages/config-management/sysDictData/index', icon: 'lucide:database', color: '#34c759' },
      { name: '分类配置', path: '/pages/config-management/exerciseCategoryConfig/index', icon: 'lucide:list-tree', color: '#ff2d55' },
    ]
  },
  {
    title: '系统',
    apps: [
      { name: '用户中心', path: '/pages/system/user/index', icon: 'lucide:user', color: '#007aff' },
      { name: '菜单管理', path: '/pages/system/menu/index', icon: 'lucide:menu', color: '#5856d6' },
      { name: '用户字典', path: '/pages/system/user-dict/index', icon: 'lucide:book-dashed', color: '#af52de' },
    ]
  },
  {
    title: 'MCP',
    apps: [
      { name: 'MCP工具', path: '/pages/mcp/tools/index', icon: 'lucide:wrench', color: '#ff9500' },
    ]
  }
]);

const getIconifyStyle = (iconStr: string, keepColor = false) => {
  if (!iconStr) return '';
  const [collection, name] = iconStr.split(':');
  if (!collection || !name) return '';
  const url = `url("https://api.iconify.design/${collection}/${name}.svg")`;
  
  if (keepColor) {
    return {
      background: `${url} no-repeat center / contain`
    };
  }

  return {
    mask: `${url} no-repeat center / contain`,
    '-webkit-mask': `${url} no-repeat center / contain`,
    backgroundColor: 'currentColor'
  };
};

const handleNavigate = (path: string) => {
  if (!userStore.token) {
    uni.navigateTo({ url: '/pages/login/index' });
    return;
  }
  
  if (['/pages/task-center/todo/index', '/pages/dashboard/index', '/pages/message/index', '/pages/_core/profile/index'].includes(path)) {
    uni.switchTab({ url: path });
  } else {
    uni.navigateTo({
      url: path,
      fail: (err) => {
        console.error('Navigate failed:', err);
        uni.showToast({ title: '页面开发中', icon: 'none' });
      }
    });
  }
};

const handleLogout = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.clearToken();
        userStore.setUserInfo(null);
        uni.reLaunch({ url: '/pages/login/index' });
      }
    }
  });
};
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f5f6f8;
  display: flex;
  flex-direction: column;
}

.scroll-area {
  flex: 1;
  padding: 24rpx;
  box-sizing: border-box;
}

/* 用户卡片 */
.user-card {
  display: flex;
  align-items: center;
  background-color: #fff;
  padding: 32rpx;
  border-radius: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.03);
  
  .avatar {
    width: 100rpx;
    height: 100rpx;
    background-color: #f4f8ff;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-right: 24rpx;
  }
  
  .user-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    
    .nickname {
      font-size: 36rpx;
      font-weight: 600;
      color: #333;
      margin-bottom: 8rpx;
    }
    
    .desc {
      font-size: 24rpx;
      color: #999;
    }
  }
  
  .user-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

/* 应用大厅面板 */
.group-panel {
  background-color: #fff;
  border-radius: 24rpx;
  margin-bottom: 24rpx;
  padding: 24rpx 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.03);
  
  .group-header {
    margin-bottom: 24rpx;
    
    .group-title {
      font-size: 30rpx;
      font-weight: 600;
      color: #333;
    }
  }
  
  .grid-layout {
    display: flex;
    flex-wrap: wrap;
    gap: 32rpx 0;
    
    .app-item {
      width: 25%;
      display: flex;
      flex-direction: column;
      align-items: center;
      
      .app-icon-wrap {
        width: 80rpx;
        height: 80rpx;
        background-color: #f4f8ff;
        border-radius: 24rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 12rpx;
        
        .iconify-icon {
          width: 44rpx;
          height: 44rpx;
        }
      }
      
      .app-name {
        font-size: 24rpx;
        color: #333;
      }
    }
  }
}

/* 退出登录 */
.logout-btn {
  margin-top: 16rpx;
  margin-bottom: 40rpx;
  background-color: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.03);
  
  .logout-text {
    color: #ff3b30;
    font-size: 30rpx;
    font-weight: 500;
  }
}
</style>
