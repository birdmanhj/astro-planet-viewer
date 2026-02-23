import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLANETS, SUN_CONFIG, MOON_CONFIG } from '../utils/planetConfig';
import { eclipticToVector3, auToScene } from '../utils/coordinates';
import { generateProceduralTexture } from '../utils/proceduralTextures';

export default function SolarSystemView({ planets, sun, moon, selectedBody, onSelectBody, renderMode = 'texture' }) {
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
  const textureLoaderRef = useRef(new THREE.TextureLoader());
  const texturesRef = useRef({}); // 保存已加载的纹理

  // 初始化场景
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    console.log('SolarSystemView: Initializing scene');

    // 渲染器（启用 tone mapping 和曝光控制）
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000008);
    // 启用 tone mapping 防止太阳过曝
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5; // 进一步提高曝光，让行星更明亮
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    console.log('SolarSystemView: Renderer created');

    // 场景
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 相机（俯视黄道面）
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 5000);
    camera.position.set(0, 320, 0);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 轨道控制
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 15;
    controls.maxDistance = 500;
    controlsRef.current = controls;

    // 环境光（大幅增强以确保行星可见）
    scene.add(new THREE.AmbientLight(0x888899, 4.0));

    // 太阳点光源（极大增强强度和距离）
    const sunLight = new THREE.PointLight(0xFFFFFF, 80.0, 8000);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = false; // 关闭阴影以提高性能
    scene.add(sunLight);

    // 太阳（使用 MeshStandardMaterial 以支持 tone mapping）
    const sunGeo = new THREE.SphereGeometry(SUN_CONFIG.radius, 32, 32);
    const sunBaseColor = new THREE.Color(SUN_CONFIG.color);
    sunBaseColor.lerp(new THREE.Color(0xffffff), 0.3);
    const sunMat = new THREE.MeshStandardMaterial({
      color: sunBaseColor,
      emissive: SUN_CONFIG.emissive,
      emissiveIntensity: 1.5,
      roughness: 0.5,
      metalness: 0.0,
    });

    // 异步加载太阳纹理，失败时使用程序化纹理
    if (SUN_CONFIG.textureUrl) {
      textureLoaderRef.current.load(
        SUN_CONFIG.textureUrl,
        (texture) => {
          console.log('太阳纹理加载成功:', SUN_CONFIG.textureUrl);
          texturesRef.current['Sun'] = texture; // 保存纹理引用
          sunMat.map = texture;
          sunMat.needsUpdate = true;
        },
        undefined,
        (error) => {
          console.warn('太阳纹理加载失败，使用程序化纹理:', error);
          const procTexture = generateProceduralTexture('Sun');
          texturesRef.current['Sun'] = procTexture;
          sunMat.map = procTexture;
          sunMat.needsUpdate = true;
        }
      );
    } else {
      const procTexture = generateProceduralTexture('Sun');
      texturesRef.current['Sun'] = procTexture;
      sunMat.map = procTexture;
      console.log('SolarSystemView: Using procedural texture for Sun');
    }

    // 步骤 1：先创建 Mesh（已包含纹理贴图）
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    // 太阳不接收阴影（它是光源）
    sunMesh.castShadow = false;
    sunMesh.receiveShadow = false;
    sunMesh.userData = {
      bodyId: 'Sun',
      nameZh: '太阳',
      baseColor: SUN_CONFIG.color,
      isSun: true,
      rotationPeriod: SUN_CONFIG.rotationPeriod,
      axialTilt: SUN_CONFIG.axialTilt
    };
    // 步骤 2：再使用四元数设置轴倾角（绕 Z 轴倾斜）
    if (SUN_CONFIG.axialTilt) {
      const tiltAxis = new THREE.Vector3(0, 0, 1); // Z 轴
      const tiltAngle = (SUN_CONFIG.axialTilt * Math.PI) / 180;
      const tiltQuat = new THREE.Quaternion();
      tiltQuat.setFromAxisAngle(tiltAxis, tiltAngle);
      sunMesh.quaternion.copy(tiltQuat);
    }
    // 步骤 3：自转将在动画循环中绕倾斜后的轴进行
    scene.add(sunMesh);
    planetMeshesRef.current['Sun'] = sunMesh;

    console.log('SolarSystemView: Sun added to scene');

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
    const moonBaseColor = new THREE.Color(MOON_CONFIG.color);
    moonBaseColor.lerp(new THREE.Color(0xffffff), 0.3);
    const moonMat = new THREE.MeshStandardMaterial({
      color: moonBaseColor,
      emissive: MOON_CONFIG.emissive,
      emissiveIntensity: 0.3,
      roughness: 0.7,
      metalness: 0.0,
    });

    // 异步加载月球纹理，失败时使用程序化纹理
    if (MOON_CONFIG.textureUrl) {
      textureLoaderRef.current.load(
        MOON_CONFIG.textureUrl,
        (texture) => {
          texturesRef.current['Moon'] = texture;
          moonMat.map = texture;
          moonMat.needsUpdate = true;
        },
        undefined,
        (error) => {
          console.warn('月球纹理加载失败，使用程序化纹理:', error);
          const procTexture = generateProceduralTexture('Moon');
          texturesRef.current['Moon'] = procTexture;
          moonMat.map = procTexture;
          moonMat.needsUpdate = true;
        }
      );
    } else {
      const procTexture = generateProceduralTexture('Moon');
      texturesRef.current['Moon'] = procTexture;
      moonMat.map = procTexture;
    }

    // 步骤 1：先创建 Mesh（已包含纹理贴图）
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    // 月球可以投射和接收阴影（用于日食和月食）
    moonMesh.castShadow = true;
    moonMesh.receiveShadow = true;
    moonMesh.userData = {
      bodyId: 'Moon',
      nameZh: '月球',
      baseColor: MOON_CONFIG.color,
      rotationPeriod: MOON_CONFIG.rotationPeriod,
      axialTilt: MOON_CONFIG.axialTilt
    };
    // 步骤 2：再使用四元数设置轴倾角（绕 Z 轴倾斜）
    if (MOON_CONFIG.axialTilt) {
      const tiltAxis = new THREE.Vector3(0, 0, 1); // Z 轴
      const tiltAngle = (MOON_CONFIG.axialTilt * Math.PI) / 180;
      const tiltQuat = new THREE.Quaternion();
      tiltQuat.setFromAxisAngle(tiltAxis, tiltAngle);
      moonMesh.quaternion.copy(tiltQuat);
    }
    // 步骤 3：自转将在动画循环中绕倾斜后的轴进行
    scene.add(moonMesh);
    planetMeshesRef.current['Moon'] = moonMesh;
    const moonLabel = createLabel('月球');
    moonLabel.position.set(0, MOON_CONFIG.radius + 1.5, 0);
    moonMesh.add(moonLabel);

    // 月球视觉轨道圈（作为地球的子对象，随地球移动）
    // 白道与黄道的夹角约为 5.14°
    const moonOrbitPts = [];
    const moonOrbitInclination = 5.14 * Math.PI / 180; // 白道倾角
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const x = 4 * Math.cos(a);
      const z = -4 * Math.sin(a);
      // 应用倾角：绕 X 轴旋转
      const y = z * Math.sin(moonOrbitInclination);
      const zTilted = z * Math.cos(moonOrbitInclination);
      moonOrbitPts.push(new THREE.Vector3(x, y, zTilted));
    }
    const moonOrbitLine = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(moonOrbitPts),
      new THREE.LineBasicMaterial({ color: 0x445566, transparent: true, opacity: 0.5 })
    );
    // 先加到场景，后续在 effect 里跟随地球
    scene.add(moonOrbitLine);
    planetMeshesRef.current['MoonOrbit'] = moonOrbitLine;

    // 行星和轨道
    PLANETS.forEach(config => {
      // 椭圆轨道线：使用极坐标方程 r(θ) = a(1-e²)/(1+e·cosθ)，再经 auToScene 对数缩放
      const orbitPoints = buildEllipticalOrbit(
        config.semiMajorAU,
        config.eccentricity,
        config.perihelionLonDeg
      );
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
      const orbitMat = new THREE.LineBasicMaterial({
        color: config.orbitColor, transparent: true, opacity: 0.4
      });
      const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat);
      scene.add(orbitLine);
      orbitLinesRef.current[config.id] = orbitLine;

      // 行星球体 - 使用 MeshStandardMaterial 支持纹理和光照
      const geo = new THREE.SphereGeometry(config.radius, 32, 32);
      const planetBaseColor = new THREE.Color(config.color);
      planetBaseColor.lerp(new THREE.Color(0xffffff), 0.3); // 30% 白色混合增强亮度
      const mat = new THREE.MeshStandardMaterial({
        color: planetBaseColor,
        emissive: config.emissive || 0x000000,
        emissiveIntensity: 0.5,
        roughness: 0.5,
        metalness: 0.0,
      });

      // 异步加载行星纹理，失败时使用程序化纹理
      if (config.textureUrl) {
        textureLoaderRef.current.load(
          config.textureUrl,
          (texture) => {
            console.log(`${config.nameZh}纹理加载成功:`, config.textureUrl);
            texturesRef.current[config.id] = texture;
            mat.map = texture;
            mat.needsUpdate = true;
          },
          undefined,
          (error) => {
            console.warn(`${config.nameZh}纹理加载失败，使用程序化纹理:`, error);
            const procTexture = generateProceduralTexture(config.id);
            texturesRef.current[config.id] = procTexture;
            mat.map = procTexture;
            mat.needsUpdate = true;
          }
        );
      } else {
        const procTexture = generateProceduralTexture(config.id);
        texturesRef.current[config.id] = procTexture;
        mat.map = procTexture;
      }

      // 步骤 1：先创建 Mesh（已包含纹理贴图）
      const mesh = new THREE.Mesh(geo, mat);
      // 行星可以投射和接收阴影（用于日食和月食）
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = {
        bodyId: config.id,
        nameZh: config.nameZh,
        baseColor: config.color,
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
      scene.add(mesh);
      planetMeshesRef.current[config.id] = mesh;

      // 土星光环
      if (config.hasRings) {
        const innerRadius = config.radius * 1.4;
        const outerRadius = config.radius * 2.4;
        const ringGeo = new THREE.RingGeometry(innerRadius, outerRadius, 64, 8);

        // 修改 UV 坐标以实现径向映射（纹理从内到外）
        // 纹理图片的左边（U=0）对应内圈，右边（U=1）对应外圈
        const uvs = ringGeo.attributes.uv.array;
        const positions = ringGeo.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
          const x = positions[i];
          const y = positions[i + 1];
          const radius = Math.sqrt(x * x + y * y);
          // 将半径归一化到 0-1 范围（从内圈到外圈）
          const normalizedRadius = (radius - innerRadius) / (outerRadius - innerRadius);

          const uvIndex = (i / 3) * 2;
          // U 坐标：使用归一化半径（0=内圈，1=外圈）
          uvs[uvIndex] = normalizedRadius;
          // V 坐标：使用角度，让纹理在圆周方向重复
          const angle = Math.atan2(y, x);
          uvs[uvIndex + 1] = (angle + Math.PI) / (2 * Math.PI); // 归一化到 0-1
        }
        ringGeo.attributes.uv.needsUpdate = true;

        const ringMat = new THREE.MeshStandardMaterial({
          color: 0xC2A45A,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.95, // 降低透明度，使光环更明显
          roughness: 0.9,
          metalness: 0.0,
        });

        // 异步加载土星环纹理
        if (config.ringTextureUrl) {
          textureLoaderRef.current.load(
            config.ringTextureUrl,
            (texture) => {
              // 土星环纹理需要径向映射（从内到外）
              texture.wrapS = THREE.ClampToEdgeWrapping; // 径向方向夹紧（U方向）
              texture.wrapT = THREE.RepeatWrapping; // 环绕方向重复（V方向）
              texturesRef.current[config.id + '_ring'] = texture;
              ringMat.map = texture;
              ringMat.alphaMap = texture;
              ringMat.needsUpdate = true;
            },
            undefined,
            (error) => console.warn('土星环纹理加载失败:', error)
          );
        }

        const ring = new THREE.Mesh(ringGeo, ringMat);
        // 光环应该在土星的赤道平面上（垂直于自转轴）
        // 由于土星已经倾斜，光环只需要绕 X 轴旋转 90° 即可
        ring.rotation.x = Math.PI / 2; // 90°，使光环水平
        ring.userData = { isSaturnRing: true, baseColor: 0xC2A45A }; // 标记为土星环
        mesh.add(ring);
        planetMeshesRef.current[config.id + '_ring'] = ring; // 保存光环引用
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

      // 行星自转（绕自身轴旋转）
      Object.values(planetMeshesRef.current).forEach(mesh => {
        // 排除土星环和月球（月球由潮汐锁定控制）
        if (mesh.userData && mesh.userData.rotationPeriod &&
            !mesh.userData.isSaturnRing &&
            mesh.userData.bodyId !== 'Moon') {
          // 动态调整加速倍数：慢速行星加速更多
          let speedMultiplier = 60;
          if (mesh.userData.rotationPeriod > 1000) {
            speedMultiplier = 600; // 水星、金星加速 600 倍
          } else if (mesh.userData.rotationPeriod > 100) {
            speedMultiplier = 200; // 中速行星加速 200 倍
          }

          const rotationSpeed = (2 * Math.PI) / (mesh.userData.rotationPeriod * speedMultiplier);

          // 创建绕局部 Y 轴的旋转四元数
          const rotAxis = new THREE.Vector3(0, 1, 0); // 局部 Y 轴
          const rotQuat = new THREE.Quaternion();
          rotQuat.setFromAxisAngle(rotAxis, rotationSpeed);

          // 应用旋转：先有的四元数（包含轴倾角）乘以新的旋转
          mesh.quaternion.multiplyQuaternions(mesh.quaternion, rotQuat);
        }
      });

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    console.log('SolarSystemView: Animation loop started');

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
    if (!planets?.length) {
      console.log('SolarSystemView: No planets data');
      return;
    }
    console.log('SolarSystemView: Updating planet positions', planets.length);
    planets.forEach(planet => {
      const mesh = planetMeshesRef.current[planet.id];
      if (!mesh) return;
      // 太阳系俯视图：将行星投影到黄道面（helioLat=0），使其始终落在轨道线上
      const pos = eclipticToVector3(planet.helioLon, 0, planet.helioDistAU);
      mesh.position.copy(pos);
    });
  }, [planets]);

  // 月球跟随地球，按实际地心黄道经度确定方向，加视觉偏移量
  useEffect(() => {
    if (!moon) return;
    const earthMesh = planetMeshesRef.current['Earth'];
    const moonMesh = planetMeshesRef.current['Moon'];
    const moonOrbit = planetMeshesRef.current['MoonOrbit'];
    if (!earthMesh || !moonMesh) return;

    // moon.helioLon/helioLat 是地心黄道坐标（月球相对地球的方向）
    const lonRad = moon.helioLon * Math.PI / 180;
    const latRad = moon.helioLat * Math.PI / 180;
    const MOON_VIS_RADIUS = 4; // 视觉轨道半径（场景单位）

    moonMesh.position.set(
      earthMesh.position.x + MOON_VIS_RADIUS * Math.cos(latRad) * Math.cos(lonRad),
      earthMesh.position.y + MOON_VIS_RADIUS * Math.sin(latRad),
      earthMesh.position.z - MOON_VIS_RADIUS * Math.cos(latRad) * Math.sin(lonRad)
    );

    // 潮汐锁定：月球始终以同一面朝向地球
    // 计算从月球指向地球的方向向量
    const toEarth = new THREE.Vector3();
    toEarth.subVectors(earthMesh.position, moonMesh.position).normalize();

    // 计算月球应该的朝向
    // 纹理贴图的左右边缘（U=0 和 U=1）对应月背（远离地球）
    // 纹理中心（U=0.5）对应月面（朝向地球）
    // 所以需要让月球的 +X 轴指向地球
    const up = new THREE.Vector3(0, 1, 0);
    const moonRotation = new THREE.Matrix4();
    moonRotation.lookAt(moonMesh.position, earthMesh.position, up);

    // 从旋转矩阵提取四元数，并应用轴倾角
    const lookQuat = new THREE.Quaternion();
    lookQuat.setFromRotationMatrix(moonRotation);

    // 应用月球的轴倾角（6.68°）
    if (moonMesh.userData.axialTilt) {
      const tiltAxis = new THREE.Vector3(0, 0, 1);
      const tiltAngle = (moonMesh.userData.axialTilt * Math.PI) / 180;
      const tiltQuat = new THREE.Quaternion();
      tiltQuat.setFromAxisAngle(tiltAxis, tiltAngle);
      lookQuat.multiply(tiltQuat);
    }

    // 额外旋转 90°，使纹理正确对齐（+X 轴指向地球）
    const adjustQuat = new THREE.Quaternion();
    adjustQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    lookQuat.multiply(adjustQuat);

    moonMesh.quaternion.copy(lookQuat);

    // 轨道圈跟随地球
    if (moonOrbit) moonOrbit.position.copy(earthMesh.position);
  }, [moon, planets]);

  // 高亮选中天体（MeshStandardMaterial 用 emissive 表示选中）
  useEffect(() => {
    Object.entries(planetMeshesRef.current).forEach(([id, mesh]) => {
      // 跳过没有材质、MoonOrbit 或没有 emissive 属性的对象
      if (!mesh.material || id === 'MoonOrbit' || !mesh.material.emissive) return;
      const base = mesh.userData.baseColor ?? 0xffffff;
      if (id === selectedBody) {
        // 选中：增强自发光
        const emissiveColor = new THREE.Color(base);
        emissiveColor.multiplyScalar(0.5);
        mesh.material.emissive.set(emissiveColor);
        mesh.material.emissiveIntensity = 0.8;
      } else {
        // 未选中：恢复原始自发光
        const config = PLANETS.find(p => p.id === id) ||
                       (id === 'Sun' ? SUN_CONFIG : null) ||
                       (id === 'Moon' ? MOON_CONFIG : null);
        if (config) {
          mesh.material.emissive.set(config.emissive || 0x000000);
          mesh.material.emissiveIntensity = config.emissiveIntensity || 0.3;
        }
      }
    });
  }, [selectedBody]);

  // 根据渲染模式切换材质
  useEffect(() => {
    Object.entries(planetMeshesRef.current).forEach(([id, mesh]) => {
      if (!mesh.material || id === 'MoonOrbit') return;

      // 处理土星光环
      if (mesh.userData.isSaturnRing) {
        if (renderMode === 'solid') {
          // 纯色模式：半透明纯色，无纹理
          mesh.material.color.set(mesh.userData.baseColor);
          mesh.material.emissive.set(0x000000);
          mesh.material.emissiveIntensity = 0;
          mesh.material.map = null;
          mesh.material.alphaMap = null;
          mesh.material.opacity = 0.6;
          mesh.material.needsUpdate = true;
        } else {
          // 真实模式：使用纹理
          const ringTexture = texturesRef.current['Saturn_ring'];
          if (ringTexture) {
            mesh.material.map = ringTexture;
            mesh.material.alphaMap = ringTexture;
            mesh.material.opacity = 0.7;
            mesh.material.needsUpdate = true;
          }
        }
        return;
      }

      // 处理行星和天体
      if (!mesh.material.emissive) return;

      const config = PLANETS.find(p => p.id === id) ||
                     (id === 'Sun' ? SUN_CONFIG : null) ||
                     (id === 'Moon' ? MOON_CONFIG : null);
      if (!config) return;

      if (renderMode === 'solid') {
        // 纯色模式：使用配置颜色，高自发光，无纹理
        mesh.material.color.set(config.color);
        mesh.material.emissive.set(config.color);
        mesh.material.emissiveIntensity = 0.8;
        mesh.material.map = null;
        mesh.material.roughness = 0.7;
        mesh.material.needsUpdate = true;
      } else {
        // 真实模式：使用配置颜色增强饱和度，高自发光，恢复纹理
        const baseColor = new THREE.Color(config.color);
        baseColor.lerp(new THREE.Color(0xffffff), 0.3); // 30% 白色混合
        mesh.material.color.set(baseColor);

        // 增强自发光以提升亮度和色彩
        const emissiveColor = new THREE.Color(config.emissive || config.color);
        mesh.material.emissive.set(emissiveColor);
        mesh.material.emissiveIntensity = 0.5;

        // 降低粗糙度让颜色更鲜艳
        mesh.material.roughness = 0.5;

        // 恢复纹理
        const texture = texturesRef.current[id];
        if (texture) {
          mesh.material.map = texture;
        }
        mesh.material.needsUpdate = true;
      }
    });
  }, [renderMode]);

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

/**
 * 生成椭圆轨道点集（极坐标方程 + auToScene 对数缩放）
 * r(θ) = a(1-e²) / (1 + e·cos(θ))
 * θ 为真近点角，lon = perihelionLon + θ 为黄经
 */
function buildEllipticalOrbit(semiMajorAU, eccentricity, perihelionLonDeg, segments = 256) {
  const omega = perihelionLonDeg * Math.PI / 180;
  const p = semiMajorAU * (1 - eccentricity * eccentricity); // 半通径
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const trueAnomaly = (i / segments) * Math.PI * 2;
    const r = p / (1 + eccentricity * Math.cos(trueAnomaly));
    const lon = omega + trueAnomaly;
    const sceneR = auToScene(r);
    points.push(new THREE.Vector3(
      sceneR * Math.cos(lon),
      0,
      -sceneR * Math.sin(lon)
    ));
  }
  return points;
}
