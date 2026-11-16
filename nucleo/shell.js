/* nucleo - guscio comune alle due app: accesso, pagina iniziale, profilo, rubrica, condivisione,
   presenza, stato di sincronizzazione, backup, tema */
(function (N) {
  'use strict';
  const U = N.U, UI = N.UI, D = N.D, esc = U.esc, ico = UI.ico;
  const TAB = U.uid().slice(0, 8);

  /* stato di sincronizzazione (punto 281): sincronizzato, in attesa, offline */
  const Sync = {
    offline: false, attesa: 0, asc: [],
    imposta(o) { Object.assign(Sync, o); Sync.asc.forEach((f) => f()); Shell.disegnaStato && Shell.disegnaStato(); },
    on(f) { Sync.asc.push(f); }
  };

  /* presenza (punto 169): chi ha aperto lo stesso documento, tramite il canale tra schede */
  const Pres = {
    doc: null, altri: {}, timer: null,
    entra(doc) { Pres.esci(); Pres.doc = doc; Pres.batti(); Pres.timer = setInterval(Pres.batti, 4000); },
    esci() { if (Pres.doc) N.Canale.invia({ t: 'pres', doc: Pres.doc, tab: TAB, via: true }); clearInterval(Pres.timer); Pres.doc = null; Pres.altri = {}; Shell.disegnaPres(); },
    batti() { if (!Pres.doc || Sync.offline || !Shell.utente) return; const u = Shell.utente; N.Canale.invia({ t: 'pres', doc: Pres.doc, tab: TAB, u: { id: u.id, nome: u.nome || u.email, avatar: u.avatar }, ts: Date.now() }); Pres.pulisci(); },
    ricevi(m) {
      if (m.t !== 'pres' || m.doc !== Pres.doc || m.tab === TAB || Sync.offline) return;
      if (m.via) delete Pres.altri[m.tab]; else { const nuovo = !Pres.altri[m.tab]; Pres.altri[m.tab] = { u: m.u, ts: Date.now() }; if (nuovo) Pres.batti(); }
      Shell.disegnaPres();
    },
    pulisci() { const t = Date.now(); let c = false; Object.keys(Pres.altri).forEach((k) => { if (t - Pres.altri[k].ts > 11000) { delete Pres.altri[k]; c = true; } }); if (c) Shell.disegnaPres(); },
    persone() { const o = {}; Object.values(Pres.altri).forEach((x) => { if (x.u && x.u.id !== (Shell.utente || {}).id) o[x.u.id] = x.u; }); return Object.values(o); }
  };

  const Shell = {
    cfg: null, utente: null, vista: null, doc: null, persone: {},
    async avvia(cfg) {
      Shell.cfg = cfg;
      if (N.Aiuto) N.Aiuto.capitoli = (cfg.guida || []).concat(N.Aiuto.COMUNI);
      document.documentElement.dataset.app = cfg.app;
      try { await D.semina(cfg.app, cfg.semina, cfg.versioneSemina); } catch (e) { console.error(e); }
      Shell.persone = await D.profilo.leggi();
      Shell.utente = await D.accesso.utente();
      Shell.tema();
      N.Canale.on(Pres.ricevi);
      D.on(async (m) => {
        if (Sync.offline || m.t !== 'dati') return;
        if (m.cosa === 'profili') Shell.persone = await D.profilo.leggi();
        if (!Shell.doc && (m.cosa === 'documenti' || m.cosa === 'membri') && Shell.rotta().r === '') Shell.disegna();
        if (Shell.doc && m.cosa === 'membri' && m.doc === Shell.doc.id) Shell.ricontrollaRuolo();
      });
      addEventListener('hashchange', () => Shell.disegna());
      addEventListener('beforeunload', () => Pres.esci());
      if (matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => Shell.tema());
      Shell.disegna();
      if (!window.__INLINE__ && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').then((r) => {
        r.addEventListener('updatefound', () => { const w = r.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) UI.toast('Nuova versione disponibile', '', { testo: 'Aggiorna', fai: () => location.reload() }); }); });
      }).catch(() => { /* */ });
    },
    tema() {
      const t = ((Shell.utente || {}).preferenze || {}).tema || 'sistema';
      const scuro = t === 'scuro' || (t === 'sistema' && matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.tema = scuro ? 'scuro' : 'chiaro';
    },
    rotta() { const h = (location.hash || '').replace(/^#\/?/, '').split('/'); return { r: h[0] || '', id: h[1] || '' }; },
    vai(h) { location.hash = '#/' + (h || ''); },
    nome(id) { const p = Shell.persone[id]; return p ? (p.nome || p.email) : 'Utente'; },
    profiloDi(id) { return Shell.persone[id] || { id, nome: '?' }; },

    async disegna() {
      UI.chiudiPop();
      const root = U.$('#app'), rt = Shell.rotta();
      if (Shell.vista && (rt.r !== 'd' || !Shell.doc || rt.id !== Shell.doc.id)) { try { Shell.vista.chiudi && Shell.vista.chiudi(); } catch (e) { console.error(e); } Shell.vista = null; Shell.doc = null; Pres.esci(); }
      if (!Shell.utente) { if (rt.r === 'invito') { try { sessionStorage.setItem('np:invito', rt.id); } catch (e) { /* */ } } return Shell.accesso(root); }
      if (rt.r === 'invito') {
        try { const doc = await D.condivisione.usaLink(rt.id); UI.toast('Sei stato aggiunto al documento'); return Shell.vai('d/' + doc); } catch (e) { UI.errore(e); return Shell.vai(''); }
      }
      if (rt.r === 'd' && Shell.doc && Shell.doc.id === rt.id) return;
      root.innerHTML = '<div class="guscio"><header class="top" id="top"></header><main class="vista" id="vista"></main></div>';
      if (rt.r === 'd') {
        try { Shell.doc = await D.documenti.apri(rt.id); } catch (e) { UI.errore(e); return Shell.vai(''); }
        if (Shell.doc.eliminato) { UI.toast('Il documento è nel cestino'); Shell.doc = null; return Shell.vai(''); }
        Shell.barra(); Pres.entra(Shell.doc.id);
        try { Shell.vista = await Shell.cfg.apri(Shell.doc, U.$('#vista'), Shell); } catch (e) { console.error(e); U.$('#vista').innerHTML = '<div class="vuoto"><p>Non è stato possibile aprire il documento.</p><p class="muted small">' + esc(e.message) + '</p></div>'; }
        return;
      }
      Shell.barra();
      const pag = Shell.cfg.pagine && Shell.cfg.pagine[rt.id];
      if (rt.r === 'p' && pag) return pag.disegna(U.$('#vista'), Shell);
      return Shell.home(U.$('#vista'));
    },

    /* barra superiore */
    barra() {
      const c = Shell.cfg, u = Shell.utente, d = Shell.doc;
      U.$('#top').innerHTML = '<a class="brand" href="#/" title="Pagina iniziale">' + c.logo + '<span class="bt"><b class="wm">' + esc(c.nome) + '</b><small><b>nautargo</b></small></span></a>' +
        (d && !c.titoloInVista ? '<span class="sep">/</span><button class="titolo" data-c="rinomina" title="' + (d.ruolo === 'lettore' ? '' : 'Rinomina') + '"' + (d.ruolo === 'lettore' ? ' disabled' : '') + '>' + esc(d.titolo) + '</button><span class="chip ruolo">' + UI.ruolo(d.ruolo) + '</span>' : '') +
        '<span class="sp"></span><span class="pres" id="pres"></span><button class="stato" id="stato" data-pop data-c="stato"></button>' +
        (d ? '<button class="btn sm" data-c="condividi">' + ico('share') + '<span class="solo-l">Condividi</span></button>' : '') +
        '<button class="ib0 me" data-pop data-c="me" aria-label="Menu utente">' + UI.avatar(u, 32) + '</button>';
      Shell.disegnaStato(); Shell.disegnaPres();
      U.$('#top').onclick = (e) => {
        const b = e.target.closest('[data-c]'); if (!b) return;
        const k = b.dataset.c;
        if (k === 'me') Shell.menuMe(b);
        if (k === 'stato') Shell.popStato(b);
        if (k === 'condividi') Shell.condividi(Shell.doc);
        if (k === 'rinomina') Shell.rinomina(Shell.doc);
      };
    },
    disegnaStato() {
      const el = U.$('#stato'); if (!el) return;
      const s = Sync.offline ? ['off', 'cloudoff', 'Offline'] : Sync.attesa ? ['att', 'sync', 'In attesa (' + Sync.attesa + ')'] : ['ok', 'cloud', 'Sincronizzato'];
      el.className = 'stato ' + s[0]; el.innerHTML = ico(s[1]) + '<span class="solo-l">' + s[2] + '</span>'; el.title = s[2];
    },
    disegnaPres() {
      const el = U.$('#pres'); if (!el) return;
      const p = Pres.persone(); el.innerHTML = p.slice(0, 4).map((x) => '<span class="pav" title="' + esc(x.nome) + ' sta guardando">' + UI.avatar(x, 26) + '</span>').join('') + (p.length > 4 ? '<span class="chip">+' + (p.length - 4) + '</span>' : '');
    },
    popStato(b) {
      const p = UI.pop(b, '<div class="pstato"><p class="ey">Sincronizzazione ' + Shell.i('sincronizzazione') + '</p><p>' + (Sync.offline ? 'Sei offline: le modifiche restano in coda e partono al rientro.' : Sync.attesa ? 'Ci sono modifiche in coda, in invio.' : 'Tutte le modifiche sono salvate.') + '</p>' +
        '<label class="sw"><input type="checkbox" ' + (Sync.offline ? 'checked' : '') + '><span>Simula offline</span></label>' +
        '<p class="muted small">Modalità prova: i dati restano in questo browser. Apri l\'app in due schede, anche con utenti diversi, per vedere tempo reale, presenza e conflitti.</p></div>', { destra: true });
      p.querySelector('input').onchange = (e) => { Sync.imposta({ offline: e.target.checked }); if (!e.target.checked) Pres.batti(); UI.toast(e.target.checked ? 'Offline simulato: le modifiche vanno in coda' : 'Di nuovo online'); };
    },
    menuMe(b) {
      const u = Shell.utente;
      UI.menu(b, [
        { testo: (u.nome || u.email), ico: 'user', fai: () => Shell.profilo() },
        { testo: 'Rubrica', ico: 'book', fai: () => Shell.rubrica() },
        { testo: 'Backup', ico: 'down', fai: () => Shell.backup() },
        { testo: 'Impostazioni', ico: 'gear', fai: () => Shell.impostazioni() },
        '-',
        { testo: 'Cambia utente (prova)', ico: 'users', fai: async () => { await D.accesso.esci(); Shell.utente = null; Shell.vai(''); Shell.disegna(); } },
        { testo: 'Esci', ico: 'out', fai: async () => { await D.accesso.esci(); Shell.utente = null; Shell.vai(''); Shell.disegna(); } }
      ]);
    },
    async ricontrollaRuolo() {
      try { const d = await D.documenti.apri(Shell.doc.id); if (d.ruolo !== Shell.doc.ruolo) { UI.toast('Il tuo ruolo è cambiato: ' + UI.ruolo(d.ruolo)); Shell.doc = null; Shell.disegna(); } }
      catch (e) { UI.toast('Non hai più accesso a questo documento'); Shell.doc = null; Shell.vai(''); }
    },

    /* accesso: email, codice a 6 cifre (punto 219); in prova il codice compare a schermo */
    async accesso(root) {
      const c = Shell.cfg, prova = await D.accesso.utentiProva();
      root.innerHTML = '<div class="accesso"><div class="acard"><div class="abrand">' + c.logo + '<b class="wm">' + esc(c.nome) + '</b></div><p class="muted">' + esc(c.motto) + '</p>' +
        '<div id="passo"></div>' +
        (prova.length ? '<div class="prova"><p class="ey">Prova rapida, entra come</p><div class="plist">' + prova.map((p) => '<button class="btn pv" data-u="' + p.id + '">' + UI.avatar(p, 26) + '<span>' + esc(p.nome) + '</span></button>').join('') + '</div></div>' : '') +
        '<p class="muted small piede"><b>nautargo</b> - modalità prova, dati solo su questo dispositivo</p></div></div>';
      const passo = U.$('#passo');
      const entrato = async (p) => {
        Shell.utente = p; Shell.persone = await D.profilo.leggi(); Shell.tema();
        if (!p.nome) { const n = await UI.chiedi('Come ti chiami?', '', 'Nome visibile ai collaboratori'); if (n) Shell.utente = await D.profilo.salva({ nome: n }); }
        let inv = null; try { inv = sessionStorage.getItem('np:invito'); sessionStorage.removeItem('np:invito'); } catch (e) { /* */ }
        if (inv) Shell.vai('invito/' + inv); else Shell.disegna();
      };
      const email = () => {
        passo.innerHTML = '<form class="col gap"><label class="campo"><span>Email</span><input type="email" name="email" autocomplete="email" placeholder="nome@esempio.it" required></label><button class="btn pri largo">Invia il codice</button></form>';
        passo.querySelector('form').onsubmit = async (e) => {
          e.preventDefault(); const em = e.target.email.value;
          try { const r = await D.accesso.inviaCodice(em); codice(em, r.codiceProva); } catch (er) { UI.errore(er); }
        };
      };
      const codice = (em, prova) => {
        passo.innerHTML = '<form class="col gap"><p>Abbiamo inviato un codice a <b>' + esc(em) + '</b>. Puoi anche aprire il link contenuto nell\'email.</p>' +
          (prova ? '<p class="nota">Modalità prova: il codice è <b class="mono">' + prova + '</b></p>' : '') +
          '<label class="campo"><span>Codice a 6 cifre</span><input name="c" inputmode="numeric" autocomplete="one-time-code" maxlength="6" class="mono codice" required></label><button class="btn pri largo">Entra</button><button type="button" class="btn link" data-cambia>Cambia email</button></form>';
        const f = passo.querySelector('form'); f.c.focus();
        f.onsubmit = async (e) => { e.preventDefault(); try { entrato(await D.accesso.verificaCodice(em, f.c.value)); } catch (er) { UI.errore(er); } };
        f.querySelector('[data-cambia]').onclick = email;
      };
      email();
      root.querySelectorAll('[data-u]').forEach((b) => { b.onclick = async () => entrato(await D.accesso.entraProva(b.dataset.u)); });
    },

    /* pagina iniziale: documenti propri, condivisi, cestino */
    async home(el) {
      const c = Shell.cfg, u = Shell.utente;
      const docs = await D.documenti.elenca(c.app);
      const miei = docs.filter((d) => d.ruolo === 'proprietario' && !d.eliminato), cond = docs.filter((d) => d.ruolo !== 'proprietario' && !d.eliminato), cest = docs.filter((d) => d.eliminato && d.ruolo === 'proprietario');
      const ultimo = await D.backup.ultimo(c.app);
      const ricorda = miei.length && (!ultimo || Date.now() - new Date(ultimo).getTime() > 7 * 86400000);
      const scheda = (d) => '<a class="dcard" href="#/d/' + d.id + '"><span class="dico">' + c.icoDoc + '</span><span class="dtx"><b>' + esc(d.titolo) + '</b><small class="muted">' + esc(U.fa(d.modificato)) + (d.ruolo !== 'proprietario' ? ' - di ' + esc(Shell.nome(d.proprietario)) : '') + '</small></span>' +
        '<span class="dmem">' + d.membri.slice(0, 3).map((m) => UI.avatar(Shell.profiloDi(m), 22)).join('') + '</span>' + (d.ruolo !== 'proprietario' ? '<span class="chip">' + UI.ruolo(d.ruolo) + '</span>' : '') +
        '<button class="ib0" data-pop data-m="' + d.id + '" aria-label="Azioni">' + ico('menu') + '</button></a>';
      el.innerHTML = '<div class="home">' +
        (ricorda ? '<div class="banner">' + ico('info') + '<span>' + (ultimo ? 'L\'ultimo backup è di ' + esc(U.fa(ultimo)) + '.' : 'Non hai ancora scaricato un backup.') + ' Conviene farne uno a settimana.</span><button class="btn sm" data-c="backup">Scarica backup</button></div>' : '') +
        '<div class="hhead"><div><p class="ey">Ciao ' + esc((u.nome || '').split(' ')[0] || '') + '</p><h1>' + esc(c.titoloHome) + ' ' + Shell.i(c.aiutoHome || '') + '</h1></div><div class="acts">' + (c.azioniHome || '') + '<button class="btn pri" data-c="nuovo">' + ico('plus') + esc(c.nuovo) + '</button></div></div>' +
        '<section><h2 class="sez">Tue <span class="cnt">' + miei.length + '</span></h2>' + (miei.length ? '<div class="dlist">' + miei.map(scheda).join('') + '</div>' : '<p class="vuoto muted">' + esc(c.vuoto) + '</p>') + '</section>' +
        '<section><h2 class="sez">Condivise con te <span class="cnt">' + cond.length + '</span></h2>' + (cond.length ? '<div class="dlist">' + cond.map(scheda).join('') + '</div>' : '<p class="vuoto muted">Quando qualcuno ti invita, il documento compare qui.</p>') + '</section>' +
        (cest.length ? '<details class="cest"><summary>' + ico('trash') + 'Cestino (' + cest.length + ')</summary><div class="dlist">' + cest.map((d) => '<div class="dcard off"><span class="dico">' + c.icoDoc + '</span><span class="dtx"><b>' + esc(d.titolo) + '</b><small class="muted">eliminato ' + esc(U.fa(d.eliminato)) + '</small></span><button class="btn sm" data-r="' + d.id + '">' + ico('undo') + 'Ripristina</button></div>').join('') + '</div></details>' : '') +
        '</div>';
      el.onclick = async (e) => {
        const m = e.target.closest('[data-m]'), r = e.target.closest('[data-r]'), b = e.target.closest('[data-c]');
        if (m) { e.preventDefault(); const d = docs.find((x) => x.id === m.dataset.m); const voci = [{ testo: 'Apri', ico: 'chev', fai: () => Shell.vai('d/' + d.id) }];
          if (d.ruolo !== 'lettore') voci.push({ testo: 'Rinomina', ico: 'edit', fai: () => Shell.rinomina(d) });
          if (d.ruolo === 'proprietario') voci.push({ testo: 'Condividi', ico: 'share', fai: () => Shell.condividi(d) }, '-', { testo: 'Sposta nel cestino', ico: 'trash', pericolo: true, fai: async () => { await D.documenti.elimina(d.id); UI.toast('Spostato nel cestino', '', { testo: 'Annulla', fai: async () => { await D.documenti.ripristina(d.id); Shell.disegna(); } }); Shell.disegna(); } });
          UI.menu(m, voci); return; }
        if (r) { await D.documenti.ripristina(r.dataset.r); Shell.disegna(); return; }
        if (b && b.dataset.c === 'nuovo') return Shell.nuovo();
        if (b && b.dataset.c === 'backup') return Shell.backup();
        if (b && c.azioneHome) c.azioneHome(b.dataset.c, Shell);
      };
    },
    async nuovo() {
      const c = Shell.cfg;
      try {
        const scelta = c.sceltaNuovo ? await c.sceltaNuovo() : { titolo: await UI.chiedi(c.nuovo, '', 'Titolo') };
        if (!scelta || scelta.titolo === null) return;
        const d = await D.documenti.crea(c.app, scelta.titolo);
        await c.creaContenuto(d, scelta);
        Shell.vai('d/' + d.id);
      } catch (e) { UI.errore(e); }
    },
    async rinomina(d) {
      const t = await UI.chiedi('Rinomina', d.titolo, 'Titolo'); if (t === null || !t.trim()) return;
      try { await D.documenti.rinomina(d.id, t); if (Shell.doc && Shell.doc.id === d.id) { Shell.doc.titolo = t.trim(); Shell.barra(); } else Shell.disegna(); } catch (e) { UI.errore(e); }
    },

    /* profilo (punto 164) */
    profilo() {
      const u = Shell.utente; let avatar = u.avatar;
      const w = UI.modale('<h2>Profilo</h2><div class="prof"><span id="pav">' + UI.avatar(u, 64) + '</span><div class="col gap"><button class="btn sm" data-c="foto">' + ico('image') + 'Cambia foto</button><button class="btn sm link" data-c="nofoto">Usa le iniziali</button></div></div>' +
        '<label class="campo"><span>Nome</span><input name="nome" value="' + esc(u.nome || '') + '"></label><label class="campo"><span>Email</span><input value="' + esc(u.email) + '" disabled></label>' +
        '<div class="azioni"><button class="btn" data-x>Annulla</button><button class="btn pri" data-c="salva">Salva</button></div>', { classe: 'stretta' });
      const ridisegna = () => { U.$('#pav', w.el).innerHTML = UI.avatar(Object.assign({}, u, { avatar }), 64); };
      w.el.onclick = async (e) => {
        const b = e.target.closest('[data-c]'); if (!b) return;
        if (b.dataset.c === 'foto') { const [f] = await U.scegliFile('image/*'); if (f) { avatar = (await U.riduciImmagine(f, 160)).dataUrl; ridisegna(); } }
        if (b.dataset.c === 'nofoto') { avatar = null; ridisegna(); }
        if (b.dataset.c === 'salva') { try { Shell.utente = await D.profilo.salva({ nome: w.el.querySelector('[name=nome]').value, avatar, }); Shell.persone = await D.profilo.leggi(); Shell.tema(); w.chiudi(); Shell.barra(); UI.toast('Profilo salvato'); } catch (er) { UI.errore(er); } }
      };
    },

    /* impostazioni: tema, icone "i" e Guida */
    impostazioni() {
      const u = Shell.utente, pr = u.preferenze || {}, c = Shell.cfg;
      const w = UI.modale('<h2>Impostazioni</h2>' +
        '<label class="campo"><span>Tema</span><select name="tema"><option value="sistema">Come il sistema</option><option value="chiaro">Chiaro</option><option value="scuro">Scuro</option></select></label>' +
        '<div class="iset"><label class="sw"><input type="checkbox" name="spiegazioni"' + (pr.spiegazioni !== false ? ' checked' : '') + '><span>Mostra le icone <span class="ibtn finto">i</span> accanto alle funzioni</span></label><p class="muted small">Un tocco sull\'icona apre una spiegazione breve, con il rimando alla Guida.</p></div>' +
        '<div class="iset"><button class="btn" data-c="guida">' + ico('book') + 'Apri la Guida</button></div>' +
        '<p class="muted small">' + esc(c.nome) + ' ' + esc(c.versione || '') + ' - <b>nautargo</b> - modalità prova</p>' +
        '<div class="azioni"><button class="btn" data-x>Chiudi</button><button class="btn pri" data-c="salva">Salva</button></div>', { classe: 'stretta' });
      w.el.querySelector('[name=tema]').value = pr.tema || 'sistema';
      w.el.onclick = async (e) => {
        const b = e.target.closest('[data-c]'); if (!b) return;
        if (b.dataset.c === 'guida') return N.Aiuto.guida();
        if (b.dataset.c === 'salva') {
          try {
            const prima = pr.spiegazioni !== false, dopo = w.el.querySelector('[name=spiegazioni]').checked;
            Shell.utente = await D.profilo.salva({ preferenze: { tema: w.el.querySelector('[name=tema]').value, spiegazioni: dopo } });
            Shell.tema(); w.chiudi(); UI.toast('Impostazioni salvate');
            if (prima !== dopo) Shell.ridisegna();
          } catch (er) { UI.errore(er); }
        }
      };
    },
    ridisegna() { if (Shell.vista) { try { Shell.vista.chiudi && Shell.vista.chiudi(); } catch (e) { console.error(e); } } Shell.vista = null; Shell.doc = null; Shell.disegna(); },
    i(id) { return N.Aiuto ? N.Aiuto.i(id) : ''; },

    /* rubrica (punto 165): condivisa tra le due app */
    async rubrica() {
      const w = UI.modale('<h2>Rubrica ' + Shell.i('rubrica') + '</h2><p class="muted small">I contatti valgono per zeno e iris. Si aggiungono solo con l\'email esatta.</p><form class="riga"><input name="nome" placeholder="Nome"><input name="email" type="email" placeholder="email@esempio.it" required><button class="btn pri">' + ico('plus') + 'Aggiungi</button></form><div id="rlist" class="plist2"></div>', { classe: 'media' });
      const lista = async () => {
        const r = await D.rubrica.elenca();
        U.$('#rlist', w.el).innerHTML = r.length ? r.map((c) => '<div class="prow">' + UI.avatar({ id: c.utente || c.email, nome: c.nome }, 30) + '<span class="ptx"><b>' + esc(c.nome) + '</b><small class="muted">' + esc(c.email) + (c.utente ? '' : ' - non ancora registrato') + '</small></span><button class="ib0" data-del="' + c.id + '" aria-label="Rimuovi">' + ico('trash') + '</button></div>').join('') : '<p class="muted">Nessun contatto.</p>';
      };
      await lista();
      w.el.querySelector('form').onsubmit = async (e) => { e.preventDefault(); try { await D.rubrica.aggiungi({ nome: e.target.nome.value, email: e.target.email.value }); e.target.reset(); lista(); } catch (er) { UI.errore(er); } };
      w.el.addEventListener('click', async (e) => { const b = e.target.closest('[data-del]'); if (b) { await D.rubrica.rimuovi(b.dataset.del); lista(); } });
    },

    /* condivisione (punto 166): membri e ruoli, invito da rubrica, link con ruolo e scadenza */
    async condividi(d) {
      const prop = d.ruolo === 'proprietario';
      const w = UI.modale('<h2>Condividi "' + esc(d.titolo) + '" ' + Shell.i('condivisione') + '</h2><div id="cmem" class="plist2"></div>' +
        (prop ? '<h3 class="h3">Invita dalla rubrica</h3><form class="riga" id="cinv"><select name="email" required></select><select name="ruolo"><option value="editor">Editor</option><option value="lettore">Lettore</option></select><button class="btn pri">Invita</button></form><p class="muted small">Editor modifica i contenuti; Lettore legge, esporta e commenta.</p>' +
          '<h3 class="h3">Link di invito</h3><form class="riga" id="clink"><select name="ruolo"><option value="lettore">Lettore</option><option value="editor">Editor</option></select><select name="giorni"><option value="7">Scade tra 7 giorni</option><option value="30">Scade tra 30 giorni</option><option value="0">Senza scadenza</option></select><button class="btn">' + ico('link') + 'Crea link</button></form><div id="clinks"></div>' : '<p class="muted small">Solo il proprietario gestisce inviti e ruoli.</p>'), { classe: 'media' });
      const ridisegna = async () => {
        const mem = await D.condivisione.membri(d.id);
        U.$('#cmem', w.el).innerHTML = mem.map((m) => '<div class="prow">' + UI.avatar(m.utente ? Shell.profiloDi(m.utente) : { id: m.email, nome: m.email }, 30) + '<span class="ptx"><b>' + esc(m.nome) + (m.utente === Shell.utente.id ? ' (tu)' : '') + '</b><small class="muted">' + esc(m.inAttesa ? 'invito in attesa del primo accesso' : m.email || '') + '</small></span>' +
          (prop && m.ruolo !== 'proprietario' ? '<select data-ruolo="' + (m.utente || '') + '"' + (m.inAttesa ? ' disabled' : '') + '><option value="editor"' + (m.ruolo === 'editor' ? ' selected' : '') + '>Editor</option><option value="lettore"' + (m.ruolo === 'lettore' ? ' selected' : '') + '>Lettore</option></select><button class="ib0" data-rim="' + (m.utente || '') + '" data-inv="' + (m.invito || '') + '" aria-label="Rimuovi">' + ico('x') + '</button>' : '<span class="chip">' + UI.ruolo(m.ruolo) + '</span>') + '</div>').join('');
        if (!prop) return;
        const rub = await D.rubrica.elenca(), gia = mem.map((m) => m.email);
        const sel = w.el.querySelector('#cinv [name=email]'), lib = rub.filter((c) => !gia.includes(c.email));
        sel.innerHTML = lib.length ? lib.map((c) => '<option value="' + esc(c.email) + '">' + esc(c.nome) + ' - ' + esc(c.email) + '</option>').join('') : '<option value="">Rubrica vuota o già tutti invitati</option>';
        const ls = await D.condivisione.links(d.id), base = location.href.split('#')[0];
        U.$('#clinks', w.el).innerHTML = ls.map((l) => { const scad = l.scadenza && new Date(l.scadenza) < new Date(); return '<div class="lrow' + (scad ? ' off' : '') + '"><input readonly value="' + esc(base + '#/invito/' + l.codice) + '"><span class="chip">' + UI.ruolo(l.ruolo) + '</span><small class="muted">' + (l.scadenza ? (scad ? 'scaduto' : 'fino al ' + U.data(l.scadenza)) : 'senza scadenza') + '</small><button class="ib0" data-copia aria-label="Copia">' + ico('copy') + '</button><button class="ib0" data-rev="' + l.codice + '" aria-label="Revoca">' + ico('trash') + '</button></div>'; }).join('');
      };
      await ridisegna();
      if (prop) {
        w.el.querySelector('#cinv').onsubmit = async (e) => { e.preventDefault(); if (!e.target.email.value) return; try { const r = await D.condivisione.invita(d.id, e.target.email.value, e.target.ruolo.value); UI.toast(r.diretto ? 'Aggiunto al documento' : 'Invito in attesa: si attiva al primo accesso'); ridisegna(); } catch (er) { UI.errore(er); } };
        w.el.querySelector('#clink').onsubmit = async (e) => { e.preventDefault(); await D.condivisione.creaLink(d.id, e.target.ruolo.value, +e.target.giorni.value); ridisegna(); };
      }
      w.el.addEventListener('change', async (e) => { const s = e.target.closest('[data-ruolo]'); if (s) { await D.condivisione.cambiaRuolo(d.id, s.dataset.ruolo, s.value); UI.toast('Ruolo aggiornato'); } });
      w.el.addEventListener('click', async (e) => {
        const r = e.target.closest('[data-rim]'), v = e.target.closest('[data-rev]'), cp = e.target.closest('[data-copia]');
        if (r) { await D.condivisione.rimuovi(d.id, r.dataset.rim, r.dataset.inv || null); ridisegna(); }
        if (v) { await D.condivisione.revocaLink(v.dataset.rev); ridisegna(); }
        if (cp) { const i = cp.parentNode.querySelector('input'); i.select(); try { await navigator.clipboard.writeText(i.value); UI.toast('Link copiato'); } catch (er) { document.execCommand('copy'); UI.toast('Link copiato'); } }
      });
    },

    /* backup (punti 157, 170): scarica un file con tutto, ripristina come copie */
    backup() {
      const c = Shell.cfg;
      const w = UI.modale('<h2>Backup ' + Shell.i('backup') + '</h2><p>Il backup è un file con tutti i documenti di ' + esc(c.nome) + ' a cui hai accesso. Conservalo dove vuoi: è la tua copia di sicurezza.</p><div class="azioni sx"><button class="btn pri" data-c="scarica">' + ico('down') + 'Scarica backup</button><button class="btn" data-c="ripristina">' + ico('up') + 'Ripristina da file</button></div><p class="muted small">Il ripristino aggiunge i documenti come copie tue, senza toccare quelli esistenti.</p>', { classe: 'stretta' });
      w.el.onclick = async (e) => {
        const b = e.target.closest('[data-c]'); if (!b) return;
        try {
          if (b.dataset.c === 'scarica') { const dati = await D.backup.esporta(c.app, c.esportaContenuto); U.scarica(JSON.stringify(dati, null, 1), c.app + '-backup-' + U.oggi() + '.json', 'application/json'); UI.toast(dati.documenti.length + ' documenti nel backup'); }
          if (b.dataset.c === 'ripristina') {
            const [f] = await U.scegliFile('.json,application/json'); if (!f) return;
            const dati = JSON.parse(await U.leggiTesto(f));
            if (dati.formato !== 'nautargo-backup' || dati.app !== c.app) throw new Error('Il file non è un backup di ' + c.nome);
            for (const x of dati.documenti) { const d = await D.documenti.crea(c.app, x.documento.titolo + ' (ripristino)'); await c.importaContenuto(d, x.contenuto); }
            UI.toast(dati.documenti.length + ' documenti ripristinati'); w.chiudi(); Shell.disegna();
          }
        } catch (er) { UI.errore(er); }
      };
    }
  };

  N.Shell = Shell; N.Sync = Sync; N.Pres = Pres; N.TAB = TAB;
})(window.N = window.N || {});
