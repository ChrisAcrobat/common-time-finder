import {
  mix
} from './colourMath.js';
import {
  solarPosition as defaultSolarPosition
} from '../solar/solar.js';
import {
  SUNRISE_ELEVATION
} from '../solar/sunState.js';
import {
  zonedParts,
  zonedToInstant
} from '../time/zones.js';
export const STOPS = [
  [-18, '#0b1026'],
  [-12, '#1c2a5a'],
  [-6, '#3b4f8f'],
  [SUNRISE_ELEVATION, '#e8875a'],
  [6, '#f6c77a'],
  [20, '#a9d3f2']
];
export const LIGHTEST = '#eaf6ff';
const hex = values => '#' + values.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
export function elevationColour(elevation, {
  mode = 'absolute',
  dayMax = 90
} = {}) {
  const scale = mode === 'relative' ? [...STOPS.filter(([e]) => e < dayMax), [dayMax, LIGHTEST]] : [...STOPS, [90, LIGHTEST]];
  if (elevation <= scale[0][0]) return scale[0][1];
  for (let i = 1; i < scale.length; i++)
    if (elevation <= scale[i][0]) {
      const [low, a] = scale[i - 1], [high, b] = scale[i];
      return hex(mix(a, b, (elevation - low) / (high - low)));
    }
  return LIGHTEST;
}
export function sampleDial({
  shownTime,
  timeZone,
  lat,
  lon,
  mode = 'absolute',
  solarPosition = defaultSolarPosition
}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const parts = zonedParts(shownTime, timeZone);
  const dayStart = zonedToInstant({
    ...parts,
    hour: 0,
    minute: 0,
    second: 0
  }, timeZone);
  const samples = Array.from({
    length: 288
  }, (_, i) => {
    const minutes = i * 5;
    // Resolve each dial position as wall time, not elapsed time since midnight.
    // The shared zone converter advances gaps and chooses the first fold instant.
    const time = zonedToInstant({
      ...parts,
      hour: Math.floor(minutes / 60),
      minute: minutes % 60,
      second: 0
    }, timeZone);
    return {
      time,
      minutes,
      elevation: solarPosition(time, lat, lon).elevation
    };
  });
  const dayMax = Math.max(...samples.map(s => s.elevation));
  return {
    dayStart,
    dayMax,
    samples: samples.map(s => ({
      ...s,
      colour: elevationColour(s.elevation, {
        mode,
        dayMax
      })
    }))
  };
}
export function dialAngle(localMinutes, dialTop = 'shown') {
  const dialRotation = dialTop === 'shown' ? -localMinutes / 4 : dialTop === 'noon' ? 180 : 0;
  return {
    handAngle: dialTop === 'shown' ? 0 : localMinutes / 4 + dialRotation,
    dialRotation
  };
}
