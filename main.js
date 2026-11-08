import {
  createInitialState,
  createStore,
  shownMembers,
  selectActiveGroup,
  activeReference
} from './state/store.js';
import {
  loadSettings,
  saveSettings
} from './storage/settingsStore.js';
import {
  openGroupsDb
} from './storage/groupsDb.js';
import {
  createI18n,
  detectLanguage,
  resolveLanguage
} from './i18n/i18n.js';
import {
  createTimeModel
} from './time/timeModel.js';
import {
  clockModel
} from './render/clockModel.js';
import {
  renderClockList
} from './render/clockList.js';
import {
  attachGestures
} from './input/gestures.js';
import {
  createLayout
} from './ui/layout.js';
import {
  createPanelHost
} from './ui/panels/panelHost.js';
import {
  openGroups
} from './ui/panels/groups.js';
import {
  openPeople
} from './ui/panels/people.js';
import {
  openSettings
} from './ui/panels/settings.js';
import {
  openReference
} from './ui/panels/reference.js';
import {
  openShare
} from './ui/panels/share.js';
import {
  handleShareLink
} from './ui/panels/importDialog.js';
import {
  openAttribution
} from './ui/attribution.js';
import {
  createPlaceSearch
} from './data/placeSearch.js';
import {
  createPeerSync,
  loadPeerJs
} from './share/peerSync.js';
import {
  snapshotMessage
} from './share/syncMessages.js';
import {
  syncStatusLabel
} from './share/syncStatus.js';
import {
  element,
  button,
  input,
  select
} from './ui/dom.js';
const $ = id => document.getElementById(id);
const defaults = createInitialState({
  language: detectLanguage(navigator)
});
let local, indexed;
try {
  local = localStorage;
} catch {
  /* Storage functions report unavailable backends. */
}
try {
  indexed = indexedDB;
} catch {
  /* The memory database remains usable. */
}
const saved = loadSettings(local, defaults);
const initial = {
  ...defaults,
  ...saved.data,
  groups: []
};
initial.settings.language = resolveLanguage(initial.settings.language, navigator);
const i18n = createI18n({
    language: initial.settings.language
  }),
  {
    t
  } = i18n;
i18n.applyToDom(document);
document.documentElement.lang = i18n.getLanguage();
const db = await openGroupsDb({
  indexedDB: indexed
});
initial.groups = await db.getAll();
if (!initial.groups.some(group => group.id === initial.activeGroupId)) initial.activeGroupId = initial.groups[0]?.id ?? null;
const store = createStore({
  state: initial
});
const time = createTimeModel();
const host = createPanelHost($('panels'), {
  t
});
const peerStates = new Map(),
  peers = new Map();
let globe, globeError, pickCallback, restoreFocus, lastReference, noticeTimer, updating = false,
  disposed = false;
const layout = createLayout($('workspace'), {
  focus: initial.settings.focus,
  onFocusChange: view => dispatch({
    type: 'settings/set',
    key: 'focus',
    value: view
  })
});

function notice(key) {
  $('notice').textContent = t(key);
  $('notice').classList.add('visible');
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => $('notice').classList.remove('visible'), 6000);
}

/** Shows a notice for a failed `{ ok, error }` result and returns the result unchanged. */
function reportFailure(result) {
  if (!result.ok) notice(result.error);
  return result;
}

// Inline form validation owns its feedback; other actions retain global notices.
function dispatch(action, { showNotice = true } = {}) {
  const result = store.dispatch(action);
  return showNotice ? reportFailure(result) : result;
}

function pickPosition(callback) {
  if (!globe) {
    notice('globe.unavailable');
    return;
  }
  pickCallback = callback;
  restoreFocus = layout.getFocus();
  layout.setFocus('globe');
  globe.setPickMode(true);
  renderTime();
  notice('member.pickHint');
}
function endPickMode() {
  pickCallback = null;
  globe?.setPickMode(false);
  layout.setFocus(restoreFocus);
  renderTime();
}
const context = {
  store,
  host,
  t,
  dispatch,
  notice,
  pickPosition,
  placeSearch: createPlaceSearch({
    language: i18n.getLanguage()
  })
};
const views = [...document.querySelectorAll('[data-view]')];
for (const view of views) attachGestures(view, {
  onTimeWheel(delta, mode) {
    const result = time.scrollBy(delta, mode);
    if (result.hint) notice(result.hint);
  },
  onTimeStep(minutes) {
    if (time.isLive()) notice('ref.scrollHint');
    else time.stepBy(minutes);
  },
  onRotate(dx, dy) {
    globe?.rotate(dx, dy);
  },
}, {
  area: view.dataset.view
});

function renderNavigation() {
  const state = store.getState(),
    current = selectActiveGroup(state),
    navigation = $('navigation');
  navigation.replaceChildren();
  const groups = select(state.activeGroupId ?? '', [...(state.groups.length ? [] : [
    ['', t('group.none')]
  ]), ...state.groups.map(g => [g.id, g.name.value || t('group.none')])]);
  groups.setAttribute('aria-label', t('nav.groups'));
  groups.addEventListener('change', () => dispatch({
    type: 'group/setActive',
    groupId: groups.value
  }));
  navigation.append(groups);
  for (const [icon, key, open] of [
      ['☷', 'nav.groups', openGroups],
      ['♙', 'nav.people', openPeople],
      ['⏱', 'nav.reference', openReference],
      ['⚙', 'nav.settings', openSettings],
      ['↗', 'nav.share', openShare]
    ]) {
    const control = button('', () => open(context), {
      title: t(key),
      'aria-label': t(key)
    });
    control.append(element('span', {
      text: icon,
      'aria-hidden': 'true'
    }), element('span', {
      className: 'button-label',
      text: t(key)
    }));
    if ((key === 'nav.reference' || key === 'nav.share') && !current) control.disabled = true;
    navigation.append(control);
  }
}

function fitClocks() {
  const container = $('clock-list'),
    count = container.children.length;
  if (!count) return;
  const width = container.clientWidth,
    height = container.clientHeight,
    compact = layout.getFocus() === 'globe';
  let best = {
    diameter: 0,
    columns: 1,
    rows: count
  };
  for (let columns = 1; columns <= count; columns++) {
    const rows = Math.ceil(count / columns),
      cellWidth = width / columns,
      cellHeight = height / rows;
    const diameter = Math.min(cellWidth - 12, cellHeight / (compact ? 1.65 : 1.9) - 8, compact ? 80 : 290);
    if (diameter > best.diameter) best = {
      diameter,
      columns,
      rows
    };
  }
  container.style.gridTemplateColumns = `repeat(${best.columns},minmax(0,1fr))`;
  container.style.gridTemplateRows = `repeat(${best.rows},minmax(0,1fr))`;
  container.style.setProperty('--diameter', Math.max(2, best.diameter) + 'px');
  container.style.setProperty('--clock-font', Math.max(5, Math.min(18, best.diameter / 9)) + 'px');
  container.style.setProperty('--digital-font', Math.max(6, Math.min(30, best.diameter / 6)) + 'px');
}

function updateReference() {
  const group = selectActiveGroup(store.getState());
  const reference = activeReference(group),
    key = JSON.stringify([group?.id, reference]);
  if (key === lastReference) return;
  lastReference = key;
  if (reference) time.setReference(reference.start, reference.end);
  else time.clearReference();
}

function renderTime() {
  if (disposed || updating) return;
  const state = store.getState(),
    shownTime = time.getShownTime(),
    members = shownMembers(state).map(m => m === state.self && !m.name ? {
      ...m,
      name: t('member.self')
    } : m);
  const models = members.map(member => clockModel({
    member,
    shownTime,
    selfTimeZone: state.self.timeZone,
    settings: state.settings,
    browserLocale: navigator.languages?.[0] ?? navigator.language
  }));
  renderClockList($('clock-list'), models, {
    t,
    compact: layout.getFocus() === 'globe'
  });
  fitClocks();
  globe?.update({
    shownTime,
    members,
    settings: state.settings
  });
  renderTimeline(shownTime, state.self.timeZone);
}

/** Builds the live/reference timeline controls once per mode and updates their values. */
function renderTimeline(shownTime, timeZone) {
  const timeline = $('timeline'),
    reference = time.getReference(),
    locale = i18n.getLanguage() === 'sv' ? 'sv-SE' : 'en-GB';
  const format = ms => new Intl.DateTimeFormat(locale, {
    timeZone,
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(ms);
  if (!timeline.dataset.mode || timeline.dataset.mode !== (reference ? 'reference' : 'live')) {
    timeline.replaceChildren();
    timeline.dataset.mode = reference ? 'reference' : 'live';
    if (reference) {
      const slider = input(null, {
        type: 'range',
        step: 300000,
        'aria-label': t('ref.timeline')
      });
      slider.addEventListener('input', () => time.setShownTime(Number(slider.value)));
      timeline.append(button(t('symbol.previous'), () => time.stepBy(-15), {
        'aria-label': t('ref.previous')
      }), element('div', {
        className: 'range-wrap'
      }, element('div', {
        className: 'range-labels'
      }, element('span', {
        'data-range-start': ''
      }), element('span', {
        'data-range-end': ''
      })), slider), button(t('symbol.next'), () => time.stepBy(15), {
        'aria-label': t('ref.next')
      }));
    }
    timeline.append(element('output', {
      id: 'shown-label'
    }));
  }
  if (reference) {
    const slider = timeline.querySelector('input');
    slider.min = reference.start;
    slider.max = reference.end;
    slider.value = shownTime;
    slider.setAttribute('aria-valuetext', format(shownTime));
    slider.setAttribute('aria-label', t('ref.timeline'));
    timeline.querySelector('[data-range-start]').textContent = format(reference.start);
    timeline.querySelector('[data-range-end]').textContent = format(reference.end);
  }
  $('shown-label').textContent = (reference ? '' : t('ref.live') + ' · ') + format(shownTime);
}

function renderStatus() {
  const group = selectActiveGroup(store.getState());
  const state = group ? (peerStates.get(group.id) ?? {
    status: group.syncState,
    peers: 0
  }) : null;
  const label = state ? syncStatusLabel(state) : null;
  $('sync-status').textContent = label ? t(label.key, label.params) : '';
}

function render() {
  updating = true;
  i18n.setLanguage(store.getState().settings.language);
  document.documentElement.lang = i18n.getLanguage();
  i18n.applyToDom(document);
  layout.setFocus(pickCallback ? 'globe' : store.getState().settings.focus);
  updateReference();
  renderNavigation();
  renderStatus();
  for (const view of views) view.setAttribute('aria-label', t('view.' + view.dataset.view));
  if (globeError) $('globe-message').textContent = t(globeError);
  updating = false;
  renderTime();
}
let persistence = Promise.resolve();

function persist(state, previous) {
  reportFailure(saveSettings(local, state));
  const changes = state.groups.filter(group => previous.groups.find(g => g.id === group.id) !== group);
  const deleted = previous.groups.filter(group => !state.groups.some(g => g.id === group.id));
  persistence = persistence.then(async () => {
    for (const group of changes) reportFailure(await db.put(group));
    for (const group of deleted) reportFailure(await db.delete(group.id));
  });
}

function syncGroups(state, action) {
  for (const [id, sync] of peers)
    if (!state.groups.some(g => g.id === id)) {
      sync.stop();
      peers.delete(id);
      peerStates.delete(id);
    }
  for (const group of state.groups) {
    if (!peers.has(group.id)) {
      const sync = createPeerSync({
        groupId: group.id,
        loadPeer: () => loadPeerJs(),
        hasData: group.hasData ?? group.syncState !== 'waiting',
        getSnapshot: () => {
          const current = store.getState();
          return snapshotMessage(current.groups.find(g => g.id === group.id), current.self);
        },
        onSnapshot: snapshot => dispatch({
          type: 'sync/receive',
          groupId: group.id,
          snapshot
        }),
        onStateChange: status => {
          peerStates.set(group.id, status);
          dispatch({
            type: 'sync/status',
            groupId: group.id,
            status: status.status
          });
          renderStatus();
        },
      });
      peers.set(group.id, sync);
      sync.start();
    } else if (!action.type.startsWith('sync/') && (action.groupId === group.id || action.type === 'self/update')) peers.get(group.id).broadcast();
  }
}
store.subscribe((state, previous, action) => {
  persist(state, previous);
  render();
  syncGroups(state, action);
});
time.subscribe(renderTime);
new ResizeObserver(fitClocks).observe($('clock-list'));
$('credits-button').addEventListener('click', () => openAttribution(context));
let swipeY;
$('timeline').addEventListener('pointerdown', event => {
  if (event.target.tagName !== 'INPUT') swipeY = event.clientY;
});
$('timeline').addEventListener('pointerup', event => {
  if (swipeY != null) {
    time.scrollBy((swipeY - event.clientY) * 2);
    swipeY = null;
  }
});
window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && pickCallback) endPickMode();
});
window.addEventListener('hashchange', readLink);
window.addEventListener('pageshow', event => {
  if (event.persisted) location.reload();
});
async function readLink() {
  const result = await handleShareLink({
    hash: location.hash,
    store,
    container: $('imports'),
    t
  });
  if (result.error) notice(result.error);
  if (result.outcome !== 'none') history.replaceState(null, '', location.pathname + location.search);
}
render();
const initialSave = saveSettings(local, store.getState());
if (!initialSave.ok && !saved.error) notice(initialSave.error);
if (saved.error) notice(saved.error);
else if (!db.persistent) notice('storage.notPersistent');
import('./render/globe/globe.js').then(({
  createGlobe
}) => {
  globe = createGlobe($('globe-viewport'), {
    t,
    onMessage: key => {
      globeError = key;
      $('globe-message').textContent = key ? t(key) : '';
    },
    onPick: position => {
      if (!pickCallback) return;
      const callback = pickCallback;
      endPickMode();
      callback(position);
    }
  });
  renderTime();
}).catch(() => {
  globeError = 'globe.unavailable';
  $('globe-viewport').replaceChildren();
  $('globe-message').textContent = t(globeError);
});
readLink();
syncGroups(store.getState(), {
  type: 'bootstrap'
});
const tick = setInterval(() => {
  if (time.isLive() && !document.hidden) renderTime();
}, 1000);
window.addEventListener('pagehide', () => {
  disposed = true;
  clearInterval(tick);
  for (const sync of peers.values()) sync.stop();
  globe?.dispose();
  db.close();
}, {
  once: true
});
