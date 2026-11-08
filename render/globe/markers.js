import * as THREE from 'three';
import {
  markerPlacements
} from './markerData.js';
import {
  geoVector,
  disposeGroup
} from './geometry.js';
export function updateMarkers(group, members) {
  disposeGroup(group);
  for (const {
      id,
      lat,
      lon
    }
    of markerPlacements(members)) {
    const marker = new THREE.Mesh(new THREE.SphereGeometry(.013, 12, 8), new THREE.MeshBasicMaterial({
      color: 0xffe2a4
    }));
    marker.position.copy(geoVector(lat, lon));
    marker.userData.memberId = id;
    group.add(marker);
  }
}
