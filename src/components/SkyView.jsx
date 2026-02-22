import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { altAzToVector3, raDecToAltAz, getLocalSiderealTime } from '../utils/coordinates';
import { bvToRgb, PLANETS } from '../utils/planetConfig';

const PLANET_COLORS = Object.fromEntries(PLANETS.map(p => [p.id, p.color]));
PLANET_COLORS['Sun'] = 0xFDB813;
PLANET_COLORS['Moon'] = 0xDDDDCC;

const COMPASS = [
  { label: '北', az: 0 }, { label: '东', az: 90 },
  { label: '南', az: 180 }, { label: '西', az: 270 },
];

export default function SkyView({ planets, sun, moon, location, time, selectedBody, onSelectBody }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const frameRef = useRef(null);
  const planetSpritesRef = useRef({});
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const sphericalRef = useRef({ theta: 0, phi: Math.PI / 2 });
  const starDataRef = useRef(null); // 缓存星表数据
  const [sceneReady, setSceneReady] = useState(false);

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
    updateCameraDirection(camera, sphericalRef.current);

    // 天穹
    const skyGeo = new THREE.SphereGeometry(1500, 32, 16);
    scene.add(new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ color: 0x000010, side: THREE.BackSide })));

    // 地面
    const groundGeo = new THREE.CircleGeometry(1500, 64);
    const ground = new THREE.Mesh(groundGeo, new THREE.MeshBasicMaterial({
      color: 0x0a1a0a, side: THREE.DoubleSide, transparent: true, opacity: 0.95
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
      sprite.scale.set(40, 20, 1);
      scene.add(sprite);
    });

    // 黄道线
    addEclipticLine(scene);

    // 行星精灵
    const allBodies = [
      { id: 'Sun', nameZh: '太阳', color: 0xFDB813 },
      { id: 'Moon', nameZh: '月球', color: 0xDDDDCC },
      ...PLANETS.map(p => ({ id: p.id, nameZh: p.nameZh, color: p.color })),
    ];
    allBodies.forEach(body => {
      const sprite = createPlanetSprite(body.nameZh, body.color);
      sprite.userData = { bodyId: body.id };
      sprite.visible = false;
      scene.add(sprite);
      planetSpritesRef.current[body.id] = sprite;
    });

    // 鼠标控制
    const onMouseDown = (e) => { isDraggingRef.current = true; lastMouseRef.current = { x: e.clientX, y: e.clientY }; };
    const onMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      rotateSky(e.clientX - lastMouseRef.current.x, e.clientY - lastMouseRef.current.y, 0.003);
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => { isDraggingRef.current = false; };

    // 触摸控制
    let lastTouches = null;
    const onTouchStart = (e) => { e.preventDefault(); lastTouches = Array.from(e.touches); };
    const onTouchMove = (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && lastTouches?.length === 1) {
        rotateSky(e.touches[0].clientX - lastTouches[0].clientX, e.touches[0].clientY - lastTouches[0].clientY, 0.004);
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

    const animate = () => { frameRef.current = requestAnimationFrame(animate); renderer.render(scene, camera); };
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

  // 加载星表数据（只加载一次）
  useEffect(() => {
    if (!sceneReady) return;
    if (starDataRef.current) {
      // 已有缓存，直接渲染
      updateStarField(sceneRef.current, starDataRef.current, location, time);
      return;
    }
    fetch('/data/stars_bright.json')
      .then(r => r.json())
      .then(stars => {
        starDataRef.current = stars;
        updateStarField(sceneRef.current, stars, location, time);
      })
      .catch(() => {
        renderFallbackStars(sceneRef.current);
      });
  }, [sceneReady]);

  // 位置或时间变化时更新星场
  useEffect(() => {
    if (!sceneReady || !starDataRef.current) return;
    updateStarField(sceneRef.current, starDataRef.current, location, time);
  }, [location?.latitude, location?.longitude, time?.getTime(), sceneReady]);

  // 更新行星位置
  useEffect(() => {
    const allBodies = [...(planets || []), ...(sun ? [sun] : []), ...(moon ? [moon] : [])];
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
    const s = sphericalRef.current;
    s.theta -= dx * factor;
    // dy > 0 向下拖 → 天空向下移动 → 视线向上 → phi 减小
    s.phi = Math.max(0.05, Math.min(Math.PI - 0.05, s.phi - dy * factor));
    if (cameraRef.current) updateCameraDirection(cameraRef.current, s);
  }

  return (
    <div ref={mountRef} className="w-full h-full relative" style={{ background: '#000005' }}>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-500 pointer-events-none select-none">
        拖拽旋转视角 · 双指缩放
      </div>
    </div>
  );
}

function updateCameraDirection(camera, { theta, phi }) {
  const x = Math.sin(phi) * Math.sin(theta);
  const y = Math.cos(phi);
  const z = -Math.sin(phi) * Math.cos(theta);
  camera.lookAt(x * 100, y * 100, z * 100);
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

function addEclipticLine(scene) {
  const points = [];
  const obliquity = 23.44 * Math.PI / 180;
  for (let i = 0; i <= 128; i++) {
    const lon = (i / 128) * Math.PI * 2;
    const ra = Math.atan2(Math.sin(lon) * Math.cos(obliquity), Math.cos(lon));
    const dec = Math.asin(Math.sin(lon) * Math.sin(obliquity));
    const r = 990;
    points.push(new THREE.Vector3(r * Math.cos(dec) * Math.cos(ra), r * Math.sin(dec), -r * Math.cos(dec) * Math.sin(ra)));
  }
  scene.add(new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0x553300, transparent: true, opacity: 0.4 })
  ));
}

function createPlanetSprite(nameZh, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 80;
  const ctx = canvas.getContext('2d');
  const hex = '#' + color.toString(16).padStart(6, '0');
  ctx.beginPath();
  ctx.arc(32, 28, 14, 0, Math.PI * 2);
  ctx.fillStyle = hex;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(nameZh, 32, 62);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(30, 37, 1);
  return sprite;
}

function createTextSprite(text, color, fontSize) {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(text, 32, 24);
  const tex = new THREE.CanvasTexture(canvas);
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
}
