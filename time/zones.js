const formatters = new Map();

function formatter(zone) {
  if (!formatters.has(zone)) formatters.set(zone, new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }));
  return formatters.get(zone);
}
export function zonedParts(ms, zone) {
  const parts = {};
  for (const {
      type,
      value
    }
    of formatter(zone).formatToParts(ms))
    if (type !== 'literal') parts[type] = Number(value);
  return parts;
}
const utc = ({
  year,
  month,
  day,
  hour = 0,
  minute = 0,
  second = 0
}) => Date.UTC(year, month - 1, day, hour, minute, second);
export function zoneOffsetMinutes(ms, zone) {
  return (utc(zonedParts(ms, zone)) - Math.floor(ms / 1000) * 1000) / 60000;
}
export function zonedToInstant(parts, zone) {
  const wall = utc(parts);
  // Gather both offsets around a transition. Exact matches choose the earlier fold;
  // a gap chooses the first candidate after the requested wall time.
  const offsets = new Set([-2, -1, 0, 1, 2].map(days => zoneOffsetMinutes(wall + days * 86400000, zone)));
  const candidates = [...offsets].map(offset => {
    const instant = wall - offset * 60000;
    return {
      instant,
      difference: utc(zonedParts(instant, zone)) - wall
    };
  });
  const exact = candidates.filter(c => c.difference === 0).sort((a, b) => a.instant - b.instant);
  if (exact.length) return exact[0].instant;
  return candidates.filter(c => c.difference > 0).sort((a, b) => a.difference - b.difference)[0]?.instant ?? candidates[0].instant;
}
export function isValidTimeZone(zone) {
  if (typeof zone !== 'string' || !zone) return false;
  try {
    formatter(zone);
    return true;
  } catch {
    return false;
  }
}
// ICU/CLDR may enumerate older spellings even when Intl accepts both names.
// Keep both discoverable; never rewrite the zone the user chose to save.
const ZONE_NAME_ALIASES = [
  ['Asia/Calcutta', 'Asia/Kolkata'],
  ['Europe/Kiev', 'Europe/Kyiv'],
  ['Europe/Uzhgorod', 'Europe/Kyiv'],
  ['Europe/Zaporozhye', 'Europe/Kyiv'],
  ['Asia/Saigon', 'Asia/Ho_Chi_Minh'],
  ['Asia/Katmandu', 'Asia/Kathmandu'],
  ['Asia/Rangoon', 'Asia/Yangon'],
  ['Asia/Ulan_Bator', 'Asia/Ulaanbaatar'],
  ['Asia/Ashkhabad', 'Asia/Ashgabat'],
  ['America/Godthab', 'America/Nuuk'],
  ['Pacific/Enderbury', 'Pacific/Kanton'],
  ['Atlantic/Faeroe', 'Atlantic/Faroe'],
  ['Pacific/Truk', 'Pacific/Chuuk'],
  ['Pacific/Ponape', 'Pacific/Pohnpei'],
  ['America/Buenos_Aires', 'America/Argentina/Buenos_Aires'],
  ['America/Catamarca', 'America/Argentina/Catamarca'],
  ['America/Cordoba', 'America/Argentina/Cordoba'],
  ['America/Jujuy', 'America/Argentina/Jujuy'],
  ['America/Mendoza', 'America/Argentina/Mendoza'],
  ['America/Indianapolis', 'America/Indiana/Indianapolis'],
  ['America/Louisville', 'America/Kentucky/Louisville']
];
export function listTimeZones() {
  const fallback = ['UTC', 'Europe/Stockholm', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Kolkata', 'Australia/Sydney', 'Pacific/Auckland'];
  const names = [...(Intl.supportedValuesOf?.('timeZone') ?? fallback), ...ZONE_NAME_ALIASES.flat(), 'UTC'];
  return [...new Set(names)].filter(isValidTimeZone).sort();
}
export function dayOffset(ms, zone, ownZone) {
  const date = z => {
    const p = zonedParts(ms, z);
    return Date.UTC(p.year, p.month - 1, p.day);
  };
  return Math.round((date(zone) - date(ownZone)) / 86400000);
}
export function formatClockTime(ms, zone, browserLocale) {
  const hour12 = new Intl.DateTimeFormat(browserLocale, {
    hour: 'numeric'
  }).resolvedOptions().hour12;
  return new Intl.DateTimeFormat(browserLocale, {
    timeZone: zone,
    hour: hour12 ? 'numeric' : '2-digit',
    minute: '2-digit'
  }).format(ms).replace(/\u202f|\u00a0/g, ' ');
}
