/* nucleo - archivio chiave/valore sul dispositivo (IndexedDB, con riserva in memoria) e canale tra schede */
(function (N) {
  'use strict';
  const NOME = 'nautargo-prova', STORE = 'kv';
  let dbp = null;
  const mem = new Map();
  const haIdb = () => { try { return typeof indexedDB !== 'undefined' && !!indexedDB; } catch (e) { return false; } };

  function apri() {
    if (dbp) return dbp;
    dbp = new Promise((ok) => {
      if (!haIdb()) return ok(null);
      try {
        const r = indexedDB.open(NOME, 1);
        r.onupgradeneeded = () => r.result.createObjectStore(STORE);
        r.onsuccess = () => ok(r.result);
        r.onerror = () => ok(null);
        r.onblocked = () => ok(null);
      } catch (e) { ok(null); }
    });
    return dbp;
  }
  function tx(modo, fn) {
    return apri().then((db) => new Promise((ok, ko) => {
      if (!db) return ok(fn(null));
      const t = db.transaction(STORE, modo), s = t.objectStore(STORE);
      let out; const r = fn(s);
      if (r && 'onsuccess' in r) r.onsuccess = () => { out = r.result; };
      t.oncomplete = () => ok(out); t.onerror = () => ko(t.error); t.onabort = () => ko(t.error);
    }));
  }

  const KV = {
    memoria: false,
    async get(k) { if (KV.memoria) return U2(mem.get(k)); const db = await apri(); if (!db) return U2(mem.get(k)); return tx('readonly', (s) => s.get(k)); },
    async set(k, v) { if (KV.memoria || !(await apri())) { mem.set(k, U2(v)); return; } return tx('readwrite', (s) => s.put(v, k)); },
    async del(k) { if (KV.memoria || !(await apri())) { mem.delete(k); return; } return tx('readwrite', (s) => s.delete(k)); },
    async chiavi(pref) {
      let ks;
      if (KV.memoria || !(await apri())) ks = Array.from(mem.keys());
      else ks = await tx('readonly', (s) => s.getAllKeys());
      return (ks || []).filter((k) => !pref || String(k).indexOf(pref) === 0);
    },
    /* lettura, modifica e scrittura sotto lucchetto, così due schede non si sovrascrivono */
    async muta(k, fn) {
      const lavoro = async () => { const v = await KV.get(k); const nv = await fn(v); if (nv !== undefined) await KV.set(k, nv); return nv; };
      if (typeof navigator !== 'undefined' && navigator.locks && navigator.locks.request) return navigator.locks.request('np:' + k, lavoro);
      return lavoro();
    }
  };
  /* copia profonda per la memoria, come farebbe IndexedDB */
  function U2(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

  /* canale tra schede dello stesso browser: simula il tempo reale del server */
  const ascolto = [];
  let bc = null;
  try { if (typeof BroadcastChannel !== 'undefined') { bc = new BroadcastChannel(NOME); bc.onmessage = (e) => ascolto.forEach((f) => f(e.data)); } } catch (e) { bc = null; }
  const Canale = {
    invia(msg) { if (bc) try { bc.postMessage(msg); } catch (e) { /* */ } },
    on(f) { ascolto.push(f); return () => { const i = ascolto.indexOf(f); if (i >= 0) ascolto.splice(i, 1); }; }
  };

  N.KV = KV;
  N.Canale = Canale;
})(typeof window !== 'undefined' ? (window.N = window.N || {}) : (globalThis.N = globalThis.N || {}));
