/* nucleo - strato dati isolato (punti 149, 167, 272).
   Questa è l'adattatore "locale": simula il server sul dispositivo, con le stesse regole dei ruoli
   che in produzione applicherà il database (RLS). L'adattatore Supabase avrà gli stessi nomi di funzione. */
(function (N) {
  'use strict';
  const U = N.U, KV = N.KV, C = N.Canale;
  const RUOLI = ['lettore', 'editor', 'proprietario'];
  const livello = (r) => RUOLI.indexOf(r);
  const errore = (codice, msg) => { const e = new Error(msg); e.codice = codice; return e; };
  const sess = {
    get() { try { return sessionStorage.getItem('np:utente'); } catch (e) { return sess._m; } },
    set(v) { try { if (v) sessionStorage.setItem('np:utente', v); else sessionStorage.removeItem('np:utente'); } catch (e) { /* */ } sess._m = v; }
  };
  const codiciInviati = {};
  const tab = async (nome) => (await KV.get('srv:' + nome)) || {};
  const mutaTab = (nome, fn) => KV.muta('srv:' + nome, async (v) => { v = v || {}; const r = await fn(v); return r === undefined ? v : r; });
  const SCHEDA = U.uid();
  const avvisa = (cosa, extra) => C.invia(Object.assign({ t: 'dati', cosa, da: sess.get(), scheda: SCHEDA }, extra || {}));

  async function io() { const id = sess.get(); if (!id) return null; const p = (await tab('profili'))[id]; return p || null; }
  async function devoEssere() { const u = await io(); if (!u) throw errore('accesso', 'Accesso richiesto'); return u; }
  async function ruoloSu(docId, uid) {
    const docs = await tab('documenti'); const d = docs[docId]; if (!d) return null;
    if (d.proprietario === uid) return 'proprietario';
    const m = (await tab('membri'))[docId + '|' + uid]; return m ? m.ruolo : null;
  }
  async function serve(docId, minimo) {
    const u = await devoEssere(); const r = await ruoloSu(docId, u.id);
    if (!r || livello(r) < livello(minimo)) throw errore('permesso', 'Il tuo ruolo su questo documento non consente l\'operazione');
    return { u, r };
  }
  /* inviti per email in attesa: si attivano al primo accesso con quella email */
  async function attivaInviti(u) {
    const inv = await tab('inviti'); let n = 0;
    for (const k of Object.keys(inv)) {
      const i = inv[k];
      if (i.tipo === 'email' && !i.usato && i.email === u.email) {
        await mutaTab('membri', (m) => { m[i.documento + '|' + u.id] = { documento: i.documento, utente: u.id, ruolo: i.ruolo, dal: U.ora() }; });
        await mutaTab('inviti', (t) => { t[k].usato = U.ora(); }); n++;
      }
    }
    return n;
  }

  const D = { modo: 'prova', RUOLI };

  D.accesso = {
    async inviaCodice(email) {
      email = String(email || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw errore('email', 'Indirizzo email non valido');
      const c = String(Math.floor(100000 + Math.random() * 900000)); codiciInviati[email] = c;
      return { inviato: true, codiceProva: c };
    },
    async verificaCodice(email, codice) {
      email = String(email || '').trim().toLowerCase();
      if (!codiciInviati[email] || codiciInviati[email] !== String(codice).trim()) throw errore('codice', 'Codice non valido o scaduto');
      delete codiciInviati[email];
      return D.accesso._entra(email);
    },
    async _entra(email) {
      let p = Object.values(await tab('profili')).find((x) => x.email === email);
      if (!p) { p = { id: U.uid(), email, nome: '', avatar: null, preferenze: { tema: 'sistema' }, creato: U.ora() }; await mutaTab('profili', (t) => { t[p.id] = p; }); }
      sess.set(p.id); await attivaInviti(p); return p;
    },
    async entraProva(id) { const p = (await tab('profili'))[id]; if (!p) throw errore('accesso', 'Utente di prova inesistente'); sess.set(id); await attivaInviti(p); return p; },
    async utentiProva() { return Object.values(await tab('profili')).filter((p) => p.prova); },
    utente: io,
    async esci() { sess.set(null); }
  };

  D.profilo = {
    async salva(dati) {
      const u = await devoEssere();
      await mutaTab('profili', (t) => { t[u.id] = Object.assign({}, t[u.id], { nome: dati.nome != null ? String(dati.nome).trim() : t[u.id].nome, avatar: dati.avatar !== undefined ? dati.avatar : t[u.id].avatar, preferenze: Object.assign({}, t[u.id].preferenze, dati.preferenze || {}) }); });
      avvisa('profili'); return io();
    },
    async leggi(ids) { const t = await tab('profili'); const o = {}; (ids || Object.keys(t)).forEach((id) => { if (t[id]) o[id] = { id, nome: t[id].nome || t[id].email, email: t[id].email, avatar: t[id].avatar }; }); return o; }
  };

  D.rubrica = {
    async elenca() { const u = await devoEssere(); const t = await tab('contatti'); const pr = await tab('profili'); return Object.values(t).filter((c) => c.proprietario === u.id).map((c) => { const p = Object.values(pr).find((x) => x.email === c.email); return Object.assign({}, c, { utente: p ? p.id : null, nomeProfilo: p ? p.nome : '' }); }).sort((a, b) => (a.nome || a.email).localeCompare(b.nome || b.email)); },
    async aggiungi(dati) {
      const u = await devoEssere(); const email = String(dati.email || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw errore('email', 'Indirizzo email non valido');
      if (email === u.email) throw errore('email', 'È il tuo indirizzo');
      const esiste = Object.values(await tab('contatti')).find((c) => c.proprietario === u.id && c.email === email);
      if (esiste) throw errore('doppio', 'Contatto già in rubrica');
      const c = { id: U.uid(), proprietario: u.id, email, nome: String(dati.nome || '').trim() || email.split('@')[0], creato: U.ora() };
      await mutaTab('contatti', (t) => { t[c.id] = c; }); return c;
    },
    async rimuovi(id) { const u = await devoEssere(); await mutaTab('contatti', (t) => { if (t[id] && t[id].proprietario === u.id) delete t[id]; }); }
  };

  D.documenti = {
    async elenca(app) {
      const u = await devoEssere(); const docs = await tab('documenti'); const mem = await tab('membri');
      const out = [];
      for (const d of Object.values(docs)) {
        if (d.app !== app) continue;
        const r = d.proprietario === u.id ? 'proprietario' : (mem[d.id + '|' + u.id] || {}).ruolo;
        if (!r) continue;
        const membri = [d.proprietario].concat(Object.values(mem).filter((m) => m.documento === d.id).map((m) => m.utente));
        out.push(Object.assign({}, d, { ruolo: r, membri }));
      }
      return out.sort((a, b) => String(b.modificato).localeCompare(String(a.modificato)));
    },
    async apri(id) { const u = await devoEssere(); const d = (await tab('documenti'))[id]; if (!d) throw errore('assente', 'Documento non trovato'); const r = await ruoloSu(id, u.id); if (!r) throw errore('permesso', 'Non hai accesso a questo documento'); return Object.assign({}, d, { ruolo: r }); },
    async crea(app, titolo, id) {
      const u = await devoEssere(); const d = { id: id || U.uid(), app, titolo: String(titolo || '').trim() || 'Senza titolo', proprietario: u.id, creato: U.ora(), modificato: U.ora(), eliminato: null };
      await mutaTab('documenti', (t) => { t[d.id] = d; }); avvisa('documenti'); return Object.assign({}, d, { ruolo: 'proprietario' });
    },
    async rinomina(id, titolo) { await serve(id, 'editor'); await mutaTab('documenti', (t) => { t[id].titolo = String(titolo || '').trim() || t[id].titolo; t[id].modificato = U.ora(); }); avvisa('documenti', { doc: id }); },
    async descrivi(id, testo) { await serve(id, 'editor'); await mutaTab('documenti', (t) => { t[id].descrizione = String(testo || '').trim(); t[id].modificato = U.ora(); }); avvisa('documenti', { doc: id }); },
    async tocca(id) { await mutaTab('documenti', (t) => { if (t[id]) t[id].modificato = U.ora(); }); },
    async elimina(id) { await serve(id, 'proprietario'); await mutaTab('documenti', (t) => { t[id].eliminato = U.ora(); }); avvisa('documenti', { doc: id }); },
    async ripristina(id) { await serve(id, 'proprietario'); await mutaTab('documenti', (t) => { t[id].eliminato = null; }); avvisa('documenti', { doc: id }); }
  };

  D.condivisione = {
    async membri(docId) {
      await serve(docId, 'lettore'); const d = (await tab('documenti'))[docId]; const pr = await tab('profili');
      const scheda = (id, ruolo) => ({ utente: id, nome: (pr[id] || {}).nome || (pr[id] || {}).email || '?', email: (pr[id] || {}).email, avatar: (pr[id] || {}).avatar, ruolo });
      const out = [scheda(d.proprietario, 'proprietario')];
      Object.values(await tab('membri')).filter((m) => m.documento === docId).forEach((m) => out.push(scheda(m.utente, m.ruolo)));
      Object.values(await tab('inviti')).filter((i) => i.documento === docId && i.tipo === 'email' && !i.usato).forEach((i) => out.push({ invito: i.codice, nome: i.email, email: i.email, ruolo: i.ruolo, inAttesa: true }));
      return out;
    },
    async invita(docId, email, ruolo) {
      const { u } = await serve(docId, 'proprietario'); email = String(email || '').trim().toLowerCase();
      if (!RUOLI.slice(0, 2).includes(ruolo)) throw errore('ruolo', 'Ruolo non valido');
      if (email === u.email) throw errore('email', 'Sei già il proprietario');
      const p = Object.values(await tab('profili')).find((x) => x.email === email);
      if (p) await mutaTab('membri', (m) => { m[docId + '|' + p.id] = { documento: docId, utente: p.id, ruolo, dal: U.ora() }; });
      else { const c = U.codice(16); await mutaTab('inviti', (t) => { t[c] = { codice: c, tipo: 'email', documento: docId, email, ruolo, creato: U.ora(), scadenza: null, usato: null }; }); }
      avvisa('membri', { doc: docId }); return { diretto: !!p };
    },
    async cambiaRuolo(docId, utente, ruolo) { await serve(docId, 'proprietario'); await mutaTab('membri', (m) => { const k = docId + '|' + utente; if (m[k]) m[k].ruolo = ruolo; }); avvisa('membri', { doc: docId }); },
    async rimuovi(docId, utente, invito) {
      await serve(docId, 'proprietario');
      if (invito) await mutaTab('inviti', (t) => { delete t[invito]; }); else await mutaTab('membri', (m) => { delete m[docId + '|' + utente]; });
      avvisa('membri', { doc: docId });
    },
    async creaLink(docId, ruolo, giorni) {
      await serve(docId, 'proprietario'); const c = U.codice(20);
      const i = { codice: c, tipo: 'link', documento: docId, ruolo, creato: U.ora(), scadenza: giorni ? new Date(Date.now() + giorni * 86400000).toISOString() : null, usato: null };
      await mutaTab('inviti', (t) => { t[c] = i; }); return i;
    },
    async links(docId) { await serve(docId, 'proprietario'); return Object.values(await tab('inviti')).filter((i) => i.documento === docId && i.tipo === 'link'); },
    async revocaLink(codice) { const i = (await tab('inviti'))[codice]; if (!i) return; await serve(i.documento, 'proprietario'); await mutaTab('inviti', (t) => { delete t[codice]; }); },
    async usaLink(codice) {
      const u = await devoEssere(); const i = (await tab('inviti'))[codice];
      if (!i || i.tipo !== 'link') throw errore('link', 'Link non valido o revocato');
      if (i.scadenza && new Date(i.scadenza) < new Date()) throw errore('scaduto', 'Il link è scaduto');
      const attuale = await ruoloSu(i.documento, u.id);
      if (!attuale || livello(attuale) < livello(i.ruolo)) await mutaTab('membri', (m) => { m[i.documento + '|' + u.id] = { documento: i.documento, utente: u.id, ruolo: i.ruolo, dal: U.ora() }; });
      avvisa('membri', { doc: i.documento }); return i.documento;
    }
  };

  /* file: in prova restano sul dispositivo come dataURL; in produzione andranno nello Storage privato */
  D.file = {
    LIMITE: 5 * 1024 * 1024,
    async carica(docId, dataUrl, nome, tipo) {
      await serve(docId, 'editor'); const dim = U.pesoDataUrl(dataUrl);
      if (dim > D.file.LIMITE) throw errore('peso', 'Il file supera 5 MB');
      const f = { id: U.uid(), documento: docId, nome: nome || 'file', tipo: tipo || '', dimensione: dim, creato: U.ora() };
      await KV.set('file:' + f.id, { meta: f, dati: dataUrl }); return f;
    },
    async url(id) { const f = await KV.get('file:' + id); if (!f) return null; await serve(f.meta.documento, 'lettore'); return f.dati; },
    async elimina(id) { const f = await KV.get('file:' + id); if (!f) return; await serve(f.meta.documento, 'editor'); await KV.del('file:' + id); }
  };

  /* zeno: board come insieme di tabelle; le celle hanno un numero di versione per i conflitti (punto 144) */
  const TAB_Z = ['gruppi', 'colonne', 'elementi', 'commenti', 'allegati'];
  const vuotaZ = () => ({ gruppi: {}, colonne: {}, elementi: {}, celle: {}, commenti: {}, allegati: {}, storico: [] });
  D.zeno = {
    async carica(id) { await serve(id, 'lettore'); return Object.assign(vuotaZ(), await KV.get('z:' + id)); },
    async applica(id, ops) {
      const { u, r } = await serve(id, 'lettore');
      const esito = { conflitti: [], celle: {}, rifiutate: [] };
      await KV.muta('z:' + id, (b) => {
        b = Object.assign(vuotaZ(), b); const ora = U.ora();
        ops.forEach((op) => {
          const soloCommento = op.tab === 'commenti' && (op.t === 'crea' || (op.t === 'agg' && b.commenti[op.id] && b.commenti[op.id].autore === u.id));
          if (r === 'lettore' && !soloCommento) { esito.rifiutate.push({ op, motivo: 'Ruolo Lettore: puoi solo commentare' }); return; }
          if (op.t === 'cella') {
            const k = op.el + '|' + op.col, cur = b.celle[k];
            if (cur && !op.forza && (cur.ver || 0) !== (op.base || 0) && JSON.stringify(cur.v) !== JSON.stringify(op.v)) { esito.conflitti.push({ op, attuale: cur }); return; }
            const nuova = { v: op.v, ver: (cur ? cur.ver || 0 : 0) + 1, da: u.id, il: ora };
            b.celle[k] = nuova; esito.celle[k] = nuova;
            b.storico.push({ id: U.uid(), el: op.el, col: op.col, prima: cur ? cur.v : null, dopo: op.v, da: u.id, il: ora });
          } else if (op.t === 'crea' && TAB_Z.includes(op.tab)) {
            b[op.tab][op.dati.id] = Object.assign({}, op.dati, { creato: op.dati.creato || ora, da: u.id });
          } else if (op.t === 'agg' && TAB_Z.includes(op.tab) && b[op.tab][op.id]) {
            const prima = b[op.tab][op.id];
            if (op.tab === 'elementi' && op.dati.nome !== undefined && op.dati.nome !== prima.nome) b.storico.push({ id: U.uid(), el: op.id, col: 'nome', prima: prima.nome, dopo: op.dati.nome, da: u.id, il: ora });
            b[op.tab][op.id] = Object.assign({}, prima, op.dati);
          }
        });
        const limite = new Date(Date.now() - 90 * 86400000).toISOString();
        b.storico = b.storico.filter((s) => s.il >= limite);
        return b;
      });
      if (ops.length > esito.rifiutate.length) { await D.documenti.tocca(id); avvisa('zeno', { doc: id }); }
      return esito;
    },
    async mie() {
      const u = await devoEssere(); const docs = (await D.documenti.elenca('zeno')).filter((d) => !d.eliminato); const out = [];
      for (const d of docs) {
        const b = Object.assign(vuotaZ(), await KV.get('z:' + d.id)), calc = D.zeno.calcola(b);
        const pers = Object.values(b.colonne).filter((c) => c.tipo === 'persona' && !c.eliminato).map((c) => c.id);
        const date = U.ordina(Object.values(b.colonne).filter((c) => (c.tipo === 'data' || c.tipo === 'timeline') && !c.eliminato));
        const stato = calc.colonnaStato ? b.colonne[calc.colonnaStato] : null;
        Object.values(b.elementi).forEach((e) => {
          if (calc.elementi[e.id] === undefined) return;
          if (!pers.some((c) => ((b.celle[e.id + '|' + c] || {}).v || []).includes(u.id))) return;
          const dc = date.find((c) => (b.celle[e.id + '|' + c.id] || {}).v); const dv = dc ? b.celle[e.id + '|' + dc.id].v : null;
          out.push({ board: d.id, boardTitolo: d.titolo, elemento: e.id, nome: e.nome, padre: e.padre ? (b.elementi[e.padre] || {}).nome : null, gruppo: (b.gruppi[e.gruppo] || {}).nome, data: dv && dv.da ? dv.da : dv, avanzamento: calc.elementi[e.id], stato: stato ? (stato.opzioni || []).find((o) => o.id === (b.celle[e.id + '|' + stato.id] || {}).v) : null });
        });
      }
      return out;
    },
    /* avanzamento (punti 195, 201): un elemento è completato quando il suo stato conta come "fatto";
       con sotto-elementi vale la quota di sotto-elementi completati; gruppo e board fanno la media.
       È il valore che Meridian leggerà per le attività del Gantt (R4). */
    calcola(b) {
      const cols = U.ordina(Object.values(b.colonne).filter((c) => !c.eliminato));
      const st = cols.find((c) => c.tipo === 'stato' && (c.opzioni || []).some((o) => o.fatto)) || cols.find((c) => c.tipo === 'stato');
      const opz = st ? st.opzioni || [] : [], esplicite = opz.some((o) => o.fatto);
      const fatte = new Set(opz.filter((o) => esplicite ? o.fatto : /^(fatto|completat|done|chiuso|pubblicat)/i.test(o.nome)).map((o) => o.id));
      const vivo = (e) => e && !e.eliminato && b.gruppi[e.gruppo] && !b.gruppi[e.gruppo].eliminato;
      const top = Object.values(b.elementi).filter((e) => vivo(e) && !e.padre);
      const sub = Object.values(b.elementi).filter((e) => vivo(e) && e.padre && vivo(b.elementi[e.padre]) && !b.elementi[e.padre].padre);
      const ok = (e) => !!st && fatte.has((b.celle[e.id + '|' + st.id] || {}).v);
      const figli = {}; sub.forEach((e) => { (figli[e.padre] = figli[e.padre] || []).push(e); });
      const el = {};
      sub.forEach((e) => { el[e.id] = ok(e) ? 100 : 0; });
      top.forEach((e) => { const f = figli[e.id] || []; el[e.id] = ok(e) ? 100 : f.length ? Math.round(100 * f.filter(ok).length / f.length) : 0; });
      const somma = (l) => ({ completati: l.filter((e) => el[e.id] === 100).length, totali: l.length, percentuale: l.length ? Math.round(l.reduce((s, e) => s + el[e.id], 0) / l.length) : 0 });
      const gruppi = {}; Object.values(b.gruppi).filter((g) => !g.eliminato).forEach((g) => { gruppi[g.id] = somma(top.filter((e) => e.gruppo === g.id)); });
      return { colonnaStato: st ? st.id : null, fatte: Array.from(fatte), board: somma(top), gruppi, elementi: el };
    },
    async avanzamento(id) { await serve(id, 'lettore'); const c = D.zeno.calcola(Object.assign(vuotaZ(), await KV.get('z:' + id))); return { board: c.board, gruppi: c.gruppi, elementi: c.elementi }; },
    async importa(id, b) { await serve(id, 'proprietario'); await KV.set('z:' + id, Object.assign(vuotaZ(), b, { storico: [] })); },
    async viste(boardId) { const u = await devoEssere(); return ((await KV.get('zv:' + u.id)) || []).filter((v) => v.board === boardId); },
    async salvaVista(v) { const u = await devoEssere(); await KV.muta('zv:' + u.id, (l) => { l = (l || []).filter((x) => x.id !== v.id); l.push(v); return l; }); },
    async eliminaVista(id) { const u = await devoEssere(); await KV.muta('zv:' + u.id, (l) => (l || []).filter((x) => x.id !== id)); }
  };

  /* iris: le versioni salvate della lavagna (punto 189); il documento Yjs vivo lo apre iris/js/sync.js */
  D.iris = {
    async versioni(id) { await serve(id, 'lettore'); return ((await KV.get('iv:' + id)) || []).map((v) => ({ id: v.id, il: v.il, da: v.da, nota: v.nota, automatica: v.automatica })).reverse(); },
    async salvaVersione(id, stato, nota, automatica) {
      const { u } = await serve(id, 'editor');
      await KV.muta('iv:' + id, (l) => { l = l || []; l.push({ id: U.uid(), il: U.ora(), da: u.id, nota: nota || '', automatica: !!automatica, stato }); return l.slice(-30); });
    },
    async leggiVersione(id, vid) { await serve(id, 'lettore'); return ((await KV.get('iv:' + id)) || []).find((v) => v.id === vid); },
    /* commenti fuori dal documento Yjs: così anche il Lettore può commentare senza poter modificare la lavagna */
    async commenti(id) { await serve(id, 'lettore'); return Object.values((await KV.get('ic:' + id)) || {}).filter((c) => !c.eliminato).sort((a, b) => String(a.il).localeCompare(b.il)); },
    async commenta(id, oggetto, testo) {
      const { u } = await serve(id, 'lettore'); const c = { id: U.uid(), oggetto, testo: String(testo || '').trim(), autore: u.id, il: U.ora(), risolto: false };
      if (!c.testo) return null;
      await KV.muta('ic:' + id, (t) => { t = t || {}; t[c.id] = c; return t; }); avvisa('iris-commenti', { doc: id }); return c;
    },
    async aggiornaCommento(id, cid, dati) {
      const { u, r } = await serve(id, 'lettore');
      await KV.muta('ic:' + id, (t) => { t = t || {}; const c = t[cid]; if (!c) return t; if (c.autore !== u.id && r === 'lettore') throw errore('permesso', 'Puoi modificare solo i tuoi commenti'); if (dati.eliminato && c.autore !== u.id && r !== 'proprietario') throw errore('permesso', 'Puoi eliminare solo i tuoi commenti'); t[cid] = Object.assign({}, c, dati); return t; });
      avvisa('iris-commenti', { doc: id });
    }
  };

  /* backup (punto 170): un file con tutti i documenti accessibili dell'app; il contenuto lo fornisce l'app */
  D.backup = {
    async esporta(app, contenuto) {
      const u = await devoEssere(); const docs = (await D.documenti.elenca(app)).filter((d) => !d.eliminato); const out = [];
      for (const d of docs) out.push({ documento: { id: d.id, titolo: d.titolo, creato: d.creato, modificato: d.modificato, ruolo: d.ruolo }, contenuto: await contenuto(d) });
      await KV.set('ultimoBackup:' + app + ':' + u.id, U.ora());
      return { formato: 'nautargo-backup', versione: 1, app, data: U.ora(), utente: u.email, documenti: out };
    },
    async ultimo(app) { const u = await io(); return u ? KV.get('ultimoBackup:' + app + ':' + u.id) : null; }
  };

  /* eventi dalle altre schede (in produzione: Supabase Realtime) */
  D.on = (f) => C.on((m) => { if (m && m.scheda !== SCHEDA) f(m); });
  D.invia = (m) => C.invia(Object.assign({ da: sess.get(), scheda: SCHEDA }, m));
  D._tab = tab; D._mutaTab = mutaTab; D._sess = sess;

  /* dati di prova: tre persone, rubrica di Simo; ogni app aggiunge i suoi documenti */
  D.semina = async (app, seminaApp, versione) => {
    const chiave = 'srv:semina:' + app + (versione ? ':' + versione : '');
    if (!(await KV.get('srv:semina:nucleo'))) {
      const P = [['p-simo', 'simo@esempio.it', 'Simo'], ['p-giulia', 'giulia@esempio.it', 'Giulia Rinaldi'], ['p-marco', 'marco@esempio.it', 'Marco Ferri']];
      await mutaTab('profili', (t) => { P.forEach(([id, email, nome]) => { t[id] = { id, email, nome, avatar: null, preferenze: { tema: 'sistema' }, prova: true, creato: U.ora() }; }); });
      await mutaTab('contatti', (t) => { t['c1'] = { id: 'c1', proprietario: 'p-simo', email: 'giulia@esempio.it', nome: 'Giulia Rinaldi', creato: U.ora() }; t['c2'] = { id: 'c2', proprietario: 'p-simo', email: 'marco@esempio.it', nome: 'Marco Ferri', creato: U.ora() }; t['c3'] = { id: 'c3', proprietario: 'p-giulia', email: 'simo@esempio.it', nome: 'Simo', creato: U.ora() }; });
      await KV.set('srv:semina:nucleo', U.ora());
    }
    if (seminaApp && !(await KV.get(chiave))) {
      const prima = sess.get();
      await seminaApp({ D, entraCome: (id) => sess.set(id), membro: (doc, utente, ruolo) => mutaTab('membri', (m) => { m[doc + '|' + utente] = { documento: doc, utente, ruolo, dal: U.ora() }; }) });
      sess.set(prima); await KV.set(chiave, U.ora());
    }
  };

  N.D = D;
})(typeof window !== 'undefined' ? (window.N = window.N || {}) : (globalThis.N = globalThis.N || {}));
