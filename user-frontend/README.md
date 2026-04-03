# User Frontend - 搜索向导前端应用

一个现代化的商品搜索向导前端应用，使用 React、TypeScript、Vite 和 Tailwind CSS 构建。

## 功能特性

- 🔍 智能搜索 - 支持实时搜索建议
- 🎯 多维度筛选 - 分类、地区、价格区间
- 📱 响应式设计 - 完美支持桌面、平板、手机
- 🎨 蓝色主题 - 统一的品牌视觉风格
- ⚡ 快速响应 - 流畅的用户体验

## 技术栈

- **框架**: React 19 + TypeScript
- **构建工具**: Vite 8
- **样式**: Tailwind CSS 4
- **状态管理**: Zustand
- **路由**: React Router DOM
- **数据获取**: TanStack React Query
- **测试**: Vitest + React Testing Library

## 开发

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 代码检查

```bash
npm run lint
```

### 运行测试

```bash
# 运行所有测试
npm run test

# 运行测试并监听变化
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage
```

### 预览生产构建

```bash
npm run preview
```

## 测试覆盖

测试文件位于 `src/test/` 目录下：

- `SearchInput.test.tsx` - 搜索输入组件测试
- `SearchProgress.test.tsx` - 搜索进度组件测试
- `MerchantCard.test.tsx` - 商户卡片组件测试
- `ProductList.test.tsx` - 商品列表组件测试
- `useSearchHistory.test.ts` - 搜索历史 Hook 测试
- `useSearchProgress.test.ts` - 搜索进度 Hook 测试

### 组件测试覆盖

| 组件 | 行覆盖率 | 函数覆盖率 |
|------|---------|-----------|
| SearchInput | 95% | 100% |
| SearchProgress | 100% | 100% |
| MerchantCard | 94% | 90% |
| ProductList | 86% | 80% |
| useSearchHistory | 96% | 100% |

## 项目结构

```
src/
├── api/              # API 接口和模拟数据
├── assets/           # 静态资源
├── components/       # React 组件
│   ├── CategoryFilter.tsx
│   ├── MerchantCard.tsx
│   ├── ProductList.tsx
│   ├── SearchInput.tsx
│   ├── SearchProgress.tsx
│   └── ...
├── hooks/            # 自定义 Hooks
├── pages/            # 页面组件
├── router/           # 路由配置
├── stores/           # Zustand 状态管理
├── styles/           # 样式文件
├── test/             # 测试文件
├── types/            # TypeScript 类型定义
└── utils/            # 工具函数
```

## 浏览器支持

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 许可证

MIT License