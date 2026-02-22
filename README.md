# 天文观测台 🌌

基于浏览器的行星位置查询与可视化网站，支持实时天象和历史天象查询，提供太阳系3D俯视和地球天空两种视角。

## 功能特性

### 两种工作模式
- **本地模式**：自动获取 GPS 位置 + 当前时间，每分钟自动刷新
- **指定模式**：手动输入经纬度和任意日期时间，查询历史或未来天象

### 两种显示视角
- **太阳系视角**：俯瞰黄道面，显示太阳、八大行星、月球的轨道和实时位置，支持鼠标旋转/缩放
- **天空视角**：以观测者为中心仰望天空，显示行星位置、背景恒星（100颗亮星）、黄道线，支持拖拽旋转

### 天象检测
- 自动检测并提示：行星连珠（≥3颗行星黄经差<45°）、冲日、合日

### 移动端支持
- 响应式布局，手机/平板/桌面自适应
- 触摸手势：单指拖拽旋转、双指捏合缩放
- 移动端底部抽屉式控制面板

## 技术栈

| 技术 | 用途 |
|------|------|
| React 19 + Vite 5 | 前端框架与构建 |
| Three.js | 3D 渲染（太阳系视图 + 天空穹顶） |
| astronomy-engine | 天文计算（精度 < 1角分，无需外部API） |
| Tailwind CSS 4 | 响应式深色主题 UI |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build
```

打开 http://localhost:5173 即可使用。

## 项目结构

```
src/
├── components/
│   ├── SolarSystemView.jsx  # 太阳系3D俯视场景
│   ├── SkyView.jsx          # 天空穹顶场景
│   ├── ControlPanel.jsx     # 控制面板（模式/时间/地点）
│   └── InfoPanel.jsx        # 天体详情弹窗
├── hooks/
│   ├── useAstronomy.js      # 天文计算核心（astronomy-engine封装）
│   └── useGeolocation.js    # 浏览器定位
└── utils/
    ├── coordinates.js       # 坐标变换（Alt/Az、黄道、恒星时）
    └── planetConfig.js      # 行星配置与星色映射

docs/
├── SRD.md                   # 软件需求文档
└── DESIGN.md                # 技术设计文档

public/data/
└── stars_bright.json        # 亮星星表（100颗，mag < 3.0）
```

## 操作说明

### 太阳系视角
- 鼠标左键拖拽：旋转视角
- 滚轮：缩放
- 点击行星：查看详细信息

### 天空视角
- 鼠标拖拽：旋转视角（拖拽方向与天空移动方向一致）
- 双指捏合（移动端）：缩放视野
- 点击行星标记：查看详细信息

## 数据来源

- 行星位置：[astronomy-engine](https://github.com/cosinekitty/astronomy)（基于 VSOP87 算法，精度 < 1角分）
- 星表数据：基于 [HYG Database](https://github.com/astronexus/HYG-Database)（CC BY-SA 2.5）
- 全部客户端计算，无需外部 API，支持离线使用

## 验证精度

与 Stellarium 对比（2026-02-21 20:00 北京）：行星位置误差 < 1°。
