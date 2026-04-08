# Changelog

All notable changes to this project will be documented in this file.

## [Version 1.0.0] - 2026-04-01

### 初始化发布

#### 新增功能

- **搜索功能**
  - 搜索输入框，带实时验证
  - 搜索历史记录 (localStorage 持久化)
  - 智能搜索建议
  
- **搜索进度显示**
  - 三步骤进度指示器 (Parse → Match → Products)
  - 实时加载动画
  - 步骤详情展示
  
- **筛选功能**
  - 分类筛选 (CategoryFilter)
  - 地区筛选 (RegionFilter)
  - 价格区间筛选 (PriceFilter)
  - 排序选项 (SortSelect)
  
- **商户和商品展示**
  - 商户卡片 (MerchantCard) - 可展开商品列表
  - 商品网格 (ProductList)
  - 骨架屏加载 (ProductSkeleton)
  
- **UI 组件**
  - 空状态提示 (EmptyState)
  - 热门搜索标签 (HotSearchTags)
  - 加载动画 (LoadingSpinner)
  - 搜索错误提示 (SearchError)

#### 技术实现

- **前端框架**: React 19 + TypeScript
- **构建工具**: Vite 8
- **样式方案**: Tailwind CSS 4
- **状态管理**: Zustand
- **路由**: React Router DOM v7
- **数据获取**: TanStack React Query
- **测试框架**: Vitest + React Testing Library
- **响应式设计**: 支持桌面/平板/手机

#### 测试

- **单元测试**: 54 个测试用例，通过率 100%
- **测试覆盖的组件**:
  - SearchInput - 95% 行覆盖率
  - SearchProgress - 100% 行覆盖率
  - MerchantCard - 94% 行覆盖率
  - ProductList - 86% 行覆盖率
  - useSearchHistory - 96% 行覆盖率
  - useSearchProgress - 基本功能测试

#### 设计

- **主题色**: 蓝色 (#3B82F6 / primary)
- **设计风格**: 现代、简洁、卡片式布局
- **响应式断点**:
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px

## [规划中]

### 待实现功能

- [ ] 用户认证
- [ ] 搜索结果缓存
- [ ] 国际化 (i18n)
- [ ] 深色模式
- [ ] PWA 支持
- [ ] 更复杂的筛选选项
- [ ] 搜索分析统计