import {
  isValidTimeZone
} from '../time/zones.js';
import {
  validateRange
} from '../time/timeModel.js';
import {
  isUuid
} from '../share/shareLink.js';
import {
  isMemberVisible,
  mergeGroup
} from '../share/syncMerge.js';
export function createInitialState({
  uuid = () => crypto.randomUUID(),
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  language = 'en'
} = {}) {
  return {
    settings: {
      language,
      showTimeZones: true,
      showSunArrows: false,
      focus: 'clocks',
      dialTop: 'shown',
      dialBrightness: 'absolute'
    },
    self: {
      id: uuid(),
      name: '',
      timeZone,
      lat: null,
      lon: null,
      updatedAt: 0
    },
    groups: [],
    activeGroupId: null
  };
}
export const selectActiveGroup = state => state.groups.find(g => g.id === state.activeGroupId) ?? null;
export const activeReference = group => group?.reference?.start != null && group?.reference?.end != null ? {
  start: group.reference.start,
  end: group.reference.end
} : null;
export const visibleMembers = group => (group?.members ?? []).filter(isMemberVisible);
export const shownMembers = state => [state.self, ...visibleMembers(selectActiveGroup(state)).filter(m => m.id !== state.self.id)];

function validateMember(member, self = false) {
  if (!self && (typeof member.name !== 'string' || !member.name.trim())) return 'member.errorNameRequired';
  if (typeof member.name !== 'string' || member.name.length > 100) return 'member.errorNameRequired';
  if (!isValidTimeZone(member.timeZone)) return 'member.errorZoneInvalid';
  if (!(member.lat == null && member.lon == null) && !(Number.isFinite(member.lat) && Math.abs(member.lat) <= 90 && Number.isFinite(member.lon) && Math.abs(member.lon) <= 180)) return 'member.errorPosition';
  if (member.label != null && (typeof member.label !== 'string' || member.label.length > 200)) return 'member.errorPosition';
  return null;
}
const settingValues = {
  language: ['en', 'sv'],
  showTimeZones: [true, false],
  showSunArrows: [true, false],
  focus: ['clocks', 'globe'],
  dialTop: ['shown', 'noon', 'midnight'],
  dialBrightness: ['absolute', 'relative']
};
export function createStore({
  state = createInitialState(),
  now = Date.now,
  uuid = () => crypto.randomUUID()
} = {}) {
  const listeners = new Set();
  const fail = error => ({
    ok: false,
    error
  });

  function dispatch(action) {
    let next = state,
      result = {
        ok: true
      };
    const timestamp = now(),
      group = state.groups.find(g => g.id === action.groupId);
    const replace = updated => ({
      ...state,
      groups: state.groups.map(g => g.id === updated.id ? updated : g)
    });
    switch (action.type) {
      case 'group/create':
      case 'group/join': {
        const joining = action.type === 'group/join',
          id = joining ? action.id : uuid();
        if (!isUuid(id)) return fail('share.invalidLink');
        if (joining && state.groups.some(g => g.id === id)) {
          next = state.activeGroupId === id ? state : {
            ...state,
            activeGroupId: id
          };
          result = {
            ok: true,
            id,
            existing: true
          };
          break;
        }
        const name = action.name ?? '';
        if (typeof name !== 'string' || name.length > 100) return fail('group.errorName');
        const stamp = joining ? 0 : timestamp;
        const created = {
          id,
          hasData: !joining,
          shareSelf: false,
          syncState: joining ? 'waiting' : 'connected',
          locked: {
            value: false,
            updatedAt: stamp
          },
          name: {
            value: name,
            updatedAt: stamp
          },
          members: [],
          reference: null,
          inputTimeZone: state.self.timeZone,
          updatedAt: stamp
        };
        next = {
          ...state,
          groups: [...state.groups, created],
          activeGroupId: id
        };
        result.id = id;
        break;
      }
      case 'group/delete':
        if (!group) return fail('group.errorMissing');
        next = {
          ...state,
          groups: state.groups.filter(g => g.id !== group.id)
        };
        if (state.activeGroupId === group.id) next.activeGroupId = next.groups[0]?.id ?? null;
        break;
      case 'group/setActive':
        if (!group) return fail('group.errorMissing');
        if (state.activeGroupId !== group.id) next = {
          ...state,
          activeGroupId: group.id
        };
        break;
      case 'group/rename':
      case 'group/setLocked':
      case 'group/setShareSelf':
      case 'reference/inputZone': {
        if (!group) return fail('group.errorMissing');
        const changed = {
          ...group,
          updatedAt: timestamp
        };
        if (action.type === 'group/rename') {
          if (typeof action.name !== 'string' || action.name.length > 100) return fail('group.errorName');
          changed.name = {
            value: action.name,
            updatedAt: timestamp
          };
        } else if (action.type === 'group/setLocked') changed.locked = {
          value: !!action.locked,
          updatedAt: timestamp
        };
        else if (action.type === 'group/setShareSelf') {
          if (action.shareSelf && !state.self.name.trim()) return fail('member.errorNameRequired');
          changed.shareSelf = !!action.shareSelf;
        } else {
          if (!isValidTimeZone(action.timeZone)) return fail('member.errorZoneInvalid');
          changed.inputTimeZone = action.timeZone;
        }
        next = replace(changed);
        break;
      }
      case 'member/add':
      case 'member/update':
      case 'member/remove': {
        if (!group) return fail('group.errorMissing');
        const old = group.members.find(m => m.id === action.memberId);
        if (action.type !== 'member/add' && !old) return fail('member.errorMissing');
        const member = action.type === 'member/add' ? {
            lat: null,
            lon: null,
            label: null,
            ...action.member,
            id: uuid(),
            updatedAt: timestamp,
            removedAt: null
          } :
          action.type === 'member/remove' ? {
            ...old,
            removedAt: timestamp
          } : {
            ...old,
            ...action.changes,
            id: old.id,
            updatedAt: timestamp
          };
        const error = validateMember(member);
        if (error) return fail(error);
        member.name = member.name.trim();
        next = replace({
          ...group,
          updatedAt: timestamp,
          members: action.type === 'member/add' ? [...group.members, member] : group.members.map(m => m.id === old.id ? member : m)
        });
        if (action.type === 'member/add') result.id = member.id;
        break;
      }
      case 'self/update': {
        const self = {
          ...state.self,
          ...action.changes,
          updatedAt: timestamp
        };
        if (!isUuid(self.id)) return fail('member.errorId');
        const error = validateMember(self, !state.groups.some(group => group.shareSelf));
        if (error) return fail(error);
        next = {
          ...state,
          self
        };
        break;
      }
      case 'settings/set':
        if (!settingValues[action.key]?.includes(action.value)) return fail('settings.errorInvalid');
        if (state.settings[action.key] !== action.value) next = {
          ...state,
          settings: {
            ...state.settings,
            [action.key]: action.value
          }
        };
        break;
      case 'reference/set':
      case 'reference/clear': {
        if (!group) return fail('group.errorMissing');
        const clearing = action.type === 'reference/clear';
        if (!clearing) {
          const valid = validateRange(action.start, action.end);
          if (!valid.ok) return valid;
        }
        next = replace({
          ...group,
          updatedAt: timestamp,
          reference: {
            start: clearing ? null : action.start,
            end: clearing ? null : action.end,
            updatedAt: timestamp
          }
        });
        break;
      }
      case 'sync/receive': {
        if (!group) return fail('group.errorMissing');
        const merged = {
          ...mergeGroup(group, action.snapshot),
          hasData: true
        };
        if (JSON.stringify(merged) !== JSON.stringify(group)) next = replace(merged);
        break;
      }
      case 'sync/status':
        if (!group) return fail('group.errorMissing');
        if (group.syncState !== action.status) next = replace({
          ...group,
          syncState: action.status
        });
        break;
      default:
        return fail('app.errorAction');
    }
    if (next !== state) {
      const previous = state;
      state = next;
      for (const fn of listeners) fn(state, previous, action);
    }
    return result;
  }
  return {
    getState: () => state,
    dispatch,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };
}
