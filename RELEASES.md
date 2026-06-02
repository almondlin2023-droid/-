# 生产发布记录

## v1.0.0 — 2026-06-02

**首次部署** | 服务器: 111.229.33.234 (腾讯云 Lighthouse CentOS 7.6)

### 包含内容
- 前端: Next.js 16.2.6 + Clerk 认证 + Dashboard/电站管理/诊断流程/报告中心
- 引擎: FastAPI + 三层诊断架构(检测→量化→归因) + 18项损失模型
- 基础: PostgreSQL + Redis + MinIO + Celery Worker + Nginx

### 部署配置
- Docker Compose 七容器编排
- Dockerfile: engine-api, engine-worker, engine-frontend
- Dockerfile CMD JSON 语法修复
- Pydantic Settings extra="ignore" 修复
- Python 循环导入修复 (detectors models 提取, attribution 直接引用)

### 已知问题
- Worker 容器循环导入已修复，7/7 容器全部正常运行
- 外部访问需在腾讯云控制台开放 80/8000 端口
- Clerk Dashboard 需添加 `http://111.229.33.234` 为 Allowed Origin

