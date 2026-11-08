// Unwrap each ring as a continuous longitude sequence, then move the query point
// into that ring's frame. Wrapping each edge independently creates false hits on
// the opposite side of the Earth for dateline-crossing polygons.
const ringCache = new WeakMap();

function unwrapRing(ring) {
  if (ringCache.has(ring)) return ringCache.get(ring);
  let previous = ring[0][0];
  const points = ring.map(([longitude, latitude]) => {
    while (longitude - previous > 180) longitude -= 360;
    while (longitude - previous < -180) longitude += 360;
    previous = longitude;
    return [longitude, latitude];
  });
  const xs = points.map(point => point[0]);
  const value = {
    points,
    centre: (Math.min(...xs) + Math.max(...xs)) / 2
  };
  ringCache.set(ring, value);
  return value;
}

function ringTest(ring, lat, lon) {
  const {
    points,
    centre
  } = unwrapRing(ring);
  lon += 360 * Math.round((centre - lon) / 360);
  let inside = false,
    distance = Infinity;
  const scale = Math.max(.01, Math.cos(lat * Math.PI / 180));
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    let ax = points[j][0] - lon,
      bx = points[i][0] - lon;
    const ay = points[j][1] - lat,
      by = points[i][1] - lat;
    if ((ay > 0) !== (by > 0) && 0 < ax + (bx - ax) * -ay / (by - ay)) inside = !inside;
    ax *= scale;
    bx *= scale;
    const dx = bx - ax,
      dy = by - ay;
    const fraction = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
    distance = Math.min(distance, Math.hypot(ax + fraction * dx, ay + fraction * dy));
  }
  return {
    inside,
    distance
  };
}
export function lookupZone(features, lat, lon) {
  for (const feature of features) {
    const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] :
      feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates : [];
    for (const rings of polygons) {
      const outer = ringTest(rings[0], lat, lon);
      if (!outer.inside) continue;
      const holes = rings.slice(1).map(ring => ringTest(ring, lat, lon));
      if (holes.some(hole => hole.inside)) continue;
      return {
        timeZone: feature.properties.tzid,
        approximate: Math.min(outer.distance, ...holes.map(hole => hole.distance)) < .25
      };
    }
  }
  return null;
}
