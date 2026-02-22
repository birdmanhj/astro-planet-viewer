// 行星配置：颜色、大小、名称、轨道颜色
// 轨道根数来源：J2000.0 平均轨道要素
// semiMajorAU: 半长轴(AU), eccentricity: 离心率, perihelionLonDeg: 近日点黄经(度)
export const PLANETS = [
  {
    id: 'Mercury',
    nameZh: '水星',
    color: 0xB5B5B5,
    emissive: 0x222222,
    radius: 1.2,
    orbitColor: 0x666666,
    orbitalPeriodDays: 87.97,
    semiMajorAU: 0.38710,
    eccentricity: 0.20563,
    perihelionLonDeg: 77.46,
  },
  {
    id: 'Venus',
    nameZh: '金星',
    color: 0xE8C97A,
    emissive: 0x332200,
    radius: 1.8,
    orbitColor: 0x665500,
    orbitalPeriodDays: 224.70,
    semiMajorAU: 0.72333,
    eccentricity: 0.00677,
    perihelionLonDeg: 131.53,
  },
  {
    id: 'Earth',
    nameZh: '地球',
    color: 0x4B9CD3,
    emissive: 0x001133,
    radius: 2.0,
    orbitColor: 0x224466,
    orbitalPeriodDays: 365.25,
    semiMajorAU: 1.00000,
    eccentricity: 0.01671,
    perihelionLonDeg: 102.94,
  },
  {
    id: 'Mars',
    nameZh: '火星',
    color: 0xC1440E,
    emissive: 0x330800,
    radius: 1.5,
    orbitColor: 0x551100,
    orbitalPeriodDays: 686.97,
    semiMajorAU: 1.52366,
    eccentricity: 0.09341,
    perihelionLonDeg: 336.04,
  },
  {
    id: 'Jupiter',
    nameZh: '木星',
    color: 0xC88B3A,
    emissive: 0x221100,
    radius: 5.0,
    orbitColor: 0x553300,
    orbitalPeriodDays: 4332.59,
    semiMajorAU: 5.20336,
    eccentricity: 0.04839,
    perihelionLonDeg: 14.75,
  },
  {
    id: 'Saturn',
    nameZh: '土星',
    color: 0xC2A45A,
    emissive: 0x221800,
    radius: 4.2,
    orbitColor: 0x554422,
    orbitalPeriodDays: 10759.22,
    hasRings: true,
    semiMajorAU: 9.53707,
    eccentricity: 0.05415,
    perihelionLonDeg: 92.43,
  },
  {
    id: 'Uranus',
    nameZh: '天王星',
    color: 0x7DE8E8,
    emissive: 0x002222,
    radius: 3.0,
    orbitColor: 0x224444,
    orbitalPeriodDays: 30688.5,
    semiMajorAU: 19.1913,
    eccentricity: 0.04717,
    perihelionLonDeg: 170.96,
  },
  {
    id: 'Neptune',
    nameZh: '海王星',
    color: 0x3F54BA,
    emissive: 0x000833,
    radius: 2.8,
    orbitColor: 0x112244,
    orbitalPeriodDays: 60182.0,
    semiMajorAU: 30.0690,
    eccentricity: 0.00859,
    perihelionLonDeg: 44.97,
  },
];

export const SUN_CONFIG = {
  id: 'Sun',
  nameZh: '太阳',
  color: 0xFDB813,
  emissive: 0xFDB813,
  emissiveIntensity: 1.0,
  radius: 8,
};

export const MOON_CONFIG = {
  id: 'Moon',
  nameZh: '月球',
  color: 0xCCCCCC,
  emissive: 0x111111,
  radius: 1.0,
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
