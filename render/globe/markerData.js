export const markerPlacements = members => members.filter(m => Number.isFinite(m.lat) && Number.isFinite(m.lon)).map(({
  id,
  lat,
  lon
}) => ({
  id,
  lat,
  lon
}));
