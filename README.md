# AIO Life (All In One Life)

> 记录生活的所有数据 (Record all life data)

[![Vben Admin](https://img.shields.io/badge/Based%20on-Vue%20Vben%20Admin-blue)](https://github.com/vbenjs/vue-vben-admin)

## 📖 简介 (Introduction)

**AIO Life** 是一个基于 [Vue Vben Admin 5.0](https://github.com/vbenjs/vue-vben-admin) 构建的一站式个人生活数据管理平台。旨在帮助你记录和分析生活中的各类数据，从财务状况到娱乐活动，从待办事项到时间追踪，全方位掌握生活节奏。

## ✨ 功能特性 (Features)

### 📊 仪表盘 (Dashboard)
- **分析页 (Analytics)**: 数据概览与可视化分析
- **工作台 (Workspace)**: 个人工作台与常用功能快捷入口

### 💰 财务管理 (Finance)
- **收支概览**: 财务状况一目了然
- **支出管理 (Expense)**: 记录日常开销，支持支付宝导入
- **收入管理 (Income)**: 记录各类收入来源

### 📺 娱乐生活 (Entertainment)
- **Bilibili 视频**: 记录看过的 Bilibili 视频数据

### ✅ 效率工具 (Productivity)
- **待办事项 (Todo)**: 任务管理与追踪
- **时间追踪 (Time Tracker)**: 记录时间投入，分析时间利用率
- **思考笔记 (Think)**: 随时记录灵感与想法

### 🛠 系统管理 (System)
- **字典管理**: 系统数据字典配置

## 🛠 技术栈 (Tech Stack)

- **Frontend**: [Vue 3](https://vuejs.org/), [Vite](https://vitejs.dev/), [TypeScript](https://www.typescriptlang.org/)
- **UI Framework**: [Ant Design Vue](https://antdv.com/), [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Mock Server**: [Nitro](https://nitro.unjs.io/)

## 🚀 快速开始 (Getting Started)

### 环境准备

- Node.js >= 20.10.0
- pnpm >= 9.12.0

### 安装依赖

```bash
# 启用 corepack (如果尚未启用)
corepack enable

# 安装依赖
pnpm install
```

### 启动项目

```bash
# 启动所有应用 (Frontend + Mock Server)
pnpm run dev

# 仅启动 Web 端 (Ant Design 版本)
pnpm run dev:antd
```

### 构建项目

```bash
# 构建所有应用
pnpm run build

# 仅构建 Web 端
pnpm run build:antd
```

