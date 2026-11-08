import {
  isUuid
} from './shareLink.js';
import {
  isValidTimeZone
} from '../time/zones.js';
export const SYNC_VERSION = 1,
  MAX_NAME_LENGTH = 100,
  MAX_LABEL_LENGTH = 200;
export const helloMessage = groupId => ({
  v: SYNC_VERSION,
  type: 'hello',
  groupId
});
const memberFields = m => ({
  id: m.id,
  name: m.name,
  timeZone: m.timeZone,
  lat: m.lat ?? null,
  lon: m.lon ?? null,
  label: m.label ?? null,
  updatedAt: m.updatedAt,
  removedAt: m.removedAt ?? null
});
export function snapshotMessage(group, self) {
  const members = group.members.filter(m => m.id !== self?.id).map(memberFields);
  if (group.shareSelf && self) members.push(memberFields(self));
  return structuredClone({
    v: SYNC_VERSION,
    type: 'snapshot',
    groupId: group.id,
    name: group.name,
    locked: group.locked,
    reference: group.reference,
    members
  });
}
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, max, required = false) => typeof value === 'string' && value.length <= max && (!required || !!value.trim());
const stamp = value => Number.isFinite(value) && value >= 0;
const item = (value, type) => object(value) && typeof value.value === type && stamp(value.updatedAt);

function validMember(m) {
  return object(m) && isUuid(m.id) && text(m.name, MAX_NAME_LENGTH, true) && isValidTimeZone(m.timeZone) &&
    ((m.lat === null && m.lon === null) || (Number.isFinite(m.lat) && Math.abs(m.lat) <= 90 && Number.isFinite(m.lon) && Math.abs(m.lon) <= 180)) &&
    (m.label === null || text(m.label, MAX_LABEL_LENGTH)) && stamp(m.updatedAt) && (m.removedAt === null || stamp(m.removedAt));
}
export function validateMessage(input, groupId) {
  try {
    const message = typeof input === 'string' ? JSON.parse(input) : input;
    if (!object(message) || message.v !== SYNC_VERSION || !isUuid(message.groupId) || message.groupId !== groupId) throw new Error('envelope');
    if (message.type === 'hello') return {
      ok: true,
      message
    };
    if (message.type !== 'snapshot' || !item(message.name, 'string') || message.name.value.length > MAX_NAME_LENGTH || !item(message.locked, 'boolean')) throw new Error('items');
    const ref = message.reference;
    if (ref !== null && !(object(ref) && stamp(ref.updatedAt) && ((ref.start === null && ref.end === null) || (Number.isFinite(ref.start) && Number.isFinite(ref.end) && ref.end > ref.start)))) throw new Error('reference');
    if (!Array.isArray(message.members) || !message.members.every(validMember) || new Set(message.members.map(m => m.id)).size !== message.members.length) throw new Error('members');
    return {
      ok: true,
      message
    };
  } catch (error) {
    return {
      ok: false,
      reason: String(error.message ?? 'invalid')
    };
  }
}
