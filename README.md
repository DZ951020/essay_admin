# essays_admin

一个基于 Express.js 和 MySQL 的随笔管理后端 API 服务。

## 项目概述

essays_admin 是一个轻量级的后端 API 服务，用于管理随笔内容。它提供了完整的 CRUD 操作，可以轻松集成到各种前端应用中。

## 技术栈

- **后端框架**: Express.js
- **数据库**: MySQL
- **ORM**: mysql2
- **环境变量管理**: dotenv

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/DZ951020/essay_admin.git
cd essay_admin
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.env` 文件并配置以下环境变量：

```
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=123456
DB_NAME=essays_db
```

### 4. 启动服务

```bash
node app.js
```

服务将在 `http://localhost:3000` 启动。

## API 接口文档

### 获取所有随笔

```
GET /api/essays
```

**响应示例**:
```json
{
  "essays": [
    {
      "id": 1,
      "title": "我的第一篇随笔",
      "content": "这是我的第一篇测试随笔内容。",
      "created_at": "2026-01-16T03:20:27.000Z",
      "updated_at": "2026-01-16T03:20:27.000Z"
    },
    {
      "id": 2,
      "title": "学习 Node.js",
      "content": "今天开始学习 Node.js，感觉很有趣！",
      "created_at": "2026-01-16T03:20:27.000Z",
      "updated_at": "2026-01-16T03:20:27.000Z"
    }
  ]
}
```

### 获取单个随笔

```
GET /api/essays/:id
```

**参数**:
- `id`: 随笔 ID

**响应示例**:
```json
{
  "essay": {
    "id": 1,
    "title": "我的第一篇随笔",
    "content": "这是我的第一篇测试随笔内容。",
    "created_at": "2026-01-16T03:20:27.000Z",
    "updated_at": "2026-01-16T03:20:27.000Z"
  }
}
```

### 创建新随笔

```
POST /api/essays
```

**请求体**:
```json
{
  "title": "新随笔标题",
  "content": "新随笔内容"
}
```

**响应示例**:
```json
{
  "essay": {
    "id": 3,
    "title": "新随笔标题",
    "content": "新随笔内容",
    "created_at": "2026-01-16T04:00:00.000Z",
    "updated_at": "2026-01-16T04:00:00.000Z"
  }
}
```

### 更新随笔

```
PUT /api/essays/:id
```

**参数**:
- `id`: 随笔 ID

**请求体**:
```json
{
  "title": "更新后的标题",
  "content": "更新后的内容"
}
```

**响应示例**:
```json
{
  "essay": {
    "id": 1,
    "title": "更新后的标题",
    "content": "更新后的内容",
    "created_at": "2026-01-16T03:20:27.000Z",
    "updated_at": "2026-01-16T04:05:00.000Z"
  }
}
```

### 删除随笔

```
DELETE /api/essays/:id
```

**参数**:
- `id`: 随笔 ID

**响应示例**:
```json
{
  "message": "随笔删除成功"
}
```

## 项目结构

```
.
├── app.js          # 主应用文件
├── .env            # 环境变量配置
├── .gitignore      # Git 忽略文件
├── init_db.sql     # 数据库初始化脚本
├── package.json    # 项目配置
├── package-lock.json # 依赖版本锁定
└── README.md       # 项目文档
```

## 数据库设计

### essays 表

| 字段名      | 类型      | 描述                     |
|------------|-----------|--------------------------|
| id         | INT       | 主键，自增               |
| title      | VARCHAR   | 随笔标题                 |
| content    | TEXT      | 随笔内容                 |
| created_at | TIMESTAMP | 创建时间，默认当前时间   |
| updated_at | TIMESTAMP | 更新时间，默认当前时间   |

## 自动初始化

应用启动时会自动完成以下操作：

1. 创建数据库（如果不存在）
2. 创建表结构（如果不存在）
3. 插入示例数据（如果表为空）

## 跨域支持

服务已配置 CORS，支持所有来源的请求：

```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
```

## 部署

可以使用各种 Node.js 托管服务部署 essays_admin，如：

- Heroku
- Vercel
- AWS Elastic Beanstalk
- 阿里云函数计算

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

ISC License
