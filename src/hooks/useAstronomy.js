import { useMemo } from 'react';
import * as Astronomy from 'astronomy-engine';
import { eclipticAngularDist } from '../utils/coordinates';

const PLANET_IDS = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];

const PLANET_NAMES_ZH = {
  Sun: '太阳', Moon: '月球', Mercury: '水星', Venus: '金星',
  Earth: '地球', Mars: '火星', Jupiter: '木星', Saturn: '土星',
  Uranus: '天王星', Neptune: '海王星',
};

/**
 * 核心天文计算 Hook
 * @param {Date} time - 观测时间
 * @param {{ latitude, longitude, elevation }} location - 观测者位置
 * @returns {{ planets, sun, moon, phenomena }}
 */
export function useAstronomy(time, location) {
  return useMemo(() => {
    if (!time || !location) return { planets: [], sun: null, moon: null, phenomena: [] };

    try {
      const observer = new Astronomy.Observer(
        location.latitude,
        location.longitude,
        location.elevation || 0
      );
      const astroTime = new Astronomy.AstroTime(time);

      // 计算太阳
      const sun = calcBody('Sun', astroTime, observer);

      // 计算月球
      const moon = calcBody('Moon', astroTime, observer);

      // 计算八大行星
      const planets = PLANET_IDS.map(id => calcBody(id, astroTime, observer));

      // 检测特殊天象（包括日月食）
      const phenomena = detectPhenomena(sun, moon, planets, astroTime);

      return { planets, sun, moon, phenomena };
    } catch (e) {
      console.error('Astronomy calculation error:', e);
      return { planets: [], sun: null, moon: null, phenomena: [] };
    }
  }, [time?.getTime(), location?.latitude, location?.longitude]);
}

function calcBody(bodyId, astroTime, observer) {
  // 地球是观测者本身，特殊处理
  if (bodyId === 'Earth') {
    let helioLon = 0, helioLat = 0, helioDistAU = 1;
    try {
      const helioVec = Astronomy.HelioVector('Earth', astroTime);
      const eclipCoords = Astronomy.Ecliptic(helioVec);
      helioLon = eclipCoords.elon;
      helioLat = eclipCoords.elat;
      helioDistAU = helioVec.Length();
    } catch (_) {}
    return {
      id: 'Earth', nameZh: '地球',
      ra: 0, dec: 0, altitude: 0, azimuth: 0,
      helioLon, helioLat, helioDistAU,
      distanceAU: 0, magnitude: 0, constellation: '',
    };
  }

  // 地心赤道坐标
  const equatorial = Astronomy.Equator(bodyId, astroTime, observer, true, true);

  // 地平坐标
  const horizontal = Astronomy.Horizon(
    astroTime, observer, equatorial.ra, equatorial.dec, 'normal'
  );

  // 日心黄道坐标（用于太阳系视图）
  let helioLon = 0, helioLat = 0, helioDistAU = 1;
  if (bodyId !== 'Sun' && bodyId !== 'Moon') {
    try {
      const helioVec = Astronomy.HelioVector(bodyId, astroTime);
      const eclipCoords = Astronomy.Ecliptic(helioVec);
      helioLon = eclipCoords.elon;
      helioLat = eclipCoords.elat;
      helioDistAU = helioVec.Length();
    } catch (_) {}
  } else if (bodyId === 'Moon') {
    // 月球用地心黄道坐标
    try {
      const moonVec = Astronomy.GeoVector('Moon', astroTime, true);
      const eclipCoords = Astronomy.Ecliptic(moonVec);
      helioLon = eclipCoords.elon;
      helioLat = eclipCoords.elat;
      helioDistAU = moonVec.Length(); // GeoVector 已是 AU 单位
    } catch (_) {}
  }

  // 地心距离
  let distanceAU = equatorial.dist;

  // 视星等（近似）
  let magnitude = 0;
  try {
    const illum = Astronomy.Illumination(bodyId, astroTime);
    magnitude = illum.mag;
  } catch (_) {}

  // 所在星座
  let constellation = '';
  try {
    const constel = Astronomy.Constellation(equatorial.ra, equatorial.dec);
    constellation = constel.symbol;
  } catch (_) {}

  return {
    id: bodyId,
    nameZh: PLANET_NAMES_ZH[bodyId] || bodyId,
    ra: equatorial.ra * 15,        // 小时→度
    dec: equatorial.dec,
    altitude: horizontal.altitude,
    azimuth: horizontal.azimuth,
    helioLon,
    helioLat,
    helioDistAU,
    distanceAU,
    magnitude,
    constellation,
  };
}

function detectPhenomena(sun, moon, planets, astroTime) {
  const phenomena = [];
  if (!sun || !planets.length) return phenomena;

  const sunLon = sun.helioLon || 0;

  // 检测日食和月食
  if (moon) {
    // 计算太阳和月球的角距离（地平坐标系）
    const sunMoonAngularDist = Math.sqrt(
      Math.pow(sun.ra - moon.ra, 2) + Math.pow(sun.dec - moon.dec, 2)
    );

    // 日食：月球在太阳和地球之间（新月附近），且角距离很小
    // 太阳和月球的视直径约为 0.5°，日食发生时角距离 < 2°
    if (sunMoonAngularDist < 2.0) {
      // 检查月相：新月附近（月球和太阳黄经接近）
      const moonSunLonDiff = Math.abs(moon.helioLon - sun.ra);
      const normalizedDiff = moonSunLonDiff > 180 ? 360 - moonSunLonDiff : moonSunLonDiff;

      if (normalizedDiff < 15) { // 新月附近 ±15°
        // 进一步检查：使用 Astronomy Engine 的日食搜索
        try {
          const searchStart = new Astronomy.AstroTime(new Date(astroTime.date.getTime() - 7 * 24 * 60 * 60 * 1000));
          const searchEnd = new Astronomy.AstroTime(new Date(astroTime.date.getTime() + 7 * 24 * 60 * 60 * 1000));
          const eclipse = Astronomy.SearchGlobalSolarEclipse(searchStart);

          if (eclipse && eclipse.peak) {
            const timeDiff = Math.abs(eclipse.peak.date.getTime() - astroTime.date.getTime());
            // 如果日食在当前时间的 ±12 小时内
            if (timeDiff < 12 * 60 * 60 * 1000) {
              let eclipseType = '日食';
              if (eclipse.kind === 'total') eclipseType = '日全食';
              else if (eclipse.kind === 'annular') eclipseType = '日环食';
              else if (eclipse.kind === 'partial') eclipseType = '日偏食';

              phenomena.push({
                type: 'solar_eclipse',
                bodies: ['Sun', 'Moon'],
                bodyZh: '太阳、月球',
                description: eclipseType,
                eclipseKind: eclipse.kind,
                peakTime: eclipse.peak.date,
              });
            }
          }
        } catch (e) {
          // 如果 API 调用失败，使用简单的几何判断
          if (sunMoonAngularDist < 0.6) {
            phenomena.push({
              type: 'solar_eclipse',
              bodies: ['Sun', 'Moon'],
              bodyZh: '太阳、月球',
              description: '可能发生日食',
            });
          }
        }
      }
    }

    // 月食：月球在地球阴影中（满月附近）
    // 检查月相：满月时太阳和月球黄经相差约 180°
    const moonSunLonDiff = Math.abs(moon.helioLon - sun.ra);
    const normalizedDiff = moonSunLonDiff > 180 ? 360 - moonSunLonDiff : moonSunLonDiff;

    if (Math.abs(normalizedDiff - 180) < 15) { // 满月附近 ±15°
      // 检查月球是否接近黄道（地球阴影在黄道面上）
      if (Math.abs(moon.helioLat) < 2.0) { // 月球黄纬 < 2°
        try {
          const searchStart = new Astronomy.AstroTime(new Date(astroTime.date.getTime() - 7 * 24 * 60 * 60 * 1000));
          const eclipse = Astronomy.SearchLunarEclipse(searchStart);

          if (eclipse && eclipse.peak) {
            const timeDiff = Math.abs(eclipse.peak.date.getTime() - astroTime.date.getTime());
            // 如果月食在当前时间的 ±12 小时内
            if (timeDiff < 12 * 60 * 60 * 1000) {
              let eclipseType = '月食';
              if (eclipse.kind === 'total') eclipseType = '月全食';
              else if (eclipse.kind === 'partial') eclipseType = '月偏食';
              else if (eclipse.kind === 'penumbral') eclipseType = '半影月食';

              phenomena.push({
                type: 'lunar_eclipse',
                bodies: ['Moon', 'Earth'],
                bodyZh: '月球、地球',
                description: eclipseType,
                eclipseKind: eclipse.kind,
                peakTime: eclipse.peak.date,
              });
            }
          }
        } catch (e) {
          // 如果 API 调用失败，使用简单的几何判断
          if (Math.abs(moon.helioLat) < 1.0 && Math.abs(normalizedDiff - 180) < 5) {
            phenomena.push({
              type: 'lunar_eclipse',
              bodies: ['Moon', 'Earth'],
              bodyZh: '月球、地球',
              description: '可能发生月食',
            });
          }
        }
      }
    }
  }

  // 检测冲/合（外行星）
  const outerPlanets = ['Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
  planets.forEach(planet => {
    if (!outerPlanets.includes(planet.id)) return;
    const diff = eclipticAngularDist(planet.ra, sun.ra);
    if (diff > 170 && diff < 190) {
      phenomena.push({
        type: 'opposition',
        bodies: [planet.id],
        bodyZh: planet.nameZh,
        description: `${planet.nameZh}冲日`,
      });
    } else if (diff < 10) {
      phenomena.push({
        type: 'conjunction',
        bodies: [planet.id, 'Sun'],
        bodyZh: planet.nameZh,
        description: `${planet.nameZh}合日`,
      });
    }
  });

  // 检测行星连珠（≥3颗行星黄经差<45°）
  const allBodies = planets.filter(p => p.id !== 'Uranus' && p.id !== 'Neptune');
  for (let i = 0; i < allBodies.length; i++) {
    const group = [allBodies[i]];
    for (let j = i + 1; j < allBodies.length; j++) {
      const dist = eclipticAngularDist(allBodies[i].ra, allBodies[j].ra);
      if (dist < 45) group.push(allBodies[j]);
    }
    if (group.length >= 3) {
      const names = group.map(p => p.nameZh).join('、');
      phenomena.push({
        type: 'alignment',
        bodies: group.map(p => p.id),
        description: `${names}连珠`,
      });
      break; // 只报告一次
    }
  }

  return phenomena;
}
