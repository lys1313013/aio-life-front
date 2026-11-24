<script setup lang="ts">
import type {
  GraphData,
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
  QuestionCircleOutlined,
  RetweetOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  DatePicker,
  Drawer,
  Empty,
  Form,
  FormItem,
  Input,
  message,
  Popconfirm,
  Select,
  SelectOption,
  Spin,
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
import { AppModal as Modal } from '#/components/app-modal';
import GlobalFloatBtn from '#/components/global-float-btn/index.vue';

import PaperRelationshipCanvas from './components/PaperRelationshipCanvas.vue';
import { ONE_WAY_RELATION_TYPES, SCHOOL_FIELDS } from './constants';

const graphData = ref<GraphData>({ nodes: [], edges: [] });
const allNodes = computed(() => graphData.value.nodes);
const loading = ref(false);
const loaded = ref(false);
const loadFailed = ref(false);
const detailLoading = ref(false);
const detailFailed = ref(false);
const selectedPersonId = ref<string>();
const selectedPersonDetail = ref<null | PersonDetailVO>(null);
const drawerVisible = ref(false);
const personFormVisible = ref(false);
const personSubmitLoading = ref(false);
const relationshipFormVisible = ref(false);
const relationshipSubmitLoading = ref(false);
const deletingPerson = ref(false);
const deletingRelationships = ref(new Set<string>());
const editingPersonId = ref<null | string>(null);
const graphRef = ref<InstanceType<typeof PaperRelationshipCanvas> | null>(null);
let graphRequest = 0;
let detailRequest = 0;

// 搜索定位
const searchValue = ref<string | undefined>();

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
const editingRelationshipId = ref<null | string>(null);

const searchOptions = computed(() =>
  allNodes.value.map(({ name, id }) => ({ label: name, value: id })),
);

async function fetchGraphData() {
  const request = ++graphRequest;
  loading.value = true;
  loadFailed.value = false;
  try {
    const data = await getGraphData();
    if (request !== graphRequest) return;
    graphData.value = data;
    loaded.value = true;
  } catch {
    if (request === graphRequest) loadFailed.value = true;
  } finally {
    if (request === graphRequest) loading.value = false;
  }
}

async function loadPersonDetail(id: string) {
  const request = ++detailRequest;
  detailLoading.value = true;
  detailFailed.value = false;
  try {
    const person = await getPerson(id);
    if (request === detailRequest) selectedPersonDetail.value = person;
  } catch {
    if (request === detailRequest) detailFailed.value = true;
  } finally {
    if (request === detailRequest) detailLoading.value = false;
  }
}

function openPersonDetail(id: string) {
  if (!id || (drawerVisible.value && selectedPersonId.value === id)) return;
  selectedPersonId.value = id;
  selectedPersonDetail.value = null;
  drawerVisible.value = true;
  void loadPersonDetail(id);
}

function handleDrawerChange(open: boolean) {
  drawerVisible.value = open;
  if (open) return;
  detailRequest++;
  detailLoading.value = false;
  selectedPersonId.value = undefined;
  selectedPersonDetail.value = null;
}

function handleSearchSelect(value: unknown) {
  if (typeof value === 'string') graphRef.value?.centerOnNode(value);
}

function refreshDetails(id?: string) {
  if (id && drawerVisible.value && selectedPersonId.value === id)
    return loadPersonDetail(id);
}

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
    const detail = selectedPersonDetail.value;
    if (detail?.id === personId) {
      personForm.value = {
        name: detail.name,
        avatar: detail.avatar || '',
        category: detail.category || '',
        description: detail.description || '',
        tags: detail.tags || '',
        birthday: detail.birthday || '',
        phone: detail.phone || '',
        email: detail.email || '',
        primarySchool: detail.primarySchool,
        juniorHighSchool: detail.juniorHighSchool,
        highSchool: detail.highSchool,
        undergraduateSchool: detail.undergraduateSchool,
        mastersSchool: detail.mastersSchool,
        doctoralSchool: detail.doctoralSchool,
        socialLinks: detail.socialLinks || '',
        notes: detail.notes || '',
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
  if (personSubmitLoading.value) return;
  const id = editingPersonId.value;
  personSubmitLoading.value = true;
  try {
    if (id) await updatePerson(id, personForm.value);
    else await createPerson(personForm.value);
    message.success(id ? '保存成功' : '添加成功');
    personFormVisible.value = false;
    await Promise.all([fetchGraphData(), refreshDetails(id ?? undefined)]);
  } catch {
    // 全局拦截器已提示
  } finally {
    personSubmitLoading.value = false;
  }
};

const handleDeletePerson = async (id: string) => {
  if (deletingPerson.value) return;
  deletingPerson.value = true;
  try {
    await deletePerson(id);
    message.success('删除成功');
    if (selectedPersonId.value === id) handleDrawerChange(false);
    if (searchValue.value === id) searchValue.value = undefined;
    await fetchGraphData();
  } catch {
    // 全局拦截器已提示
  } finally {
    deletingPerson.value = false;
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

const handleRelationTypeChange = (type: unknown) => {
  if (typeof type !== 'string') return;
  relationshipForm.value.direction = ONE_WAY_RELATION_TYPES.has(type)
    ? '单向'
    : '双向';
};

const openEditRelationshipForm = (rel: RelationshipDetailVO) => {
  if (!selectedPersonDetail.value || !rel.target?.id) return;
  editingRelationshipId.value = rel.id;
  relationshipForm.value = {
    sourcePersonId: selectedPersonDetail.value.id,
    targetPersonId: rel.target.id,
    relationType: rel.relationType ?? '',
    direction: rel.direction || '双向',
    description: rel.description ?? '',
    tags: rel.tags ?? '',
  };
  relationshipFormVisible.value = true;
};

const handleRelationshipSubmit = async () => {
  if (relationshipSubmitLoading.value) return;
  const id = editingRelationshipId.value;
  const source = relationshipForm.value.sourcePersonId;
  relationshipSubmitLoading.value = true;
  try {
    if (id === null) await createRelationship(relationshipForm.value);
    else await updateRelationship(id, relationshipForm.value);
    message.success(id === null ? '添加成功' : '保存成功');
    relationshipFormVisible.value = false;
    await Promise.all([fetchGraphData(), refreshDetails(source)]);
  } catch {
    // 全局拦截器已提示
  } finally {
    relationshipSubmitLoading.value = false;
  }
};

const handleDeleteRelationship = async (relationship: RelationshipDetailVO) => {
  const source = selectedPersonDetail.value?.id;
  if (!source || !relationship.id || deletingRelationships.value.has(relationship.id))
    return;
  deletingRelationships.value.add(relationship.id);
  try {
    await deleteRelationship(relationship.id);
    message.success('删除成功');
    await Promise.all([fetchGraphData(), refreshDetails(source)]);
  } catch {
    // 全局拦截器已提示
  } finally {
    deletingRelationships.value.delete(relationship.id);
  }
};

onMounted(fetchGraphData);
</script>

<template>
  <div class="relationship-page h-full">
    <section
      class="relative h-full overflow-hidden bg-card text-card-foreground"
    >
      <PaperRelationshipCanvas
        ref="graphRef"
        :graph-data="graphData"
        :motion="!personFormVisible && !relationshipFormVisible"
        @person-open="openPersonDetail"
      />
      <div class="absolute right-4 top-3">
        <label class="sr-only" for="relationship-person-search">
          搜索人物并定位
        </label>
        <Select
          id="relationship-person-search"
          v-model:value="searchValue"
          :options="searchOptions"
          class="w-44 max-w-[55vw]"
          placeholder="搜索人物并定位"
          option-filter-prop="label"
          allow-clear
          show-search
          @select="handleSearchSelect"
          @clear="graphRef?.clearFocus()"
        />
      </div>

      <div
        v-if="!loaded && loading"
        class="empty-overlay"
        role="status"
        aria-label="加载图谱"
      >
        <Spin />
      </div>
      <div v-else-if="!loaded && loadFailed" class="empty-overlay">
        <Empty description="图谱加载失败" :image="Empty.PRESENTED_IMAGE_SIMPLE">
          <Button @click="fetchGraphData">重试</Button>
        </Empty>
      </div>
      <div v-else-if="loaded && allNodes.length === 0" class="empty-overlay">
        <Empty description="暂无人物" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
      </div>

      <div
        v-if="loaded && (loading || loadFailed)"
        class="absolute left-4 top-3"
      >
        <Button v-if="loadFailed" size="small" @click="fetchGraphData">
          重试
        </Button>
        <div
          v-else
          class="pointer-events-none"
          role="status"
          aria-label="加载图谱"
        >
          <Spin size="small" />
        </div>
      </div>

      <div
        v-if="allNodes.length > 0"
        class="absolute bottom-6 left-6 flex items-center gap-1 rounded-lg bg-card p-1 shadow-sm"
      >
        <Tooltip title="适应画布">
          <Button
            type="text"
            aria-label="适应画布"
            @click="graphRef?.fitView()"
          >
            <template #icon><FullscreenOutlined /></template>
          </Button>
        </Tooltip>
        <Tooltip title="重置布局">
          <Button
            type="text"
            aria-label="重置布局"
            @click="graphRef?.resetLayout()"
          >
            <template #icon><RetweetOutlined /></template>
          </Button>
        </Tooltip>
        <Tooltip
          title="单击聚焦，双击或按回车查看详情，拖动可调整位置。触屏轻点查看详情。"
        >
          <Button type="text" aria-label="图谱操作说明">
            <template #icon><QuestionCircleOutlined /></template>
          </Button>
        </Tooltip>
      </div>
    </section>

    <GlobalFloatBtn aria-label="添加人物" @click="openPersonForm()" />

    <!-- 人物详情抽屉 -->
    <Drawer
      :open="drawerVisible"
      @update:open="handleDrawerChange"
      :title="selectedPersonDetail?.name || '人物详情'"
      :mask="false"
      width="min(400px, 100vw)"
    >
      <Spin :spinning="detailLoading">
        <Empty
          v-if="detailFailed"
          description="人物详情加载失败"
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
        >
          <Button
            @click="selectedPersonId && loadPersonDetail(selectedPersonId)"
          >
            重试
          </Button>
        </Empty>
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
              <template v-for="field in SCHOOL_FIELDS" :key="field.key">
                <p v-if="selectedPersonDetail[field.key]">
                  <strong>{{ field.label }}：</strong
                  >{{ selectedPersonDetail[field.key] }}
                </p>
              </template>
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
                <Tooltip title="新建关系">
                  <Button
                    type="text"
                    size="small"
                    aria-label="新建关系"
                    @click="openRelationshipForm"
                  >
                    <template #icon><PlusOutlined /></template>
                  </Button>
                </Tooltip>
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
                    <Button
                      type="text"
                      size="small"
                      aria-label="编辑关系"
                      title="编辑关系"
                      @click="openEditRelationshipForm(rel)"
                    >
                      <template #icon><EditOutlined /></template>
                    </Button>
                    <Popconfirm
                      title="确定删除这条关系？"
                      @confirm="handleDeleteRelationship(rel)"
                    >
                      <Button
                        type="text"
                        size="small"
                        danger
                        aria-label="删除关系"
                        :loading="deletingRelationships.has(rel.id)"
                      >
                        <template #icon><DeleteOutlined /></template>
                      </Button>
                    </Popconfirm>
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
                <Button type="primary" danger :loading="deletingPerson">
                  <DeleteOutlined /> 删除
                </Button>
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
      :confirm-loading="personSubmitLoading"
      centered
      width="560px"
      @ok="handlePersonSubmit"
    >
      <Form class="person-form" layout="vertical">
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
        <FormItem class="form-item-full" label="简介">
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
          <DatePicker
            v-model:value="personForm.birthday"
            placeholder="请选择生日"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </FormItem>
        <FormItem label="电话">
          <Input v-model:value="personForm.phone" placeholder="手机号" />
        </FormItem>
        <div class="form-item-full person-form">
          <FormItem
            v-for="field in SCHOOL_FIELDS"
            :key="field.key"
            :label="field.label"
          >
            <Input
              :aria-label="field.label"
              :value="personForm[field.key] ?? undefined"
              @update:value="personForm[field.key] = $event"
            />
          </FormItem>
        </div>
        <FormItem class="form-item-full" label="备注">
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
      :confirm-loading="relationshipSubmitLoading"
      centered
      width="400px"
      @ok="handleRelationshipSubmit"
    >
      <Form layout="vertical">
        <FormItem label="关系类型" required>
          <Select
            v-model:value="relationshipForm.relationType"
            placeholder="选择关系类型"
            @change="handleRelationTypeChange"
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
            <SelectOption value="单向">单向（当前人物 → 对方）</SelectOption>
            <SelectOption value="双向">双向（彼此）</SelectOption>
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
.empty-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
}

.empty-overlay :deep(.ant-btn) {
  pointer-events: auto;
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
  display: flex;
  flex: none;
  align-items: center;
  gap: 4px;
}

.detail-actions {
  display: flex;
  gap: 8px;
  margin-top: 24px;
}

.person-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.person-form :deep(.ant-form-item) {
  margin-bottom: 12px;
}

.person-form .form-item-full {
  grid-column: 1 / -1;
}

@media (max-width: 575px) {
  .person-form {
    grid-template-columns: 1fr;
  }

  .person-form .form-item-full {
    grid-column: auto;
  }
}
</style>
