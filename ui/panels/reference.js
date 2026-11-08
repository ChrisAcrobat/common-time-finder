import {
  bindValidatedSubmit
} from '../formValidation.js';
import {
  selectActiveGroup
} from '../../state/store.js';
import {
  zonedParts,
  zonedToInstant,
  isValidTimeZone
} from '../../time/zones.js';
import {
  element,
  button,
  input,
  field,
  select
} from '../dom.js';
const dateInput = (ms, zone) => {
  const p = zonedParts(ms, zone),
    pad = n => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
};

function parseWall(value, zone) {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)) return NaN;
  const [year, month, day, hour, minute] = value.match(/\d+/g).map(Number);
  return zonedToInstant({
    year,
    month,
    day,
    hour,
    minute
  }, zone);
}
export function openReference({
  store,
  host,
  t,
  dispatch,
  notice
}) {
  const state = store.getState(),
    group = selectActiveGroup(state);
  if (!group) {
    notice('group.errorMissing');
    return;
  }
  host.open('nav.reference', content => {
    const zone = group.inputTimeZone || state.self.timeZone;
    const zones = [...new Set([state.self.timeZone, ...group.members.filter(m => !m.removedAt || m.updatedAt > m.removedAt).map(m => m.timeZone)])];
    if (!zones.includes(zone)) zones.push(zone);
    const choice = select(zone, zones.map(z => [z, z]));
    const base = group.reference?.start ?? Date.now();
    const start = input(dateInput(base, zone), {
        type: 'datetime-local',
        required: '',
        name: 'start'
      }),
      end = input(dateInput(group.reference?.end ?? base + 10800000, zone), {
        type: 'datetime-local',
        required: '',
        name: 'end'
      });
    const form = element('form');
    form.append(field(t('ref.zone'), choice), field(t('ref.start'), start), field(t('ref.end'), end), element('button', {
      type: 'submit',
      text: t('ui.save')
    }));
    choice.addEventListener('change', () => dispatch({
      type: 'reference/inputZone',
      groupId: group.id,
      timeZone: choice.value
    }));
    bindValidatedSubmit(form, {
      t,
      onSuccess: () => host.close(),
      submit: () => {
        if (!isValidTimeZone(choice.value)) return {
          ok: false,
          error: 'member.errorZoneInvalid'
        };
        return dispatch({
          type: 'reference/set',
          groupId: group.id,
          start: parseWall(start.value, choice.value),
          end: parseWall(end.value, choice.value)
        }, { showNotice: false });
      }
    });
    content.append(form, button(t('ref.clear'), () => {
      dispatch({
        type: 'reference/clear',
        groupId: group.id
      });
      host.close();
    }));
  });
}
