import {
  parseShareFragment
} from '../../share/shareLink.js';
export function openImportDialog(container, {
  id,
  name,
  t
}) {
  return new Promise(resolve => {
    const dialog = document.createElement('section');
    dialog.className = 'import-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    const title = document.createElement('h2');
    title.textContent = name ?? id;
    dialog.append(title);
    dialog.setAttribute('aria-label', title.textContent);
    const previous = document.activeElement;

    function choose(value) {
      dialog.remove();
      previous?.focus();
      resolve(value);
    }
    for (const action of ['join', 'cancel']) {
      const button = document.createElement('button');
      button.dataset.action = action;
      button.textContent = t(`share.${action}`);
      button.addEventListener('click', () => choose(action));
      dialog.append(button);
    }
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') choose('cancel');
      if (event.key === 'Tab') {
        event.preventDefault();
        const buttons = [...dialog.querySelectorAll('button')];
        buttons[(buttons.indexOf(document.activeElement) + 1) % buttons.length].focus();
      }
    });
    container.append(dialog);
    dialog.querySelector('button').focus();
  });
}
export async function handleShareLink({
  hash,
  store,
  container,
  t
}) {
  const parsed = parseShareFragment(hash);
  if (!parsed) return {
    outcome: 'none'
  };
  if (!parsed.ok) return {
    outcome: 'invalid',
    error: parsed.error
  };
  const {
    id,
    name
  } = parsed;
  if (store.getState().groups.some(group => group.id === id)) {
    store.dispatch({
      type: 'group/join',
      id,
      name
    });
    return {
      outcome: 'opened',
      id
    };
  }
  const choice = await openImportDialog(container, {
    id,
    name,
    t
  });
  if (choice === 'cancel') return {
    outcome: 'cancelled',
    id
  };
  store.dispatch({
    type: 'group/join',
    id,
    name
  });
  return {
    outcome: 'joined',
    id
  };
}
