import * as THREE from 'three';

/**
 * 程序化纹理生成器
 * 当外部纹理加载失败时，生成简单的程序化纹理作为备用
 */

/**
 * 生成水星纹理（灰色陨石坑）
 */
export function generateMercuryTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 基础灰色
  ctx.fillStyle = '#8B8B8B';
  ctx.fillRect(0, 0, 512, 512);

  // 添加噪点（陨石坑）
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 15 + 5;
    const gray = Math.floor(Math.random() * 60 + 100);
    ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

/**
 * 生成金星纹理（黄色云层）
 */
export function generateVenusTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 渐变黄色
  const gradient = ctx.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, '#FFE680');
  gradient.addColorStop(0.5, '#FFDD55');
  gradient.addColorStop(1, '#E8C040');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  // 添加云层纹理
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const w = Math.random() * 80 + 40;
    const h = Math.random() * 20 + 10;
    ctx.fillStyle = `rgba(255, 240, 200, ${Math.random() * 0.3})`;
    ctx.fillRect(x, y, w, h);
  }

  return new THREE.CanvasTexture(canvas);
}

/**
 * 生成地球纹理（蓝绿色）
 */
export function generateEarthTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // 海洋蓝（渐变）
  const gradient = ctx.createRadialGradient(512, 512, 0, 512, 512, 512);
  gradient.addColorStop(0, '#2E8BC0');
  gradient.addColorStop(0.5, '#1E90FF');
  gradient.addColorStop(1, '#145A8C');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 1024);

  // 陆地（更多更大的绿色斑块）
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const r = Math.random() * 100 + 50;
    const greenShade = Math.floor(Math.random() * 50 + 100);
    ctx.fillStyle = `rgba(${greenShade - 60}, ${greenShade}, ${greenShade - 60}, ${Math.random() * 0.6 + 0.4})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 山脉和地形细节（深色）
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const r = Math.random() * 20 + 5;
    ctx.fillStyle = `rgba(80, 60, 40, ${Math.random() * 0.4 + 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 云层（更多白色云）
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const r = Math.random() * 50 + 15;
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 极地冰盖
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(512, 100, 80, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(512, 924, 80, 0, Math.PI * 2);
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

/**
 * 生成火星纹理（红色沙漠）
 */
export function generateMarsTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // 基础红色（渐变）
  const gradient = ctx.createRadialGradient(512, 512, 0, 512, 512, 512);
  gradient.addColorStop(0, '#E07060');
  gradient.addColorStop(0.5, '#CD5C5C');
  gradient.addColorStop(1, '#A04040');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 1024);

  // 添加深色区域（峡谷和火山）
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const r = Math.random() * 60 + 30;
    const darkness = Math.floor(Math.random() * 80 + 60);
    ctx.fillStyle = `rgba(${darkness}, ${darkness - 20}, ${darkness - 40}, ${Math.random() * 0.6 + 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 添加陨石坑
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const r = Math.random() * 25 + 10;
    ctx.fillStyle = `rgba(100, 60, 40, ${Math.random() * 0.5 + 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // 陨石坑边缘
    ctx.strokeStyle = `rgba(180, 100, 80, 0.4)`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 沙尘暴区域（浅色）
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const r = Math.random() * 80 + 40;
    ctx.fillStyle = `rgba(220, 180, 140, ${Math.random() * 0.3 + 0.1})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 极冠（白色，更大）
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(512, 100, 80, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(512, 924, 80, 0, Math.PI * 2);
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

/**
 * 生成木星纹理（条纹）
 */
export function generateJupiterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // 更丰富的条纹背景
  const colors = ['#F0C080', '#E8B060', '#D89850', '#C88040', '#B87030', '#A86020'];
  let y = 0;
  while (y < 1024) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    const height = 30 + Math.random() * 50;
    ctx.fillStyle = color;
    ctx.fillRect(0, y, 1024, height);

    // 添加条纹内的湍流细节
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 1024;
      const yOffset = y + Math.random() * height;
      const w = Math.random() * 150 + 50;
      const h = Math.random() * 15 + 5;
      const shade = Math.random() * 0.3;
      ctx.fillStyle = `rgba(255, 200, 150, ${shade})`;
      ctx.fillRect(x, yOffset, w, h);
    }

    y += height;
  }

  // 大红斑（更大更明显）
  ctx.fillStyle = 'rgba(220, 60, 50, 0.9)';
  ctx.beginPath();
  ctx.ellipse(700, 560, 120, 80, 0, 0, Math.PI * 2);
  ctx.fill();

  // 大红斑内部细节
  ctx.fillStyle = 'rgba(180, 40, 30, 0.6)';
  ctx.beginPath();
  ctx.ellipse(700, 560, 80, 50, 0, 0, Math.PI * 2);
  ctx.fill();

  // 添加更多风暴和漩涡
  for (let i = 0; i < 15; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const r = Math.random() * 40 + 20;
    ctx.fillStyle = `rgba(200, 180, 160, ${Math.random() * 0.4 + 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

/**
 * 生成土星纹理（淡黄色条纹）
 */
export function generateSaturnTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 条纹背景
  const colors = ['#F0D080', '#E8C070', '#E0B060', '#D8A050'];
  for (let y = 0; y < 512; y += 30) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    ctx.fillStyle = color;
    ctx.fillRect(0, y, 512, 30 + Math.random() * 15);
  }

  return new THREE.CanvasTexture(canvas);
}

/**
 * 生成天王星纹理（青色）
 */
export function generateUranusTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 渐变青色
  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  gradient.addColorStop(0, '#80FFFF');
  gradient.addColorStop(0.5, '#60E0E0');
  gradient.addColorStop(1, '#40C0C0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  return new THREE.CanvasTexture(canvas);
}

/**
 * 生成海王星纹理（深蓝色）
 */
export function generateNeptuneTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 渐变深蓝
  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  gradient.addColorStop(0, '#6080FF');
  gradient.addColorStop(0.5, '#4060E0');
  gradient.addColorStop(1, '#2040C0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  // 大暗斑
  ctx.fillStyle = 'rgba(20, 30, 80, 0.6)';
  ctx.beginPath();
  ctx.ellipse(300, 200, 50, 35, 0, 0, Math.PI * 2);
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

/**
 * 生成太阳纹理（发光）
 */
export function generateSunTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // 渐变黄色（更明亮）
  const gradient = ctx.createRadialGradient(512, 512, 0, 512, 512, 512);
  gradient.addColorStop(0, '#FFFFCC');
  gradient.addColorStop(0.3, '#FFFF80');
  gradient.addColorStop(0.6, '#FFD840');
  gradient.addColorStop(1, '#FFA020');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 1024);

  // 太阳耀斑和日珥（明亮区域）
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const r = Math.random() * 60 + 30;
    ctx.fillStyle = `rgba(255, 240, 200, ${Math.random() * 0.4 + 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 太阳黑子（更多更明显）
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const r = Math.random() * 20 + 8;
    ctx.fillStyle = `rgba(120, 60, 0, ${Math.random() * 0.5 + 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 太阳表面颗粒结构
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const r = Math.random() * 15 + 5;
    ctx.fillStyle = `rgba(255, 220, 180, ${Math.random() * 0.3 + 0.1})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

/**
 * 生成月球纹理（灰色陨石坑）
 */
export function generateMoonTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 基础灰色
  ctx.fillStyle = '#AAAAAA';
  ctx.fillRect(0, 0, 512, 512);

  // 陨石坑
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 20 + 5;
    const gray = Math.floor(Math.random() * 80 + 80);
    ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // 陨石坑边缘
    ctx.strokeStyle = `rgba(60, 60, 60, 0.5)`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  return new THREE.CanvasTexture(canvas);
}

/**
 * 根据行星 ID 生成对应的程序化纹理
 */
export function generateProceduralTexture(planetId) {
  switch (planetId) {
    case 'Mercury': return generateMercuryTexture();
    case 'Venus': return generateVenusTexture();
    case 'Earth': return generateEarthTexture();
    case 'Mars': return generateMarsTexture();
    case 'Jupiter': return generateJupiterTexture();
    case 'Saturn': return generateSaturnTexture();
    case 'Uranus': return generateUranusTexture();
    case 'Neptune': return generateNeptuneTexture();
    case 'Sun': return generateSunTexture();
    case 'Moon': return generateMoonTexture();
    default: return null;
  }
}
