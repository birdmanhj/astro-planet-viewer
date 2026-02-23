import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { altAzToVector3, raDecToAltAz, raDecToVector3, getLocalSiderealTime } from '../utils/coordinates';
import { bvToRgb, PLANETS } from '../utils/planetConfig';

const PLANET_COLORS = Object.fromEntries(PLANETS.map(p => [p.id, p.color]));
PLANET_COLORS['Sun'] = 0xFDB813;
PLANET_COLORS['Moon'] = 0xDDDDCC;

const COMPASS = [
  { label: '北', az: 0 }, { label: '东', az: 90 },
  { label: '南', az: 180 }, { label: '西', az: 270 },
];

export default function SkyView({ planets, sun, moon, location, time, onSelectBody }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const frameRef = useRef(null);
  const planetSpritesRef = useRef({});
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ dx: 0, dy: 0 }); // 惯性速度（像素/帧）
  // Initial orientation: looking north (-Z), tilted up so horizon sits at bottom 1/5 of screen
  // FOV=75°, horizon at NDC y=-0.6 → tilt = arctan(0.6 * tan(37.5°)) ≈ 24.7°
  const INIT_TILT = Math.atan(0.6 * Math.tan(75 * Math.PI / 360));
  const orientationRef = useRef(
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), INIT_TILT)
  );
  const starDataRef = useRef(null); // 缓存星表数据
  const constellDataRef = useRef(null); // 缓存星座数据
  const hoveredConstellRef = useRef(null); // 当前悬停星座 id
  const locationRef = useRef(null); // 供事件处理器访问最新 location
  const timeRef = useRef(null);     // 供事件处理器访问最新 time
  const [sceneReady, setSceneReady] = useState(false);
  const [hoveredConstell, setHoveredConstell] = useState(null); // { nameZh, nameEn }

  // 初始化场景
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000005);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 3000);
    camera.position.set(0, 0, 0);
    cameraRef.current = camera;
    camera.quaternion.copy(orientationRef.current);

    // 天穹
    const skyGeo = new THREE.SphereGeometry(1500, 32, 16);
    scene.add(new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ color: 0x000010, side: THREE.BackSide })));

    // 地面
    const groundGeo = new THREE.CircleGeometry(1500, 64);
    const ground = new THREE.Mesh(groundGeo, new THREE.MeshBasicMaterial({
      color: 0x0a1a0a, side: THREE.DoubleSide, transparent: true, opacity: 0.55
    }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    scene.add(ground);

    // 地平线
    const horizonPts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      horizonPts.push(new THREE.Vector3(1000 * Math.cos(a), 0, -1000 * Math.sin(a)));
    }
    scene.add(new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(horizonPts),
      new THREE.LineBasicMaterial({ color: 0x224422, transparent: true, opacity: 0.6 })
    ));

    // 方位标注
    COMPASS.forEach(({ label, az }) => {
      const pos = altAzToVector3(0, az, 900);
      const sprite = createTextSprite(label, '#44aa44', 28);
      sprite.position.copy(pos);
      scene.add(sprite);
    });

    // 黄道线（动态，随时间/位置更新，在下方 effect 中绘制）

    // 行星精灵（排除地球——观测者本身不出现在天空中）
    const allBodies = [
      { id: 'Sun', nameZh: '太阳', color: 0xFDB813 },
      { id: 'Moon', nameZh: '月球', color: 0xDDDDCC },
      ...PLANETS.filter(p => p.id !== 'Earth').map(p => ({ id: p.id, nameZh: p.nameZh, color: p.color })),
    ];
    allBodies.forEach(body => {
      const isBig = body.id === 'Sun' || body.id === 'Moon';
      const scale = isBig ? [55, 68] : [38, 48];
      const fontSize = Math.round(18 * 68 / scale[1]); // compensate scale so text stays same world size
      const sprite = createPlanetSprite(body.nameZh, body.color, scale, fontSize);
      sprite.userData = { bodyId: body.id };
      sprite.visible = false;
      scene.add(sprite);
      planetSpritesRef.current[body.id] = sprite;
    });

    // 鼠标控制
    const onMouseDown = (e) => {
      isDraggingRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      velocityRef.current = { dx: 0, dy: 0 };
    };
    const onMouseMove = (e) => {
      if (isDraggingRef.current) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        // EMA 平滑速度，减少抖动
        velocityRef.current = {
          dx: 0.7 * dx + 0.3 * velocityRef.current.dx,
          dy: 0.7 * dy + 0.3 * velocityRef.current.dy,
        };
        rotateSky(dx, dy, 0.003);
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        return;
      }
      // 星座悬停检测
      if (!constellDataRef.current?.length) return;
      const rect = mount.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mx, my), cameraRef.current);
      const dir = raycaster.ray.direction.clone().normalize();

      const loc = locationRef.current;
      const t = timeRef.current;
      const lst = getLocalSiderealTime(t || new Date(), loc?.longitude || 116.4);
      const lat = loc?.latitude || 39.9;

      let nearest = null, minAngle = Infinity;
      constellDataRef.current.forEach(c => {
        const { altitude, azimuth } = raDecToAltAz(c.center.ra, c.center.dec, lat, lst);
        const pos = altAzToVector3(altitude, azimuth, 1).normalize();
        const angle = Math.acos(Math.max(-1, Math.min(1, dir.dot(pos))));
        if (angle < minAngle) { minAngle = angle; nearest = c; }
      });

      const THRESHOLD = 28 * Math.PI / 180;
      const newId = minAngle < THRESHOLD ? nearest?.id : null;
      if (newId !== hoveredConstellRef.current) {
        hoveredConstellRef.current = newId;
        updateConstellationLines(sceneRef.current, constellDataRef.current, loc, t, newId);
        setHoveredConstell(newId ? nearest : null);
      }
    };
    const onMouseUp = () => { isDraggingRef.current = false; };

    // 触摸控制
    let lastTouches = null;
    const onTouchStart = (e) => {
      e.preventDefault();
      lastTouches = Array.from(e.touches);
      velocityRef.current = { dx: 0, dy: 0 };
    };
    const onTouchMove = (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && lastTouches?.length === 1) {
        const dx = e.touches[0].clientX - lastTouches[0].clientX;
        const dy = e.touches[0].clientY - lastTouches[0].clientY;
        velocityRef.current = {
          dx: 0.7 * dx + 0.3 * velocityRef.current.dx,
          dy: 0.7 * dy + 0.3 * velocityRef.current.dy,
        };
        rotateSky(dx, dy, 0.004);
      } else if (e.touches.length === 2 && lastTouches?.length === 2) {
        const d1 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const d0 = Math.hypot(lastTouches[0].clientX - lastTouches[1].clientX, lastTouches[0].clientY - lastTouches[1].clientY);
        if (d0 > 0) { camera.fov = Math.max(20, Math.min(120, camera.fov * (d0 / d1))); camera.updateProjectionMatrix(); }
      }
      lastTouches = Array.from(e.touches);
    };

    // 点击选择
    const onClick = (e) => {
      const rect = mount.getBoundingClientRect();
      const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(Object.values(planetSpritesRef.current).filter(s => s.visible));
      if (hits.length > 0) onSelectBody?.(hits[0].object.userData.bodyId);
    };

    mount.addEventListener('mousedown', onMouseDown);
    mount.addEventListener('mousemove', onMouseMove);
    mount.addEventListener('mouseup', onMouseUp);
    mount.addEventListener('mouseleave', onMouseUp);
    mount.addEventListener('touchstart', onTouchStart, { passive: false });
    mount.addEventListener('touchmove', onTouchMove, { passive: false });
    mount.addEventListener('click', onClick);

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      // 惯性：松手后速度按阻尼系数衰减
      if (!isDraggingRef.current) {
        const { dx, dy } = velocityRef.current;
        if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
          rotateSky(dx, dy, 0.003);
          velocityRef.current = { dx: dx * 0.90, dy: dy * 0.90 };
        }
      }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // 场景就绪，触发星表加载
    setSceneReady(true);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      mount.removeEventListener('mousedown', onMouseDown);
      mount.removeEventListener('mousemove', onMouseMove);
      mount.removeEventListener('mouseup', onMouseUp);
      mount.removeEventListener('mouseleave', onMouseUp);
      mount.removeEventListener('touchstart', onTouchStart);
      mount.removeEventListener('touchmove', onTouchMove);
      mount.removeEventListener('click', onClick);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      setSceneReady(false);
    };
  }, []);

  // 保持 locationRef / timeRef 最新，供事件处理器使用
  useEffect(() => { locationRef.current = location; }, [location]);
  useEffect(() => { timeRef.current = time; }, [time]);

  // 加载星表 + 星座数据（只加载一次）
  useEffect(() => {
    if (!sceneReady) return;
    if (starDataRef.current) {
      updateStarField(sceneRef.current, starDataRef.current, location, time);
      if (constellDataRef.current) {
        updateConstellationLines(sceneRef.current, constellDataRef.current, location, time, null);
      }
      return;
    }
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}data/stars_bright.json`).then(r => r.json()),
      fetch(`${import.meta.env.BASE_URL}data/constellations.json`).then(r => r.json()),
    ]).then(([stars, constells]) => {
      starDataRef.current = stars;
      constellDataRef.current = constells;
      updateStarField(sceneRef.current, stars, location, time);
      updateEclipticLine(sceneRef.current, location, time);
      updateCelestialGrid(sceneRef.current, location, time);
      updateConstellationLines(sceneRef.current, constells, location, time, null);
    }).catch(() => {
      renderFallbackStars(sceneRef.current);
    });
  }, [sceneReady]);

  // 位置或时间变化时更新星场 + 黄道线 + 天球经纬线 + 星座连线
  useEffect(() => {
    if (!sceneReady || !starDataRef.current) return;
    updateStarField(sceneRef.current, starDataRef.current, location, time);
    updateEclipticLine(sceneRef.current, location, time);
    updateCelestialGrid(sceneRef.current, location, time);
    if (constellDataRef.current) {
      updateConstellationLines(sceneRef.current, constellDataRef.current, location, time, hoveredConstellRef.current);
    }
  }, [location?.latitude, location?.longitude, time?.getTime(), sceneReady]);

  // 更新行星位置（排除地球）
  useEffect(() => {
    const allBodies = [...(planets || []).filter(p => p.id !== 'Earth'), ...(sun ? [sun] : []), ...(moon ? [moon] : [])];
    allBodies.forEach(body => {
      const sprite = planetSpritesRef.current[body.id];
      if (!sprite) return;
      const pos = altAzToVector3(body.altitude, body.azimuth, 950);
      sprite.position.copy(pos);
      sprite.visible = body.altitude > -20;
      if (sprite.material) sprite.material.opacity = body.altitude >= 0 ? 1.0 : 0.3;
    });
  }, [planets, sun, moon]);

  function rotateSky(dx, dy, factor) {
    const camera = cameraRef.current;
    if (!camera) return;

    // 计算旋转轴（垂直于鼠标移动方向）
    const rotationAxis = new THREE.Vector3(dy, dx, 0).normalize();

    // 将旋转轴从屏幕空间转换到世界空间
    rotationAxis.applyQuaternion(orientationRef.current);

    // 计算旋转角度（基于鼠标移动距离）
    const angle = Math.sqrt(dx * dx + dy * dy) * factor;

    // 创建旋转四元数
    const rotationQ = new THREE.Quaternion().setFromAxisAngle(rotationAxis, angle);

    // 应用旋转
    orientationRef.current.premultiply(rotationQ);
    camera.quaternion.copy(orientationRef.current);
  }

  return (
    <div ref={mountRef} className="w-full h-full relative" style={{ background: '#000005' }}>
      {hoveredConstell && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 border border-blue-800/60 rounded px-3 py-1.5 text-sm text-blue-200 pointer-events-none select-none backdrop-blur">
          {hoveredConstell.nameZh} · {hoveredConstell.nameEn}
        </div>
      )}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-500 pointer-events-none select-none">
        拖拽旋转视角 · 双指缩放
      </div>
    </div>
  );
}

function updateStarField(scene, stars, location, time) {
  if (!scene || !stars?.length) return;
  const old = scene.getObjectByName('starField');
  if (old) { scene.remove(old); old.geometry?.dispose(); old.material?.dispose(); }

  const lst = getLocalSiderealTime(time || new Date(), location?.longitude || 116.4);
  const lat = location?.latitude || 39.9;
  const isMobile = window.innerWidth < 768;
  const filtered = stars.filter(s => s.mag < (isMobile ? 5.0 : 6.5));

  const positions = new Float32Array(filtered.length * 3);
  const colors = new Float32Array(filtered.length * 3);

  filtered.forEach((star, i) => {
    const { altitude, azimuth } = raDecToAltAz(star.ra * 15, star.dec, lat, lst);
    const pos = altAzToVector3(altitude, azimuth, 1000);
    positions[i * 3] = pos.x; positions[i * 3 + 1] = pos.y; positions[i * 3 + 2] = pos.z;
    const rgb = bvToRgb(star.bv ?? 0.6);
    colors[i * 3] = rgb.r; colors[i * 3 + 1] = rgb.g; colors[i * 3 + 2] = rgb.b;
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({ vertexColors: true, sizeAttenuation: false, size: 1.8, transparent: true, opacity: 0.9 });
  const points = new THREE.Points(geo, mat);
  points.name = 'starField';
  scene.add(points);
}

function renderFallbackStars(scene) {
  const count = 2000;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    positions[i * 3] = 1000 * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = 1000 * Math.cos(phi);
    positions[i * 3 + 2] = 1000 * Math.sin(phi) * Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: false }));
  points.name = 'starField';
  scene.add(points);
}

/**
 * 星座连线：平时暗色显示，鼠标悬停时高亮并显示名称
 */
function updateConstellationLines(scene, constellData, location, time, hoveredId) {
  if (!scene || !constellData?.length) return;
  const old = scene.getObjectByName('constellLines');
  if (old) { old.traverse(c => { c.geometry?.dispose(); c.material?.dispose(); }); scene.remove(old); }

  const lst = getLocalSiderealTime(time || new Date(), location?.longitude || 116.4);
  const lat = location?.latitude || 39.9;
  const R = 960;
  const group = new THREE.Group();
  group.name = 'constellLines';

  constellData.forEach(c => {
    const isHovered = c.id === hoveredId;
    const mat = new THREE.LineBasicMaterial({
      color: isHovered ? 0x88aaff : 0x1e3355,
      transparent: true,
      opacity: isHovered ? 0.95 : 0.45,
    });

    c.lines.forEach(segment => {
      const pts = segment
        .map(([raDeg, decDeg]) => {
          const { altitude, azimuth } = raDecToAltAz(raDeg, decDeg, lat, lst);
          return altAzToVector3(altitude, azimuth, R);
        })
        .filter(Boolean);
      if (pts.length >= 2) {
        group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
      }
    });

    // 悬停时在星座中心显示名称
    if (isHovered) {
      const { altitude, azimuth } = raDecToAltAz(c.center.ra, c.center.dec, lat, lst);
      const sp = createTextSprite(`${c.nameZh}  ${c.nameEn}`, '#aabbff', 18);
      sp.position.copy(altAzToVector3(altitude + 4, azimuth, R));
      group.add(sp);
    }
  });

  scene.add(group);
}

/**
 * 天球赤道坐标网格（赤纬圈 + 赤经线），随时间/位置动态更新
 */
function updateCelestialGrid(scene, location, time) {
  if (!scene) return;
  const old = scene.getObjectByName('celestialGrid');
  if (old) {
    old.traverse(c => { c.geometry?.dispose(); c.material?.dispose(); });
    scene.remove(old);
  }

  const lst = getLocalSiderealTime(time || new Date(), location?.longitude || 116.4);
  const lat = location?.latitude || 39.9;
  const R = 970;
  const group = new THREE.Group();
  group.name = 'celestialGrid';

  const gridMat = new THREE.LineBasicMaterial({ color: 0x1a3a5a, transparent: true, opacity: 0.5 });
  const equatorMat = new THREE.LineBasicMaterial({ color: 0x2255aa, transparent: true, opacity: 0.7 });

  // 赤纬圈：-60°, -30°, 0°(天赤道), +30°, +60°
  const decLines = [-60, -30, 0, 30, 60];
  decLines.forEach(decDeg => {
    const pts = [];
    for (let i = 0; i <= 72; i++) {
      const raDeg = (i / 72) * 360;
      pts.push(raDecToVector3(raDeg, decDeg, lat, lst, R));
    }
    const mat = decDeg === 0 ? equatorMat : gridMat;
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));

    // 天赤道标签
    if (decDeg === 0) {
      let maxAlt = -Infinity, labelPos = null;
      for (let i = 0; i <= 72; i++) {
        const raDeg = (i / 72) * 360;
        const { altitude, azimuth } = raDecToAltAz(raDeg, 0, lat, lst);
        if (altitude > maxAlt) { maxAlt = altitude; labelPos = { altitude, azimuth }; }
      }
      if (labelPos) {
        const sp = createTextSprite('天赤道', '#4477cc', 18);
        sp.position.copy(altAzToVector3(labelPos.altitude + 3, labelPos.azimuth, R));
        group.add(sp);
      }
    }
  });

  // 赤经线：每 2h（0h, 2h, 4h, ..., 22h）
  // 分成两段绘制（南半球和北半球），避免视锥体裁剪问题
  for (let h = 0; h < 24; h += 2) {
    const raDeg = h * 15;

    // 南半球段：-90° 到 0°
    const ptsSouth = [];
    for (let i = 0; i <= 18; i++) {
      const decDeg = -90 + (i / 18) * 90;
      ptsSouth.push(raDecToVector3(raDeg, decDeg, lat, lst, R));
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ptsSouth), gridMat));

    // 北半球段：0° 到 +90°
    const ptsNorth = [];
    for (let i = 0; i <= 18; i++) {
      const decDeg = (i / 18) * 90;
      ptsNorth.push(raDecToVector3(raDeg, decDeg, lat, lst, R));
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ptsNorth), gridMat));
  }

  scene.add(group);
}

/**
 * 动态黄道线：将黄道坐标转换为 RA/Dec，再转为 Alt/Az，与星星坐标系一致
 * 每次时间/位置变化时重绘
 */
function updateEclipticLine(scene, location, time) {
  if (!scene) return;
  // 移除旧的黄道线
  const old = scene.getObjectByName('eclipticLine');
  if (old) { scene.remove(old); old.geometry?.dispose(); old.material?.dispose(); }
  const oldLabel = scene.getObjectByName('eclipticLabel');
  if (oldLabel) { scene.remove(oldLabel); oldLabel.material?.map?.dispose(); oldLabel.material?.dispose(); }

  const lst = getLocalSiderealTime(time || new Date(), location?.longitude || 116.4);
  const lat = location?.latitude || 39.9;
  const obliquity = 23.44 * Math.PI / 180;
  const R = 980;
  const points = [];

  for (let i = 0; i <= 180; i++) {
    const lon = (i / 180) * Math.PI * 2;
    const raDeg = Math.atan2(Math.sin(lon) * Math.cos(obliquity), Math.cos(lon)) * 180 / Math.PI;
    const decDeg = Math.asin(Math.sin(lon) * Math.sin(obliquity)) * 180 / Math.PI;
    const { altitude, azimuth } = raDecToAltAz(raDeg, decDeg, lat, lst);
    points.push(altAzToVector3(altitude, azimuth, R));
  }

  const group = new THREE.Group();
  group.name = 'eclipticLine';
  const mat = new THREE.LineBasicMaterial({ color: 0x886622, transparent: true, opacity: 0.7 });
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), mat));
  scene.add(group);

  // 黄道标签（在黄道最高点附近）
  let maxAlt = -Infinity, labelPos = null;
  for (let i = 0; i <= 180; i++) {
    const lon = (i / 180) * Math.PI * 2;
    const raDeg = Math.atan2(Math.sin(lon) * Math.cos(obliquity), Math.cos(lon)) * 180 / Math.PI;
    const decDeg = Math.asin(Math.sin(lon) * Math.sin(obliquity)) * 180 / Math.PI;
    const { altitude, azimuth } = raDecToAltAz(raDeg, decDeg, lat, lst);
    if (altitude > maxAlt) { maxAlt = altitude; labelPos = { altitude, azimuth }; }
  }
  if (labelPos) {
    const sprite = createTextSprite('黄道', '#aa7733', 20);
    sprite.position.copy(altAzToVector3(labelPos.altitude + 3, labelPos.azimuth, R));
    sprite.name = 'eclipticLabel';
    scene.add(sprite);
  }
}

function createPlanetSprite(nameZh, color, spriteScale = [38, 48], fontSize = 18) {
  const canvas = document.createElement('canvas');
  canvas.width = 96; canvas.height = 120;
  const ctx = canvas.getContext('2d');
  const hex = '#' + color.toString(16).padStart(6, '0');
  ctx.beginPath();
  ctx.arc(48, 40, 22, 0, Math.PI * 2);
  ctx.fillStyle = hex;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(nameZh, 48, 90);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(spriteScale[0], spriteScale[1], 1);
  return sprite;
}

function createTextSprite(text, color, fontSize) {
  // Measure text width first, then size canvas dynamically
  const offscreen = document.createElement('canvas');
  const offCtx = offscreen.getContext('2d');
  offCtx.font = `bold ${fontSize}px sans-serif`;
  const textWidth = offCtx.measureText(text).width;

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(textWidth) + 24;
  canvas.height = Math.ceil(fontSize * 2);
  const ctx = canvas.getContext('2d');
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(text, canvas.width / 2, fontSize * 1.4);

  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  // Keep aspect ratio; fix height at 24 world units
  sprite.scale.set((canvas.width / canvas.height) * 24, 24, 1);
  return sprite;
}
