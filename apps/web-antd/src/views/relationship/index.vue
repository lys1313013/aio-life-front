<script setup lang="ts">
import type {
  PersonDetailVO,
  PersonReq,
  RelationshipReq,
} from '#/api/relationship';

import { computed, onMounted, ref } from 'vue';

import {
  DeleteOutlined,
  EditOutlined,
  FullscreenOutlined,
  PlusOutlined,
  TeamOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Drawer,
  Empty,
  Form,
  FormItem,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  SelectOption,
  Spin,
} from 'ant-design-vue';

import {
  createPerson,
  createRelationship,
  deletePerson,
  deleteRelationship,
  getGraphData,
  getPerson,
  updatePerson,
} from '#/api/relationship';

import ForceGraph2DWrapper from './components/ForceGraph2DWrapper.vue';
import { getRelationColor } from './constants';

// ==================== 状态 ====================
const loading = ref(false);
const graphData = ref<{ links: any[]; nodes: any[] }>({ nodes: [], links: [] });
const selectedPersonDetail = ref<null | PersonDetailVO>(null);
const drawerVisible = ref(false);
const personFormVisible = ref(false);
const relationshipFormVisible = ref(false);
const editingPersonId = ref<null | string>(null);
const graphRef = ref<InstanceType<typeof ForceGraph2DWrapper> | null>(null);
// 图例点选高亮的关系类型
const highlightRelationType = ref<null | string>(null);

// 图例：只展示当前图中实际出现的关系类型
const legendItems = computed(() => {
  const types = new Set<string>();
  for (const link of graphData.value.links) {
    if (link.relationType) types.add(link.relationType);
  }
  return [...types].map((type) => ({
    type,
    color: getRelationColor(type),
  }));
});

const toggleLegendHighlight = (type: string) => {
  highlightRelationType.value =
    highlightRelationType.value === type ? null : type;
};

// 关系类型选项
const relationTypes = [
  { label: '父母', value: '父母' },
  { label: '母亲', value: '母亲' },
  { label: '父亲', value: '父亲' },
  { label: '子女', value: '子女' },
  { label: '配偶', value: '配偶' },
  { label: '兄弟姐妹', value: '兄弟姐妹' },
  { label: '朋友', value: '朋友' },
  { label: '挚友', value: '挚友' },
  { label: '同学', value: '同学' },
  { label: '同事', value: '同事' },
  { label: '老师', value: '老师' },
  { label: '学生', value: '学生' },
  { label: 'mentor', value: 'mentor' },
  { label: '恋人', value: '恋人' },
  { label: '前任', value: '前任' },
  { label: '暗恋', value: '暗恋' },
  { label: '其他', value: '其他' },
];

const categoryOptions = [
  { label: '亲属', value: '亲属' },
  { label: '社会', value: '社会' },
  { label: '情感', value: '情感' },
  { label: '其他', value: '其他' },
];

// 关系表单
const relationshipForm = ref<RelationshipReq>({
  sourcePersonId: '',
  targetPersonId: '',
  relationType: '',
  direction: '双向',
  description: '',
  tags: '',
});

// ==================== 数据获取 ====================
const fetchGraphData = async () => {
  loading.value = true;
  try {
    const data = await getGraphData();
    const nodes = data.nodes || [];
    const edges = data.edges || [];

    // 计算每个节点的关系数量（对边去重，避免双向关系算两次）
    const relCountMap = new Map<string, number>();
    for (const node of nodes) {
      relCountMap.set(node.id, 0);
    }
    const seenEdges = new Set<string>();
    for (const edge of edges) {
      const key = [edge.source, edge.target].sort().join('|');
      if (seenEdges.has(key)) continue;
      seenEdges.add(key);
      relCountMap.set(edge.source, (relCountMap.get(edge.source) || 0) + 1);
      relCountMap.set(edge.target, (relCountMap.get(edge.target) || 0) + 1);
    }

    // 按关系数量排序，关系最多的排第一
    const sortedNodes = [...nodes].sort(
      (a, b) => (relCountMap.get(b.id) || 0) - (relCountMap.get(a.id) || 0),
    );
    // 计算最大连接数（用于大小映射）
    const maxRelCount = Math.max(relCountMap.get(sortedNodes[0]?.id || '') || 0, 1);

    // 径向布局：关系最多的在中心 (0,0)，其他按同心圆分布
    const layoutNodes = sortedNodes.map((n, i) => {
      const count = relCountMap.get(n.id) || 0;
      // 节点大小按关系数映射到 8~24
      const val = 8 + (count / maxRelCount) * 16;
      let x = 0;
      let y = 0;

      if (i === 0) {
        // 关系最多的节点放中心
        x = 0;
        y = 0;
      } else {
        // 其余节点按同心圆分布
        // 第1层最多6个，第2层最多12个，第3层最多18个...
        let layer = 1;
        let cumulativeCount = 0;
        while (cumulativeCount + Math.floor(6 * layer) < i && layer < 5) {
          cumulativeCount += Math.floor(6 * layer);
          layer++;
        }
        const indexInLayer = i - 1 - cumulativeCount;
        const nodesInThisLayer = Math.min(Math.floor(6 * layer), sortedNodes.length - i + indexInLayer);
        const angle =
          (2 * Math.PI * indexInLayer) / Math.max(nodesInThisLayer, 1) - Math.PI / 2;
        const layerRadius = layer * 120;
        x = layerRadius * Math.cos(angle);
        y = layerRadius * Math.sin(angle);
      }

      return {
        id: n.id,
        name: n.name,
        avatar: n.avatar,
        category: n.category,
        x,
        y,
        fx: x, // 固定位置，不让力模拟移动
        fy: y,
        relationshipCount: count,
        // 中心节点（关系最多者）标记，用于光环效果
        isCenter: i === 0,
        // 节点大小按关系数区分（8~24）
        val,
      };
    });

    graphData.value = {
      nodes: layoutNodes,
      links: edges.map((e) => ({
        source: e.source,
        target: e.target,
        relationType: e.relationType,
      })),
    };
  } catch (error) {
    console.error('Failed to fetch graph data:', error);
    // 具体错误提示由全局拦截器展示（如后端未开启 Neo4j 时给出明确指引）
  } finally {
    loading.value = false;
  }
};

// ==================== 交互处理 ====================
const handleNodeClick = async (node: any) => {
  if (!node?.id || node.id === 'null' || node.id === 'undefined') {
    message.error('该人物数据缺少有效 ID，请到 Neo4j 删除该节点后重新添加');
    return;
  }
  try {
    selectedPersonDetail.value = await getPerson(node.id);
    drawerVisible.value = true;
  } catch {
    message.error('获取详情失败');
  }
};

// ==================== 表单处理 ====================
const personForm = ref<PersonReq>({
  name: '',
  avatar: '',
  category: '',
  description: '',
  tags: '',
  birthday: '',
  phone: '',
  email: '',
  socialLinks: '',
  notes: '',
});

const openPersonForm = (personId?: string) => {
  if (personId) {
    editingPersonId.value = personId;
    const node = graphData.value.nodes.find((n) => n.id === personId);
    if (node) {
      personForm.value = {
        name: node.name,
        avatar: '',
        category: node.category || '',
        description: '',
        tags: '',
        birthday: '',
        phone: '',
        email: '',
        socialLinks: '',
        notes: '',
      };
    }
  } else {
    editingPersonId.value = null;
    personForm.value = {
      name: '',
      avatar: '',
      category: '',
      description: '',
      tags: '',
      birthday: '',
      phone: '',
      email: '',
      socialLinks: '',
      notes: '',
    };
  }
  personFormVisible.value = true;
};

const handlePersonSubmit = async () => {
  try {
    if (editingPersonId.value) {
      await updatePerson(editingPersonId.value, personForm.value);
    } else {
      await createPerson(personForm.value);
      message.success('添加成功');
    }
    personFormVisible.value = false;
    await fetchGraphData();
  } catch {
    message.error('保存失败');
  }
};

const handleDeletePerson = async (id: string) => {
  try {
    await deletePerson(id);
    message.success('删除成功');
    drawerVisible.value = false;
    selectedPersonDetail.value = null;
    await fetchGraphData();
  } catch {
    message.error('删除失败');
  }
};

const openRelationshipForm = () => {
  if (!selectedPersonDetail.value) return;
  relationshipForm.value = {
    sourcePersonId: selectedPersonDetail.value.id,
    targetPersonId: '',
    relationType: '',
    direction: '双向',
    description: '',
    tags: '',
  };
  relationshipFormVisible.value = true;
};

const handleRelationshipSubmit = async () => {
  try {
    await createRelationship(relationshipForm.value);
    message.success('添加成功');
    relationshipFormVisible.value = false;
    await fetchGraphData();
    if (selectedPersonDetail.value) {
      selectedPersonDetail.value = await getPerson(
        selectedPersonDetail.value.id,
      );
    }
  } catch {
    message.error('保存失败');
  }
};

const handleDeleteRelationship = async (targetId: string) => {
  if (!selectedPersonDetail.value) return;
  try {
    await deleteRelationship({
      sourcePersonId: selectedPersonDetail.value.id,
      targetPersonId: targetId,
    });
    message.success('删除成功');
    await fetchGraphData();
    if (selectedPersonDetail.value) {
      selectedPersonDetail.value = await getPerson(
        selectedPersonDetail.value.id,
      );
    }
  } catch {
    message.error('删除失败');
  }
};

// ==================== 生命周期 ====================
onMounted(() => {
  fetchGraphData();
});
</script>

<template>
  <div class="relationship-page">
    <Spin :spinning="loading">
      <!-- 顶部工具栏 -->
      <div
        class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <TeamOutlined style="font-size: 18px" />
          </span>
          <span class="text-base font-semibold text-card-foreground">
            人际关系图谱
          </span>
          <span
            class="ml-2 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground"
          >
            {{ graphData.nodes?.length || 0 }} 人
          </span>
          <span
            class="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground"
          >
            {{ graphData.links?.length || 0 }} 条关系
          </span>
        </div>
        <div class="flex items-center">
          <Button type="primary" @click="openPersonForm()">
            <PlusOutlined /> 添加人物
          </Button>
        </div>
      </div>

      <!-- 图谱区域 -->
      <div
        class="graph-container relative flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      >
        <ForceGraph2DWrapper
          v-if="graphData.nodes?.length"
          ref="graphRef"
          :graph-data="graphData"
          :highlight-relation-type="highlightRelationType"
          node-label="name"
          :link-directional-arrow-length="6"
          :link-directional-arrow-rel-pos="1"
          @node-click="handleNodeClick"
        />

        <!-- 图例 -->
        <div
          v-if="legendItems.length"
          class="absolute left-3 top-3 z-10 max-w-[45%] rounded-xl border border-border bg-card/90 p-3 shadow-md backdrop-blur"
        >
          <div class="mb-2 text-xs font-medium text-muted-foreground">
            关系图例
          </div>
          <div class="flex flex-wrap gap-x-3 gap-y-1.5">
            <button
              v-for="item in legendItems"
              :key="item.type"
              type="button"
              class="flex cursor-pointer items-center gap-1.5 rounded-full px-1.5 py-0.5 text-xs transition-opacity hover:bg-secondary"
              :class="{
                'opacity-40':
                  highlightRelationType && highlightRelationType !== item.type,
              }"
              @click="toggleLegendHighlight(item.type)"
            >
              <span
                class="inline-block h-2.5 w-2.5 rounded-full"
                :style="{ backgroundColor: item.color }"
              ></span>
              <span class="text-card-foreground">{{ item.type }}</span>
            </button>
          </div>
        </div>

        <!-- 画布控件 -->
        <div
          v-if="graphData.nodes?.length"
          class="absolute right-3 top-3 z-10 flex flex-col gap-1 rounded-xl border border-border bg-card/90 p-1.5 shadow-md backdrop-blur"
        >
          <Button
            type="text"
            size="small"
            title="放大"
            @click="graphRef?.zoomIn()"
          >
            <ZoomInOutlined />
          </Button>
          <Button
            type="text"
            size="small"
            title="缩小"
            @click="graphRef?.zoomOut()"
          >
            <ZoomOutOutlined />
          </Button>
          <Button
            type="text"
            size="small"
            title="适应全屏"
            @click="graphRef?.zoomToFit()"
          >
            <FullscreenOutlined />
          </Button>
        </div>

        <Empty
          v-if="!graphData.nodes?.length"
          description="暂无人物，点击添加开始"
          class="empty-overlay"
        />
      </div>
    </Spin>

    <!-- 人物详情抽屉 -->
    <Drawer
      v-model:open="drawerVisible"
      :title="selectedPersonDetail?.name || '人物详情'"
      width="400"
    >
      <template v-if="selectedPersonDetail">
        <div class="person-detail">
          <div class="detail-section">
            <h4>基本信息</h4>
            <p v-if="selectedPersonDetail.category">
              <strong>分类：</strong>{{ selectedPersonDetail.category }}
            </p>
            <p v-if="selectedPersonDetail.description">
              <strong>简介：</strong>{{ selectedPersonDetail.description }}
            </p>
            <p v-if="selectedPersonDetail.birthday">
              <strong>生日：</strong>{{ selectedPersonDetail.birthday }}
            </p>
            <p v-if="selectedPersonDetail.phone">
              <strong>电话：</strong>{{ selectedPersonDetail.phone }}
            </p>
            <p v-if="selectedPersonDetail.email">
              <strong>邮箱：</strong>{{ selectedPersonDetail.email }}
            </p>
            <p v-if="selectedPersonDetail.tags">
              <strong>标签：</strong>{{ selectedPersonDetail.tags }}
            </p>
            <p v-if="selectedPersonDetail.notes">
              <strong>备注：</strong>{{ selectedPersonDetail.notes }}
            </p>
          </div>

          <div class="detail-section">
            <div class="section-header">
              <h4>
                关系 ({{ selectedPersonDetail.relationships?.length || 0 }})
              </h4>
              <Button type="link" size="small" @click="openRelationshipForm">
                <PlusOutlined /> 添加关系
              </Button>
            </div>
            <div
              v-if="selectedPersonDetail.relationships?.length"
              class="relationship-list"
            >
              <div
                v-for="rel in selectedPersonDetail.relationships"
                :key="rel.id"
                class="relationship-item"
              >
                <div class="rel-info">
                  <span class="rel-type">{{ rel.relationType }}</span>
                  <span class="rel-name"> → {{ rel.target?.name }}</span>
                </div>
                <div class="rel-actions">
                  <DeleteOutlined
                    @click="handleDeleteRelationship(rel.target?.id || '')"
                  />
                </div>
              </div>
            </div>
            <Empty
              v-else
              description="暂无关系"
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
            />
          </div>

          <div class="detail-actions">
            <Button @click="openPersonForm(selectedPersonDetail.id)">
              <EditOutlined /> 编辑
            </Button>
            <Popconfirm
              title="确定删除此人物？"
              @confirm="handleDeletePerson(selectedPersonDetail.id)"
            >
              <Button type="primary" danger> <DeleteOutlined /> 删除 </Button>
            </Popconfirm>
          </div>
        </div>
      </template>
    </Drawer>

    <!-- 人物表单弹窗 -->
    <Modal
      v-model:open="personFormVisible"
      :title="editingPersonId ? '编辑人物' : '添加人物'"
      @ok="handlePersonSubmit"
      width="500px"
    >
      <Form layout="vertical">
        <FormItem label="姓名" required>
          <Input v-model:value="personForm.name" placeholder="请输入姓名" />
        </FormItem>
        <FormItem label="分类">
          <Select v-model:value="personForm.category" placeholder="请选择分类">
            <SelectOption
              v-for="opt in categoryOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </SelectOption>
          </Select>
        </FormItem>
        <FormItem label="简介">
          <Input.TextArea
            v-model:value="personForm.description"
            placeholder="简短描述"
            :rows="2"
          />
        </FormItem>
        <FormItem label="标签">
          <Input
            v-model:value="personForm.tags"
            placeholder="多个标签用逗号分隔"
          />
        </FormItem>
        <FormItem label="生日">
          <Input
            v-model:value="personForm.birthday"
            placeholder="如：1990-01-01"
          />
        </FormItem>
        <FormItem label="电话">
          <Input v-model:value="personForm.phone" placeholder="手机号" />
        </FormItem>
        <FormItem label="邮箱">
          <Input v-model:value="personForm.email" placeholder="邮箱" />
        </FormItem>
        <FormItem label="备注">
          <Input.TextArea
            v-model:value="personForm.notes"
            placeholder="其他备注"
            :rows="2"
          />
        </FormItem>
      </Form>
    </Modal>

    <!-- 关系表单弹窗 -->
    <Modal
      v-model:open="relationshipFormVisible"
      title="添加关系"
      @ok="handleRelationshipSubmit"
      width="400px"
    >
      <Form layout="vertical">
        <FormItem label="关系类型" required>
          <Select
            v-model:value="relationshipForm.relationType"
            placeholder="选择关系类型"
          >
            <SelectOption
              v-for="opt in relationTypes"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </SelectOption>
          </Select>
        </FormItem>
        <FormItem label="对方人物" required>
          <Select
            v-model:value="relationshipForm.targetPersonId"
            placeholder="选择人物"
          >
            <SelectOption
              v-for="n in graphData.nodes?.filter(
                (n) => n.id !== selectedPersonDetail?.id,
              )"
              :key="n.id"
              :value="n.id"
            >
              {{ n.name }}
            </SelectOption>
          </Select>
        </FormItem>
        <FormItem label="方向">
          <Select v-model:value="relationshipForm.direction">
            <SelectOption value="双向">双向</SelectOption>
            <SelectOption value="单向">单向</SelectOption>
          </Select>
        </FormItem>
        <FormItem label="描述">
          <Input.TextArea
            v-model:value="relationshipForm.description"
            placeholder="关系描述"
            :rows="2"
          />
        </FormItem>
        <FormItem label="标签">
          <Input
            v-model:value="relationshipForm.tags"
            placeholder="多个标签用逗号分隔"
          />
        </FormItem>
      </Form>
    </Modal>
  </div>
</template>

<style scoped>
.relationship-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.relationship-page :deep(.ant-spin-container) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.graph-container {
  min-height: calc(100vh - 220px);
}

.empty-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.person-detail {
  padding: 8px;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  margin-bottom: 12px;
  color: hsl(var(--card-foreground));
  font-weight: 500;
}

.detail-section p {
  margin-bottom: 8px;
  color: hsl(var(--muted-foreground));
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h4 {
  margin-bottom: 0;
}

.relationship-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.relationship-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: hsl(var(--secondary));
  border-radius: 6px;
}

.rel-info {
  font-size: 14px;
}

.rel-type {
  color: hsl(var(--primary));
  font-weight: 500;
}

.rel-name {
  color: hsl(var(--card-foreground));
}

.rel-actions {
  color: hsl(var(--destructive));
  cursor: pointer;
}

.detail-actions {
  display: flex;
  gap: 8px;
  margin-top: 24px;
}
</style>
