<template>
  <view class="container">
    <view class="performance-list" v-if="performanceList.length > 0">
      <view
        class="performance-card"
        v-for="item in performanceList"
        :key="item.id"
        @click="onClickPerformance(item)"
        @longpress="onDeletePerformance(item)"
      >
        <view class="header">
          <text class="title">{{ item.title || item.name }}</text>
          <text class="score" :class="getScoreClass(item.score)">{{ item.score }} 分</text>
        </view>
        <view class="body">
          <text class="desc" v-if="item.description">{{ item.description }}</text>
          <view class="tags" v-if="item.category">
            <text class="tag">{{ item.category }}</text>
          </view>
        </view>
        <view class="footer">
          <text class="date">{{ item.date || item.createTime }}</text>
        </view>
      </view>
    </view>
    <view v-else class="empty">
      <text>暂无活动记录</text>
    </view>

    <uni-fab
      horizontal="right"
      vertical="bottom"
      :pattern="{ buttonColor: '#00BCD4' }"
      @fabClick="onAddPerformance"
    />

    <uni-popup ref="formPopup" type="bottom" background-color="#fff">
      <view class="popup-content">
        <view class="popup-header">
          <text class="popup-title">{{ isEdit ? '编辑活动' : '新建活动' }}</text>
          <uni-icons type="closeempty" size="24" @click="closeForm" />
        </view>
        <view class="popup-body">
          <input class="form-input" v-model="formData.title" placeholder="标题" />
          <input class="form-input" v-model="formData.score" type="number" placeholder="评分 (0-100)" />
          <textarea
            class="form-textarea"
            v-model="formData.description"
            placeholder="描述..."
          />
          <input class="form-input" v-model="formData.category" placeholder="分类 (如: 工作、学习、运动)" />
          <view class="date-row">
            <text class="date-label">日期</text>
            <picker mode="date" :value="formData.date" @change="onDateChange">
              <text class="date-value">{{ formData.date || '请选择日期' }}</text>
            </picker>
          </view>
        </view>
        <view class="popup-footer">
          <button class="submit-btn primary" @click="submitForm" :loading="submitting">保存</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { query, insertOrUpdate, deleteData } from '../../../api/performance';

const performanceList = ref<any[]>([]);
const formPopup = ref<any>(null);
const isEdit = ref(false);
const editId = ref('');
const submitting = ref(false);

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
};

const formData = ref({ title: '', score: '', description: '', category: '', date: todayStr() });

const loadPerformanceList = async () => {
  try {
    const res = await query({ page: 1, pageSize: 50, condition: {} });
    performanceList.value = res.items || res.records || res.list || (Array.isArray(res) ? res : []);
  } catch (e) {
    console.error('加载活动记录失败', e);
  }
};

const getScoreClass = (score: number) => {
  if (!score) return 'normal';
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'good';
  if (score < 60) return 'poor';
  return 'normal';
};

const onAddPerformance = () => {
  isEdit.value = false;
  editId.value = '';
  formData.value = { title: '', score: '', description: '', category: '', date: todayStr() };
  formPopup.value?.open();
};

const onClickPerformance = (item: any) => {
  isEdit.value = true;
  editId.value = item.id;
  formData.value = {
    title: item.title || item.name || '',
    score: item.score != null ? String(item.score) : '',
    description: item.description || '',
    category: item.category || '',
    date: item.date || todayStr()
  };
  formPopup.value?.open();
};

const onDeletePerformance = (item: any) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除「${item.title || item.name}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteData({ id: item.id });
          uni.showToast({ title: '已删除', icon: 'success' });
          loadPerformanceList();
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' });
        }
      }
    }
  });
};

const onDateChange = (e: any) => {
  formData.value.date = e.detail.value;
};

const closeForm = () => {
  formPopup.value?.close();
};

const submitForm = async () => {
  if (!formData.value.title.trim()) {
    uni.showToast({ title: '标题不能为空', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    const payload: any = {
      title: formData.value.title.trim(),
      description: formData.value.description.trim(),
      category: formData.value.category.trim(),
      date: formData.value.date,
      score: formData.value.score ? Number(formData.value.score) : undefined
    };
    if (isEdit.value) {
      payload.id = editId.value;
    }
    await insertOrUpdate(payload);
    uni.showToast({ title: isEdit.value ? '已更新' : '已保存', icon: 'success' });
    closeForm();
    loadPerformanceList();
  } catch (e) {
    console.error('保存活动失败', e);
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  loadPerformanceList();
});
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;
  padding-bottom: 120rpx;
}

.performance-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.performance-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;

    .title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }

    .score {
      font-size: 36rpx;
      font-weight: bold;

      &.excellent { color: #4CAF50; }
      &.good { color: #2196F3; }
      &.normal { color: #FF9800; }
      &.poor { color: #F44336; }
    }
  }

  .body {
    margin-bottom: 20rpx;

    .desc {
      font-size: 26rpx;
      color: #666;
      line-height: 1.5;
      display: block;
      margin-bottom: 12rpx;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 12rpx;

      .tag {
        font-size: 22rpx;
        color: #00BCD4;
        background-color: #E0F7FA;
        padding: 4rpx 12rpx;
        border-radius: 4rpx;
      }
    }
  }

  .footer {
    display: flex;
    justify-content: flex-end;
    border-top: 1rpx solid #f0f0f0;
    padding-top: 16rpx;

    .date {
      font-size: 24rpx;
      color: #999;
    }
  }
}

.empty {
  padding: 100rpx 0;
  text-align: center;
  color: #999;
}

.popup-content {
  padding: 30rpx;
  border-top-left-radius: 24rpx;
  border-top-right-radius: 24rpx;
  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30rpx;
    .popup-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
  }
  .popup-body {
    margin-bottom: 30rpx;
    .form-input {
      background: #f5f5f5;
      padding: 20rpx;
      border-radius: 12rpx;
      font-size: 28rpx;
      margin-bottom: 16rpx;
    }
    .form-textarea {
      background: #f5f5f5;
      padding: 20rpx;
      border-radius: 12rpx;
      font-size: 28rpx;
      width: 100%;
      min-height: 160rpx;
      box-sizing: border-box;
      margin-bottom: 16rpx;
    }
    .date-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20rpx 0;
      .date-label {
        font-size: 28rpx;
        color: #333;
      }
      .date-value {
        font-size: 28rpx;
        color: #007AFF;
      }
    }
  }
  .popup-footer {
    .submit-btn {
      width: 100%;
      border-radius: 12rpx;
    }
    .primary {
      background-color: #00BCD4;
      color: #fff;
    }
  }
}
</style>
