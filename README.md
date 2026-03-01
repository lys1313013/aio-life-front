# AIO Life

> 记录、统计、分析人生的所有数据

[![Vben Admin](https://img.shields.io/badge/Based%20on-Vue%20Vben%20Admin-blue)](https://github.com/vbenjs/vue-vben-admin)

## 简介

**AIO Life** 是一款 All-in-One 人生管理系统，致力于全方位记录、统计与分析生活数据。通过主动录入与第三方同步，实现人生痕迹的全面数字化，助您洞察规律，掌控生活节奏。

## 功能

### 首页

- **当前状态**：数据来自于时迹
- **今日运动**：查询本地数据库获取当日运动状态
- **github**: 调用 github接口查询提交记录
- **leetcode**: 查询每日一题是否完成，点击可跳转到对应题目
- **扇贝单词**：调用扇贝单词的接口获取当天是否打卡

### 任务中心
- **待办**

### 记录
- **时迹**: 记录每天的时间花费
- **运动**：记录日常运动
- **视频观看**: 通过浏览器插件实现在 B站观看视频时自动同步指定的视频进度
- **闪念**: 随时记录灵感与想法
- **笔记**: 随便记点啥
- **里程碑**：记录生活关键节点

### 财务中心
- **概览**
- **收入**
- **支出**
- **账单导入**：支持支付宝和微信账单导入

### 物品中心
- **设备墙**

### 编程看板
- **GitHub 看板**: GitHub 数据统计
- **Leetcode 看板**：Leetcode数据统计

### 配置管理 （权限还未处理好，目前只能管理员查看与修改）
- **字典类型**: 维护字典类型
- **字典数据**: 维护字典数据 

### 系统管理
- **用户管理**：查看用户信息


## 截图展示
### 首页

![img.png](images/img.png)

### 时迹

![img_1.png](images/img_1.png)
![img_2.png](images/img_2.png)

### 设备墙

![img_5.png](images/img_5.png)

### Github 

![img_3.png](images/img_3.png)

### leetcode

![img_4.png](images/img_4.png)

### 视频观看

![img_6.png](images/img_6.png)

### 财务概览

![img_9.png](images/img_9.png)

### 收入

![img_8.png](images/img_8.png)

### 支出

![img_7.png](images/img_7.png)


## 技术栈

- **Frontend**: [Vue 3](https://vuejs.org/), [Vite](https://vitejs.dev/), [TypeScript](https://www.typescriptlang.org/)
- **UI Framework**: [Ant Design Vue](https://antdv.com/), [Tailwind CSS](https://tailwindcss.com/)
- **Charts**: [ECharts](https://echarts.apache.org/)

## 快速开始

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
# 启动应用
pnpm run dev
```

### 构建项目

```bash
# 构建应用
pnpm run build
```

## 开源与贡献

### 贡献流程

1. **Fork 仓库** ➜ 点击 GitHub 右上角 `Fork` 按钮。
2. **创建分支** ➜ 推荐使用有意义的分支名，如 `feature/data-scraper-optimization`。
3. **提交代码** ➜ 确保代码可读性高，符合规范。
4. **提交 Pull Request（PR）** ➜ 详细描述您的更改内容，并关联相关 issue（如有）。
5. **等待审核** ➜ 维护者会进行代码审核并合并。
