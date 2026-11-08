export function createMemoryGroupsDb() {
  const groups = new Map();
  return {
    persistent: false,
    async getAll() {
      return structuredClone([...groups.values()]);
    },
    async put(group) {
      groups.set(group.id, structuredClone(group));
      return {
        ok: true
      };
    },
    async delete(id) {
      groups.delete(id);
      return {
        ok: true
      };
    },
    close() {}
  };
}
export function openGroupsDb({
  indexedDB,
  name = 'ctf'
}) {
  return new Promise(resolve => {
    let settled = false;
    const fallback = () => {
      if (!settled) {
        settled = true;
        resolve(createMemoryGroupsDb());
      }
    };
    try {
      if (!indexedDB) {
        fallback();
        return;
      }
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('groups', {
          keyPath: 'id'
        });
      };
      request.onerror = request.onblocked = fallback;
      request.onsuccess = () => {
        const db = request.result;
        if (settled) {
          db.close();
          return;
        }
        settled = true;
        const write = (method, value) => new Promise(done => {
          try {
            const tx = db.transaction('groups', 'readwrite');
            tx.objectStore('groups')[method](value);
            tx.oncomplete = () => done({
              ok: true
            });
            tx.onerror = tx.onabort = () => done({
              ok: false,
              error: 'storage.errorWrite'
            });
          } catch {
            done({
              ok: false,
              error: 'storage.errorWrite'
            });
          }
        });
        db.onversionchange = () => db.close();
        resolve({
          persistent: true,
          getAll: () => new Promise(done => {
            try {
              const r = db.transaction('groups').objectStore('groups').getAll();
              r.onsuccess = () => done(r.result);
              r.onerror = () => done([]);
            } catch {
              done([]);
            }
          }),
          put: group => write('put', group),
          delete: id => write('delete', id),
          close: () => db.close()
        });
      };
    } catch {
      fallback();
    }
  });
}
