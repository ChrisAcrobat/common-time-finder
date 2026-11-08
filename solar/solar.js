// NOAA/Meeus geometric solar coordinates; no refraction correction (D-052).
const RAD = Math.PI / 180;
const wrap = (value, period = 360) => ((value % period) + period) % period;

function coordinates(ms) {
  const t = (ms / 86400000 + 2440587.5 - 2451545) / 36525;
  const longitude = wrap(280.46646 + t * (36000.76983 + .0003032 * t));
  const anomaly = (357.52911 + t * (35999.05029 - .0001537 * t)) * RAD;
  const eccentricity = .016708634 - t * (.000042037 + .0000001267 * t);
  const centre = Math.sin(anomaly) * (1.914602 - t * (.004817 + .000014 * t)) +
    Math.sin(2 * anomaly) * (.019993 - .000101 * t) + Math.sin(3 * anomaly) * .000289;
  const omega = (125.04 - 1934.136 * t) * RAD;
  const apparent = (longitude + centre - .00569 - .00478 * Math.sin(omega)) * RAD;
  const obliquity = (23 + (26 + (21.448 - t * (46.815 + t * (.00059 - t * .001813))) / 60) / 60 +
    .00256 * Math.cos(omega)) * RAD;
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(apparent)) / RAD;
  const y = Math.tan(obliquity / 2) ** 2,
    l = longitude * RAD,
    e = eccentricity,
    m = anomaly;
  const equationOfTime = 4 / RAD * (y * Math.sin(2 * l) - 2 * e * Math.sin(m) +
    4 * e * y * Math.sin(m) * Math.cos(2 * l) - .5 * y * y * Math.sin(4 * l) - 1.25 * e * e * Math.sin(2 * m));
  return {
    declination,
    equationOfTime
  };
}
export function subsolarPoint(ms) {
  const {
    declination,
    equationOfTime
  } = coordinates(ms);
  const hours = wrap(ms, 86400000) / 3600000;
  return {
    lat: declination,
    lon: wrap(-15 * (hours - 12) - equationOfTime / 4 + 180) - 180
  };
}
export function solarPosition(ms, lat, lon) {
  const {
    declination,
    equationOfTime
  } = coordinates(ms);
  const hourAngle = wrap(wrap(ms, 86400000) / 240000 + equationOfTime / 4 + lon) - 180;
  const p = lat * RAD,
    d = declination * RAD,
    h = hourAngle * RAD;
  const elevation = Math.asin(Math.max(-1, Math.min(1, Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(h)))) / RAD;
  const azimuth = wrap(Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(p) - Math.tan(d) * Math.cos(p)) / RAD + 180);
  return {
    declination,
    equationOfTime,
    hourAngle,
    elevation,
    azimuth
  };
}
