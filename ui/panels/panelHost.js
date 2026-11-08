import {
  element,
  button
} from '../dom.js';
export function createPanelHost(container, {
  t
}) {
  let active = null,
    previous, previousLabel;

  function close() {
    if (!active) return;
    active.close();
    active.remove();
    active = null;
    if (previous?.isConnected) previous.focus();
    else if (previousLabel)[...document.querySelectorAll('[aria-label]')].find(node => node.getAttribute('aria-label') === previousLabel)?.focus();
  }

  function open(titleKey, build) {
    close();
    previous = document.activeElement;
    previousLabel = previous?.getAttribute('aria-label');
    const dialog = element('dialog', {
      className: 'panel'
    });
    const title = element('h2', {
      text: t(titleKey),
      id: 'panel-title'
    });
    dialog.setAttribute('aria-labelledby', title.id);
    dialog.append(element('div', {
      className: 'panel-heading'
    }, title, button(t('ui.close'), close, {
      class: 'close-button'
    })));
    const content = element('div', {
      className: 'panel-content'
    });
    dialog.append(content);
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      close();
    });
    container.append(dialog);
    active = dialog;
    build(content, close);
    dialog.showModal();
    return dialog;
  }
  return {
    open,
    close,
    isOpen: () => active !== null
  };
}
