import * as THREE from 'three';
import {
  subsolarPoint,
  solarPosition
} from '../../solar/solar.js';
import {
  sunState,
  SUNRISE_ELEVATION
} from '../../solar/sunState.js';
import {
  formatClockTime,
  isValidTimeZone
} from '../../time/zones.js';
import {
  createZoneBoundaries
} from '../../data/zoneBoundaries.js';
import {
  geoVector,
  RAD,
  disposeGroup
} from './geometry.js';
import {
  updateMarkers
} from './markers.js';
import {
  createTerminatorArrow
} from './terminatorArrows.js';
import {
  drawZones
} from './zonesOverlay.js';
import {
  lookupZone
} from './picking.js';
export function createGlobe(container, {
  t,
  onMessage,
  onPick = () => {},
  browserLocale = navigator.language
}) {
  const canvas = document.createElement('canvas');
  container.append(canvas);
  const tooltip = document.createElement('div');
  tooltip.className = 'globe-tooltip';
  tooltip.hidden = true;
  container.append(tooltip);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene(),
    root = new THREE.Group();
  scene.add(root);
  root.rotation.y = -.65;
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 50);
  camera.position.set(0, 0, 3.45);
  const textures = new THREE.TextureLoader();
  const day = textures.load(new URL('../../assets/blue-marble.jpg', import.meta.url), requestRender);
  const night = textures.load(new URL('../../assets/black-marble.jpg', import.meta.url), requestRender);
  day.colorSpace = night.colorSpace = THREE.SRGBColorSpace;
  day.anisotropy = night.anisotropy = 4;
  const material = new THREE.ShaderMaterial({
    uniforms: {
      sun: {
        value: new THREE.Vector3(1, 0, 0)
      },
      dayMap: {
        value: day
      },
      nightMap: {
        value: night
      },
      horizonColor: {
        value: new THREE.Color(0xffd23f)
      }
    },
    vertexShader: `varying vec3 location; varying vec2 vUv;
      void main() { location = normalize(position); vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 location; varying vec2 vUv;
      uniform vec3 sun; uniform sampler2D dayMap; uniform sampler2D nightMap; uniform vec3 horizonColor;
      void main() {
        float elevation = degrees(asin(clamp(dot(normalize(location), sun), -1.0, 1.0)));
        float nightWeight = 1.0 - smoothstep(-18.0, 0.0, elevation);
        vec3 color = mix(texture2D(dayMap, vUv).rgb, texture2D(nightMap, vUv).rgb, nightWeight);
        float pixelWidth = max(length(vec2(dFdx(elevation), dFdy(elevation))), 0.0001);
        float line = 1.0 - smoothstep(0.25, 1.25, abs(elevation - ${SUNRISE_ELEVATION}) / pixelWidth);
        gl_FragColor = vec4(mix(color, horizonColor, line), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), material);
  root.add(sphere);
  const markers = new THREE.Group(),
    zones = new THREE.Group();
  root.add(markers, zones);
  const arrow = createTerminatorArrow(root),
    boundaries = createZoneBoundaries();
  let members = [],
    settings = {},
    shownTime = Date.now(),
    features = [],
    yaw = -.65,
    pitch = 0,
    scheduled = false,
    disposed = false,
    frameId;
  let previousZones = '',
    previousMembers = '',
    pickMode = false,
    dragging = false,
    pointerStart;

  function requestRender() {
    if (scheduled || disposed) return;
    scheduled = true;
    frameId = requestAnimationFrame(() => {
      scheduled = false;
      const width = Math.max(1, container.clientWidth),
        height = Math.max(1, container.clientHeight);
      if (canvas.width !== Math.floor(width * renderer.getPixelRatio()) || canvas.height !== Math.floor(height * renderer.getPixelRatio())) renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      root.rotation.y = yaw;
      const distance = 3.45 / Math.min(1, camera.aspect);
      camera.position.set(0, distance * Math.sin(pitch), distance * Math.cos(pitch));
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      arrow.update(material.uniforms.sun.value, camera, !!settings.showSunArrows);
      renderer.render(scene, camera);
    });
  }
  const observer = new ResizeObserver(requestRender);
  observer.observe(container);
  async function updateZones() {
    const key = JSON.stringify([settings.showTimeZones, members.map(m => m.timeZone).sort()]);
    zones.visible = !!settings.showTimeZones;
    if (!settings.showTimeZones || key === previousZones) return;
    previousZones = key;
    const result = await boundaries.load();
    if (disposed) return;
    if (!result.ok) {
      previousZones = '';
      onMessage(result.error);
      return;
    }
    features = result.data.features;
    onMessage(null);
    drawZones(zones, features, members.map(m => m.timeZone));
    requestRender();
  }

  function hitAt(event) {
    const rect = canvas.getBoundingClientRect();
    const pointer = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(pointer, camera);
    sphere.updateWorldMatrix(true, false);
    const point = ray.ray.clone().applyMatrix4(sphere.matrixWorld.clone().invert()).intersectSphere(new THREE.Sphere(new THREE.Vector3(), 1), new THREE.Vector3());
    if (!point) return null;
    return {
      point,
      lat: Math.asin(point.y) / RAD,
      lon: Math.atan2(-point.z, point.x) / RAD
    };
  }

  function inspect(event) {
    if (dragging) return;
    const hit = hitAt(event);
    tooltip.hidden = !hit;
    if (!hit) return;
    const nearest = members.find(m => Number.isFinite(m.lat) && Number.isFinite(m.lon) && geoVector(m.lat, m.lon).distanceTo(hit.point) < .04);
    const zone = nearest ? {
      timeZone: nearest.timeZone,
      approximate: false
    } : lookupZone(features, hit.lat, hit.lon);
    const lines = nearest ? [nearest.name] : [];
    if (zone && isValidTimeZone(zone.timeZone)) lines.push(zone.timeZone, formatClockTime(shownTime, zone.timeZone, browserLocale), ...(zone.approximate ? [t('globe.approxTime')] : []));
    lines.push(t('sun.' + sunState(solarPosition(shownTime, hit.lat, hit.lon).elevation)));
    tooltip.textContent = lines.join('\n');
    const rect = container.getBoundingClientRect();
    tooltip.style.left = Math.max(6, Math.min(event.clientX - rect.left + 12, rect.width - tooltip.offsetWidth - 6)) + 'px';
    tooltip.style.top = Math.max(6, Math.min(event.clientY - rect.top + 12, rect.height - tooltip.offsetHeight - 6)) + 'px';
  }
  canvas.addEventListener('pointerdown', event => {
    pointerStart = {
      x: event.clientX,
      y: event.clientY
    };
    dragging = false;
  });
  canvas.addEventListener('pointermove', event => {
    if (event.buttons && pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 4) dragging = true;
    if (!event.buttons) inspect(event);
    else tooltip.hidden = true;
  });
  canvas.addEventListener('pointerleave', () => {
    tooltip.hidden = true;
  });
  canvas.addEventListener('pointerup', event => {
    if (!dragging) {
      if (pickMode) {
        const hit = hitAt(event);
        if (hit) onPick({
          lat: hit.lat,
          lon: hit.lon
        });
      } else inspect(event);
    }
    dragging = false;
    pointerStart = null;
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    onMessage('globe.unavailable');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    onMessage(null);
    requestRender();
  });
  return {
    update({
      shownTime: time,
      members: people,
      settings: options
    }) {
      shownTime = time;
      members = people;
      settings = options;
      const sun = subsolarPoint(time);
      material.uniforms.sun.value.copy(geoVector(sun.lat, sun.lon));
      const signature = JSON.stringify(people.map(({
        id,
        lat,
        lon
      }) => [id, lat, lon]));
      if (signature !== previousMembers) {
        previousMembers = signature;
        updateMarkers(markers, people);
      }
      updateZones();
      requestRender();
    },
    rotate(dx, dy) {
      yaw += dx * .006;
      pitch = Math.max(-1.45, Math.min(1.45, pitch + dy * .006));
      tooltip.hidden = true;
      requestRender();
    },
    setPickMode(value) {
      pickMode = value;
      container.classList.toggle('picking', value);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      disposeGroup(markers);
      disposeGroup(zones);
      sphere.geometry.dispose();
      material.dispose();
      day.dispose();
      night.dispose();
      renderer.dispose();
      container.replaceChildren();
    },
  };
}
