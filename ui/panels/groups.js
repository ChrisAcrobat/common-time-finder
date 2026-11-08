import {
  bindValidatedSubmit
} from '../formValidation.js';
import {
  selectActiveGroup
} from '../../state/store.js';
import {
  element,
  button,
  input,
  field,
  checkbox
} from '../dom.js';
export function openGroups({
  store,
  host,
  t,
  dispatch,
  confirm = window.confirm
}) {
  host.open('nav.groups', content => {
    const state = store.getState(),
      active = selectActiveGroup(state);
    const list = element('div', {
      className: 'group-list'
    });
    for (const group of state.groups) list.append(button(group.name.value || t('group.none'), () => {
      dispatch({
        type: 'group/setActive',
        groupId: group.id
      });
      host.close();
    }, {
      'aria-pressed': group.id === state.activeGroupId
    }));
    content.append(list);

    function nameForm(key, value, save) {
      const form = element('form'),
        name = input(value, {
          maxlength: 100,
          required: '',
          name: 'groupName'
        });
      form.append(field(t('group.name'), name), element('button', {
        type: 'submit',
        text: t(key)
      }));
      bindValidatedSubmit(form, {
        t,
        onSuccess: () => host.close(),
        submit: () => !name.value.trim() ?
          {
            ok: false,
            error: 'group.errorNameRequired'
          } :
          save(name.value)
      });
      content.append(form);
    }
    nameForm('group.create', '', name => dispatch({
      type: 'group/create',
      name
    }, { showNotice: false }));
    if (active) {
      nameForm('group.rename', active.name.value, name => dispatch({
        type: 'group/rename',
        groupId: active.id,
        name
      }, { showNotice: false }));
      content.append(checkbox(t('group.locked'), active.locked.value, locked => dispatch({
          type: 'group/setLocked',
          groupId: active.id,
          locked
        })),
        button(t('ui.delete'), () => {
          if (confirm(t('group.deleteConfirm'))) {
            dispatch({
              type: 'group/delete',
              groupId: active.id
            });
            host.close();
          }
        }, {
          class: 'danger'
        }));
    }
  });
}
