<script setup lang="ts">
import type {
  PersonDetailVO,
  PersonReq,
  RelationshipDetailVO,
  RelationshipReq,
} from '#/api/relationship';

import { computed, onMounted, ref } from 'vue';

import {
  DeleteOutlined,
  EditOutlined,
  FullscreenOutlined,
  PlusOutlined,
  ReloadOutlined,
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
  Tag,
  Tooltip,
} from 'ant-design-vue';

import {
  createPerson,
  createRelationship,
  deletePerson,
  deleteRelationship,
  getGraphData,
  getPerson,
  updatePerson,
  updateRelationship,
} from '#/api/relationship';

import ForceGraph2DWrapper from './components/ForceGraph2DWrapper.vue';
import { getCategoryColor, getRelationColor } from './constants';

// ==================== 状态 ====================
const loading = ref(false);
const detailLoading = ref(false);
// allNodes / allLinks 保持对象引用不变（force-graph 会在其上写入坐标），
// 过滤时复用同一批对象可避免布局被重置
const allNodes = ref<any[]>([]);
const allLinks = ref<any[]>([]);
const selectedPersonDetail = ref<null | PersonDetailVO>(null);
const drawerVisible = ref(false);
const personFormVisible = ref(false);
const relationshipFormVisible = ref(false);
const editingPersonId = ref<null | string>(null);

const graphRef = ref<InstanceType<typeof ForceGraph2DWrapper> | null>(null);

// 搜索定位
const searchValue = ref<string | undefined>();

// 筛选：用「未勾选」集合，新出现的类型/分类默认选中
const uncheckedRelationTypes = ref<string[]>([]);
const uncheckedCategories = ref<string[]>([]);

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
const editingRelationshipId = ref<null | number>(null);

// ==================== 计算属性 ====================
const linkIdOf = (endpoint: any): string =>
  typeof endpoint === 'object' ? endpoint.id : String(endpoint);

const relTypeOf = (link: any): string => link.relationType || '其他';
const catOf = (node: any): string => node.category || '未分类';

const presentRelationTypes = computed(() => [
  ...new Set(allLinks.value.map((l) => relTypeOf(l))),
]);

const presentCategories = computed(() => [
  ...new Set(allNodes.value.map((n) => catOf(n))),
]);

const searchOptions = computed(() =>
  allNodes.value.map((n) => ({ label: n.name, value: n.id })),
);

const filteredGraphData = computed(() => {
  const nodes = allNodes.value.filter(
    (n) => !uncheckedCategories.value.includes(catOf(n)),
  );
  const ids = new Set(nodes.map((n) => n.id));
  return {
    nodes,
    links: allLinks.value.filter(
      (l) =>
        ids.has(linkIdOf(l.source)) &&
        ids.has(linkIdOf(l.target)) &&
        !uncheckedRelationTypes.value.includes(relTypeOf(l)),
    ),
  };
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

    // 径向布局作为力模拟初始位置：关系最多的在中心 (0,0)，其他按同心圆分布
    allNodes.value = sortedNodes.map((n, i) => {
      const count = relCountMap.get(n.id) || 0;
      let x = 0;
      let y = 0;

      if (i > 0) {
        // 第1层最多6个，第2层最多12个，第3层最多18个...
        let layer = 1;
        let cumulativeCount = 0;
        while (cumulativeCount + Math.floor(6 * layer) < i && layer < 5) {
          cumulativeCount += Math.floor(6 * layer);
          layer++;
        }
        const indexInLayer = i - 1 - cumulativeCount;
        const nodesInThisLayer = Math.min(
          Math.floor(6 * layer),
          sortedNodes.length - i + indexInLayer,
        );
        const angle =
          (2 * Math.PI * indexInLayer) / Math.max(nodesInThisLayer, 1) -
          Math.PI / 2;
        const layerRadius = layer * 120;
        x = layerRadius * Math.cos(angle);
        y = layerRadius * Math.sin(angle);
      }

      return {
        id: n.id,
        name: n.name,
        category: n.category,
        relationshipCount: count,
        // 力模拟初始位置（不固定，可自由展开）
        x,
        y,
        initialX: x,
        initialY: y,
        val: 20,
      };
    });

    allLinks.value = edges.map((e) => ({
      source: e.source,
      target: e.target,
      relationType: e.relationType,
    }));
  } catch (error) {
    console.error('Failed to fetch graph data:', error);
    // 具体错误提示由全局拦截器展示（如后端未开启 Neo4j 时给出明确指引）
  } finally {
    loading.value = false;
  }
};

// ==================== 交互处理 ====================
const handleNodeDblClick = async (node: any) => {
  if (!node?.id || node.id === 'null' || node.id === 'undefined') {
    message.error('该人物数据缺少有效 ID，请到 Neo4j 删除该节点后重新添加');
    return;
  }
  detailLoading.value = true;
  drawerVisible.value = true;
  try {
    selectedPersonDetail.value = await getPerson(node.id);
  } catch {
    message.error('获取详情失败');
    drawerVisible.value = false;
  } finally {
    detailLoading.value = false;
  }
};

const handleSearchSelect = (id: any) => {
  graphRef.value?.centerOnNode(String(id));
};

const toggleRelationType = (type: string) => {
  const idx = uncheckedRelationTypes.value.indexOf(type);
  if (idx >= 0) {
    uncheckedRelationTypes.value.splice(idx, 1);
  } else {
    uncheckedRelationTypes.value.push(type);
  }
};

const toggleCategory = (cat: string) => {
  const idx = uncheckedCategories.value.indexOf(cat);
  if (idx >= 0) {
    uncheckedCategories.value.splice(idx, 1);
  } else {
    uncheckedCategories.value.push(cat);
  }
};

const relTagStyle = (type: string) => {
  const color = getRelationColor(type);
  const checked = !uncheckedRelationTypes.value.includes(type);
  return checked
    ? { borderColor: color, color, backgroundColor: `${color}26` }
    : {
        borderColor: `${color}55`,
        color: `${color}99`,
        backgroundColor: 'transparent',
      };
};

const catTagStyle = (category: string) => {
  const color = getCategoryColor(category === '未分类' ? '' : category);
  const checked = !uncheckedCategories.value.includes(category);
  return checked
    ? { borderColor: color, color, backgroundColor: `${color}26` }
    : {
        borderColor: `${color}55`,
        color: `${color}99`,
        backgroundColor: 'transparent',
      };
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
    const node = allNodes.value.find((n) => n.id === personId);
    if (node) {
      personForm.value = {
        name: node.name,
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
  editingRelationshipId.value = null;
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

// 后端历史数据带字面双引号（如 "\"配偶\""），回填表单时剥掉
const stripQuotes = (val?: string) => val?.replace(/^"|"$/g, '') ?? '';

const openEditRelationshipForm = (rel: RelationshipDetailVO) => {
  if (!selectedPersonDetail.value || !rel.target?.id) return;
  editingRelationshipId.value = rel.id;
  relationshipForm.value = {
    sourcePersonId: selectedPersonDetail.value.id,
    targetPersonId: rel.target.id,
    relationType: stripQuotes(rel.relationType),
    direction: stripQuotes(rel.direction) || '双向',
    description: stripQuotes(rel.description),
    tags: stripQuotes(rel.tags),
  };
  relationshipFormVisible.value = true;
};

const handleRelationshipSubmit = async () => {
  try {
    if (editingRelationshipId.value !== null) {
      await updateRelationship(
        editingRelationshipId.value,
        relationshipForm.value,
      );
      message.success('保存成功');
    } else {
      await createRelationship(relationshipForm.value);
      message.success('添加成功');
    }
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
        class="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-card px-4 py-3"
      >
        <div class="flex flex-wrap items-center gap-2">
          <TeamOutlined class="text-primary text-xl" />
          <span class="text-card-foreground text-base font-medium">
            人际关系图谱
          </span>
          <span class="text-muted-foreground text-sm">
            {{ filteredGraphData.nodes.length || 0 }} 人 ·
            {{ filteredGraphData.links.length || 0 }} 条关系
          </span>
          <Select
            v-model:value="searchValue"
            show-search
            allow-clear
            placeholder="搜索人物并定位"
            class="w-44"
            :options="searchOptions"
            option-filter-prop="label"
            @select="handleSearchSelect"
          />
        </div>
        <div class="flex items-center">
          <Button type="primary" @click="openPersonForm()">
            <PlusOutlined /> 添加人物
          </Button>
        </div>
      </div>

      <!-- 筛选栏 -->
      <div
        v-if="allNodes.length"
        class="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-card px-4 py-2"
      >
        <div class="flex flex-wrap items-center gap-1">
          <span class="text-muted-foreground mr-1 text-xs">关系类型</span>
          <Tag.CheckableTag
            v-for="t in presentRelationTypes"
            :key="t"
            :checked="!uncheckedRelationTypes.includes(t)"
            class="rel-type-tag"
            :style="relTagStyle(t)"
            @change="toggleRelationType(t)"
          >
            {{ t }}
          </Tag.CheckableTag>
        </div>
        <div class="flex flex-wrap items-center gap-1">
          <span class="text-muted-foreground mr-1 text-xs">分类</span>
          <Tag.CheckableTag
            v-for="c in presentCategories"
            :key="c"
            :checked="!uncheckedCategories.includes(c)"
            class="rel-type-tag"
            :style="catTagStyle(c)"
            @change="toggleCategory(c)"
          >
            {{ c }}
          </Tag.CheckableTag>
        </div>
        <span class="text-muted-foreground ml-auto hidden text-xs md:inline">
          单击节点聚焦 · 双击查看详情 · 拖拽后固定位置
        </span>
      </div>

      <!-- 图谱区域 -->
      <div class="graph-container bg-card">
        <ForceGraph2DWrapper
          v-if="filteredGraphData.nodes.length"
          ref="graphRef"
          :graph-data="filteredGraphData"
          node-label="name"
          :link-directional-arrow-length="6"
          :link-directional-arrow-rel-pos="1"
          @node-dblclick="handleNodeDblClick"
        />
        <Empty
          v-if="!filteredGraphData.nodes.length"
          description="暂无人物，点击添加开始"
          class="empty-overlay"
        />

        <!-- 画布工具栏 -->
        <div
          v-if="filteredGraphData.nodes.length"
          class="border-border bg-card absolute bottom-4 right-4 z-10 flex flex-col overflow-hidden rounded-lg border shadow-md"
        >
          <Tooltip title="放大" placement="left">
            <button
              class="canvas-tool-btn"
              type="button"
              @click="graphRef?.zoomIn()"
            >
              <ZoomInOutlined />
            </button>
          </Tooltip>
          <Tooltip title="缩小" placement="left">
            <button
              class="canvas-tool-btn"
              type="button"
              @click="graphRef?.zoomOut()"
            >
              <ZoomOutOutlined />
            </button>
          </Tooltip>
          <Tooltip title="适应全屏" placement="left">
            <button
              class="canvas-tool-btn"
              type="button"
              @click="graphRef?.fitView()"
            >
              <FullscreenOutlined />
            </button>
          </Tooltip>
          <Tooltip title="重置布局" placement="left">
            <button
              class="canvas-tool-btn"
              type="button"
              @click="graphRef?.resetLayout()"
            >
              <ReloadOutlined />
            </button>
          </Tooltip>
        </div>
      </div>
    </Spin>

    <!-- 人物详情抽屉 -->
    <Drawer
      v-model:open="drawerVisible"
      :title="selectedPersonDetail?.name || '人物详情'"
      width="400"
    >
      <Spin :spinning="detailLoading">
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
                  class="relationship-item bg-secondary"
                >
                  <div class="rel-info">
                    <span class="rel-type">{{ rel.relationType }}</span>
                    <span class="rel-name"> → {{ rel.target?.name }}</span>
                  </div>
                  <div class="rel-actions">
                    <EditOutlined
                      class="rel-edit-icon"
                      @click="openEditRelationshipForm(rel)"
                    />
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
      </Spin>
    </Drawer>

    <!-- 人物表单弹窗 -->
    <Modal
      v-model:open="personFormVisible"
      :title="editingPersonId ? '编辑人物' : '添加人物'"
      width="500px"
      @ok="handlePersonSubmit"
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
      :title="editingRelationshipId === null ? '添加关系' : '编辑关系'"
      width="400px"
      @ok="handleRelationshipSubmit"
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
            :disabled="editingRelationshipId !== null"
          >
            <SelectOption
              v-for="n in allNodes.filter(
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
  flex: 1;
  border-radius: 8px;
  position: relative;
  min-height: calc(100vh - 260px);
  overflow: hidden;
}

.empty-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.canvas-tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  cursor: pointer;
  color: hsl(var(--card-foreground));
  background: transparent;
  border: none;
}

.canvas-tool-btn:hover {
  color: hsl(var(--primary));
  background: hsl(var(--secondary));
}

.rel-type-tag {
  border: 1px solid;
  border-radius: 4px;
  margin-inline-end: 0;
}

.rel-type-tag::before {
  display: none;
}

.person-detail {
  padding: 8px;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  margin-bottom: 12px;
  font-weight: 500;
}

.detail-section p {
  margin-bottom: 8px;
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
  border-radius: 4px;
}

.rel-info {
  font-size: 14px;
}

.rel-actions {
  color: hsl(var(--destructive, 0 84% 60%));
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
}

.rel-actions .rel-edit-icon {
  color: hsl(var(--muted-foreground, 215 16% 47%));
}

.detail-actions {
  display: flex;
  gap: 8px;
  margin-top: 24px;
}
</style>
