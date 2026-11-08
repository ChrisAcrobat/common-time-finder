import {
  zonedParts,
  dayOffset,
  formatClockTime
} from '../time/zones.js';
import {
  solarPosition as defaultSolarPosition
} from '../solar/solar.js';
import {
  sunState
} from '../solar/sunState.js';
import {
  sampleDial,
  dialAngle
} from './dialColours.js';
export function clockModel({
  member,
  shownTime,
  selfTimeZone,
  settings,
  browserLocale
}, {
  solarPosition = defaultSolarPosition
} = {}) {
  const parts = zonedParts(shownTime, member.timeZone);
  const localMinutes = parts.hour * 60 + parts.minute + parts.second / 60;
  const noPosition = !Number.isFinite(member.lat) || !Number.isFinite(member.lon);
  const state = noPosition ? null : sunState(solarPosition(shownTime, member.lat, member.lon).elevation);
  return {
    id: member.id,
    name: member.name,
    timeZone: member.timeZone,
    noPosition,
    localMinutes,
    digital: formatClockTime(shownTime, member.timeZone, browserLocale),
    dayOffset: dayOffset(shownTime, member.timeZone, selfTimeZone),
    ...dialAngle(localMinutes, settings.dialTop),
    dial: noPosition ? null : sampleDial({
      shownTime,
      ...member,
      mode: settings.dialBrightness,
      solarPosition
    }),
    sunState: state,
    sunStateKey: noPosition ? 'clock.noPosition' : `sun.${state}`,
  };
}
