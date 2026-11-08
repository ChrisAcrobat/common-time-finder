import * as THREE from 'three';
import {
  RAD
} from './geometry.js';
import {
  SUNRISE_ELEVATION
} from '../../solar/sunState.js';
export function createTerminatorArrow(root) {
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), .16, 0xffd23f, .05, .03);
  root.add(arrow);
  return {
    update(sun, camera, visible) {
      arrow.visible = visible;
      if (!visible) return;
      root.updateWorldMatrix(true, false);
      const view = root.worldToLocal(camera.getWorldPosition(new THREE.Vector3())).normalize();
      const horizontal = sun.clone().setY(0);
      const centre = horizontal.clone().multiplyScalar(Math.sin(SUNRISE_ELEVATION * RAD) / horizontal.lengthSq());
      const side = new THREE.Vector3().crossVectors(sun, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(Math.sqrt(1 - centre.lengthSq()));
      const point = centre.clone().add(side),
        other = centre.clone().sub(side);
      if (other.dot(view) > point.dot(view)) point.copy(other);
      arrow.position.copy(point);
      arrow.setDirection(new THREE.Vector3(-point.z, 0, point.x).normalize());
    }
  };
}
