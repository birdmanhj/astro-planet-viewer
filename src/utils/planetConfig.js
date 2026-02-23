// 行星配置：颜色、大小、名称、轨道颜色、纹理
// 轨道根数来源：J2000.0 平均轨道要素
// semiMajorAU: 半长轴(AU), eccentricity: 离心率, perihelionLonDeg: 近日点黄经(度)
// axialTilt: 轴倾角（度），相对于轨道平面
// rotationPeriod: 自转周期（小时）
// textureUrl: 行星表面纹理（本地纹理文件）

// 获取资源基础路径（支持 GitHub Pages 部署）
const BASE_URL = import.meta.env.BASE_URL || '/';

export const PLANETS = [
  {
    id: 'Mercury',
    nameZh: '水星',
    color: 0xD0D0D0,
    emissive: 0x1a1a1a,
    emissiveIntensity: 0.15,
    radius: 1.2,
    orbitColor: 0x666666,
    orbitalPeriodDays: 87.97,
    semiMajorAU: 0.38710,
    eccentricity: 0.20563,
    perihelionLonDeg: 77.46,
    axialTilt: 0.034, // 几乎垂直
    rotationPeriod: 1407.6, // 58.6 地球日
    textureUrl: `${BASE_URL}textures/mercury.jpg`,
  },
  {
    id: 'Venus',
    nameZh: '金星',
    color: 0xFFDD55,
    emissive: 0x332200,
    emissiveIntensity: 0.2,
    radius: 1.8,
    orbitColor: 0x665500,
    orbitalPeriodDays: 224.70,
    semiMajorAU: 0.72333,
    eccentricity: 0.00677,
    perihelionLonDeg: 131.53,
    axialTilt: 177.4, // 逆向自转
    rotationPeriod: 5832.5, // 243 地球日（逆向）
    textureUrl: `${BASE_URL}textures/venus.jpg`,
  },
  {
    id: 'Earth',
    nameZh: '地球',
    color: 0x4B9CD3,
    emissive: 0x002244,
    emissiveIntensity: 0.25,
    radius: 2.0,
    orbitColor: 0x224466,
    orbitalPeriodDays: 365.25,
    semiMajorAU: 1.00000,
    eccentricity: 0.01671,
    perihelionLonDeg: 102.94,
    axialTilt: 23.44, // 黄赤交角
    rotationPeriod: 23.93, // 23小时56分
    textureUrl: `${BASE_URL}textures/earth.jpg`,
  },
  {
    id: 'Mars',
    nameZh: '火星',
    color: 0xFF4411,
    emissive: 0x441100,
    emissiveIntensity: 0.2,
    radius: 1.5,
    orbitColor: 0x551100,
    orbitalPeriodDays: 686.97,
    semiMajorAU: 1.52366,
    eccentricity: 0.09341,
    perihelionLonDeg: 336.04,
    axialTilt: 25.19, // 与地球相似
    rotationPeriod: 24.62, // 24小时37分
    textureUrl: `${BASE_URL}textures/mars.jpg`,
  },
  {
    id: 'Jupiter',
    nameZh: '木星',
    color: 0xE89840,
    emissive: 0x332200,
    emissiveIntensity: 0.3,
    radius: 5.0,
    orbitColor: 0x553300,
    orbitalPeriodDays: 4332.59,
    semiMajorAU: 5.20336,
    eccentricity: 0.04839,
    perihelionLonDeg: 14.75,
    axialTilt: 3.13, // 几乎垂直
    rotationPeriod: 9.93, // 约10小时
    textureUrl: `${BASE_URL}textures/jupiter.jpg`,
  },
  {
    id: 'Saturn',
    nameZh: '土星',
    color: 0xF0C060,
    emissive: 0x332200,
    emissiveIntensity: 0.25,
    radius: 4.2,
    orbitColor: 0x554422,
    orbitalPeriodDays: 10759.22,
    hasRings: true,
    semiMajorAU: 9.53707,
    eccentricity: 0.05415,
    perihelionLonDeg: 92.43,
    axialTilt: 26.73, // 光环也倾斜
    rotationPeriod: 10.66, // 约10.7小时
    textureUrl: `${BASE_URL}textures/saturn.jpg`,
    ringTextureUrl: `${BASE_URL}textures/saturn_ring.png`,
  },
  {
    id: 'Uranus',
    nameZh: '天王星',
    color: 0x40EEFF,
    emissive: 0x003344,
    emissiveIntensity: 0.2,
    radius: 3.0,
    orbitColor: 0x224444,
    orbitalPeriodDays: 30688.5,
    semiMajorAU: 19.1913,
    eccentricity: 0.04717,
    perihelionLonDeg: 170.96,
    axialTilt: 97.77, // 几乎"躺着"自转
    rotationPeriod: 17.24, // 约17.2小时（逆向）
    textureUrl: `${BASE_URL}textures/uranus.jpg`,
  },
  {
    id: 'Neptune',
    nameZh: '海王星',
    color: 0x4466FF,
    emissive: 0x001144,
    emissiveIntensity: 0.2,
    radius: 2.8,
    orbitColor: 0x112244,
    orbitalPeriodDays: 60182.0,
    semiMajorAU: 30.0690,
    eccentricity: 0.00859,
    perihelionLonDeg: 44.97,
    axialTilt: 28.32,
    rotationPeriod: 16.11, // 约16小时
    textureUrl: `${BASE_URL}textures/neptune.jpg`,
  },
];

export const SUN_CONFIG = {
  id: 'Sun',
  nameZh: '太阳',
  color: 0xFDB813,
  emissive: 0xFDB813,
  emissiveIntensity: 1.0,
  radius: 8,
  axialTilt: 7.25, // 相对于黄道面
  rotationPeriod: 609.12, // 约25.4地球日（赤道）
  textureUrl: `${BASE_URL}textures/sun.jpg`,
};

export const MOON_CONFIG = {
  id: 'Moon',
  nameZh: '月球',
  color: 0xCCCCCC,
  emissive: 0x222222,
  emissiveIntensity: 0.15,
  radius: 1.0,
  axialTilt: 6.68, // 相对于黄道面
  rotationPeriod: 655.72, // 27.3地球日（潮汐锁定）
  textureUrl: `${BASE_URL}textures/moon.jpg`,
};

// B-V色指数 → RGB颜色（用于恒星颜色）
export function bvToRgb(bv) {
  // 简化映射：蓝色(-0.4) → 白色(0.0) → 黄色(0.6) → 红色(2.0)
  let r, g, b;
  if (bv < -0.4) bv = -0.4;
  if (bv > 2.0) bv = 2.0;

  if (bv < 0.0) {
    r = 0.6 + bv * 0.5;
    g = 0.7 + bv * 0.3;
    b = 1.0;
  } else if (bv < 0.5) {
    r = 0.6 + bv * 0.8;
    g = 0.8 + bv * 0.1;
    b = 1.0 - bv * 1.5;
  } else if (bv < 1.0) {
    r = 1.0;
    g = 0.85 - (bv - 0.5) * 0.3;
    b = 0.25 - (bv - 0.5) * 0.5;
  } else {
    r = 1.0;
    g = 0.7 - (bv - 1.0) * 0.4;
    b = 0.0;
  }

  return {
    r: Math.max(0, Math.min(1, r)),
    g: Math.max(0, Math.min(1, g)),
    b: Math.max(0, Math.min(1, b)),
  };
}
