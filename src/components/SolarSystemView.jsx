import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLANETS, SUN_CONFIG, MOON_CONFIG } from '../utils/planetConfig';
import { eclipticToVector3, auToScene } from '../utils/coordinates';

export default function SolarSystemView({ planets, sun, moon, selectedBody, onSelectBody }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const planetMeshesRef = useRef({});
  const orbitLinesRef = useRef({});
  const frameRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  // 初始化场景
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // 渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000008);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 场景
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 相机（俯视黄道面）
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 5000);
    camera.position.set(0, 120, 0);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 轨道控制
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 15;
    controls.maxDistance = 500;
    controlsRef.current = controls;

    // 环境光
    scene.add(new THREE.AmbientLight(0x111122, 0.5));

    // 太阳点光源
    const sunLight = new THREE.PointLight(0xFFF5E0, 2.0, 500);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    // 太阳
    const sunGeo = new THREE.SphereGeometry(SUN_CONFIG.radius, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: SUN_CONFIG.color });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sunMesh);
    planetMeshesRef.current['Sun'] = sunMesh;

    // 太阳光晕
    const glowGeo = new THREE.SphereGeometry(SUN_CONFIG.radius * 1.4, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xFFAA00, transparent: true, opacity: 0.15, side: THREE.BackSide
    });
    scene.add(new THREE.Mesh(glowGeo, glowMat));

    // 背景星点
    addBackgroundStars(scene);

    // 月球（单独添加，定位在地球附近）
    const moonGeo = new THREE.SphereGeometry(MOON_CONFIG.radius, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({ color: MOON_CONFIG.color });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.userData = { bodyId: 'Moon', nameZh: '月球', baseColor: MOON_CONFIG.color };
    scene.add(moonMesh);
    planetMeshesRef.current['Moon'] = moonMesh;
    const moonLabel = createLabel('月球');
    moonLabel.position.set(0, MOON_CONFIG.radius + 1.5, 0);
    moonMesh.add(moonLabel);

    // 行星和轨道
    PLANETS.forEach(config => {
      // 轨道线（圆形近似）
      const orbitPoints = [];
      for (let i = 0; i <= 128; i++) {
        const angle = (i / 128) * Math.PI * 2;
        // 使用平均轨道半径近似
        const avgAU = getAvgOrbitAU(config.id);
        const r = auToScene(avgAU);
        orbitPoints.push(new THREE.Vector3(r * Math.cos(angle), 0, -r * Math.sin(angle)));
      }
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
      const orbitMat = new THREE.LineBasicMaterial({
        color: config.orbitColor, transparent: true, opacity: 0.4
      });
      const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat);
      scene.add(orbitLine);
      orbitLinesRef.current[config.id] = orbitLine;

      // 行星球体 - 用 MeshBasicMaterial 直接显色，不依赖光照
      const geo = new THREE.SphereGeometry(config.radius, 24, 24);
      const mat = new THREE.MeshBasicMaterial({ color: config.color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData = { bodyId: config.id, nameZh: config.nameZh, baseColor: config.color };
      scene.add(mesh);
      planetMeshesRef.current[config.id] = mesh;

      // 土星光环
      if (config.hasRings) {
        const ringGeo = new THREE.RingGeometry(config.radius * 1.4, config.radius * 2.4, 64);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xC2A45A, side: THREE.DoubleSide, transparent: true, opacity: 0.6
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2.5;
        mesh.add(ring);
      }

      // 标签
      const label = createLabel(config.nameZh);
      label.position.set(0, config.radius + 2, 0);
      mesh.add(label);
    });

    // 点击事件
    const onClick = (e) => {
      const rect = mount.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const meshes = Object.values(planetMeshesRef.current);
      const hits = raycasterRef.current.intersectObjects(meshes);
      if (hits.length > 0) {
        const bodyId = hits[0].object.userData.bodyId;
        if (bodyId) onSelectBody?.(bodyId);
      }
    };
    mount.addEventListener('click', onClick);

    // 动画循环
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 响应窗口大小
    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      mount.removeEventListener('click', onClick);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // 更新行星位置
  useEffect(() => {
    if (!planets?.length) return;
    planets.forEach(planet => {
      const mesh = planetMeshesRef.current[planet.id];
      if (!mesh) return;
      const pos = eclipticToVector3(planet.helioLon, planet.helioLat, planet.helioDistAU);
      mesh.position.copy(pos);
    });
  }, [planets]);

  // 月球跟随地球，偏移 3 个场景单位以便可见
  useEffect(() => {
    if (!moon) return;
    const earthMesh = planetMeshesRef.current['Earth'];
    const moonMesh = planetMeshesRef.current['Moon'];
    if (!earthMesh || !moonMesh) return;
    moonMesh.position.set(
      earthMesh.position.x + 3,
      earthMesh.position.y + 1.5,
      earthMesh.position.z
    );
  }, [moon, planets]);

  // 高亮选中天体（MeshBasicMaterial 用颜色变化表示选中）
  useEffect(() => {
    Object.entries(planetMeshesRef.current).forEach(([id, mesh]) => {
      if (!mesh.material) return;
      const base = mesh.userData.baseColor ?? 0xffffff;
      if (id === selectedBody) {
        // 选中：颜色变亮（混入白色）
        const c = new THREE.Color(base);
        c.lerp(new THREE.Color(0xffffff), 0.4);
        mesh.material.color.set(c);
      } else {
        mesh.material.color.set(base);
      }
    });
  }, [selectedBody]);

  return (
    <div ref={mountRef} className="w-full h-full" style={{ background: '#000008' }} />
  );
}

function addBackgroundStars(scene) {
  const count = 3000;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 2000;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, sizeAttenuation: true });
  scene.add(new THREE.Points(geo, mat));
}

function createLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, 128, 32);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#aaccff';
  ctx.textAlign = 'center';
  ctx.fillText(text, 64, 20);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(8, 2, 1);
  return sprite;
}

// 各行星平均轨道半径（AU）
const AVG_ORBIT_AU = {
  Mercury: 0.387, Venus: 0.723, Earth: 1.000, Mars: 1.524,
  Jupiter: 5.203, Saturn: 9.537, Uranus: 19.19, Neptune: 30.07,
};
function getAvgOrbitAU(id) {
  return AVG_ORBIT_AU[id] || 1;
}
