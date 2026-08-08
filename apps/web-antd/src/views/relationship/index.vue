<script setup lang="ts">
import type {
  PersonDetailVO,
  PersonReq,
  RelationshipReq,
} from '#/api/relationship';

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import {
  PlusOutlined,
  TeamOutlined,
  UnorderedListOutlined,
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
import PersonDetailPanel from './components/PersonDetailPanel.vue';
import PersonListPanel from './components/PersonListPanel.vue';
import { getRelationColor } from './constants';

// ==================== 状态 ====================
const loading = ref(false);
const graphData = ref<{ links: any[]; nodes: any[] }>({ nodes: [], links: [] });
const selectedPersonDetail = ref<null | PersonDetailVO>(null);
const detailLoading = ref(false);
const selectedId = ref<null | string>(null);
const personFormVisible = ref(false);
const relationshipFormVisible = ref(false);
const editingPersonId = ref<null | string>(null);
const listDrawerVisible = ref(false);
const graphRef = ref<InstanceType<typeof ForceGraph2DWrapper> | null>(null);

const desktopMq = window.matchMedia('(min-width: 1024px)');
const isDesktopView = ref(desktopMq.matches);
const updateViewport = () => {
  isDesktopView.value = desktopMq.matches;
};
const isDesktop = () => desktopMq.matches;

// 页面高度自适应可视区域（布局父链是 min-h 模式，h-full 会把页面撑出视口）
const pageRef = ref<HTMLDivElement | null>(null);
const pageHeight = ref('600px');
const updatePageHeight = () => {
  if (!pageRef.value) return;
  const top = pageRef.value.getBoundingClientRect().top;
  pageHeight.value = `${Math.max(window.innerHeight - top - 12, 400)}px`;
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

// ==================== 计算属性 ====================
interface PersonListEntry {
  category?: string;
  id: string;
  name: string;
  relationshipCount: number;
}

const personList = computed<PersonListEntry[]>(() =>
  graphData.value.nodes.map((n) => ({
    id: n.id,
    name: n.name,
    category: n.category,
    relationshipCount: n.relationshipCount || 0,
  })),
);

// 图例：只显示实际出现的关系类型
const activeRelationTypes = computed(() => {
  const set = new Set<string>();
  for (const link of graphData.value.links) {
    if (link.relationType) set.add(link.relationType);
  }
  return [...set];
});

// ==================== 分簇径向布局 ====================
// 关系最多者居中；其余按 category 分簇，每簇占一个扇区，簇内按关系数由内向外排
const computeClusterLayout = (
  nodes: any[],
  relCountMap: Map<string, number>,
) => {
  const sortedNodes = [...nodes].sort(
    (a, b) => (relCountMap.get(b.id) || 0) - (relCountMap.get(a.id) || 0),
  );

  const positionMap = new Map<string, { x: number; y: number }>();
  if (sortedNodes.length === 0) return { positionMap, sortedNodes };

  // 中心节点
  const center = sortedNodes[0];
  positionMap.set(center.id, { x: 0, y: 0 });

  const rest = sortedNodes.slice(1);
  if (rest.length === 0) return { positionMap, sortedNodes };

  // 按分类分组（组内保持关系数降序）
  const groups = new Map<string, any[]>();
  for (const n of rest) {
    const cat = n.category || '未分类';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(n);
  }
  // 人数多的分类先排
  const categories = [...groups.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  );

  // 扇区角度按人数比例分配（保证最小扇区，再归一化到 2π）
  const MIN_SECTOR = Math.PI / 5;
  const rawAngles = categories.map(([, members]) =>
    Math.max(MIN_SECTOR, (2 * Math.PI * members.length) / rest.length),
  );
  const totalAngle = rawAngles.reduce((s, a) => s + a, 0);
  const scale = (2 * Math.PI) / totalAngle;

  let cursor = -Math.PI / 2; // 从正上方开始
  categories.forEach(([, members], idx) => {
    const sector = rawAngles[idx]! * scale;
    const a0 = cursor;
    const a1 = cursor + sector;
    cursor = a1;

    const pad = Math.min(0.12, sector * 0.08);
    const span = a1 - a0 - 2 * pad;

    // 簇内由内向外填环，环容量按弧长估算，避免同环重叠
    let ring = 0;
    let idxInRing = 0;
    let ringCapacity = 0;
    let radius = 0;
    members.forEach((n) => {
      if (idxInRing >= ringCapacity) {
        ring += 1;
        idxInRing = 0;
        radius = 160 + (ring - 1) * 130;
        ringCapacity = Math.max(1, Math.floor((span * radius) / 90));
      }
      const angle = a0 + pad + (span * (idxInRing + 0.5)) / ringCapacity;
      positionMap.set(n.id, {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
      });
      idxInRing += 1;
    });
  });

  return { positionMap, sortedNodes };
};

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

    const { positionMap } = computeClusterLayout(nodes, relCountMap);

    const layoutNodes = nodes.map((n) => {
      const pos = positionMap.get(n.id) || { x: 0, y: 0 };
      return {
        id: n.id,
        name: n.name,
        avatar: n.avatar,
        category: n.category,
        x: pos.x,
        y: pos.y,
        fx: pos.x, // 固定位置，不让力模拟移动
        fy: pos.y,
        relationshipCount: relCountMap.get(n.id) || 0,
        val: 20,
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
const loadPersonDetail = async (id: string) => {
  detailLoading.value = true;
  try {
    selectedPersonDetail.value = await getPerson(id);
  } catch {
    message.error('获取详情失败');
    selectedPersonDetail.value = null;
  } finally {
    detailLoading.value = false;
  }
};

// 图谱节点点击 → 选中 + 详情（列表内滚动联动由 PersonListPanel 监听 selectedId）
const handleNodeClick = async (node: any) => {
  if (!node?.id || node.id === 'null' || node.id === 'undefined') {
    message.error('该人物数据缺少有效 ID，请到 Neo4j 删除该节点后重新添加');
    return;
  }
  selectedId.value = node.id;
  await loadPersonDetail(node.id);
};

// 列表点击 → 画布居中高亮；桌面端同时展开详情
const handleListSelect = async (id: string) => {
  selectedId.value = id;
  listDrawerVisible.value = false;
  graphRef.value?.focusNode(id);
  if (isDesktop()) {
    await loadPersonDetail(id);
  }
};

const closeDetail = () => {
  selectedPersonDetail.value = null;
  selectedId.value = null;
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

const emptyPersonForm = (): PersonReq => ({
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

const openPersonForm = async (personId?: string) => {
  if (personId) {
    editingPersonId.value = personId;
    // 优先用已加载的详情回填，否则拉取
    let source: null | PersonDetailVO = null;
    if (selectedPersonDetail.value?.id === personId) {
      source = selectedPersonDetail.value;
    } else {
      try {
        source = await getPerson(personId);
      } catch {
        source = null;
      }
    }
    personForm.value = source
      ? {
          name: source.name,
          avatar: source.avatar || '',
          category: source.category || '',
          description: source.description || '',
          tags: source.tags || '',
          birthday: source.birthday || '',
          phone: source.phone || '',
          email: source.email || '',
          socialLinks: source.socialLinks || '',
          notes: source.notes || '',
        }
      : {
          ...emptyPersonForm(),
          name:
            graphData.value.nodes.find((n) => n.id === personId)?.name || '',
        };
  } else {
    editingPersonId.value = null;
    personForm.value = emptyPersonForm();
  }
  personFormVisible.value = true;
};

const handlePersonSubmit = async () => {
  try {
    if (editingPersonId.value) {
      await updatePerson(editingPersonId.value, personForm.value);
      message.success('保存成功');
    } else {
      await createPerson(personForm.value);
      message.success('添加成功');
    }
    personFormVisible.value = false;
    await fetchGraphData();
    if (editingPersonId.value && selectedPersonDetail.value) {
      await loadPersonDetail(editingPersonId.value);
    }
  } catch {
    message.error('保存失败');
  }
};

const handleDeletePerson = async (id: string) => {
  try {
    await deletePerson(id);
    message.success('删除成功');
    closeDetail();
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
      await loadPersonDetail(selectedPersonDetail.value.id);
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
      await loadPersonDetail(selectedPersonDetail.value.id);
    }
  } catch {
    message.error('删除失败');
  }
};

// ==================== 生命周期 ====================
onMounted(() => {
  desktopMq.addEventListener('change', updateViewport);
  window.addEventListener('resize', updatePageHeight);
  updatePageHeight();
  fetchGraphData();
});

onBeforeUnmount(() => {
  desktopMq.removeEventListener('change', updateViewport);
  window.removeEventListener('resize', updatePageHeight);
});
</script>

<template>
  <div
    ref="pageRef"
    class="relationship-page flex gap-3 p-3 lg:p-4"
    :style="{ height: pageHeight }"
  >
    <!-- 左侧人物列表（桌面端固定面板） -->
    <aside
      class="hidden w-[260px] shrink-0 flex-col overflow-hidden rounded-lg bg-card lg:flex"
    >
      <div class="shrink-0 border-b border-border px-4 py-3">
        <div class="flex items-center justify-between">
          <span
            class="flex items-center text-base font-medium text-card-foreground"
          >
            <TeamOutlined class="mr-2" /> 人际关系图谱
          </span>
        </div>
        <div class="mt-1 text-xs text-muted-foreground">
          {{ graphData.nodes?.length || 0 }} 人 ·
          {{ graphData.links?.length || 0 }} 条关系
        </div>
        <Button block class="mt-3" type="primary" @click="openPersonForm()">
          <PlusOutlined /> 添加人物
        </Button>
      </div>
      <div class="min-h-0 flex-1">
        <PersonListPanel
          :persons="personList"
          :selected-id="selectedId"
          @select="handleListSelect"
        />
      </div>
    </aside>

    <!-- 图谱主区 -->
    <div class="relative min-w-0 flex-1 overflow-hidden rounded-lg bg-card">
      <Spin :spinning="loading" wrapper-class-name="graph-spin">
        <div class="h-full w-full">
          <ForceGraph2DWrapper
            v-if="graphData.nodes?.length"
            ref="graphRef"
            :graph-data="graphData"
            :link-directional-arrow-length="6"
            :link-directional-arrow-rel-pos="1"
            :selected-id="selectedId"
            node-label="name"
            @node-click="handleNodeClick"
          />
          <Empty
            v-if="!loading && !graphData.nodes?.length"
            class="empty-overlay"
            description="暂无人物，点击添加开始"
          />
        </div>
      </Spin>

      <!-- 关系图例（只显示实际出现的类型） -->
      <div
        v-if="activeRelationTypes.length > 0"
        class="absolute right-3 top-3 max-h-[40%] overflow-y-auto rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm"
      >
        <div
          v-for="type in activeRelationTypes"
          :key="type"
          class="flex items-center py-0.5 text-muted-foreground"
        >
          <span
            class="mr-1.5 inline-block h-2 w-4 rounded-sm"
            :style="{ backgroundColor: getRelationColor(type) }"
          ></span>
          {{ type }}
        </div>
      </div>

      <!-- 移动端浮动按钮 -->
      <div class="absolute bottom-4 left-3 lg:hidden">
        <Button @click="listDrawerVisible = true">
          <UnorderedListOutlined /> 人物 ({{ graphData.nodes?.length || 0 }})
        </Button>
      </div>
      <div class="absolute bottom-4 right-3 lg:hidden">
        <Button type="primary" @click="openPersonForm()">
          <PlusOutlined /> 添加人物
        </Button>
      </div>
    </div>

    <!-- 右侧详情面板（桌面端） -->
    <aside
      v-if="selectedPersonDetail || detailLoading"
      class="hidden w-[340px] shrink-0 overflow-hidden rounded-lg bg-card lg:block"
    >
      <PersonDetailPanel
        :detail="selectedPersonDetail"
        :loading="detailLoading"
        show-close
        @add-relationship="openRelationshipForm"
        @close="closeDetail"
        @delete-person="handleDeletePerson"
        @delete-relationship="handleDeleteRelationship"
        @edit="openPersonForm"
      />
    </aside>

    <!-- 移动端：人物列表抽屉（Drawer 走 portal，CSS 断点类无法隐藏，需 v-if） -->
    <Drawer
      v-if="!isDesktopView"
      v-model:open="listDrawerVisible"
      :width="280"
      placement="left"
      title="人物列表"
    >
      <PersonListPanel
        :persons="personList"
        :selected-id="selectedId"
        @select="handleListSelect"
      />
    </Drawer>

    <!-- 移动端：详情底部抽屉 -->
    <Drawer
      v-if="!isDesktopView"
      :open="!!selectedPersonDetail || detailLoading"
      height="75%"
      placement="bottom"
      @close="closeDetail"
    >
      <PersonDetailPanel
        :detail="selectedPersonDetail"
        :loading="detailLoading"
        show-close
        @add-relationship="openRelationshipForm"
        @close="closeDetail"
        @delete-person="handleDeletePerson"
        @delete-relationship="handleDeleteRelationship"
        @edit="openPersonForm"
      />
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
            :rows="2"
            placeholder="简短描述"
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
            :rows="2"
            placeholder="其他备注"
          />
        </FormItem>
      </Form>
    </Modal>

    <!-- 关系表单弹窗 -->
    <Modal
      v-model:open="relationshipFormVisible"
      title="添加关系"
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
            :rows="2"
            placeholder="关系描述"
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
.relationship-page :deep(.graph-spin),
.relationship-page :deep(.ant-spin-container) {
  height: 100%;
}

.empty-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
