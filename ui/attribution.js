import {
  element
} from './dom.js';
export function openAttribution({
  host,
  t
}) {
  host.open('attribution.title', content => {
    const link = (key, href) => element('a', {
      text: t(key),
      href,
      target: '_blank',
      rel: 'noopener noreferrer'
    });
    content.append(element('p', {}, link('credit.osm', 'https://www.openstreetmap.org/copyright')), element('p', {}, link('credit.tbb', 'https://github.com/evansiroky/timezone-boundary-builder')), element('p', {}, link('credit.odbl', 'https://opendatacommons.org/licenses/odbl/1-0/')),
      element('p', {}, link('attribution.day', 'https://science.nasa.gov/earth/earth-observatory/collections/blue-marble/')), element('p', {}, link('attribution.night', 'https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/')),
      element('p', {}, link('credit.three', './vendor/LICENSES.md')), element('p', {}, link('credit.peerjs', './vendor/LICENSES.md')));
  });
}
