export function renderClock(model, {
  t
}) {
  const clock = document.createElement('article');
  clock.className = 'clock';
  clock.dataset.memberId = model.id;
  clock.setAttribute('role', 'img');
  clock.setAttribute('aria-label', `${model.name}, ${model.digital}, ${t(model.sunStateKey)}`);
  const child = (className, value, parent = clock) => {
    const el = document.createElement('div');
    el.className = className;
    if (value != null) el.textContent = value;
    parent.append(el);
    return el;
  };
  child('clock-name', model.name);
  const face = child('clock-face');
  const dial = child('clock-dial', null, face);
  if (!model.dial) dial.classList.add('clock-dial--neutral');
  else dial.style.backgroundImage = `conic-gradient(${model.dial.samples.map(s => `${s.colour} ${s.minutes / 4}deg`).join(',')})`;
  dial.style.transform = `rotate(${model.dialRotation}deg)`;
  const hand = child('clock-hand', null, face);
  hand.dataset.angle = model.handAngle;
  hand.style.transform = `translateX(-50%) rotate(${model.handAngle}deg)`;
  child('clock-pin', null, face);
  child('clock-digital', model.digital);
  if (model.dayOffset) child('clock-day-offset', model.dayOffset > 0 ? `+${model.dayOffset}` : `−${-model.dayOffset}`);
  child('clock-zone', model.timeZone);
  child('clock-sun-state', t(model.sunStateKey));
  return clock;
}
