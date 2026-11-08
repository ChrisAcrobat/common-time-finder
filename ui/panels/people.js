import {
  bindValidatedSubmit
} from '../formValidation.js';
import {
  shownMembers,
  selectActiveGroup
} from '../../state/store.js';
import {
  listTimeZones
} from '../../time/zones.js';
import {
  element,
  button,
  input,
  field,
  zoneInput
} from '../dom.js';
export function openPeople(context) {
  const {
    store,
    host,
    t
  } = context;
  host.open('nav.people', content => {
    const state = store.getState();
    for (const member of shownMembers(state)) content.append(element('div', {
        className: 'person-row'
      },
      element('span', {
        text: member.name || t('member.self')
      }), button(t('ui.edit'), () => openPerson(context, member, member.id === state.self.id))));
    if (selectActiveGroup(state)) content.append(button(t('member.add'), () => openPerson(context, {
      name: '',
      timeZone: state.self.timeZone,
      lat: null,
      lon: null,
      label: null
    }, false)));
  });
}
export function openPerson(context, draft, self) {
  const {
    store,
    host,
    t,
    dispatch,
    notice,
    placeSearch,
    pickPosition
  } = context;
  const group = selectActiveGroup(store.getState());
  host.open(self ? 'member.self' : draft.id ? 'ui.edit' : 'member.add', content => {
    const form = element('form');
    const name = input(draft.name, {
      name: 'name',
      maxlength: 100,
      required: self ? null : ''
    });
    const zone = zoneInput(draft.timeZone, listTimeZones(), 'person-zones');
    const lat = input(draft.lat, {
        type: 'number',
        step: 'any',
        min: -90,
        max: 90,
        name: 'lat'
      }),
      lon = input(draft.lon, {
        type: 'number',
        step: 'any',
        min: -180,
        max: 180,
        name: 'lon'
      });
    const label = input(draft.label, {
      name: 'label',
      maxlength: 200
    });
    const id = self ? input(draft.id, {
      name: 'id',
      required: ''
    }) : null;
    const read = () => ({
      ...draft,
      name: name.value,
      timeZone: zone.node.value,
      lat: lat.value === '' ? null : Number(lat.value),
      lon: lon.value === '' ? null : Number(lon.value),
      label: label.value || null,
      ...(self ? {
        id: id.value
      } : {})
    });
    form.append(field(t('member.name'), name), field(t('member.zone'), zone.node), zone.list,
      element('div', {
        className: 'coordinate-row'
      }, field(t('member.latitude'), lat), field(t('member.longitude'), lon)), field(t('member.label'), label));
    if (self) form.append(field(t('member.id'), id), button(t('ui.copy'), async () => {
      try {
        await navigator.clipboard.writeText(id.value);
        notice('share.copied');
      } catch {
        id.select();
      }
    }));
    const query = input('', {
        name: 'placeQuery'
      }),
      results = element('div', {
        className: 'search-results'
      });
    const search = button(t('place.search'), async () => {
      search.disabled = true;
      const result = await placeSearch.search(query.value);
      search.disabled = false;
      if (!result.ok) {
        notice(result.error);
        return;
      }
      results.replaceChildren();
      if (!result.results.length) results.append(element('p', {
        text: t('place.noResults')
      }));
      for (const item of result.results) results.append(button(item.label, () => {
        lat.value = item.lat;
        lon.value = item.lon;
        label.value = item.label.slice(0, 200);
        results.replaceChildren();
      }));
    });
    query.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        search.click();
      }
    });
    form.append(field(t('place.query'), query), search, results, button(t('member.pick'), () => {
      const value = read();
      host.close();
      pickPosition(position => openPerson(context, {
        ...value,
        ...position
      }, self));
    }));
    if (self) form.append(button(t('member.geo'), () => {
      if (!navigator.geolocation) {
        notice('member.geoFailed');
        return;
      }
      navigator.geolocation.getCurrentPosition(position => {
        lat.value = position.coords.latitude;
        lon.value = position.coords.longitude;
      }, () => notice('member.geoFailed'), {
        timeout: 15000
      });
    }));
    form.append(element('div', {
      className: 'form-actions'
    }, element('button', {
      type: 'submit',
      text: t('ui.save')
    }), button(t('ui.cancel'), () => host.close())));
    bindValidatedSubmit(form, {
      t,
      onSuccess: () => host.close(),
      submit: () => {
        if (lat.validity.badInput || lon.validity.badInput) return {
          ok: false,
          error: 'member.errorPosition'
        };
        const value = read();
        const action = self ? {
          type: 'self/update',
          changes: value
        } : draft.id ? {
          type: 'member/update',
          groupId: group.id,
          memberId: draft.id,
          changes: value
        } : {
          type: 'member/add',
          groupId: group.id,
          member: value
        };
        return dispatch(action, { showNotice: false });
      }
    });
    if (draft.id && !self) form.append(button(t('ui.delete'), () => {
      dispatch({
        type: 'member/remove',
        groupId: group.id,
        memberId: draft.id
      });
      host.close();
    }, {
      class: 'danger'
    }));
    content.append(form);
  });
}
