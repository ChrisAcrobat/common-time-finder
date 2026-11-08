import * as THREE from 'three';
export const RAD = Math.PI / 180;
export function geoVector(lat, lon, radius = 1) {
  return new THREE.Vector3(Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.sin(lat * RAD), -Math.cos(lat * RAD) * Math.sin(lon * RAD)).multiplyScalar(radius);
}
export const polygons = feature => feature.geometry?.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry?.type === 'MultiPolygon' ? feature.geometry.coordinates : [];
export function disposeGroup(group) {
  for (const object of [...group.children]) {
    object.geometry?.dispose();
    if (Array.isArray(object.material)) object.material.forEach(m => m.dispose());
    else object.material?.dispose();
    group.remove(object);
  }
}
