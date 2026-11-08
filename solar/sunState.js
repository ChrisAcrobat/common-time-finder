export const SUNRISE_ELEVATION = -0.833;
export const SUN_STATES = ['day', 'golden', 'civil', 'nautical', 'astronomical', 'night'];
export function sunState(elevation) {
  return elevation >= 6 ? 'day' : elevation >= SUNRISE_ELEVATION ? 'golden' : elevation >= -6 ? 'civil' :
    elevation >= -12 ? 'nautical' : elevation >= -18 ? 'astronomical' : 'night';
}
