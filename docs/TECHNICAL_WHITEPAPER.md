# 天文观测台技术白皮书

## 项目概述

**天文观测台（Astro Planet Viewer）** 是一个基于 Web 的交互式天文可视化应用，使用 React + Three.js 构建，提供实时的行星位置查询和天球可视化功能。本文档详细阐述了项目的核心技术架构，包括坐标系设计、四元数旋转、鼠标控制和图形渲染等关键技术。

**版本**: 1.0
**日期**: 2026-02-23
**作者**: Claude Sonnet 4.6

---

## 目录

1. [坐标系统设计](#1-坐标系统设计)
2. [坐标转换算法](#2-坐标转换算法)
3. [四元数旋转系统](#3-四元数旋转系统)
4. [鼠标交互控制](#4-鼠标交互控制)
5. [图形渲染架构](#5-图形渲染架构)
6. [性能优化策略](#6-性能优化策略)
7. [问题诊断与解决](#7-问题诊断与解决)

---

## 1. 坐标系统设计

### 1.1 坐标系概述

本项目涉及三个主要坐标系，所有坐标系均采用**右手坐标系**：

| 坐标系 | X 轴 | Y 轴 | Z 轴 | 原点 | 用途 |
|--------|------|------|------|------|------|
| **地平坐标系** (Alt/Az) | 东 | 上（天顶） | 北（-Z=南） | 观测者 | 观测者视角的天体位置 |
| **Three.js 世界坐标系** | 东 | 上 | 北（-Z=南） | 相机 | 3D 场景渲染 |
| **赤道坐标系** (RA/Dec) | 春分点 | 赤道北 | 天北极 | 天球中心 | 天体的标准天文坐标 |

### 1.2 地平坐标系 (Horizontal Coordinate System)

**定义**:
- **高度角 (Altitude)**: 天体相对于地平线的仰角，范围 [-90°, +90°]
  - 0° = 地平线
  - +90° = 天顶
  - -90° = 天底
- **方位角 (Azimuth)**: 从正北方向顺时针测量的角度，范围 [0°, 360°)
  - 0° = 正北
  - 90° = 正东
  - 180° = 正南
  - 270° = 正西

**特点**:
- 观测者中心坐标系
- 随观测者位置和时间变化
- 直观反映天体在天空中的实际位置

### 1.3 赤道坐标系 (Equatorial Coordinate System)

**定义**:
- **赤经 (Right Ascension, RA)**: 从春分点沿天赤道向东测量的角度
  - 单位：小时 (0h-24h) 或度 (0°-360°)
  - 1h = 15°
- **赤纬 (Declination, Dec)**: 天体相对于天赤道的角距
  - 范围：[-90°, +90°]
  - 0° = 天赤道
  - +90° = 北天极
  - -90° = 南天极

**特点**:
- 天球固定坐标系
- 不随观测者位置变化
- 天文学标准坐标系

### 1.4 Three.js 世界坐标系

**定义**:
- 与地平坐标系一致
- 相机位于原点 (0, 0, 0)
- 天球半径：1000 单位（恒星）、970 单位（网格线）

**坐标映射**:
```javascript
x = R * cos(alt) * sin(az)   // 东分量
y = R * sin(alt)              // 上分量
z = -R * cos(alt) * cos(az)  // 北分量（注意负号）
```

---

## 2. 坐标转换算法

### 2.1 赤道坐标 → 地平坐标

**核心公式** (球面三角学):

```javascript
// 时角 (Hour Angle)
HA = LST - RA

// 高度角
sin(Alt) = sin(Dec) * sin(Lat) + cos(Dec) * cos(Lat) * cos(HA)
Alt = arcsin(sin(Alt))

// 方位角
cos(Az) = [sin(Dec) - sin(Alt) * sin(Lat)] / [cos(Alt) * cos(Lat)]
Az = arccos(cos(Az))

// 象限判断
if sin(HA) > 0:
    Az = 360° - Az
```

**参数说明**:
- `LST`: 本地恒星时 (Local Sidereal Time)
- `Lat`: 观测者纬度
- `RA`, `Dec`: 天体的赤道坐标

**实现位置**: `src/utils/coordinates.js:52-78`

### 2.2 极点奇异性处理

**问题**: 当天体接近天顶或天底时，`cos(Alt) ≈ 0`，导致方位角计算分母趋近于零。

**解决方案**:

```javascript
const denom = Math.cos(altitude * DEG2RAD) * Math.cos(latRad);
if (Math.abs(denom) < 1e-10) {
  // 极点附近，方位角由时角决定
  // 北天极：azimuth = 180° - HA
  // 南天极：azimuth = HA
  const azimuth = altitude > 0 ? (180 - ha + 360) % 360 : ha;
  return { altitude, azimuth };
}
```

**原理**:
- 在极点附近，所有赤经线收敛到同一点
- 方位角应该反映赤经线从不同方向接近极点
- 北天极：从南方看向北极，方位角 = 180° - HA
- 南天极：从北方看向南极，方位角 = HA

### 2.3 地平坐标 → 笛卡尔坐标

**公式**:

```javascript
x = R * cos(alt) * sin(az)   // 东
y = R * sin(alt)              // 上
z = -R * cos(alt) * cos(az)  // 南（负号表示 +Z 指向北）
```

**实现位置**: `src/utils/coordinates.js:11-19`

### 2.4 本地恒星时计算

**公式**:

```javascript
// 儒略日
JD = (Date.getTime() / 86400000) + 2440587.5

// 儒略世纪数
T = (JD - 2451545.0) / 36525.0

// 格林威治恒星时 (度)
GST = 280.46061837 + 360.98564736629 * (JD - 2451545.0)
      + 0.000387933 * T² - T³ / 38710000.0

// 本地恒星时
LST = (GST + 观测者经度) % 360
```

**实现位置**: `src/utils/coordinates.js:80-92`

---

## 3. 四元数旋转系统

### 3.1 为什么使用四元数？

**传统欧拉角的问题**:
- **万向锁 (Gimbal Lock)**: 当两个旋转轴对齐时，失去一个自由度
- **不连续性**: 角度跳变（如 359° → 0°）
- **插值困难**: 线性插值会产生不自然的旋转

**四元数的优势**:
- 无万向锁
- 平滑插值 (SLERP)
- 数值稳定
- 高效计算

### 3.2 轨迹球旋转算法

**核心思想**: 旋转轴垂直于鼠标移动方向，旋转角度与鼠标移动距离成正比。

**算法实现**:

```javascript
function rotateSky(dx, dy, factor) {
  // 1. 计算旋转轴（屏幕空间）
  const rotationAxis = new THREE.Vector3(dy, dx, 0).normalize();

  // 2. 转换到世界空间
  rotationAxis.applyQuaternion(orientationRef.current);

  // 3. 计算旋转角度
  const angle = Math.sqrt(dx * dx + dy * dy) * factor;

  // 4. 创建旋转四元数
  const rotationQ = new THREE.Quaternion().setFromAxisAngle(rotationAxis, angle);

  // 5. 应用旋转
  orientationRef.current.premultiply(rotationQ);
  camera.quaternion.copy(orientationRef.current);
}
```

**实现位置**: `src/components/SkyView.jsx:298-317`

### 3.3 旋转轴推导

**屏幕空间到世界空间的转换**:

1. **屏幕空间**: 鼠标移动向量 `(dx, dy)`
2. **旋转轴**: 垂直于移动方向 `(dy, dx, 0)`
   - 向右移动 (dx > 0) → 旋转轴指向上方 (0, dx, 0)
   - 向上移动 (dy > 0) → 旋转轴指向右方 (dy, 0, 0)
3. **世界空间**: 应用当前相机朝向的四元数变换

**数学原理**:
```
旋转轴 ⊥ 鼠标移动方向
旋转效果 = 天球沿垂直于鼠标移动的轴旋转
```

### 3.4 惯性旋转

**实现**:

```javascript
// 速度衰减系数
const DAMPING = 0.90;

// 更新速度（EMA 平滑）
velocityRef.current = {
  dx: 0.7 * dx + 0.3 * velocityRef.current.dx,
  dy: 0.7 * dy + 0.3 * velocityRef.current.dy,
};

// 松手后继续旋转
if (!isDragging && (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05)) {
  rotateSky(dx, dy, factor);
  velocityRef.current = {
    dx: dx * DAMPING,
    dy: dy * DAMPING
  };
}
```

**实现位置**: `src/components/SkyView.jsx:204-213`

---

## 4. 鼠标交互控制

### 4.1 交互模式

| 操作 | 桌面端 | 移动端 | 效果 |
|------|--------|--------|------|
| 旋转视角 | 鼠标拖拽 | 单指拖拽 | 轨迹球旋转 |
| 缩放 | 鼠标滚轮 | 双指捏合 | 调整 FOV |
| 选择天体 | 鼠标点击 | 触摸点击 | 显示详情 |
| 悬停星座 | 鼠标移动 | - | 高亮星座 |

### 4.2 事件处理流程

**鼠标拖拽**:

```javascript
onMouseDown → 记录初始位置，清空速度
onMouseMove → 计算 dx/dy，更新速度，调用 rotateSky()
onMouseUp   → 停止拖拽，启动惯性旋转
```

**触摸控制**:

```javascript
onTouchStart → 记录触摸点
onTouchMove  →
  - 单指：旋转视角
  - 双指：计算距离变化，调整 FOV
onTouchEnd   → 停止操作
```

**实现位置**: `src/components/SkyView.jsx:111-202`

### 4.3 射线投射 (Raycasting)

**用途**: 检测鼠标点击或悬停的天体/星座

**算法**:

```javascript
// 1. 归一化设备坐标 (NDC)
const mouse = new THREE.Vector2(
  (clientX / width) * 2 - 1,
  -(clientY / height) * 2 + 1
);

// 2. 创建射线
const raycaster = new THREE.Raycaster();
raycaster.setFromCamera(mouse, camera);

// 3. 检测相交
const intersects = raycaster.intersectObjects(objects);
if (intersects.length > 0) {
  // 处理点击的对象
}
```

**星座悬停检测**:

```javascript
// 计算射线方向
const dir = raycaster.ray.direction.normalize();

// 遍历所有星座
constellations.forEach(c => {
  // 计算星座中心方向
  const { altitude, azimuth } = raDecToAltAz(c.center.ra, c.center.dec, lat, lst);
  const pos = altAzToVector3(altitude, azimuth, 1).normalize();

  // 计算角距
  const angle = Math.acos(dir.dot(pos));

  // 判断是否在阈值内
  if (angle < THRESHOLD) {
    // 高亮星座
  }
});
```

**实现位置**: `src/components/SkyView.jsx:129-157, 186-194`

---

## 5. 图形渲染架构

### 5.1 Three.js 场景结构

```
Scene
├── Sky Dome (半径 1500)
├── Ground Plane (半径 1500, y = -1)
├── Horizon Line (半径 1000, y = 0)
├── Compass Labels (4 个方位标注)
├── Star Field (Points, 半径 1000)
├── Celestial Grid (赤经赤纬网格, 半径 970)
│   ├── Declination Circles (5 条)
│   └── RA Lines (12 条 × 2 段)
├── Ecliptic Line (黄道线, 半径 980)
├── Constellation Lines (星座连线, 半径 960)
└── Planet Sprites (行星精灵, 半径 950)
```

### 5.2 赤经线分段渲染

**问题**: 连续的赤经线（-90° 到 +90°）在极点附近会被 Three.js 视锥体裁剪错误地剔除。

**原因**:
- Three.js 使用包围盒 (Bounding Box) 判断对象是否在视野内
- 跨越极点的线段包围盒很大，可能被判定为完全在视野外
- 当极点在相机后方时，整条线段被裁剪

**解决方案**: 将每条赤经线分成两段

```javascript
// 南半球段：-90° 到 0°
for (let i = 0; i <= 18; i++) {
  const decDeg = -90 + (i / 18) * 90;
  ptsSouth.push(raDecToVector3(raDeg, decDeg, lat, lst, R));
}

// 北半球段：0° 到 +90°
for (let i = 0; i <= 18; i++) {
  const decDeg = (i / 18) * 90;
  ptsNorth.push(raDecToVector3(raDeg, decDeg, lat, lst, R));
}
```

**效果**:
- 即使一个极点在视野外，另一段仍然可以正常渲染
- 两段在赤道（0° 赤纬）处连接，视觉上连续

**实现位置**: `src/components/SkyView.jsx:467-487`

### 5.3 动态更新机制

**触发条件**:
- 时间变化（本地模式：每秒更新）
- 位置变化（切换城市或手动输入坐标）
- 视角旋转（鼠标拖拽）

**更新流程**:

```javascript
useEffect(() => {
  // 1. 计算新的天体位置
  const { planets, sun, moon } = useAstronomy(time, location);

  // 2. 更新星场
  updateStarField(scene, stars, location, time);

  // 3. 更新网格线
  updateCelestialGrid(scene, location, time);
  updateEclipticLine(scene, location, time);

  // 4. 更新星座连线
  updateConstellationLines(scene, constellations, location, time);

  // 5. 更新行星位置
  planets.forEach(p => {
    sprite.position.copy(altAzToVector3(p.altitude, p.azimuth, 950));
  });
}, [time, location]);
```

**实现位置**: `src/components/SkyView.jsx:274-296`

### 5.4 材质与渲染设置

**星星**:
```javascript
new THREE.PointsMaterial({
  vertexColors: true,      // 使用顶点颜色（B-V 色指数）
  sizeAttenuation: false,  // 固定大小
  size: 1.8,
  transparent: true,
  opacity: 0.9
});
```

**网格线**:
```javascript
new THREE.LineBasicMaterial({
  color: 0x1a3a5a,
  transparent: true,
  opacity: 0.5
});
```

**行星精灵**:
```javascript
new THREE.SpriteMaterial({
  map: canvasTexture,      // Canvas 绘制的纹理
  transparent: true,
  depthTest: false         // 始终显示在最前面
});
```

---

## 6. 性能优化策略

### 6.1 数据缓存

**星表数据**:
```javascript
const starDataRef = useRef(null);  // 只加载一次
if (!starDataRef.current) {
  fetch('/data/stars_bright.json').then(stars => {
    starDataRef.current = stars;
  });
}
```

**星座数据**:
```javascript
const constellDataRef = useRef(null);  // 只加载一次
```

### 6.2 几何体复用

**避免重复创建**:
```javascript
// 移除旧对象
const old = scene.getObjectByName('starField');
if (old) {
  scene.remove(old);
  old.geometry?.dispose();
  old.material?.dispose();
}

// 创建新对象
const geometry = new THREE.BufferGeometry();
// ...
```

### 6.3 移动端优化

**星星数量限制**:
```javascript
const isMobile = window.innerWidth < 768;
const filtered = stars.filter(s =>
  s.mag < (isMobile ? 5.0 : 6.5)  // 移动端只显示亮星
);
```

**像素比限制**:
```javascript
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
```

### 6.4 渲染循环优化

**requestAnimationFrame**:
```javascript
const animate = () => {
  frameRef.current = requestAnimationFrame(animate);

  // 惯性旋转
  if (!isDragging && hasVelocity) {
    rotateSky(dx, dy, factor);
    velocity *= DAMPING;
  }

  renderer.render(scene, camera);
};
```

---

## 7. 问题诊断与解决

### 7.1 赤经线渲染问题

**问题描述**: 赤经线在极点附近只能渲染 50%，且随极点位置变化。

**根本原因**:
1. **极点奇异性**: 方位角计算在极点附近不稳定
2. **视锥体裁剪**: 连续线段跨越极点时被错误裁剪

**解决方案**:
1. **修正极点方位角公式**:
   ```javascript
   // 北天极：azimuth = 180° - HA
   // 南天极：azimuth = HA
   const azimuth = altitude > 0 ? (180 - ha + 360) % 360 : ha;
   ```

2. **分段绘制赤经线**:
   - 南半球段：-90° 到 0°
   - 北半球段：0° 到 +90°

**实现位置**:
- `src/utils/coordinates.js:62-70`
- `src/components/SkyView.jsx:467-487`

### 7.2 万向锁问题

**问题描述**: 鼠标拖拽到地面极点附近时，旋转不自然、出现偏斜。

**根本原因**: 混合使用相机空间和世界空间的旋转轴。

**解决方案**: 使用轨迹球旋转算法
- 旋转轴垂直于鼠标移动方向
- 旋转轴随鼠标移动动态变化
- 数学上保证无万向锁

**实现位置**: `src/components/SkyView.jsx:298-317`

### 7.3 坐标转换一致性

**问题**: 不同天体使用不同的坐标转换方法，导致位置不一致。

**解决方案**: 统一使用 `raDecToAltAz()` → `altAzToVector3()` 管道

```javascript
export function raDecToVector3(raDeg, decDeg, latDeg, lstDeg, radius = 1000) {
  const { altitude, azimuth } = raDecToAltAz(raDeg, decDeg, latDeg, lstDeg);
  return altAzToVector3(altitude, azimuth, radius);
}
```

**实现位置**: `src/utils/coordinates.js:126-130`

---

## 8. 技术栈总结

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.2.0 | UI 框架 |
| Three.js | 0.183.1 | 3D 渲染引擎 |
| astronomy-engine | 2.1.19 | 天文计算（VSOP87 算法） |
| Vite | 5.4.21 | 构建工具 |
| Tailwind CSS | 4.2.0 | 样式框架 |

---

## 9. 参考资料

### 天文学
- Meeus, J. (1998). *Astronomical Algorithms*. Willmann-Bell.
- USNO Circular 179: *The IAU Resolutions on Astronomical Reference Systems*

### 计算机图形学
- Shoemake, K. (1985). *Animating rotation with quaternion curves*. SIGGRAPH.
- Eberly, D. (2001). *3D Game Engine Design*. Morgan Kaufmann.

### Three.js
- Three.js Documentation: https://threejs.org/docs/
- Three.js Fundamentals: https://threejs.org/manual/

---

## 10. 版本历史

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| 1.0 | 2026-02-23 | 初始版本，完成坐标系设计、四元数旋转、赤经线分段渲染 |

---

## 附录 A: 关键代码位置

| 功能 | 文件路径 | 行号 |
|------|----------|------|
| 坐标转换 | `src/utils/coordinates.js` | 11-130 |
| 轨迹球旋转 | `src/components/SkyView.jsx` | 298-317 |
| 赤经线绘制 | `src/components/SkyView.jsx` | 467-487 |
| 星场渲染 | `src/components/SkyView.jsx` | 326-354 |
| 天文计算 | `src/hooks/useAstronomy.js` | 全文 |

---

**文档结束**
