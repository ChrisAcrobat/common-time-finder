export function syncStatusLabel({
  status,
  peers
}) {
  if (status === 'connected') return peers > 0 ? {
    key: 'sync.connected',
    params: {
      n: peers
    }
  } : {
    key: 'sync.readyToShare',
    params: {}
  };
  return {
    key: status === 'offline' ? 'sync.offline' : 'group.waitingForSync',
    params: {}
  };
}
