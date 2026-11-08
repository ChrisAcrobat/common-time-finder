import {
  helloMessage,
  validateMessage
} from './syncMessages.js';
export const PEERJS_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js';
export const PEERJS_INTEGRITY = 'sha384-x0YgkOr/3UOZP2CRDxGW9e0Q+2Qjyr3uJrm4xU32Y7ZCNAo7Cc7bjhrZMi/dwczu';
export const peerIdFor = groupId => 'ctf-' + groupId;
const loaders = new WeakMap();
export function loadPeerJs({
  document = globalThis.document,
  window = globalThis.window
} = {}) {
  if (window.Peer) return Promise.resolve(window.Peer);
  if (loaders.has(document)) return loaders.get(document);
  const pending = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PEERJS_URL;
    script.integrity = PEERJS_INTEGRITY;
    script.crossOrigin = 'anonymous';
    script.onload = () => window.Peer ? resolve(window.Peer) : reject(new Error('PeerJS unavailable'));
    script.onerror = () => {
      script.remove();
      reject(new Error('PeerJS load failed'));
    };
    document.head.appendChild(script);
  });
  loaders.set(document, pending);
  pending.catch(() => loaders.delete(document));
  return pending;
}
export function createPeerSync({
  groupId,
  loadPeer = loadPeerJs,
  getSnapshot,
  onSnapshot,
  onStateChange = () => {},
  hasData = true,
  retryDelay = () => 250 + Math.random() * 750
}) {
  let state = {
    status: hasData ? 'connected' : 'waiting',
    peers: 0,
    isHost: false
  };
  let Peer, peer, stopped = true,
    generation = 0,
    timer;
  const connections = new Set();
  const update = changes => {
    state = {
      ...state,
      ...changes
    };
    onStateChange({
      ...state
    });
  };
  const count = () => update({
    peers: connections.size,
    status: hasData ? 'connected' : 'waiting'
  });
  const send = (connection, data) => {
    try {
      connection.send(data);
    } catch {
      /* A concurrently closed connection is removed by its close event. */
    }
  };

  function schedule() {
    if (stopped || timer) return;
    timer = setTimeout(() => {
      timer = null;
      claim();
    }, retryDelay());
  }

  function attach(connection, token) {
    let opened = false;
    connection.on('open', () => {
      if (stopped || token !== generation) {
        connection.close();
        return;
      }
      opened = true;
      connections.add(connection);
      count();
      send(connection, helloMessage(groupId));
      send(connection, getSnapshot());
    });
    connection.on('data', input => {
      if (stopped || token !== generation) return;
      const result = validateMessage(input, groupId);
      if (!result.ok) {
        console.warn('Ignored invalid sync message:', result.reason);
        return;
      }
      if (result.message.type !== 'snapshot') return;
      hasData = true;
      onSnapshot(result.message);
      count();
      if (state.isHost)
        for (const other of connections)
          if (other !== connection) send(other, result.message);
    });
    connection.on('close', () => {
      connections.delete(connection);
      if (stopped || token !== generation) return;
      count();
      if (opened && !state.isHost) schedule();
    });
  }

  function open(host) {
    const token = ++generation;
    const old = peer;
    peer = null;
    connections.clear();
    old?.destroy();
    if (stopped) return;
    try {
      peer = host ? new Peer(peerIdFor(groupId)) : new Peer();
    } catch {
      update({
        status: 'offline',
        peers: 0,
        isHost: false
      });
      schedule();
      return;
    }
    const current = peer;
    current.on('open', () => {
      if (stopped || token !== generation) return;
      update({
        isHost: host
      });
      count();
      if (!host) attach(current.connect(peerIdFor(groupId)), token);
    });
    current.on('connection', connection => attach(connection, token));
    current.on('error', error => {
      if (stopped || token !== generation) return;
      if (host && error.type === 'unavailable-id') open(false);
      else if (error.type === 'peer-unavailable') schedule();
      else {
        update({
          status: 'offline',
          peers: 0
        });
        schedule();
      }
    });
  }

  function claim() {
    if (!stopped && Peer) open(true);
  }
  return {
    async start() {
      if (!stopped) return;
      stopped = false;
      try {
        Peer = await loadPeer();
        if (!stopped) claim();
      } catch {
        if (!stopped) update({
          status: 'offline',
          peers: 0,
          isHost: false
        });
      }
    },
    stop() {
      stopped = true;
      generation++;
      clearTimeout(timer);
      timer = null;
      for (const conn of connections) conn.close();
      connections.clear();
      peer?.destroy();
      peer = null;
    },
    broadcast() {
      if (!stopped)
        for (const conn of connections) send(conn, getSnapshot());
    },
    getState: () => ({
      ...state
    }),
  };
}
