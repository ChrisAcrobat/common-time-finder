import * as THREE from 'three';
import {
  geoVector,
  polygons,
  disposeGroup
} from './geometry.js';
const canonical = zone => {
  try {
    return new Intl.DateTimeFormat('en', {
      timeZone: zone
    }).resolvedOptions().timeZone;
  } catch {
    return zone;
  }
};
export function drawZones(group, features, tzids) {
  disposeGroup(group);
  const selected = new Set(tzids.map(canonical));
  for (const feature of features) {
    if (!selected.has(canonical(feature.properties.tzid))) continue;
    for (const polygon of polygons(feature))
      for (const ring of polygon) {
        const points = [];
        for (let i = 0; i < ring.length; i++) {
          const [lon, lat] = ring[i], next = ring[(i + 1) % ring.length];
          const a = geoVector(lat, lon),
            b = geoVector(next[1], next[0]);
          // Subdivide along the spherical arc, keeping long simplified edges above the surface.
          const steps = Math.max(1, Math.ceil(a.angleTo(b) / .015));
          for (let step = 0; step < steps; step++) points.push(a.clone().lerp(b, step / steps).normalize().multiplyScalar(1.002));
        }
        const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({
          color: 0x8ee3ec,
          transparent: true,
          opacity: .75
        }));
        group.add(line);
      }
  }
}
