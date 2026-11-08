export function attachGestures(element, {
  onTimeWheel,
  onRotate,
  onTimeStep
}, {
  area
}) {
  const removers = [],
    pointers = new Map();
  const listen = (type, fn, options) => {
    element.addEventListener(type, fn, options);
    removers.push(() => element.removeEventListener(type, fn, options));
  };
  if (element.tabIndex < 0) element.tabIndex = 0;
  listen('wheel', event => {
    event.preventDefault();
    if (event.shiftKey || event.deltaX && !event.deltaY) {
      if (area === 'globe') onRotate(event.deltaX || event.deltaY, 0);
    } else onTimeWheel(event.deltaY, event.deltaMode);
  }, {
    passive: false
  });
  listen('keydown', event => {
    if (event.target.matches?.('input,select,textarea,button')) return;
    const steps = {
      ArrowLeft: -15,
      ArrowRight: 15,
      PageUp: -60,
      PageDown: 60
    };
    if (!(event.key in steps)) return;
    event.preventDefault();
    if (event.shiftKey && area === 'globe' && event.key.startsWith('Arrow')) onRotate(steps[event.key], 0);
    else if (!event.shiftKey) onTimeStep(steps[event.key]);
  });
  const centroid = () => [...pointers.values()].reduce((a, p) => ({
    x: a.x + p.x / pointers.size,
    y: a.y + p.y / pointers.size
  }), {
    x: 0,
    y: 0
  });
  listen('pointerdown', event => {
    if (area !== 'globe' || event.button > 0) return;
    pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY
    });
    try {
      (event.target?.setPointerCapture ? event.target : element).setPointerCapture(event.pointerId);
    } catch {
      /* Synthetic events do not own a pointer. */
    }
  });
  listen('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    const before = centroid();
    pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY
    });
    const after = centroid();
    event.preventDefault();
    onRotate(after.x - before.x, after.y - before.y);
  }, {
    passive: false
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(type, event => pointers.delete(event.pointerId));
  return () => {
    for (const remove of removers) remove();
    pointers.clear();
  };
}
