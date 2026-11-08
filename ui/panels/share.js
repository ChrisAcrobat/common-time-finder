import {
  selectActiveGroup
} from '../../state/store.js';
import {
  buildShareLink
} from '../../share/shareLink.js';
import {
  element,
  input,
  field,
  checkbox,
  button
} from '../dom.js';
export function openShare({
  store,
  host,
  t,
  dispatch,
  notice
}) {
  const group = selectActiveGroup(store.getState());
  if (!group) {
    notice('group.errorMissing');
    return;
  }
  host.open('nav.share', content => {
    const link = input(buildShareLink(location.href, {
      id: group.id,
      name: group.name.value
    }), {
      readonly: '',
      name: 'shareLink'
    });
    content.append(element('p', {
      text: t('share.privacy')
    }), checkbox(t('share.includeSelf'), group.shareSelf, shareSelf => {
      const result = dispatch({
        type: 'group/setShareSelf',
        groupId: group.id,
        shareSelf
      });
      if (!result.ok) content.querySelector('input[type=checkbox]').checked = !shareSelf;
    }), field(t('share.link'), link), button(t('ui.copy'), async () => {
      try {
        await navigator.clipboard.writeText(link.value);
        notice('share.copied');
      } catch {
        link.focus();
        link.select();
      }
    }));
  });
}
