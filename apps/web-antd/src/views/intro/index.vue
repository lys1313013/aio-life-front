<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';
import { preferences } from '@vben/preferences';

defineOptions({ name: 'ProductIntro' });

const router = useRouter();

const appName = computed(() => preferences.app.name);
const logo = computed(() => preferences.logo.source);

const features = [
  {
    icon: 'mdi:chart-timeline-variant',
    title: '时迹 · 时间记录',
    desc: '以时间块记录每一天的去向，看板自动汇总统计，配合自定义分类，看清时间花在了哪里。',
    span: 2,
    visual: 'timeline',
  },
  {
    icon: 'mdi:target',
    title: '任务中心',
    desc: '待办与目标管理双引擎，长期目标拆解为每日行动。',
  },
  {
    icon: 'mdi:wallet-outline',
    title: '财务中心',
    desc: '收支记账、账单导入、概览图表，个人财务一目了然。',
    visual: 'sparkline',
  },
  {
    icon: 'mdi:code-tags',
    title: '编程看板',
    desc: 'GitHub、LeetCode、CSDN 数据自动同步，沉淀你的技术成长轨迹。',
    span: 2,
    visual: 'heatmap',
  },
  {
    icon: 'mdi:notebook-outline',
    title: '生活记录',
    desc: '运动、阅读、观影、笔记、闪念、活动、里程碑、纪念日、荣誉——人生的每个维度都有处安放。',
    tags: ['运动', '阅读', '观影', '闪念', '笔记', '荣誉', '纪念日'],
  },
  {
    icon: 'mdi:graph-outline',
    title: '关系图谱',
    desc: 'Neo4j 图数据库驱动，可视化你的人际网络与关系脉络。',
    visual: 'graph',
  },
  {
    icon: 'mdi:robot-outline',
    title: 'AI 智能助理',
    desc: 'LangChain4j + OpenAI 接入，API Key 自主管理，支持 MCP 协议扩展工具能力。',
    span: 2,
    visual: 'orb',
  },
  {
    icon: 'mdi:shield-key-outline',
    title: '密码管理',
    desc: '加密存储账号密码，敏感数据不上云。',
  },
  {
    icon: 'mdi:hanger',
    title: '衣柜管理',
    desc: '数字化你的衣橱，穿搭有据可依。',
  },
];

const highlights = [
  { icon: 'mdi:theme-light-dark', text: '亮色 / 暗色双主题' },
  { icon: 'mdi:cellphone-link', text: '桌面与移动端全适配' },
  { icon: 'mdi:sync', text: '第三方平台数据自动同步' },
  { icon: 'mdi:lock-outline', text: '数据私有部署，安全可控' },
];

// 贡献热力图：确定性伪随机，避免每次渲染跳动
const heatmapCells = Array.from({ length: 7 * 24 }, (_, i) => {
  const x = Math.sin(i * 12.9898) * 43_758.547;
  return x - Math.floor(x);
});

function levelOf(v: number) {
  if (v < 0.35) return 0;
  if (v < 0.6) return 1;
  if (v < 0.8) return 2;
  if (v < 0.93) return 3;
  return 4;
}

function goLogin() {
  router.push('/auth/login');
}

function scrollToFeatures() {
  document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' });
}

let observer: IntersectionObserver | undefined;

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer?.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15 },
  );
  document
    .querySelectorAll('[data-reveal]')
    .forEach((el) => observer?.observe(el));
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div class="intro-page">
    <!-- 背景层 -->
    <div class="bg-layer" aria-hidden="true">
      <div class="aurora aurora-a"></div>
      <div class="aurora aurora-b"></div>
      <div class="aurora aurora-c"></div>
      <div class="grid-overlay"></div>
    </div>

    <!-- 导航 -->
    <header class="nav">
      <div class="nav-inner">
        <div class="nav-brand" @click="scrollToFeatures">
          <img v-if="logo" :src="logo" :alt="appName" class="nav-logo" />
          <span class="nav-name">{{ appName }}</span>
        </div>
        <button class="btn btn-primary btn-sm" @click="goLogin">
          进入系统
          <IconifyIcon icon="mdi:arrow-right" />
        </button>
      </div>
    </header>

    <!-- Hero -->
    <section class="hero">
      <div class="hero-kicker" data-reveal>
        <span class="kicker-dot"></span>
        ALL IN ONE · 人生数据管理系统
      </div>
      <h1 class="hero-title" data-reveal style="--delay: 80ms">
        记录、统计、分析<br />
        <span class="gradient-text">你人生的所有数据</span>
      </h1>
      <p class="hero-desc" data-reveal style="--delay: 160ms">
        时间去向、目标待办、收支财务、生活点滴、编程成长、人际关系——
        分散各处的数据，在这里汇聚成完整的人生全景。
      </p>
      <div class="hero-actions" data-reveal style="--delay: 240ms">
        <button class="btn btn-primary btn-lg" @click="goLogin">
          立即开始
          <IconifyIcon icon="mdi:arrow-right" />
        </button>
        <button class="btn btn-ghost btn-lg" @click="scrollToFeatures">
          <IconifyIcon icon="mdi:view-grid-outline" />
          了解功能
        </button>
      </div>

      <!-- 漂浮装饰 -->
      <div class="float-chip chip-a" aria-hidden="true">
        <IconifyIcon icon="mdi:chart-timeline-variant" />
        <span>时迹</span>
      </div>
      <div class="float-chip chip-b" aria-hidden="true">
        <IconifyIcon icon="mdi:robot-outline" />
        <span>AI 助理</span>
      </div>
      <div class="float-chip chip-c" aria-hidden="true">
        <IconifyIcon icon="mdi:graph-outline" />
        <span>关系图谱</span>
      </div>
    </section>

    <!-- 功能矩阵 -->
    <section id="features" class="section">
      <div class="section-head" data-reveal>
        <h2 class="section-title">一个系统，装下全部生活</h2>
        <p class="section-desc">九大功能模块，覆盖记录、管理与分析的完整闭环</p>
      </div>

      <div class="bento">
        <div
          v-for="(f, i) in features"
          :key="f.title"
          class="card"
          :class="{ 'card-span-2': f.span === 2 }"
          data-reveal
          :style="{ '--delay': `${(i % 4) * 70}ms` }"
        >
          <div class="card-icon">
            <IconifyIcon :icon="f.icon" />
          </div>
          <h3 class="card-title">{{ f.title }}</h3>
          <p class="card-desc">{{ f.desc }}</p>

          <!-- 时迹：时间块 -->
          <div
            v-if="f.visual === 'timeline'"
            class="v-timeline"
            aria-hidden="true"
          >
            <span style="width: 14%; --c: hsl(var(--primary))"></span>
            <span style="width: 22%; --c: #8b5cf6"></span>
            <span style="width: 8%; --c: #22d3ee"></span>
            <span style="width: 18%; --c: #34d399"></span>
            <span style="width: 12%; --c: #fbbf24"></span>
            <span style="width: 26%; --c: #f472b6"></span>
          </div>

          <!-- 财务：走势 -->
          <svg
            v-else-if="f.visual === 'sparkline'"
            class="v-spark"
            viewBox="0 0 200 60"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stop-color="hsl(var(--primary))"
                  stop-opacity="0.35"
                />
                <stop
                  offset="100%"
                  stop-color="hsl(var(--primary))"
                  stop-opacity="0"
                />
              </linearGradient>
            </defs>
            <path
              d="M0 45 L25 38 L50 42 L75 28 L100 33 L125 18 L150 24 L175 10 L200 14 L200 60 L0 60 Z"
              fill="url(#sparkFill)"
            />
            <path
              d="M0 45 L25 38 L50 42 L75 28 L100 33 L125 18 L150 24 L175 10 L200 14"
              fill="none"
              stroke="hsl(var(--primary))"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>

          <!-- 编程：贡献热力图 -->
          <div
            v-else-if="f.visual === 'heatmap'"
            class="v-heat"
            aria-hidden="true"
          >
            <span
              v-for="(v, cellIndex) in heatmapCells"
              :key="cellIndex"
              :class="`lv-${levelOf(v)}`"
            ></span>
          </div>

          <!-- 关系：节点图 -->
          <svg
            v-else-if="f.visual === 'graph'"
            class="v-graph"
            viewBox="0 0 200 90"
            aria-hidden="true"
          >
            <line x1="100" y1="45" x2="35" y2="20" />
            <line x1="100" y1="45" x2="40" y2="72" />
            <line x1="100" y1="45" x2="165" y2="18" />
            <line x1="100" y1="45" x2="170" y2="66" />
            <line x1="35" y1="20" x2="165" y2="18" />
            <circle cx="100" cy="45" r="9" class="node-main" />
            <circle cx="35" cy="20" r="5" class="node" />
            <circle cx="40" cy="72" r="5" class="node" />
            <circle cx="165" cy="18" r="5" class="node" />
            <circle cx="170" cy="66" r="5" class="node" />
          </svg>

          <!-- AI：光球 -->
          <div v-else-if="f.visual === 'orb'" class="v-orb" aria-hidden="true">
            <div class="orb"></div>
            <div class="orb-ring"></div>
          </div>

          <!-- 生活记录：标签 -->
          <div v-if="f.tags" class="v-tags">
            <span v-for="t in f.tags" :key="t">{{ t }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 特性条 -->
    <section class="section section-tight">
      <div class="highlight-band" data-reveal>
        <div v-for="h in highlights" :key="h.text" class="highlight-item">
          <IconifyIcon :icon="h.icon" />
          <span>{{ h.text }}</span>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="section section-tight">
      <div class="cta" data-reveal>
        <h2 class="cta-title">开始经营你的人生数据</h2>
        <p class="cta-desc">注册一个账号，把生活的每一面都记录下来</p>
        <button class="btn btn-primary btn-lg" @click="goLogin">
          进入系统
          <IconifyIcon icon="mdi:arrow-right" />
        </button>
      </div>
    </section>

    <footer class="footer">
      <span>{{ appName }} · All In One 人生管理系统</span>
      <span class="footer-link" @click="goLogin">登录 / 注册</span>
    </footer>
  </div>
</template>

<style scoped>
.intro-page {
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
  color: hsl(var(--foreground));
  background: hsl(var(--background));
}

/* ---------- 背景 ---------- */
.bg-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.aurora {
  position: absolute;
  border-radius: 9999px;
  filter: blur(90px);
  will-change: transform;
}

.aurora-a {
  top: -15%;
  left: -10%;
  width: 45vw;
  height: 45vw;
  min-width: 360px;
  min-height: 360px;
  background: radial-gradient(
    circle,
    hsl(var(--primary) / 35%),
    transparent 70%
  );
  animation: drift-a 18s ease-in-out infinite alternate;
}

.aurora-b {
  top: 20%;
  right: -15%;
  width: 40vw;
  height: 40vw;
  min-width: 320px;
  min-height: 320px;
  background: radial-gradient(circle, rgb(139 92 246 / 28%), transparent 70%);
  animation: drift-b 22s ease-in-out infinite alternate;
}

.aurora-c {
  bottom: -20%;
  left: 30%;
  width: 38vw;
  height: 38vw;
  min-width: 300px;
  min-height: 300px;
  background: radial-gradient(circle, rgb(34 211 238 / 22%), transparent 70%);
  animation: drift-c 15s ease-in-out infinite alternate;
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, hsl(var(--foreground) / 5%) 1px, transparent 1px),
    linear-gradient(to bottom, hsl(var(--foreground) / 5%) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: linear-gradient(to bottom, black, transparent 60%);
}

@keyframes drift-a {
  to {
    transform: translate3d(7vw, 6vh, 0) scale(1.15);
  }
}

@keyframes drift-b {
  to {
    transform: translate3d(-6vw, 8vh, 0) scale(1.2);
  }
}

@keyframes drift-c {
  to {
    transform: translate3d(-5vw, -5vh, 0) scale(1.1);
  }
}

/* ---------- 通用 ---------- */
.nav,
.hero,
.section,
.footer {
  position: relative;
  z-index: 1;
}

.btn {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  cursor: pointer;
  border: none;
  border-radius: 0.8rem;
  transition:
    transform 0.2s ease,
    box-shadow 0.25s ease,
    background-color 0.25s ease,
    border-color 0.25s ease;
}

.btn:active {
  transform: scale(0.97);
}

.btn-sm {
  padding: 0.45rem 1rem;
  font-size: 0.85rem;
}

.btn-lg {
  padding: 0.85rem 1.75rem;
  font-size: 1rem;
}

.btn-primary {
  color: hsl(var(--primary-foreground));
  background: hsl(var(--primary));
  box-shadow: 0 8px 24px hsl(var(--primary) / 35%);
}

.btn-primary:hover {
  box-shadow: 0 10px 32px hsl(var(--primary) / 50%);
  transform: translateY(-1px);
}

.btn-ghost {
  color: hsl(var(--foreground));
  background: hsl(var(--foreground) / 6%);
  border: 1px solid hsl(var(--foreground) / 12%);
  backdrop-filter: blur(8px);
}

.btn-ghost:hover {
  border-color: hsl(var(--primary) / 50%);
  background: hsl(var(--primary) / 8%);
}

/* ---------- 导航 ---------- */
.nav {
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid hsl(var(--foreground) / 8%);
  backdrop-filter: blur(16px);
  background: hsl(var(--background) / 70%);
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: min(72rem, 100%);
  padding: 0.8rem 1.5rem;
  margin: 0 auto;
}

.nav-brand {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  cursor: pointer;
}

.nav-logo {
  width: 2rem;
  height: 2rem;
}

.nav-name {
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

/* ---------- Hero ---------- */
.hero {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 7rem 1.5rem 6rem;
  text-align: center;
}

.hero-kicker {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.4rem 1rem;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 8%);
  border: 1px solid hsl(var(--primary) / 25%);
  border-radius: 9999px;
}

.kicker-dot {
  width: 0.45rem;
  height: 0.45rem;
  background: hsl(var(--primary));
  border-radius: 50%;
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  50% {
    opacity: 0.35;
    transform: scale(0.8);
  }
}

.hero-title {
  margin: 1.75rem 0 0;
  font-size: clamp(2.2rem, 6vw, 4.2rem);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.gradient-text {
  background: linear-gradient(
    115deg,
    hsl(var(--primary)) 5%,
    #8b5cf6 50%,
    #22d3ee 95%
  );
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-desc {
  max-width: 38rem;
  margin: 1.5rem 0 0;
  font-size: clamp(0.95rem, 1.5vw, 1.1rem);
  line-height: 1.9;
  color: hsl(var(--muted-foreground));
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
  margin-top: 2.75rem;
}

/* 漂浮装饰 */
.float-chip {
  position: absolute;
  display: none;
  gap: 0.5rem;
  align-items: center;
  padding: 0.6rem 1.1rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  background: hsl(var(--background) / 55%);
  border: 1px solid hsl(var(--foreground) / 12%);
  border-radius: 1rem;
  box-shadow: 0 12px 32px hsl(var(--foreground) / 8%);
  backdrop-filter: blur(12px);
}

.float-chip :first-child {
  font-size: 1.15rem;
  color: hsl(var(--primary));
}

@media (min-width: 1024px) {
  .float-chip {
    display: inline-flex;
  }
}

.chip-a {
  top: 22%;
  left: 8%;
  animation: float-y 6s ease-in-out infinite;
}

.chip-b {
  top: 18%;
  right: 9%;
  animation: float-y 7s ease-in-out 1s infinite;
}

.chip-c {
  right: 14%;
  bottom: 12%;
  animation: float-y 8s ease-in-out 0.5s infinite;
}

@keyframes float-y {
  50% {
    transform: translateY(-14px);
  }
}

/* ---------- Section ---------- */
.section {
  width: min(72rem, 100%);
  padding: 5rem 1.5rem;
  margin: 0 auto;
}

.section-tight {
  padding-top: 1rem;
  padding-bottom: 2rem;
}

.section-head {
  margin-bottom: 3rem;
  text-align: center;
}

.section-title {
  margin: 0;
  font-size: clamp(1.6rem, 3.5vw, 2.4rem);
  font-weight: 800;
  letter-spacing: -0.01em;
}

.section-desc {
  margin: 0.9rem 0 0;
  font-size: 1rem;
  color: hsl(var(--muted-foreground));
}

/* ---------- Bento ---------- */
.bento {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.1rem;
}

@media (min-width: 768px) {
  .bento {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .bento {
    grid-template-columns: repeat(4, 1fr);
  }

  .card-span-2 {
    grid-column: span 2;
  }
}

.card {
  position: relative;
  padding: 1.6rem;
  overflow: hidden;
  background: hsl(var(--card) / 65%);
  border: 1px solid hsl(var(--foreground) / 10%);
  border-radius: 1.25rem;
  backdrop-filter: blur(14px);
  transition:
    transform 0.3s ease,
    border-color 0.3s ease,
    box-shadow 0.3s ease;
}

.card:hover {
  border-color: hsl(var(--primary) / 45%);
  box-shadow: 0 16px 40px hsl(var(--primary) / 12%);
  transform: translateY(-4px);
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.9rem;
  height: 2.9rem;
  margin-bottom: 1.1rem;
  font-size: 1.4rem;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 12%);
  border-radius: 0.9rem;
  transition:
    color 0.25s ease,
    background-color 0.25s ease;
}

.card:hover .card-icon {
  color: hsl(var(--primary-foreground));
  background: hsl(var(--primary));
}

.card-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}

.card-desc {
  margin: 0.55rem 0 0;
  font-size: 0.85rem;
  line-height: 1.75;
  color: hsl(var(--muted-foreground));
}

/* ---------- 卡内可视化 ---------- */
.v-timeline {
  display: flex;
  gap: 4px;
  height: 2.2rem;
  margin-top: 1.4rem;
  overflow: hidden;
  border-radius: 0.6rem;
}

.v-timeline span {
  height: 100%;
  background: var(--c);
  opacity: 0.85;
  transition: opacity 0.25s ease;
}

.v-timeline span:hover {
  opacity: 1;
}

.v-spark {
  width: 100%;
  height: 3.6rem;
  margin-top: 1.2rem;
}

.v-heat {
  display: grid;
  grid-template-rows: repeat(7, 1fr);
  grid-auto-flow: column;
  gap: 3px;
  margin-top: 1.4rem;
}

.v-heat span {
  aspect-ratio: 1;
  border-radius: 2px;
  background: hsl(var(--foreground) / 8%);
}

.v-heat .lv-1 {
  background: hsl(var(--primary) / 30%);
}

.v-heat .lv-2 {
  background: hsl(var(--primary) / 55%);
}

.v-heat .lv-3 {
  background: hsl(var(--primary) / 80%);
}

.v-heat .lv-4 {
  background: hsl(var(--primary));
}

.v-graph {
  width: 100%;
  height: 5.5rem;
  margin-top: 1rem;
}

.v-graph line {
  stroke: hsl(var(--primary) / 30%);
  stroke-width: 1.5;
}

.v-graph .node {
  fill: hsl(var(--primary) / 70%);
}

.v-graph .node-main {
  fill: hsl(var(--primary));
  animation: pulse-node 2.4s ease-in-out infinite;
}

@keyframes pulse-node {
  50% {
    opacity: 0.55;
  }
}

.v-orb {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 5.5rem;
  margin-top: 1rem;
}

.orb {
  width: 3.2rem;
  height: 3.2rem;
  background: conic-gradient(
    from 0deg,
    hsl(var(--primary)),
    #8b5cf6,
    #22d3ee,
    hsl(var(--primary))
  );
  border-radius: 50%;
  filter: blur(2px);
  animation: orb-spin 6s linear infinite;
}

.orb-ring {
  position: absolute;
  width: 4.6rem;
  height: 4.6rem;
  border: 1px dashed hsl(var(--primary) / 45%);
  border-radius: 50%;
  animation: orb-spin 12s linear infinite reverse;
}

@keyframes orb-spin {
  to {
    transform: rotate(360deg);
  }
}

.v-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 1.2rem;
}

.v-tags span {
  padding: 0.25rem 0.7rem;
  font-size: 0.75rem;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border: 1px solid hsl(var(--primary) / 22%);
  border-radius: 9999px;
}

/* ---------- 特性条 ---------- */
.highlight-band {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  padding: 1.75rem;
  background: hsl(var(--card) / 65%);
  border: 1px solid hsl(var(--foreground) / 10%);
  border-radius: 1.25rem;
  backdrop-filter: blur(14px);
}

@media (min-width: 768px) {
  .highlight-band {
    grid-template-columns: repeat(4, 1fr);
  }
}

.highlight-item {
  display: flex;
  gap: 0.7rem;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 600;
}

.highlight-item :first-child {
  font-size: 1.3rem;
  color: hsl(var(--primary));
}

/* ---------- CTA ---------- */
.cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem 1.5rem;
  text-align: center;
  background:
    radial-gradient(
      ellipse 60% 80% at 50% 120%,
      hsl(var(--primary) / 22%),
      transparent 70%
    ),
    hsl(var(--card) / 65%);
  border: 1px solid hsl(var(--foreground) / 10%);
  border-radius: 1.5rem;
  backdrop-filter: blur(14px);
}

.cta-title {
  margin: 0;
  font-size: clamp(1.5rem, 3vw, 2.2rem);
  font-weight: 800;
}

.cta-desc {
  margin: 0.9rem 0 2rem;
  color: hsl(var(--muted-foreground));
}

/* ---------- 页脚 ---------- */
.footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
  width: min(72rem, 100%);
  padding: 2rem 1.5rem 2.5rem;
  margin: 0 auto;
  font-size: 0.85rem;
  color: hsl(var(--muted-foreground));
}

.footer-link {
  font-weight: 600;
  color: hsl(var(--primary));
  cursor: pointer;
}

.footer-link:hover {
  text-decoration: underline;
}

/* ---------- 滚动入场 ---------- */
[data-reveal] {
  opacity: 0;
  transform: translateY(26px);
  transition:
    opacity 0.6s ease var(--delay, 0ms),
    transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) var(--delay, 0ms);
}

[data-reveal].in-view {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .aurora,
  .float-chip,
  .orb,
  .orb-ring,
  .kicker-dot,
  .v-graph .node-main {
    animation: none;
  }

  [data-reveal] {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
</style>
