# 开发日志

## 2026-02-24

### 日月食检测系统
**实现内容**：
- 在 `useAstronomy.js` 的 `detectPhenomena` 函数中添加日食和月食检测
- 使用 Astronomy Engine 的 `SearchGlobalSolarEclipse` 和 `SearchLunarEclipse` API
- 实现几何判断作为后备方案

**日食检测逻辑**：
1. 检查太阳和月球角距离 < 2°
2. 验证月相在新月附近（黄经差 < 15°）
3. 搜索当前时间 ±7 天内的日食事件
4. 识别日食类型：日全食、日环食、日偏食
5. 检查食甚时间是否在当前时间 ±12 小时内

**月食检测逻辑**：
1. 检查月相在满月附近（黄经差接近 180°）
2. 验证月球黄纬 < 2°（接近黄道面）
3. 搜索当前时间 ±7 天内的月食事件
4. 识别月食类型：月全食、月偏食、半影月食
5. 检查食甚时间是否在当前时间 ±12 小时内

**显示信息**：
- 天象类型（solar_eclipse / lunar_eclipse）
- 涉及天体（中文名称）
- 食的类型（中文描述）
- 食甚时间（peakTime）

### 月球潮汐锁定
**实现内容**：
- 在月球位置更新的 useEffect 中实现潮汐锁定
- 使用 Three.js 的 `lookAt` 让月球始终朝向地球
- 保持月球的轴倾角（6.68°）
- 调整纹理对齐（左右边缘对应月背）

**技术细节**：
```javascript
// 计算从月球指向地球的方向
const toEarth = new THREE.Vector3();
toEarth.subVectors(earthMesh.position, moonMesh.position).normalize();

// 使用 lookAt 创建旋转矩阵
const moonRotation = new THREE.Matrix4();
moonRotation.lookAt(moonMesh.position, earthMesh.position, up);

// 提取四元数并应用轴倾角
const lookQuat = new THREE.Quaternion();
lookQuat.setFromRotationMatrix(moonRotation);

// 额外旋转 90° 使纹理正确对齐
const adjustQuat = new THREE.Quaternion();
adjustQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
lookQuat.multiply(adjustQuat);
```

**排除自转动画**：
- 在自转动画循环中排除月球（`mesh.userData.bodyId !== 'Moon'`）
- 月球的旋转完全由潮汐锁定控制

### 白道倾角
**实现内容**：
- 在月球轨道圈绘制时添加 5.14° 的倾角
- 对每个轨道点应用绕 X 轴的旋转

**代码实现**：
```javascript
const moonOrbitInclination = 5.14 * Math.PI / 180;
for (let i = 0; i <= 64; i++) {
  const a = (i / 64) * Math.PI * 2;
  const x = 4 * Math.cos(a);
  const z = -4 * Math.sin(a);
  // 应用倾角
  const y = z * Math.sin(moonOrbitInclination);
  const zTilted = z * Math.cos(moonOrbitInclination);
  moonOrbitPts.push(new THREE.Vector3(x, y, zTilted));
}
```

### 土星光环透明度调整
**修改内容**：
- 将土星光环的 opacity 从 0.7 提高到 0.95
- 使光环在真实模式下更加明显

### 阴影系统（已移除）
**尝试内容**：
- 启用了渲染器的阴影映射（`shadowMap.enabled = true`）
- 配置太阳光源投射阴影
- 为天体添加 `castShadow` 和 `receiveShadow` 属性

**移除原因**：
- 用户要求先不模拟光影
- 专注于轨道和天体位置的准确性
- 通过天象检测系统识别日月食

---

## 2026-02-23

### 行星自转轴和倾角修复
**问题描述**：
1. 行星绕垂直轴（Y轴）自转，而不是绕倾斜后的自转轴
2. 土星光环倾角不匹配（固定 72°，应该是 26.73°）
3. 水星、金星、火星的自转不可见

**根本原因**：
- 使用欧拉角（Euler Angles）分别设置轴倾角和自转
- `rotation.z` 设置倾角，`rotation.y` 更新自转，两个旋转是独立的
- 自转绕的是世界坐标系的 Y 轴，而不是倾斜后的轴

**解决方案**：
使用四元数（Quaternion）实现正确的自转轴

**实现步骤**：

1. **修改天体初始化**（太阳、月球、行星）：
```javascript
// 步骤 1：先创建 Mesh（已包含纹理贴图）
const mesh = new THREE.Mesh(geo, mat);
mesh.userData = {
  ...existingData,
  rotationPeriod: config.rotationPeriod,
  axialTilt: config.axialTilt
};

// 步骤 2：再使用四元数设置轴倾角（绕 Z 轴倾斜）
if (config.axialTilt) {
  const tiltAxis = new THREE.Vector3(0, 0, 1); // Z 轴
  const tiltAngle = (config.axialTilt * Math.PI) / 180;
  const tiltQuat = new THREE.Quaternion();
  tiltQuat.setFromAxisAngle(tiltAxis, tiltAngle);
  mesh.quaternion.copy(tiltQuat);
}
// 步骤 3：自转将在动画循环中绕倾斜后的轴进行
```

2. **修改自转动画**：
```javascript
// 动态调整加速倍数
let speedMultiplier = 60;
if (mesh.userData.rotationPeriod > 1000) {
  speedMultiplier = 600; // 水星、金星
} else if (mesh.userData.rotationPeriod > 100) {
  speedMultiplier = 200; // 中速行星
}

const rotationSpeed = (2 * Math.PI) / (mesh.userData.rotationPeriod * speedMultiplier);

// 创建绕局部 Y 轴的旋转四元数
const rotAxis = new THREE.Vector3(0, 1, 0);
const rotQuat = new THREE.Quaternion();
rotQuat.setFromAxisAngle(rotAxis, rotationSpeed);

// 应用旋转：先有的四元数（包含轴倾角）乘以新的旋转
mesh.quaternion.multiplyQuaternions(mesh.quaternion, rotQuat);
```

3. **修复土星光环倾角**：
```javascript
const ring = new THREE.Mesh(ringGeo, ringMat);
// 光环应该在土星的赤道平面上（垂直于自转轴）
ring.rotation.x = Math.PI / 2; // 90°，使光环水平
ring.userData = { isSaturnRing: true, baseColor: 0xC2A45A };
mesh.add(ring);
```

**技术细节**：

**为什么使用四元数？**
- 欧拉角的问题：旋转顺序依赖，无法表达"绕倾斜后的轴旋转"，会产生万向锁
- 四元数的优势：可以组合旋转，自转绕局部轴，无万向锁，插值平滑

**自转轴的数学原理**：
- 倾斜前：自转轴 = (0, 1, 0)（世界坐标系 Y 轴）
- 倾斜后：轴倾角四元数 `Q_tilt = Quaternion.setFromAxisAngle(Z轴, 倾角)`
- 自转：每帧旋转四元数 `Q_rot = Quaternion.setFromAxisAngle(局部Y轴, 角速度)`
- 新的姿态：`Q_new = Q_current × Q_rot`

**加速倍数策略**：
| 自转周期范围 | 加速倍数 | 适用行星 |
|-------------|---------|---------|
| > 1000 小时 | 600x | 水星、金星 |
| 100-1000 小时 | 200x | 中速行星 |
| < 100 小时 | 60x | 地球、火星、木星等 |

**验证结果**：
- ✅ 所有行星绕正确的倾斜轴自转
- ✅ 土星光环与土星轴倾角一致
- ✅ 水星、金星、火星的自转清晰可见
- ✅ 纹理正确映射到倾斜的球体上
- ✅ 天王星"躺着"自转的效果明显

### 土星光环径向纹理映射
**问题描述**：
土星光环纹理是平铺贴图，而不是径向映射（从内到外）

**解决方案**：
修改 UV 坐标，使 U 坐标映射到半径（0=内圈，1=外圈），V 坐标映射到角度

**代码实现**：
```javascript
const uvs = ringGeo.attributes.uv.array;
const positions = ringGeo.attributes.position.array;
for (let i = 0; i < positions.length; i += 3) {
  const x = positions[i];
  const y = positions[i + 1];
  const radius = Math.sqrt(x * x + y * y);
  const normalizedRadius = (radius - innerRadius) / (outerRadius - innerRadius);

  const uvIndex = (i / 3) * 2;
  uvs[uvIndex] = normalizedRadius; // U: 径向
  const angle = Math.atan2(y, x);
  uvs[uvIndex + 1] = (angle + Math.PI) / (2 * Math.PI); // V: 圆周
}
ringGeo.attributes.uv.needsUpdate = true;
```

### 渲染模式切换
**实现内容**：
- 添加"纯色模式"和"真实模式"切换
- 纯色模式：使用配置颜色，高饱和度
- 真实模式：使用纹理贴图，色彩增强

**纹理缓存问题修复**：
- 问题：切换到纯色模式后，再切换回真实模式，纹理丢失
- 原因：`mesh.material.map = null` 移除了纹理引用
- 解决：创建 `texturesRef` 保存纹理引用，切换时恢复

**色彩饱和度调整**：
- 问题：真实模式下行星颜色发灰白
- 解决：混合配置颜色和白色（70% 配置色 + 30% 白色）
- 增加 `emissiveIntensity` 到 0.5
- 降低 `roughness` 到 0.5

### 光照系统增强
**修改内容**：
- 环境光：0.5 → 4.0
- 太阳点光源：2.0 → 80.0
- Tone Mapping 曝光：1.0 → 1.5
- 使用 ACESFilmicToneMapping 防止过曝

---

## 项目初始化

### 技术选型
- React 19 + Vite 5
- Three.js（3D 渲染）
- astronomy-engine（天文计算）
- Tailwind CSS 4（UI）

### 核心功能实现
- 双模式系统（实时/指定）
- 双视角系统（太阳系/天空）
- 天文计算封装（useAstronomy hook）
- 地理定位（useGeolocation hook）
- 响应式布局（移动端适配）

### 数据准备
- 行星配置（planetConfig.js）
- 星表数据（stars_bright.json）
- 纹理资源（textures/）
