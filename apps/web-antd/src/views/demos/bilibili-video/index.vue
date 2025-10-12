<script>
import { PlusOutlined } from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Progress,
  Select,
  Tag,
  Tabs,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  deleteBilibiliVideo,
  insertOrUpdateBilibiliVideo,
  parseBilibiliUrl,
  queryBilibiliVideos,
  getStatusCount,
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
    ATabs: Tabs,
    ATabPane: Tabs.TabPane,
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
        status: 2,
        notes: '',
        ownerName: '',
      },
      tabList: [
        { key: 0, tab: '全部' },
        { key: 1, tab: '未开始' },
        { key: 2, tab: '进行中' },
        { key: 3, tab: '已暂停' },
        { key: 4, tab: '部分完成' },
        { key: 5, tab: '已完成' },
      ],
      tabKey: 0,
      // 视频数量统计
      videoCounts: {
        0: 0, // 全部
        1: 0, // 未开始
        2: 0, // 进行中
        3: 0, // 已暂停
        4: 0, // 部分完成
        5: 0, // 已完成
      },
      // 学习状态选项
      statusOptions: [
        { value: 1, label: '未开始' },
        { value: 2, label: '进行中' },
        { value: 3, label: '已暂停' },
        { value: 4, label: '部分完成' },
        { value: 5, label: '已完成' },
      ],
    };
  },
  async mounted() {
    await this.query();
  },
  methods: {
    /**
     * 生成带数量的标签标题
     */
    getTabTitle(tab) {
      const count = this.videoCounts[tab.key] || 0;
      return `${tab.tab} <span class="count-number">${count}</span>`;
    },

    async query() {
      const res = await queryBilibiliVideos({
        page: 1,
        pageSize: 50,
        condition: {
          status: this.tabKey === 0 ? undefined : this.tabKey,
        },
      });
      this.videos = res.items || [];

      // 更新视频数量统计
      await this.updateVideoCounts();
    },

    /**
     * 更新视频数量统计
     */
    async updateVideoCounts() {
      const res = await getStatusCount({});
        if (res) {
          let sum = 0;
          // 将接口返回的数据合并到videoCounts对象中
          Object.keys(this.videoCounts).forEach(key => {
            if (this.resetForm) {
              this.videoCounts[key] = res[key];
              if (key !== 0 && res[key] !== undefined) {
                sum += res[key];
                console.log('sum:', sum);
              }
            }
          });
          this.videoCounts[0] = sum;
        }
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
      const defaultIcon =
        event.target.parentElement.querySelector('.default-icon');
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
      const defaultIcon =
        event.target.parentElement.querySelector('.default-icon');
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
        ownerName: video.owner?.name || video.ownerName || '',
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
        status: 2,
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
          message.error(`解析失败：${res.message}`);
        }
      } catch {
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

    getStatusText(status) {
      // 处理数字状态值
      const statusMap = {
        1: '未开始',
        2: '进行中',
        3: '已暂停',
        4: '部分完成',
        5: '已完成',
      };
      return statusMap[status] || '未知';
    },

    getStatusClass(status) {
      // 将数字状态映射到对应的CSS类名
      const classMap = {
        1: 'not-started',
        2: 'in-progress',
        3: 'paused',
        4: 'partial-completed',
        5: 'completed',
      };
      return classMap[status] || 'unknown';
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
        const progress = Math.max(
          0,
          Math.min(
            100,
            ((this.newVideo.currentEpisode - 1) / this.newVideo.episodes) * 100,
          ),
        );
        this.newVideo.progress = Math.round(progress);

        // 根据进度更新状态
        if (this.newVideo.progress >= 100) {
          this.newVideo.status = 5; // 已完成
        } else if (this.newVideo.progress > 0) {
          this.newVideo.status = 2; // 进行中
        }
      }
    },

    /**
     * 监听状态变化，当状态变为"已完成"时自动将当前集数设置为总集数
     */
    handleStatusChange(newStatus) {
      // 如果状态变为"已完成"（状态值5），自动将当前集数设置为总集数
      if (newStatus === 5 && this.newVideo.episodes) {
        this.newVideo.currentEpisode = this.newVideo.episodes;
        this.newVideo.progress = 100;
      }
    },

    formatNumber(num) {
      if (num >= 10_000) {
        return `${(num / 10_000).toFixed(1)}万`;
      } else if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}千`;
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
          return dayjs
            .unix(Number.parseInt(pubdate))
            .format('YYYY-MM-DD HH:mm');
        }

        // 如果是日期字符串格式
        return dayjs(pubdate).format('YYYY-MM-DD HH:mm');
      } catch (error) {
        console.warn('格式化发布时间失败:', error);
        return pubdate;
      }
    },

    /**
     * 获取实际显示的进度值
     * 对于已完成状态的视频，进度条始终显示100%
     */
    getActualProgress(video) {
      // 如果视频状态是已完成（状态值5或'completed'），则强制显示100%
      if (video.status === 5 || video.status === 'completed') {
        return 100;
      }
      // 其他状态返回实际进度值
      return video.progress;
    },

    /**
     * 跳转到B站视频页面
     * 拼接对应的集数参数
     */
    goToBilibiliVideo(video) {
      if (!video.url) {
        message.error('视频链接不存在');
        return;
      }

      try {
        // 解析原始URL
        const urlObj = new URL(video.url);
        const params = new URLSearchParams(urlObj.search);
        
        // 获取当前集数（如果没有当前集数，默认为1）
        const currentEpisode = video.currentEpisode || 1;
        
        // 设置p参数为当前集数（B站的集数参数是p）
        params.set('p', currentEpisode.toString());
        
        // 构建新的URL
        urlObj.search = params.toString();
        const finalUrl = urlObj.toString();
        
        // 在新标签页打开B站视频
        window.open(finalUrl, '_blank');
        
        console.log('跳转到B站视频:', finalUrl);
      } catch (error) {
        console.error('跳转失败:', error);
        message.error('跳转失败，请检查视频链接格式');
      }
    },
  },
};
</script>

<template>
  <ACard style="width: 100%">
    <ATabs
      v-model:activeKey="tabKey"
      @change="onTabChange"
      type="card"
    >
      <ATabPane
        v-for="tab in tabList"
        :key="tab.key"
      >
        <template #tab>
          <span v-html="getTabTitle(tab)"></span>
        </template>
        <div class="video-container">
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
              @click.stop="goToBilibiliVideo(video)"
              style="cursor: pointer;"
            />
            <div v-else class="default-icon" @click.stop="goToBilibiliVideo(video)" style="cursor: pointer;">
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
            <div class="status-badge" :class="`status-${getStatusClass(video.status)}`">
              {{ getStatusText(video.status) }}
            </div>
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
              <span class="owner-name">{{
                video.owner?.name || video.ownerName
              }}</span>
            </div>

            <!-- 显示发布时间 -->
            <div v-if="video.pubdate" class="publish-time">
              <span class="publish-label">投稿时间:</span>
              <span class="publish-value">{{
                formatPublishTime(video.pubdate)
              }}</span>
            </div>

            <!-- 显示最后更新时间 -->
            <div v-if="video.updatedAt" class="update-time">
              <span class="update-label">最后更新:</span>
              <span class="update-value">{{
                formatPublishTime(video.updatedAt)
              }}</span>
            </div>

            <!-- 显示创建时间 -->
            <div v-if="video.createdAt" class="create-time">
              <span class="create-label">添加时间:</span>
              <span class="create-value">{{
                formatPublishTime(video.createdAt)
              }}</span>
            </div>

            <!-- 显示分区信息 -->
            <div v-if="video.tname_v2" class="category-info">
              <ATag color="blue" size="small">{{ video.tname_v2 }}</ATag>
            </div>

            <p class="episodes">
              集数：{{ video.currentEpisode }}/{{ video.episodes }}
            </p>

            <!-- 显示视频时长 -->
            <div v-if="video.duration" class="duration-info">
              <span class="duration-label">时长:</span>
              <span class="duration-value">{{ video.duration }}</span>
            </div>

            <!-- 显示统计数据 -->
            <div v-if="video.stat" class="stat-info">
              <div class="stat-item">
                <span class="stat-label">播放:</span>
                <span class="stat-value">{{
                  formatNumber(video.stat.view)
                }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">点赞:</span>
                <span class="stat-value">{{
                  formatNumber(video.stat.like)
                }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">收藏:</span>
                <span class="stat-value">{{
                  formatNumber(video.stat.favorite)
                }}</span>
              </div>
              <div v-if="video.stat.danmaku" class="stat-item">
                <span class="stat-label">弹幕:</span>
                <span class="stat-value">{{
                  formatNumber(video.stat.danmaku)
                }}</span>
              </div>
              <div v-if="video.stat.reply" class="stat-item">
                <span class="stat-label">评论:</span>
                <span class="stat-value">{{
                  formatNumber(video.stat.reply)
                }}</span>
              </div>
              <div v-if="video.stat.share" class="stat-item">
                <span class="stat-label">分享:</span>
                <span class="stat-value">{{
                  formatNumber(video.stat.share)
                }}</span>
              </div>
            </div>

            <!-- 显示学习笔记 -->
            <div v-if="video.notes" class="notes-info">
              <span class="notes-label">笔记:</span>
              <span class="notes-value">{{ video.notes }}</span>
            </div>

            <div class="progress-section">
              <AProgress
                :percent="getActualProgress(video)"
                size="small"
                :stroke-color="{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }"
                :format="(percent) => `${percent}%`"
              />
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
              <AButton :loading="isParsing" @click="parseBilibiliUrl">
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
              <AInput
                v-model:value="newVideo.duration"
                placeholder="如：30:15"
              />
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
                :formatter="(value) => `${value}%`"
                style="width: 100%"
                placeholder="自动计算"
              />
            </AFormItem>
          </div>

          <AFormItem label="学习状态">
            <ASelect v-model:value="newVideo.status" @change="handleStatusChange">
              <ASelectOption
                v-for="option in statusOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </ASelectOption>
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
      </ATabPane>
    </ATabs>
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
  top: 6px;
  right: 6px;
  padding: 2px 5px;
  border-radius: 8px;
  font-size: 10px;
  color: white;
  z-index: 2;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
  transition: all 0.3s ease;
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

.status-not-started {
  background: linear-gradient(135deg, #8c8c8c 0%, #bfbfbf 100%);
}

.status-paused {
  background: linear-gradient(135deg, #fa541c 0%, #ff7a45 100%);
}

.status-partial-completed {
  background: linear-gradient(135deg, #722ed1 0%, #9254de 100%);
}

.status-unknown {
  background: linear-gradient(135deg, #d9d9d9 0%, #f0f0f0 100%);
}

.video-card:hover .status-badge {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
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

/* 标签页数字样式 */
:deep(.ant-tabs-tab) {
  position: relative;
}

:deep(.ant-tabs-tab)::after {
  content: attr(data-count);
  color: #1890ff;
  font-weight: bold;
  margin-left: 4px;
  font-size: 12px;
}

:deep(.ant-tabs-tab-active)::after {
  color: #1890ff;
  font-weight: bold;
}
</style>
