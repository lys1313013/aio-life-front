# 密码管理功能 需求文档

## 一、背景与目标

### 背景
用户账号密码过多，难以记忆。需要一个集中管理平台。

### 核心目标
- 只有密码 (`password`) 需要加密，账号 (`username`) 明文存储
- 后端不存明文密码、不存密钥、不存主密码
- 用户主密码自己记忆，丢失则密码永久无法解密
- 前端 SM4 加密，密钥由主密码 PBKDF2 派生，存于前端内存

---

## 二、加密方案

### 密钥派生
```
主密码（用户输入）
    ↓ PBKDF2（100000次迭代，SHA256）
    ↓ 每条记录独立的 salt
SM4 密钥（128bit）
    ↓ SM4/GCM 模式加密
密文（只用于 password 字段）
```

### 加密字段（存后端）
- `password`：密码（SM4加密存储）

### 明文字段（存后端）
- `username`：账号（明文）
- `remark`：备注（明文）
- `salt`：PBKDF2盐值（明文，用于派生解密密钥）
- `title`、`website`、`category`、`favorite`

---

## 三、数据库表结构

### 表名：password_vault

```sql
CREATE TABLE password_vault (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id         BIGINT NOT NULL COMMENT '所属用户ID',
    title           VARCHAR(100) NOT NULL COMMENT '标题，如 GitHub',
    website         VARCHAR(255) COMMENT '网站/应用名',
    category        VARCHAR(50) DEFAULT '其他' COMMENT '分类：工作/生活/金融/社交/其他',
    username        TEXT COMMENT '账号（明文）',
    password        TEXT COMMENT '密码（SM4加密存储）',
    salt            VARCHAR(64) NOT NULL COMMENT 'PBKDF2盐值，每条记录唯一',
    remark          TEXT COMMENT '备注（明文）',
    favorite        BOOLEAN DEFAULT FALSE COMMENT '是否收藏',
    create_user     BIGINT NOT NULL,
    create_time     DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    update_user     BIGINT,
    is_deleted      BOOLEAN DEFAULT FALSE COMMENT '逻辑删除',
    INDEX idx_user_id (user_id)
) COMMENT '密码库表';
```

### 加密说明
- 每条记录有独立的 `salt`，相同密码加密结果不同
- `salt` 明文存储，用于派生解密密钥
- 只有 `password` 字段存加密后密文（Base64），其他字段均为明文

---

## 四、功能清单

### 4.1 核心功能

| 功能 | 说明 |
|------|------|
| 设置主密码 | 首次使用时设置（需确认） |
| 解锁查看 | 输入主密码解锁，展示明文密码 |
| 添加密码 | 录入账号+密码+标题+分类 |
| 编辑密码 | 修改已存条目（密码需重新加密） |
| 删除密码 | 删除（逻辑删除） |
| 搜索 | 按标题/网站名模糊搜索 |
| 列表展示 | 显示标题+网站+分类+收藏 |
| 一键复制 | 复制账号或密码到剪贴板 |

### 4.2 密码生成器

| 参数 | 默认值 | 说明 |
|------|--------|------|
| length | 16 | 密码长度（8-32） |
| uppercase | true | 大写字母 A-Z |
| lowercase | true | 小写字母 a-z |
| numbers | true | 数字 0-9 |
| symbols | false | 特殊字符 !@#$%^&* |
| excludeAmbiguous | false | 排除易混淆字符（0/O、1/l/I）|

- 生成后直接填入密码框
- 不存库，只作为输入辅助

---

## 五、接口设计

### 5.1 后端接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /password/list | 查询密码列表 |
| GET | /password/{id} | 获取单条密码详情 |
| POST | /password | 新增密码（前端只加密password字段） |
| PUT | /password/{id} | 编辑密码 |
| DELETE | /password/{id} | 删除密码 |
| GET | /password/categories | 获取分类列表 |

### 5.2 数据格式

**添加/编辑 请求**
```json
{
  "title": "GitHub",
  "website": "https://github.com",
  "category": "工作",
  "username": "myaccount",
  "password": "BASE64_密文（只加密password）",
  "salt": "随机盐值",
  "remark": "这是备注",
  "favorite": false
}
```

**列表/详情 响应**
```json
{
  "code": 0,
  "data": [{
    "id": 1,
    "title": "GitHub",
    "website": "https://github.com",
    "category": "工作",
    "username": "myaccount",
    "password": "BASE64_密文",
    "salt": "盐值",
    "remark": "这是备注",
    "favorite": false,
    "createTime": "2026-04-28 10:00:00",
    "updateTime": "2026-04-28 10:00:00"
  }]
}
```

---

## 六、前端技术

| 模块 | 技术 |
|------|------|
| SM4 加解密 | `gm-crypto`（npm 包） |
| 密钥派生 | PBKDF2（Web Crypto API 内置）|
| 状态管理 | Pinia store（密码解锁状态）|
| 剪贴板 | 复制后 30 秒自动清除 |

---

## 七、安全约束

1. 主密码不经过网络传输，不存后端
2. 每条记录 salt 独立，防止相同密码加密结果相同
3. PBKDF2 迭代次数 100000 次，防暴力破解
4. 关闭页面或登出，密钥从内存消失
5. 复制密码后 30 秒自动清除剪贴板
6. 30 分钟无操作自动锁定，需重新输入主密码

---

## 八、异常流程

| 情况 | 处理 |
|------|------|
| 用户遗忘主密码 | 密码永久丢失，无法解密，无法找回 |
| 首次使用未设置主密码 | 引导用户设置后才能添加密码 |
| 超时自动锁 | 30分钟无操作自动锁定，需重新输入主密码 |

---

## 九、页面路径

```
/password-manager          密码管理首页（列表）
/password-manager/add      添加密码
/password-manager/edit/:id 编辑密码
/password-manager/lock     锁屏（需输入主密码解锁）
```

---

## 十、开发任务

### 后端（aio-life-serve）✅ 已完成
- [x] 创建 `password_vault` 表
- [x] 创建 `PasswordVaultController`
- [x] 创建 `PasswordVaultService`
- [x] 创建 `PasswordVaultMapper`
- [x] 实现增删改查 API

### 前端（aio-life-front）✅ 已完成
- [x] 添加路由 `/password-manager`
- [x] 创建密码管理 Pinia store（解锁状态）
- [x] 创建加密工具函数（PBKDF2 + SM4）
- [x] 实现密码列表页
- [x] 实现添加/编辑密码页
- [x] 实现密码生成器组件
- [x] 实现锁屏页