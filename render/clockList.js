import {
  renderClock
} from './clock.js';
export function renderClockList(container, models, {
  t,
  compact = false
}) {
  container.replaceChildren(...models.map(model => renderClock(model, {
    t
  })));
  container.dataset.compact = String(compact);
}
