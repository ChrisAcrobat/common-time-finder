export const isMemberVisible = member => member.removedAt == null || member.removedAt < member.updatedAt;

function newer(a, b) {
  if (a == null) return b;
  if (b == null) return a;
  return a.updatedAt > b.updatedAt ? a : a.updatedAt < b.updatedAt ? b : JSON.stringify(a) > JSON.stringify(b) ? a : b;
}
export function mergeGroup(local, snapshot) {
  const locked = newer(local.locked, snapshot.locked);
  const members = new Map(local.members.map(member => [member.id, member]));
  for (const incoming of snapshot.members) {
    const previous = members.get(incoming.id);
    if (locked.value && (!previous || !isMemberVisible(previous))) continue;
    if (!previous) members.set(incoming.id, incoming);
    else {
      const {
        removedAt: aRemoved,
        ...a
      } = previous, {
        removedAt: bRemoved,
        ...b
      } = incoming;
      const removedAt = aRemoved == null ? bRemoved : bRemoved == null ? aRemoved : Math.max(aRemoved, bRemoved);
      members.set(incoming.id, {
        ...newer(a, b),
        removedAt: removedAt ?? null
      });
    }
  }
  return structuredClone({
    ...local,
    name: newer(local.name, snapshot.name),
    locked,
    reference: newer(local.reference, snapshot.reference),
    members: [...members.values()]
  });
}
