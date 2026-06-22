<template>
  <view class="container">
    <!-- 图谱画布 -->
    <canvas
      v-if="graphData.nodes.length > 0"
      canvas-id="relationshipGraph"
      id="relationshipGraph"
      class="graph-canvas"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    ></canvas>

    <view v-else class="empty">
      <text>暂无人物关系数据</text>
    </view>

    <!-- 人物详情弹窗 -->
    <view v-if="selectedPerson" class="person-detail-modal" @click="selectedPerson = null">
      <view class="detail-content" @click.stop>
        <view class="detail-header">
          <view class="avatar-large">
            <text v-if="selectedPerson.avatar" class="avatar-text">{{ selectedPerson.name.charAt(0) }}</text>
            <text v-else class="avatar-text">{{ selectedPerson.name.charAt(0) }}</text>
          </view>
          <text class="detail-name">{{ selectedPerson.name }}</text>
          <text class="detail-category" v-if="selectedPerson.category">{{ selectedPerson.category }}</text>
        </view>
        <view class="detail-relations" v-if="selectedPerson.personDetail?.relationships && selectedPerson.personDetail.relationships.length > 0">
          <text class="relations-title">关系 ({{ selectedPerson.personDetail.relationships.length }})</text>
          <view class="relation-item" v-for="rel in selectedPerson.personDetail.relationships" :key="rel.id">
            <text class="relation-type">{{ rel.relationType }}</text>
            <text class="relation-target">{{ rel.target.name }}</text>
          </view>
        </view>
        <button class="close-btn" @click="selectedPerson = null">关闭</button>
      </view>
    </view>

    <!-- FAB -->
    <uni-fab
      horizontal="right"
      vertical="bottom"
      :pattern="{ buttonColor: '#3f51b5' }"
      @fabClick="onAddPerson"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { getGraphData, getPerson, type GraphData, type GraphNode, type PersonDetailVO } from '../../../api/relationship';

interface LayoutNode extends GraphNode {
  x: number;
  y: number;
  relationshipCount: number;
  color: string;
  radius: number;
  personDetail?: PersonDetailVO;
}

const graphData = ref<{ nodes: LayoutNode[]; edges: { source: string; target: string; relationType: string }[] }>({
  nodes: [],
  edges: [],
});
const selectedPerson = ref<LayoutNode | null>(null);
const canvasWidth = ref(0);
const canvasHeight = ref(0);
const scale = ref(1);
const offsetX = ref(0);
const offsetY = ref(0);
let touchStartX = 0;
let touchStartY = 0;
let touchStartOffsetX = 0;
let touchStartOffsetY = 0;
let isPinching = false;
let initialPinchDistance = 0;
let initialScale = 1;

const colors = ['#3f51b5'];

// 关系类型颜色映射
const relationColors: Record<string, string> = {
  '父母': '#e91e63',
  '母亲': '#e91e63',
  '父亲': '#e91e63',
  '子女': '#4caf50',
  '配偶': '#ff9800',
  '恋人': '#ff5722',
  '兄弟姐妹': '#9c27b0',
  '朋友': '#2196f3',
  '挚友': '#00bcd4',
  '同学': '#009688',
  '同事': '#607d8b',
  '老师': '#795548',
  '学生': '#8bc34a',
  'mentor': '#3f51b5',
  '前任': '#f44336',
  '暗恋': '#e91e63',
  '其他': '#9e9e9e',
};

const loadGraphData = async () => {
  try {
    const data = await getGraphData();
    if (!data || !data.nodes || data.nodes.length === 0) {
      graphData.value = { nodes: [], edges: [] };
      return;
    }

    const nodes = data.nodes || [];
    const edges = (data.edges || []);

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

    // 找到关系最多的节点（将放在中心）
    const sortedNodes = [...nodes].sort((a, b) =>
      (relCountMap.get(b.id) || 0) - (relCountMap.get(a.id) || 0)
    );

    const maxRelCount = relCountMap.get(sortedNodes[0]?.id) || 1;

    // 布局节点
    const layoutNodes: LayoutNode[] = sortedNodes.map((node, index) => {
      const count = relCountMap.get(node.id) || 0;
      const ratio = count / maxRelCount;
      return {
        ...node,
        x: 0,
        y: 0,
        relationshipCount: count,
        color: colors[index % colors.length],
        radius: 25, // 统一大小
      };
    });

    // 使用径向布局：关系最多的在中心，其他的按关系数量从内到外分布
    const centerX = 0;
    const centerY = 0;

    if (layoutNodes.length === 1) {
      layoutNodes[0].x = centerX;
      layoutNodes[0].y = centerY;
    } else {
      // 第一个（关系最多）放中心
      layoutNodes[0].x = centerX;
      layoutNodes[0].y = centerY;

      // 其余节点按同心圆分布
      let nodeIndex = 1;
      let layer = 1;

      while (nodeIndex < layoutNodes.length && layer <= 5) {
        const nodesInThisLayer = Math.min(
          Math.floor(6 * layer), // 每层节点数递增: 6, 12, 18...
          layoutNodes.length - nodeIndex
        );

        const layerRadius = layer * 80; // 层间距

        for (let i = 0; i < nodesInThisLayer && nodeIndex < layoutNodes.length; i++) {
          const angle = (2 * Math.PI * i) / nodesInThisLayer - Math.PI / 2;
          layoutNodes[nodeIndex].x = centerX + layerRadius * Math.cos(angle);
          layoutNodes[nodeIndex].y = centerY + layerRadius * Math.sin(angle);
          nodeIndex++;
        }
        layer++;
      }
    }

    graphData.value = {
      nodes: layoutNodes,
      edges: edges,
    };

    // 加载每个节点的详细信息
    for (const node of graphData.value.nodes) {
      try {
        const detail = await getPerson(node.id);
        node.personDetail = detail;
      } catch (e) {
        console.error('加载人物详情失败', node.name, e);
      }
    }

    await nextTick();
    drawGraph();
  } catch (e) {
    console.error('加载关系图谱失败', e);
  }
};

const drawGraph = () => {
  const ctx = uni.createCanvasContext('relationshipGraph');
  if (!ctx) return;

  const width = canvasWidth.value;
  const height = canvasHeight.value;

  // 清空画布
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, width, height);

  // 应用缩放和平移
  ctx.save();
  ctx.translate(width / 2 + offsetX.value, height / 2 + offsetY.value);
  ctx.scale(scale.value, scale.value);

  const { nodes, edges } = graphData.value;

  // 绘制边（关系线）
  for (const edge of edges) {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);
    if (!sourceNode || !targetNode) continue;

    const edgeColor = relationColors[edge.relationType] || '#bbb';

    // 计算线条起止点（从节点边缘开始，而不是中心）
    const dx = targetNode.x - sourceNode.x;
    const dy = targetNode.y - sourceNode.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) continue;

    const startX = sourceNode.x + (dx / dist) * sourceNode.radius;
    const startY = sourceNode.y + (dy / dist) * sourceNode.radius;
    const endX = targetNode.x - (dx / dist) * targetNode.radius;
    const endY = targetNode.y - (dy / dist) * targetNode.radius;

    // 画线
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 画箭头
    const arrowSize = 8;
    const angle = Math.atan2(endY - startY, endX - startX);
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowSize * Math.cos(angle - Math.PI / 6),
      endY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      endX - arrowSize * Math.cos(angle + Math.PI / 6),
      endY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = edgeColor;
    ctx.fill();

    // 在连线中间画关系类型标签
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    ctx.font = '11px sans-serif';
    ctx.fillStyle = edgeColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(edge.relationType, midX, midY - 10);
  }

  // 绘制节点
  for (const node of nodes) {
    // 画节点圆形
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
    ctx.fillStyle = node.color;
    ctx.fill();

    // 画名字
    ctx.font = `bold ${Math.max(12, node.radius * 0.6)}px sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.name, node.x, node.y);
  }

  ctx.restore();
  ctx.draw();
};

const findNodeAtPosition = (screenX: number, screenY: number): LayoutNode | null => {
  const { nodes } = graphData.value;
  const width = canvasWidth.value;
  const height = canvasHeight.value;

  // 将屏幕坐标转换为图坐标
  const graphX = (screenX - width / 2 - offsetX.value) / scale.value;
  const graphY = (screenY - height / 2 - offsetY.value) / scale.value;

  for (const node of nodes) {
    const dx = graphX - node.x;
    const dy = graphY - node.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= node.radius) {
      return node;
    }
  }
  return null;
};

const onTouchStart = (event: any) => {
  const touches = event.touches;
  if (touches.length === 1) {
    // 单指触摸 - 准备拖拽或点击
    touchStartX = touches[0].x;
    touchStartY = touches[0].y;
    touchStartOffsetX = offsetX.value;
    touchStartOffsetY = offsetY.value;
  } else if (touches.length === 2) {
    // 双指捏合 - 缩放
    isPinching = true;
    const dx = touches[0].x - touches[1].x;
    const dy = touches[0].y - touches[1].y;
    initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
    initialScale = scale.value;
  }
};

const onTouchMove = (event: any) => {
  const touches = event.touches;
  if (touches.length === 1 && !isPinching) {
    // 单指拖拽
    const dx = touches[0].x - touchStartX;
    const dy = touches[0].y - touchStartY;
    offsetX.value = touchStartOffsetX + dx;
    offsetY.value = touchStartOffsetY + dy;
    drawGraph();
  } else if (touches.length === 2 && isPinching) {
    // 双指缩放
    const dx = touches[0].x - touches[1].x;
    const dy = touches[0].y - touches[1].y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const newScale = Math.max(0.5, Math.min(3, initialScale * (distance / initialPinchDistance)));
    scale.value = newScale;
    drawGraph();
  }
};

const onTouchEnd = (event: any) => {
  if (isPinching) {
    isPinching = false;
    return;
  }

  // 判断是否为点击（不是拖拽）
  const touches = event.changedTouches;
  if (touches.length === 1) {
    const endX = touches[0].x;
    const endY = touches[0].y;
    const dx = endX - touchStartX;
    const dy = endY - touchStartY;
    const moveDist = Math.sqrt(dx * dx + dy * dy);

    if (moveDist < 10) {
      // 点击事件 - 检查是否点击了节点
      const node = findNodeAtPosition(endX, endY);
      if (node) {
        selectedPerson.value = node;
      }
    }
  }
};

const onAddPerson = () => {
  uni.showToast({ title: '添加人物', icon: 'none' });
};

// 获取系统信息设置画布大小
const getSystemInfo = () => {
  const info = uni.getSystemInfoSync();
  canvasWidth.value = info.windowWidth;
  canvasHeight.value = info.windowHeight - 100; // 留出底部空间
};

onMounted(() => {
  getSystemInfo();
  loadGraphData();
});
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  position: relative;
}

.graph-canvas {
  width: 100%;
  height: calc(100vh - 100rpx);
}

.empty {
  padding: 100rpx 0;
  text-align: center;
  color: #999;
}

// 人物详情弹窗
.person-detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

.detail-content {
  background-color: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
  width: 80%;
  max-width: 600rpx;
  max-height: 80vh;
  overflow-y: auto;
}

.detail-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 30rpx;
}

.avatar-large {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background-color: #e8eaf6;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20rpx;

  .avatar-text {
    font-size: 48rpx;
    color: #3f51b5;
    font-weight: bold;
  }
}

.detail-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.detail-category {
  font-size: 24rpx;
  color: #3f51b5;
  background-color: #e8eaf6;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}

.detail-relations {
  margin-bottom: 30rpx;
}

.relations-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
  display: block;
}

.relation-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 20rpx;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  margin-bottom: 10rpx;
}

.relation-type {
  font-size: 26rpx;
  color: #3f51b5;
  font-weight: 500;
}

.relation-target {
  font-size: 26rpx;
  color: #666;
}

.close-btn {
  width: 100%;
  background-color: #3f51b5;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  padding: 16rpx;
  font-size: 30rpx;
}
</style>
