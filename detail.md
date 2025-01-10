# 项目结构说明
.
├── .vitepress/ # VitePress 配置和主题目录
│ └── theme/ # 自定义主题目录
│ ├── api/ # API 相关文件
│ ├── assets/ # 资源文件
│ ├── components/ # 组件目录
│ └── views/ # 页面视图
├── public/ # 静态资源目录
└── README.md # 项目说明文件

## 核心文件说明

### .vitepress/theme/

#### views/
- `Post.vue`: 博客文章页面组件，负责显示单篇文章的详细内容
- `Page.vue`: 通用页面组件，用于显示非文章类的页面内容

#### components/
- `RightMenu.vue`: 右侧菜单组件，提供文章目录导航等功能
- `Aside/Widgets/SiteData.vue`: 侧边栏站点数据组件，显示网站统计信息等

#### assets/
- `themeConfig.mjs`: 主题配置文件，包含主题的各种设置项，如导航栏配置、侧边栏配置等

#### api/
- `index.js`: API 接口封装文件，处理与后端的数据交互

## 主要功能模块

### 1. 文章展示系统
- 通过 `Post.vue` 实现文章的详细展示
- 支持 Markdown 渲染
- 文章目录导航

### 2. 页面布局系统
- 使用 `Page.vue` 处理通用页面布局
- 响应式设计
- 支持自定义页面模板

### 3. 导航系统
- `RightMenu.vue` 提供文章内容导航
- 支持目录自动生成
- 滚动监听和定位

### 4. 站点数据展示
- 通过 `SiteData.vue` 组件展示站点统计信息
- 支持自定义数据展示

### 5. 主题配置
- 使用 `themeConfig.mjs` 统一管理主题配置
- 支持自定义主题样式
- 灵活的配置选项

## 技术栈

- VitePress: 静态站点生成器
- Vue 3: 前端框架
- JavaScript/TypeScript: 编程语言
- CSS/SCSS: 样式处理

## 开发指南

1. 主题开发
    - 所有主题相关的开发都在 `.vitepress/theme/` 目录下进行
    - 组件开发遵循 Vue 3 组件规范

2. 页面开发
    - 新建页面时在 `views/` 目录下创建
    - 页面组件需要注册到路由系统中

3. API 开发
    - API 相关代码统一在 `api/` 目录下管理
    - 遵循模块化开发原则

4. 样式开发
    - 全局样式在 `assets/` 目录下管理
    - 组件样式采用 scoped 方式隔离

## 注意事项

1. 文件命名规范
    - 组件文件使用 PascalCase 命名
    - 工具类文件使用 camelCase 命名

2. 代码规范
    - 遵循 Vue 3 推荐的编码规范
    - 保持代码注释的完整性

3. 性能优化
    - 注意组件的按需加载
    - 合理使用缓存机制
