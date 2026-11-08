export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
export function createPlaceSearch({
  fetch = globalThis.fetch,
  now = Date.now,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  language
} = {}) {
  let previous = -Infinity,
    queue = Promise.resolve();
  async function execute(query) {
    try {
      const wait = 1000 - (now() - previous);
      if (wait > 0) await sleep(wait);
      previous = now();
      const url = new URL(NOMINATIM_URL);
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'jsonv2');
      if (language) url.searchParams.set('accept-language', language);
      const response = await fetch(url.href);
      if (!response.ok) throw new Error('Place HTTP failure');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid place results');
      const results = data.map(item => ({
          label: item.display_name,
          lat: Number(item.lat),
          lon: Number(item.lon)
        }))
        .filter(item => typeof item.label === 'string' && Number.isFinite(item.lat) && Math.abs(item.lat) <= 90 && Number.isFinite(item.lon) && Math.abs(item.lon) <= 180);
      return {
        ok: true,
        results
      };
    } catch {
      return {
        ok: false,
        error: 'place.searchFailed'
      };
    }
  }
  return {
    search(query) {
      if (typeof query !== 'string' || !query.trim()) return Promise.resolve({
        ok: true,
        results: []
      });
      const result = queue.then(() => execute(query.trim()));
      queue = result.then(() => undefined, () => undefined);
      return result;
    }
  };
}
