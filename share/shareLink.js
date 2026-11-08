export const isUuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function buildShareLink(baseUrl, {
  id,
  name
}) {
  return `${baseUrl.split('#')[0]}#g=${id}${name ? '&n=' + encodeURIComponent(name) : ''}`;
}
export function parseShareFragment(hash) {
  try {
    const values = {};
    for (const part of hash.replace(/^#/, '').split('&')) {
      const index = part.indexOf('=');
      const key = decodeURIComponent(index < 0 ? part : part.slice(0, index));
      values[key] = decodeURIComponent(index < 0 ? '' : part.slice(index + 1));
    }
    if (!Object.hasOwn(values, 'g')) return null;
    if (!isUuid(values.g)) return {
      ok: false,
      error: 'share.invalidLink'
    };
    return {
      ok: true,
      id: values.g.toLowerCase(),
      name: values.n ?? null
    };
  } catch {
    return {
      ok: false,
      error: 'share.invalidLink'
    };
  }
}
