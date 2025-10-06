<script>
import { PlusOutlined } from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Tag,
  Progress,
  message,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  deleteBilibiliVideo,
  insertOrUpdateBilibiliVideo,
  parseBilibiliUrl,
  queryBilibiliVideos,
} from '#/api/core/bilibili-video';

export default {
  components: {
    AButton: Button,
    AModal: Modal,
    AForm: Form,
    AFormItem: Form.Item,
    AInput: Input,
    AInputNumber: InputNumber,
    ASelect: Select,
    ASelectOption: Select.Option,
    ACard: Card,
    ATag: Tag,
    AProgress: Progress,
    PlusOutlined,
  },
  data() {
    return {
      videos: [],
      visible: false,
      isParsing: false,
      newVideo: {
        title: '',
        url: '',
        cover: '',
        duration: '',
        episodes: 1,
        currentEpisode: 1,
        progress: 0,
        status: 'in-progress',
        notes: '',
        ownerName: '',
      },
      tabList: [
        { key: 0, tab: '全部' },
        { key: 1, tab: '待学习' },
        { key: 2, tab: '进行中' },
        { key: 3, tab: '已完成' },
      ],
      tabKey: '',
    };
  },
  async mounted() {
    await this.query();
  },
  methods: {
    async query() {
      const res = await queryBilibiliVideos({
        page: 1,
        pageSize: 50,
        condition: {
          status: this.tabKey,
        },
      });
      this.videos = res.items || [];
    },

    /**
     * 处理图片URL，添加Referer头绕过防盗链
     */
    getImageUrl(coverUrl) {
      if (!coverUrl) return '';
      
      // 如果是B站图片，使用图片代理服务绕过防盗链
      if (coverUrl.includes('bilibili.com') || coverUrl.includes('hdslb.com')) {
        // 方案1: 使用images.weserv.nl图片代理服务（推荐）
        return `https://images.weserv.nl/?url=${encodeURIComponent(coverUrl)}&w=300&h=200&fit=cover`;
      }
      
      return coverUrl;
    },

    /**
     * 图片加载失败处理
     */
    handleImageError(event) {
      console.warn('图片加载失败:', event.target.src);
      
      // 隐藏失败的图片
      event.target.style.display = 'none';
      
      // 显示默认图标
      const defaultIcon = event.target.parentElement.querySelector('.default-icon');
      if (defaultIcon) {
        defaultIcon.style.display = 'flex';
      }
      
      // 尝试使用备用方案重新加载
      this.retryWithAlternativeProxy(event.target, event.target.src);
    },

    /**
     * 图片加载成功处理
     */
    handleImageLoad(event) {
      console.log('图片加载成功:', event.target.src);
      event.target.style.display = 'block';
      
      // 隐藏默认图标
      const defaultIcon = event.target.parentElement.querySelector('.default-icon');
      if (defaultIcon) {
        defaultIcon.style.display = 'none';
      }
    },

    /**
     * 使用备用代理方案重试加载图片
     */
    retryWithAlternativeProxy(imgElement, originalUrl) {
      // 如果当前使用的是weserv代理，尝试其他代理方案
      if (originalUrl.includes('images.weserv.nl')) {
        // 方案2: 使用cors.sh代理
        const corsProxyUrl = `https://cors.sh/${originalUrl.replace('https://images.weserv.nl/?url=', '')}`;
        
        // 延迟重试，避免频繁请求
        setTimeout(() => {
          imgElement.src = corsProxyUrl;
          console.log('尝试使用cors.sh代理重试:', corsProxyUrl);
        }, 1000);
      }
    },

    showModal() {
      this.newVideo = {
        title: '',
        url: '',
        cover: '',
        duration: '',
        episodes: 1,
        currentEpisode: 1,
        progress: 0,
        status: 2,
        notes: '',
      };
      this.visible = true;
    },

    showEditModal(video) {
      this.newVideo = { 
        ...video,
        ownerName: video.owner?.name || video.ownerName || ''
      };
      this.visible = true;
    },

    async handleOk() {
      if (!this.newVideo.url) {
        message.error('请输入B站视频URL');
        return;
      }

      // 调用API保存视频
      await insertOrUpdateBilibiliVideo(this.newVideo);

      message.success('保存成功');
      this.query();
      this.visible = false;
      this.resetForm();
    },

    handleCancel() {
      this.visible = false;
      this.resetForm();
    },

    resetForm() {
      this.newVideo = {
        title: '',
        url: '',
        cover: '',
        duration: '',
        episodes: 1,
        currentEpisode: 1,
        progress: 0,
        status: 'in-progress',
        notes: '',
        ownerName: '',
      };
    },

    async parseBilibiliUrl() {
      if (!this.newVideo.url) {
        message.error('请输入B站视频URL');
        return;
      }

      this.isParsing = true;
      try {
        const res = await parseBilibiliUrl(this.newVideo.url);
        if (res.success) {
          this.newVideo = {
            ...this.newVideo,
            url: res.data.url || this.newVideo.url, // 用清理后的URL覆盖原始URL
            title: res.data.title || '',
            cover: res.data.cover || '',
            duration: res.data.duration || '',
            episodes: res.data.episodes || 1,
            currentEpisode: res.data.currentEpisode || 1,
            progress: res.data.progress || 0,
            ownerName: res.data.owner?.name || '',
          };
          message.success('解析成功');
        } else {
          message.error('解析失败：' + res.message);
        }
      } catch (error) {
        message.error('解析失败，请检查URL格式');
      } finally {
        this.isParsing = false;
      }
    },

    async handleDelete(video, index) {
      await deleteBilibiliVideo({ id: video.id });
      message.success('删除成功');
      this.query();
    },

    getStatusColor(status) {
      return {
        'completed': 'green',
        'in-progress': 'blue',
        'watched': 'orange',
      }[status] || 'default';
    },

    getStatusText(status) {
      return {
        'completed': '已学完',
        'in-progress': '进行中',
        'watched': '已学过',
      }[status] || '未知';
    },

    onTabChange(key) {
      this.tabKey = key;
      this.query();
    },

    updateProgress(video, progress) {
      video.progress = progress;
      if (progress >= 100) {
        video.status = 'completed';
      } else if (progress > 0) {
        video.status = 'in-progress';
      }
      insertOrUpdateBilibiliVideo(video);
    },

    updateProgressFromEpisode() {
      // 根据当前集数和总集数自动计算学习进度
      if (this.newVideo.currentEpisode && this.newVideo.episodes) {
        const progress = Math.max(0, Math.min(100,
          ((this.newVideo.currentEpisode - 1) / this.newVideo.episodes) * 100
        ));
        this.newVideo.progress = Math.round(progress);

        // 根据进度更新状态
        if (this.newVideo.progress >= 100) {
          this.newVideo.status = 'completed';
        } else if (this.newVideo.progress > 0) {
          this.newVideo.status = 'in-progress';
        }
      }
    },

    formatNumber(num) {
      if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
      } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + '千';
      }
      return num.toString();
    },

    /**
     * 格式化发布时间
     */
    formatPublishTime(pubdate) {
      if (!pubdate) return '';
      
      try {
        // 如果pubdate是时间戳格式
        if (/^\d+$/.test(pubdate)) {
          return dayjs.unix(parseInt(pubdate)).format('YYYY-MM-DD HH:mm');
        }
        
        // 如果是日期字符串格式
        return dayjs(pubdate).format('YYYY-MM-DD HH:mm');
      } catch (error) {
        console.warn('格式化发布时间失败:', error);
        return pubdate;
      }
    },
  },
};
</script>

<template>
  <ACard
    style="width: 100%"
    :tab-list="tabList"
    :active-tab-key="tabKey"
    @tab-change="onTabChange"
  >
    <div class="video-container">
      <!-- 统计信息 -->
      <div class="total-static">
        <ACard>
          <span>学习视频总数：{{ videos.length }} 个</span>
          <br />
          <span>已学完：{{ videos.filter(v => v.status === 'completed').length }} 个</span>
          <br />
          <span>进行中：{{ videos.filter(v => v.status === 'in-progress').length }} 个</span>
          <br />
          <span>已学过：{{ videos.filter(v => v.status === 'watched').length }} 个</span>
        </ACard>
      </div>

      <!-- 视频列表 -->
      <div class="video-grid">
        <div
          v-for="(video, index) in videos"
          :key="index"
          class="video-card"
          @click="showEditModal(video)"
        >
          <div class="card-image">
            <img 
              v-if="video.cover" 
              :src="getImageUrl(video.cover)" 
              :alt="video.title" 
              @error="handleImageError"
              @load="handleImageLoad"
            />
            <div v-else class="default-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 5v14l11-7z"
                  stroke="#888"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M3 3h18v18H3z"
                  stroke="#888"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <div class="duration-tag">{{ video.duration || '未知' }}</div>
          </div>
          <div class="card-content">
            <AButton
              class="delete-btn"
              type="text"
              danger
              @click.stop="handleDelete(video, index)"
            >
              删除
            </AButton>
            <h3>{{ video.title || '未命名视频' }}</h3>

            <!-- 显示UP主信息 -->
            <div v-if="video.owner || video.ownerName" class="owner-info">
              <span class="owner-name">{{ video.owner?.name || video.ownerName }}</span>
            </div>

            <!-- 显示发布时间 -->
            <div v-if="video.pubdate" class="publish-time">
              <span class="publish-label">投稿时间:</span>
              <span class="publish-value">{{ formatPublishTime(video.pubdate) }}</span>
            </div>

            <!-- 显示最后更新时间 -->
            <div v-if="video.updatedAt" class="update-time">
              <span class="update-label">最后更新:</span>
              <span class="update-value">{{ formatPublishTime(video.updatedAt) }}</span>
            </div>

            <!-- 显示创建时间 -->
            <div v-if="video.createdAt" class="create-time">
              <span class="create-label">添加时间:</span>
              <span class="create-value">{{ formatPublishTime(video.createdAt) }}</span>
            </div>

            <!-- 显示分区信息 -->
            <div v-if="video.tname_v2" class="category-info">
              <ATag color="blue" size="small">{{ video.tname_v2 }}</ATag>
            </div>

            <p class="episodes">集数：{{ video.currentEpisode }}/{{ video.episodes }}</p>

            <!-- 显示视频时长 -->
            <div v-if="video.duration" class="duration-info">
              <span class="duration-label">时长:</span>
              <span class="duration-value">{{ video.duration }}</span>
            </div>

            <!-- 显示统计数据 -->
            <div v-if="video.stat" class="stat-info">
              <div class="stat-item">
                <span class="stat-label">播放:</span>
                <span class="stat-value">{{ formatNumber(video.stat.view) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">点赞:</span>
                <span class="stat-value">{{ formatNumber(video.stat.like) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">收藏:</span>
                <span class="stat-value">{{ formatNumber(video.stat.favorite) }}</span>
              </div>
              <div v-if="video.stat.danmaku" class="stat-item">
                <span class="stat-label">弹幕:</span>
                <span class="stat-value">{{ formatNumber(video.stat.danmaku) }}</span>
              </div>
              <div v-if="video.stat.reply" class="stat-item">
                <span class="stat-label">评论:</span>
                <span class="stat-value">{{ formatNumber(video.stat.reply) }}</span>
              </div>
              <div v-if="video.stat.share" class="stat-item">
                <span class="stat-label">分享:</span>
                <span class="stat-value">{{ formatNumber(video.stat.share) }}</span>
              </div>
            </div>

            <!-- 显示学习笔记 -->
            <div v-if="video.notes" class="notes-info">
              <span class="notes-label">笔记:</span>
              <span class="notes-value">{{ video.notes }}</span>
            </div>

            <div class="progress-section">
              <AProgress
                :percent="video.progress"
                size="small"
                :stroke-color="{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }"
                :format="percent => `${percent}%`"
              />
            </div>
            <div class="status-badge" :class="`status-${video.status}`">
              {{ getStatusText(video.status) }}
            </div>
          </div>
        </div>
      </div>

      <!-- 新增视频弹窗 -->
      <AModal
        v-model:visible="visible"
        :title="newVideo.id ? '编辑视频' : '新增视频'"
        width="600px"
        @ok="handleOk"
        @cancel="handleCancel"
      >
        <AForm :model="newVideo" layout="vertical">
          <AFormItem label="B站视频URL" required>
            <div style="display: flex; gap: 8px">
              <AInput
                v-model:value="newVideo.url"
                placeholder="请输入B站视频链接，如：https://www.bilibili.com/video/BV1xxx"
                style="flex: 1"
              />
              <AButton
                :loading="isParsing"
                @click="parseBilibiliUrl"
              >
                解析
              </AButton>
            </div>
          </AFormItem>

          <AFormItem label="视频标题">
            <AInput v-model:value="newVideo.title" placeholder="视频标题" />
          </AFormItem>

          <AFormItem label="UP主名称">
            <AInput v-model:value="newVideo.ownerName" placeholder="UP主名称" />
          </AFormItem>

          <AFormItem label="封面链接">
            <AInput v-model:value="newVideo.cover" placeholder="封面图片链接" />
          </AFormItem>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px">
            <AFormItem label="视频时长">
              <AInput v-model:value="newVideo.duration" placeholder="如：30:15" />
            </AFormItem>

            <AFormItem label="总集数">
              <AInputNumber
                v-model:value="newVideo.episodes"
                :min="1"
                style="width: 100%"
              />
            </AFormItem>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px">
            <AFormItem label="当前集数">
              <AInputNumber
                v-model:value="newVideo.currentEpisode"
                :min="1"
                :max="newVideo.episodes"
                @change="updateProgressFromEpisode"
                style="width: 100%"
              />
            </AFormItem>

            <AFormItem label="学习进度">
              <AInput
                v-model:value="newVideo.progress"
                readonly
                :formatter="value => `${value}%`"
                style="width: 100%"
                placeholder="自动计算"
              />
            </AFormItem>
          </div>

          <AFormItem label="学习状态">
            <ASelect v-model:value="newVideo.status">
              <ASelectOption value="in-progress">进行中</ASelectOption>
              <ASelectOption value="completed">已学完</ASelectOption>
              <ASelectOption value="watched">已学过</ASelectOption>
            </ASelect>
          </AFormItem>

          <AFormItem label="学习笔记">
            <AInput
              v-model:value="newVideo.notes"
              type="textarea"
              :rows="3"
              placeholder="记录学习心得或笔记"
            />
          </AFormItem>
        </AForm>
      </AModal>

      <!-- 新增悬浮按钮 -->
      <div class="floating-btn" @click="showModal">
        <PlusOutlined style="font-size: 24px; color: white" />
      </div>
    </div>
  </ACard>
</template>

<style scoped>
.video-container {
  padding: 10px;
  margin: 0 auto;
}

.total-static {
  margin-bottom: 20px;
}

.total-static .ant-card span {
  display: block;
  font-size: 16px;
  line-height: 2;
}

.total-static .ant-card span:first-child {
  font-weight: bold;
  font-size: 18px;
}

.video-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.video-card {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  min-width: 0;
  background: white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.video-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: #d9d9d9;
}

.card-image {
  position: relative;
  width: 100%;
  padding-top: 55%; /* 进一步减小图片高度 */
  overflow: hidden;
}

.card-image img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.duration-tag {
  position: absolute;
  bottom: 6px;
  right: 6px;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
  backdrop-filter: blur(4px);
}

.card-content {
  position: relative;
  padding: 10px;
}

.delete-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 1;
  opacity: 0;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 3px;
  padding: 1px 4px;
  font-size: 10px;
  height: 20px;
  line-height: 18px;
}

.video-card:hover .delete-btn {
  opacity: 1;
}

.card-content h3 {
  margin: 0 0 6px 0;
  font-size: 13px;
  line-height: 1.3;
  height: 34px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-weight: 600;
  color: #262626;
}

.episodes {
  color: #595959;
  font-size: 12px;
  margin: 4px 0;
  font-weight: 500;
}

.owner-info {
  margin: 3px 0;
}

.owner-name {
  color: #8c8c8c;
  font-size: 11px;
  font-weight: 500;
}

.publish-time {
  margin: 1px 0;
  display: flex;
  align-items: center;
  gap: 3px;
}

.publish-label {
  color: #bfbfbf;
  font-size: 9px;
}

.publish-value {
  color: #8c8c8c;
  font-size: 9px;
  font-weight: 500;
}

.update-time {
  margin: 1px 0;
  display: flex;
  align-items: center;
  gap: 3px;
}

.update-label {
  color: #bfbfbf;
  font-size: 9px;
}

.update-value {
  color: #8c8c8c;
  font-size: 9px;
  font-weight: 500;
}

.create-time {
  margin: 1px 0;
  display: flex;
  align-items: center;
  gap: 3px;
}

.create-label {
  color: #bfbfbf;
  font-size: 9px;
}

.create-value {
  color: #8c8c8c;
  font-size: 9px;
  font-weight: 500;
}

.category-info {
  margin: 3px 0;
}

.duration-info {
  margin: 1px 0;
  display: flex;
  align-items: center;
  gap: 3px;
}

.duration-label {
  color: #bfbfbf;
  font-size: 9px;
}

.duration-value {
  color: #8c8c8c;
  font-size: 9px;
  font-weight: 500;
}

.stat-info {
  display: flex;
  gap: 4px;
  margin: 4px 0;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 1px;
}

.stat-label {
  color: #bfbfbf;
  font-size: 8px;
}

.stat-value {
  color: #8c8c8c;
  font-size: 8px;
  font-weight: 500;
}

.notes-info {
  margin: 4px 0;
  padding: 4px;
  background-color: #fafafa;
  border-radius: 3px;
  border-left: 2px solid #1890ff;
  max-height: 40px;
  overflow: hidden;
}

.notes-label {
  color: #8c8c8c;
  font-size: 9px;
  font-weight: bold;
  margin-right: 3px;
}

.notes-value {
  color: #595959;
  font-size: 9px;
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.progress-section {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 6px 0;
}

.progress-text {
  font-size: 10px;
  color: #8c8c8c;
  min-width: 30px;
}

.default-icon {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.default-icon svg {
  width: 30%;
  height: 30%;
  opacity: 0.4;
}

.status-badge {
  position: absolute;
  bottom: 6px;
  right: 6px;
  padding: 2px 5px;
  border-radius: 8px;
  font-size: 10px;
  color: white;
  z-index: 1;
  font-weight: 500;
}

.status-completed {
  background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
}

.status-in-progress {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
}

.status-watched {
  background: linear-gradient(135deg, #fa8c16 0%, #ffa940 100%);
}

.floating-btn {
  position: fixed;
  right: 30px;
  bottom: 30px;
  width: 56px;
  height: 56px;
  background-color: #1890ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  transition: all 0.3s;
  z-index: 1000;
}

.floating-btn:hover {
  background-color: #40a9ff;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
</style>
