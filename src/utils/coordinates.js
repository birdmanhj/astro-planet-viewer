import * as THREE from 'three';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/**
 * 地平坐标（高度角/方位角）→ Three.js Vector3
 * 天球半径默认1000，相机在球心
 * 坐标系：Y轴向上，X轴向东，-Z轴向南（北方向为+Z）
 */
export function altAzToVector3(altDeg, azDeg, radius = 1000) {
  const alt = altDeg * DEG2RAD;
  const az = azDeg * DEG2RAD;
  return new THREE.Vector3(
    radius * Math.cos(alt) * Math.sin(az),   // 东
    radius * Math.sin(alt),                   // 上
    -radius * Math.cos(alt) * Math.cos(az)   // 南（-Z）
  );
}

/**
 * AU距离 → 场景单位（对数缩放）
 * 水星(0.39AU)→~11, 地球(1AU)→~20, 海王星(30AU)→~80
 */
export function auToScene(au) {
  return Math.log(au * 10 + 1) * 30;
}

/**
 * 日心黄道坐标 → Three.js Vector3（太阳系视图）
 * 黄道面为XZ平面，Y轴为黄道北极
 */
export function eclipticToVector3(lonDeg, latDeg, distAU) {
  const lon = lonDeg * DEG2RAD;
  const lat = latDeg * DEG2RAD;
  const r = auToScene(distAU);
  return new THREE.Vector3(
    r * Math.cos(lat) * Math.cos(lon),
    r * Math.sin(lat),
    -r * Math.cos(lat) * Math.sin(lon)
  );
}

/**
 * 赤道坐标（RA/Dec）→ 地平坐标（Alt/Az）
 * @param {number} raDeg - 赤经（度）
 * @param {number} decDeg - 赤纬（度）
 * @param {number} latDeg - 观测者纬度（度）
 * @param {number} lstDeg - 本地恒星时（度）
 * @returns {{ altitude: number, azimuth: number }}
 */
export function raDecToAltAz(raDeg, decDeg, latDeg, lstDeg) {
  const ha = ((lstDeg - raDeg) % 360 + 360) % 360; // 时角（度）
  const haRad = ha * DEG2RAD;
  const decRad = decDeg * DEG2RAD;
  const latRad = latDeg * DEG2RAD;

  const sinAlt = Math.sin(decRad) * Math.sin(latRad) +
                 Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * RAD2DEG;

  // 天顶/天底时分母为零，方位角需要特殊处理
  const denom = Math.cos(altitude * DEG2RAD) * Math.cos(latRad);
  if (Math.abs(denom) < 1e-10) {
    // 在极点附近，方位角由时角决定
    // 北天极（altitude ≈ 90°）：azimuth = 180° - HA（从南方看向北极）
    // 南天极（altitude ≈ -90°）：azimuth = HA（从北方看向南极）
    const azimuth = altitude > 0 ? (180 - ha + 360) % 360 : ha;
    return { altitude, azimuth };
  }

  const cosAz = (Math.sin(decRad) - Math.sin(altitude * DEG2RAD) * Math.sin(latRad)) / denom;
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) * RAD2DEG;

  // 判断方位角象限
  if (Math.sin(haRad) > 0) azimuth = 360 - azimuth;

  return { altitude, azimuth };
}

/**
 * 计算本地恒星时（度）
 * @param {Date} date
 * @param {number} lngDeg - 观测者经度（度）
 */
export function getLocalSiderealTime(date, lngDeg) {
  // J2000.0 起算的儒略日
  const jd = dateToJD(date);
  const T = (jd - 2451545.0) / 36525.0;

  // 格林威治恒星时（度）
  let gst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
            0.000387933 * T * T - T * T * T / 38710000.0;
  gst = ((gst % 360) + 360) % 360;

  // 本地恒星时
  return ((gst + lngDeg) % 360 + 360) % 360;
}

/**
 * Date → 儒略日
 */
export function dateToJD(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

/**
 * 将角度规范化到 [0, 360)
 */
export function normalizeDeg(deg) {
  return ((deg % 360) + 360) % 360;
}

/**
 * 计算两个黄经之间的角距（考虑360°环绕）
 */
export function eclipticAngularDist(lon1, lon2) {
  const diff = Math.abs(normalizeDeg(lon1) - normalizeDeg(lon2));
  return diff > 180 ? 360 - diff : diff;
}

/**
 * 赤道坐标（RA/Dec）→ 观测者坐标系 Vector3（通过 Alt/Az 中间转换）
 * 使用已验证的 raDecToAltAz 和 altAzToVector3 管道，确保一致性
 * @param {number} raDeg - 赤经（度）
 * @param {number} decDeg - 赤纬（度）
 * @param {number} latDeg - 观测者纬度（度）
 * @param {number} lstDeg - 本地恒星时（度）
 * @param {number} radius - 天球半径
 * @returns {THREE.Vector3}
 */
export function raDecToVector3(raDeg, decDeg, latDeg, lstDeg, radius = 1000) {
  // 使用已验证的转换管道
  const { altitude, azimuth } = raDecToAltAz(raDeg, decDeg, latDeg, lstDeg);
  return altAzToVector3(altitude, azimuth, radius);
}
