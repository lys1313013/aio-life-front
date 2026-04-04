<script setup lang="ts">
import type { MbtiResult } from '#/api/core/mbti';

import { onMounted, onUnmounted, ref } from 'vue';

import { ExperimentOutlined, LinkOutlined } from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Divider,
  message,
  Modal,
  Spin,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  checkMbtiResult,
  createMbtiTest,
  getMbtiById,
  getMbtiHistory,
  saveMbtiResult,
} from '#/api/core/mbti';

const loading = ref(false);
const testStarted = ref(false);
const testCompleted = ref(false);
const isFromHistory = ref(false);
const currentTestId = ref('');
const mbtiResult = ref<Partial<MbtiResult>>({});
const checkData = ref<any>(null);
const historyVisible = ref(false);
const historyList = ref<MbtiResult[]>([]);
const iframeLoadError = ref(false);

let pollTimer: null | number = null;

const testUrl = ref('');

const handleStartTest = async () => {
  loading.value = true;
  isFromHistory.value = false;
  try {
    const res = await createMbtiTest();
    if (res.success && res.testId) {
      currentTestId.value = res.testId;
      testUrl.value =
        res.testUrl || `https://devil.ai/api-personality-test/${res.testId}`;
      testStarted.value = true;
      startPolling();
    } else {
      message.error(res.message || '创建测试失败');
    }
  } catch {
    message.error('创建测试失败');
  } finally {
    loading.value = false;
  }
};

const historyColumns = [
  {
    title: '类型',
    dataIndex: 'mbtiType',
    key: 'mbtiType',
  },
  {
    title: '测试时间',
    dataIndex: 'createTime',
    key: 'createTime',
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
  },
];

const startPolling = () => {
  pollTimer = window.setInterval(async () => {
    try {
      const res = await checkMbtiResult(currentTestId.value);
      if (res.success && res.mbtiType) {
        mbtiResult.value = {
          testId: currentTestId.value,
          mbtiType: res.mbtiType,
        };
        checkData.value = res;
        testCompleted.value = true;
        stopPolling();
        message.success('测试完成！');
      }
    } catch (error) {
      console.error('查询结果失败', error);
    }
  }, 5000);
};

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
};

const handleSaveResult = async () => {
  try {
    await saveMbtiResult({
      testId: currentTestId.value,
      mbtiType: mbtiResult.value.mbtiType,
      predictions: checkData.value?.predictions,
      traitOrderConscious: checkData.value?.traitOrderConscious,
      traitOrderShadow: checkData.value?.traitOrderShadow,
      matches: checkData.value?.matches,
      resultsPage: checkData.value?.resultsPage,
    });
    message.success('保存成功');
    historyList.value = await getMbtiHistory();
  } catch {
    message.error('保存失败');
  }
};

const handleViewHistory = async () => {
  loading.value = true;
  try {
    historyList.value = await getMbtiHistory();
    historyVisible.value = true;
  } catch {
    message.error('获取历史记录失败');
  } finally {
    loading.value = false;
  }
};

const handleViewDetail = async (record: MbtiResult) => {
  try {
    if (record.id) {
      const detail = await getMbtiById(record.id);
      mbtiResult.value = detail;
      checkData.value = {
        predictions: detail.predictions,
        traitOrderConscious: detail.traitOrderConscious,
        traitOrderShadow: detail.traitOrderShadow,
        matches: detail.matches,
        resultsPage: detail.resultsPage,
      };
      isFromHistory.value = true;
      testCompleted.value = true;
      historyVisible.value = false;
    }
  } catch {
    message.error('获取详情失败');
  }
};

const handleReset = () => {
  testStarted.value = false;
  testCompleted.value = false;
  isFromHistory.value = false;
  currentTestId.value = '';
  testUrl.value = '';
  iframeLoadError.value = false;
  mbtiResult.value = {};
  checkData.value = null;
};

const handleCloseHistory = () => {
  historyVisible.value = false;
};

const openResultsPage = () => {
  if (checkData.value?.resultsPage) {
    window.open(checkData.value.resultsPage, '_blank');
  }
};

const getTraitDescription = (trait: string) => {
  const descriptions: Record<string, string> = {
    hero: '英雄 - 你最突出的特质',
    parent: '父母 - 你善于照顾他人的特质',
    child: '孩子 - 你纯真/依赖的一面',
    inferior: '劣势 - 你需要发展的特质',
    nemesis: '对手 - 你潜意识中的恐惧',
    critic: '批评家 - 你容易批评的方面',
    trickster: '骗徒 - 你容易欺骗自己的一面',
    demon: '恶魔 - 你需要警惕的阴影面',
  };
  return descriptions[trait] || trait;
};

const getTraitChinese = (trait: string) => {
  const names: Record<string, string> = {
    hero: '英雄',
    parent: '父母',
    child: '孩子',
    inferior: '劣势',
    nemesis: '对手',
    critic: '批评家',
    trickster: '骗徒',
    demon: '恶魔',
  };
  return names[trait] || trait;
};

const getMatchesArray = (matches: any): string[] => {
  if (!matches) return [];
  if (Array.isArray(matches)) return matches;
  if (typeof matches === 'string') {
    try {
      const parsed = JSON.parse(matches);
      if (Array.isArray(parsed)) return parsed;
      return Object.values(parsed);
    } catch {
      return [];
    }
  }
  if (typeof matches === 'object') {
    return Object.values(matches);
  }
  return [];
};

onMounted(async () => {
  try {
    historyList.value = await getMbtiHistory();
  } catch (error) {
    console.error('获取历史记录失败', error);
  }
});

onUnmounted(() => {
  stopPolling();
});
</script>

<template>
  <div class="mbti-setting">
    <Spin :spinning="loading">
      <div v-if="!testStarted && !testCompleted" class="start-section">
        <Card>
          <div class="text-center">
            <ExperimentOutlined class="mb-4 text-4xl text-blue-500" />
            <h2 class="mb-2 text-2xl font-bold">MBTI人格测试</h2>
            <p class="mb-6 text-gray-500">了解你的性格类型，发现真实的自我</p>
            <Button
              type="primary"
              size="large"
              class="mb-4"
              @click="handleStartTest"
            >
              开始测试
            </Button>
            <div class="mt-4">
              <Button @click="handleViewHistory">查看历史记录</Button>
            </div>
          </div>
        </Card>

        <Card v-if="historyList.length > 0" class="mt-4">
          <template #title>最近测试结果</template>
          <div class="recent-results">
            <div
              v-for="item in historyList.slice(0, 3)"
              :key="item.id"
              class="recent-item"
            >
              <span class="mbti-type-small">{{ item.mbtiType }}</span>
              <span class="text-sm text-gray-400">{{ item.createTime }}</span>
            </div>
          </div>
        </Card>
      </div>

      <div v-else-if="testStarted && !testCompleted" class="test-section">
        <Card>
          <template #title>正在测试...</template>
          <div class="iframe-container">
            <iframe
              v-if="!iframeLoadError"
              :src="testUrl"
              class="test-iframe"
              sandbox="allow-scripts allow-same-origin"
              @error="iframeLoadError = true"
            ></iframe>
            <div v-else class="iframe-fallback">
              <p class="mb-4 text-orange-500">
                <ExperimentOutlined />
                如果测试页面无法在下方显示，请点击按钮在新窗口打开
              </p>
              <Button
                type="primary"
                size="large"
                @click="window.open(testUrl, '_blank')"
              >
                在新窗口打开测试
              </Button>
            </div>
          </div>
          <p class="mt-4 text-center text-gray-500">
            完成测试后，系统将自动获取结果
          </p>
          <div class="mt-4 text-center">
            <Button @click="handleReset">取消测试</Button>
          </div>
        </Card>
      </div>

      <div v-else-if="testCompleted" class="result-section">
        <Card class="mb-4">
          <template #title>测试结果</template>
          <div class="text-center">
            <div class="mbti-type-large">{{ mbtiResult.mbtiType }}</div>
            <Button
              type="primary"
              @click="openResultsPage"
              v-if="checkData?.resultsPage"
            >
              <template #icon><LinkOutlined /></template>
              查看完整分析报告
            </Button>
          </div>
        </Card>

        <Card class="mb-4" v-if="checkData?.predictions">
          <template #title>16种人格类型匹配度</template>
          <div class="predictions-grid">
            <div
              v-for="(score, type) in typeof checkData.predictions === 'string'
                ? JSON.parse(checkData.predictions)
                : checkData.predictions"
              :key="type"
              class="prediction-item"
            >
              <Tag :color="type === mbtiResult.mbtiType ? 'blue' : 'default'">
                {{ type }}
              </Tag>
              <span>+{{ score }}</span>
            </div>
          </div>
        </Card>

        <Card
          class="mb-4"
          v-if="checkData?.traitOrderConscious || checkData?.traitOrderShadow"
        >
          <template #title>功能栈分析</template>
          <div class="trait-section">
            <h4>显性功能（意识层面）</h4>
            <div class="trait-list">
              <div
                v-for="(trait, role) in typeof checkData.traitOrderConscious ===
                'string'
                  ? JSON.parse(checkData.traitOrderConscious)
                  : checkData.traitOrderConscious"
                :key="`c-${role}`"
                class="trait-item"
              >
                <Tag color="green">{{ getTraitChinese(role) }}</Tag>
                <span class="trait-name">{{ trait?.toUpperCase() }}</span>
                <span class="trait-desc">{{ getTraitDescription(role) }}</span>
              </div>
            </div>
          </div>
          <Divider />
          <div class="trait-section">
            <h4>隐性功能（阴影层面）</h4>
            <div class="trait-list">
              <div
                v-for="(trait, role) in typeof checkData.traitOrderShadow ===
                'string'
                  ? JSON.parse(checkData.traitOrderShadow)
                  : checkData.traitOrderShadow"
                :key="`s-${role}`"
                class="trait-item"
              >
                <Tag color="orange">{{ getTraitChinese(role) }}</Tag>
                <span class="trait-name">{{ trait?.toUpperCase() }}</span>
                <span class="trait-desc">{{ getTraitDescription(role) }}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card class="mb-4" v-if="checkData?.matches">
          <template #title>人格匹配分析</template>
          <ul class="matches-list">
            <li
              v-for="(match, index) in getMatchesArray(checkData.matches)"
              :key="index"
              v-html="match"
            ></li>
          </ul>
        </Card>

        <Card>
          <div class="result-actions">
            <Button
              v-if="!isFromHistory"
              type="primary"
              @click="handleSaveResult"
            >
              保存结果
            </Button>
            <Button @click="handleViewHistory">查看历史</Button>
            <Button @click="handleReset">重新测试</Button>
          </div>
        </Card>
      </div>
    </Spin>

    <Modal
      v-model:open="historyVisible"
      title="测试历史"
      :width="800"
      @cancel="handleCloseHistory"
      :footer="null"
    >
      <Table
        :data-source="historyList"
        :columns="historyColumns"
        :pagination="{ pageSize: 10 }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <Button type="link" size="small" @click="handleViewDetail(record)">
              查看详情
            </Button>
          </template>
        </template>
      </Table>
    </Modal>
  </div>
</template>

<style scoped>
.mbti-setting {
  padding: 24px;
}

.text-center {
  text-align: center;
}

.text-4xl {
  font-size: 3rem;
}

.text-2xl {
  font-size: 1.5rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.mb-6 {
  margin-bottom: 1.5rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mt-4 {
  margin-top: 1rem;
}

.mt-6 {
  margin-top: 1.5rem;
}

.text-gray-500 {
  color: #6b7280;
}

.text-gray-400 {
  color: #9ca3af;
}

.text-blue-500 {
  color: #3b82f6;
}

.text-orange-500 {
  color: #f97316;
}

.font-bold {
  font-weight: bold;
}

.iframe-container {
  position: relative;
  width: 100%;
  padding-top: 75%;
}

.test-iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.iframe-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  text-align: center;
}

.mbti-type-large {
  margin-bottom: 24px;
  font-size: 72px;
  font-weight: bold;
  color: #1890ff;
  text-align: center;
}

.result-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 24px;
}

.recent-results {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  background: #f9f9f9;
  border-radius: 4px;
}

.mbti-type-small {
  font-size: 18px;
  font-weight: bold;
  color: #1890ff;
}

.predictions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.prediction-item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
}

.trait-section h4 {
  margin-bottom: 12px;
  color: #333;
}

.trait-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trait-item {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px;
  background: #fafafa;
  border-radius: 4px;
}

.trait-name {
  font-size: 16px;
  font-weight: bold;
  color: #1890ff;
}

.trait-desc {
  font-size: 13px;
  color: #666;
}

.matches-list {
  padding: 0;
  margin: 0;
  list-style: none;
}

.matches-list li {
  padding: 8px 0;
  color: #555;
  border-bottom: 1px solid #f0f0f0;
}

.matches-list li:last-child {
  border-bottom: none;
}

.matches-list :deep(a) {
  font-weight: 500;
  color: #1890ff;
  text-decoration: none;
}

.matches-list :deep(a:hover) {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .mbti-setting {
    padding: 16px;
  }

  .iframe-container {
    padding-top: 100%;
  }

  .mbti-type-large {
    font-size: 48px;
  }
}

.dark .test-iframe {
  background: #1a1a1a;
  border-color: #303030;
}

.dark .recent-item {
  background: #262626;
}
</style>
