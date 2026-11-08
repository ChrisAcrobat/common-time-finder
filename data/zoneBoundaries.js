export const ZONE_BOUNDARIES_URL = 'https://cdn.jsdelivr.net/npm/@math.gl/earth@5.0.0-alpha.19/timezone/data/timezone-geometry-low.json';
export function filterByTzid(collection, tzids) {
  const selected = new Set(tzids);
  return collection.features.filter(feature => selected.has(feature.properties?.tzid));
}
export function createZoneBoundaries({
  fetch = globalThis.fetch
} = {}) {
  let data = null,
    pending = null;
  async function load() {
    if (data) return {
      ok: true,
      data
    };
    if (pending) return pending;
    pending = (async () => {
      try {
        const response = await fetch(ZONE_BOUNDARIES_URL);
        if (!response.ok) throw new Error('Boundary HTTP failure');
        const value = await response.json();
        if (value?.type !== 'FeatureCollection' || !Array.isArray(value.features)) throw new Error('Invalid boundaries');
        data = value;
        return {
          ok: true,
          data
        };
      } catch {
        return {
          ok: false,
          error: 'globe.zonesUnavailable'
        };
      } finally {
        pending = null;
      }
    })();
    return pending;
  }
  return {
    isLoaded: () => data !== null,
    load,
    async featuresFor(tzids) {
      const result = await load();
      return result.ok ? {
        ok: true,
        features: filterByTzid(result.data, tzids)
      } : {
        ...result,
        features: []
      };
    }
  };
}
