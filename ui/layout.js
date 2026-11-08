export function createLayout(root, {
  focus = 'clocks',
  onFocusChange = () => {}
} = {}) {
  const views = [...root.querySelectorAll('[data-view]')];
  let current;

  function setFocus(view) {
    if (!['clocks', 'globe'].includes(view) || current === view) return;
    current = view;
    root.dataset.focus = view;
    for (const element of views) {
      element.dataset.corner = String(element.dataset.view !== view);
      if (element.tabIndex < 0) element.tabIndex = 0;
    }
  }
  for (const element of views) {
    const activate = () => {
      if (element.dataset.corner === 'true') {
        setFocus(element.dataset.view);
        onFocusChange(current);
      }
    };
    element.addEventListener('click', activate);
    element.addEventListener('keydown', event => {
      if (event.target === element && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        activate();
      }
    });
  }
  setFocus(focus);
  return {
    getFocus: () => current,
    setFocus
  };
}
