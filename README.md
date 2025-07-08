# ViewAnywhere - 3D模型在线查看器

一个基于Vue 3和Three.js的3D模型在线查看器，通过简单的URL链接即可在浏览器中查看3D模型。

## 项目简介

ViewAnywhere是一个轻量级的Web 3D模型查看器，支持通过URL参数动态加载和展示3D模型。用户只需要在URL中指定模型ID，即可在浏览器中查看对应的3D模型，无需安装任何插件或软件。

## 主要功能

- 🎯 **URL参数加载**: 通过`?modelid=模型名称`参数动态加载模型
- 🎮 **交互式查看**: 支持鼠标拖拽旋转、缩放、平移操作
- 📷 **多场景视角**: 支持预设相机位置和场景切换
- 💡 **光源控制**: 可调节环境光、主光源强度和颜色
- 🌈 **环境设置**: 可自定义天空颜色、地面网格等
- 📊 **实时信息**: 显示相机位置、角度等参数信息
- 📱 **响应式设计**: 适配不同屏幕尺寸

## 技术栈

- **前端框架**: Vue 3 + Vite
- **3D引擎**: Three.js
- **UI组件**: PrimeVue
- **构建工具**: Vite

## 使用方法

### 基本用法

在浏览器中访问以下格式的URL：

```
http://your-domain.com/?modelid=your_model_name
```

例如：
```
http://localhost:5173/?modelid=sample_model
```

### 模型文件要求

项目会自动从指定的服务器路径加载以下文件：
- `模型名称.obj` - 3D模型文件
- `模型名称_camera_info.json` - 相机配置文件（可选）

### 相机配置文件格式

相机配置文件支持多个预设场景：

```json
{
  "scenes": [
    {
      "name": "正面视角",
      "position": [0, 0, 10],
      "target": [0, 0, 0],
      "fov": 75
    }
  ]
}
```

## 开发环境设置

### 环境要求

- Node.js 16+
- npm 或 yarn

### 安装依赖

```sh
npm install
```

### 开发模式运行

```sh
npm run dev
```

### 生产环境构建

```sh
npm run build
```

### 预览构建结果

```sh
npm run preview
```

## 项目结构

```
src/
├── components/
│   └── ModelViewer.vue     # 主要的3D模型查看器组件
├── js/
│   ├── model-loader.js     # 模型加载器
│   ├── scene-manager.js    # 场景管理器
│   ├── camera-controller.js # 相机控制器
│   ├── interaction-controller.js # 交互控制器
│   └── camera-config-loader.js # 相机配置加载器
├── assets/                 # 静态资源
├── App.vue                # 根组件
└── main.js                # 入口文件
```

## 部署说明

### Docker部署

项目提供了多个Docker配置文件：

- `Dockerfile` - 标准部署
- `Dockerfile.dev` - 开发环境
- `Dockerfile.cn` - 中国镜像源

使用Docker Compose部署：

```sh
docker-compose up -d
```

### 服务器配置

确保模型文件服务器支持CORS跨域访问，并且模型文件路径格式为：
```
http://your-server:port/viewanywhere/{modelid}/{modelid}.obj
```

## 浏览器兼容性

- Chrome 88+
- Firefox 78+
- Safari 14+
- Edge 88+

## 许可证

本项目采用 MIT 许可证。

## 贡献

欢迎提交Issue和Pull Request来改进项目。
