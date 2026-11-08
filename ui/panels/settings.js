import {
  field,
  select,
  checkbox,
  element
} from '../dom.js';
export function openSettings(context) {
  const {
    store,
    host,
    t,
    dispatch
  } = context;
  host.open('nav.settings', content => {
    const settings = store.getState().settings;
    const change = (key, value) => dispatch({
      type: 'settings/set',
      key,
      value
    });
    const language = select(settings.language, [
      ['en', t('language.en')],
      ['sv', t('language.sv')]
    ]);
    language.addEventListener('change', () => {
      change('language', language.value);
      openSettings(context);
    });
    content.append(field(t('settings.language'), language));
    for (const [key, label, values] of [
        ['dialTop', 'settings.dialTop', ['shown', 'midnight', 'noon']],
        ['dialBrightness', 'settings.brightness', ['absolute', 'relative']]
      ]) {
      const control = select(settings[key], values.map(value => [value, t('settings.' + value)]));
      control.addEventListener('change', () => change(key, control.value));
      content.append(field(t(label), control));
    }
    content.append(checkbox(t('settings.zones'), settings.showTimeZones, value => change('showTimeZones', value)), checkbox(t('settings.arrows'), settings.showSunArrows, value => change('showSunArrows', value)), element('p', {
      className: 'muted',
      text: t('ref.scrollHint')
    }));
  });
}
