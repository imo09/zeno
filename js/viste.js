/* zeno - vista della board, sul modello di monday (0.3): intestazione con avanzamento, schede delle viste,
   barra strumenti, Tabella con gruppi, sotto-elementi e riepiloghi, Kanban, Calendario, selezione multipla,
   editor delle celle, filtri, colonne nascoste e viste salvate (punti 173-178, 190) */
(function (N) {
  'use strict';
  const U = N.U, UI = N.UI, D = N.D, esc = U.esc, ico = UI.ico;
  const Z = N.Z = N.Z || {};
  const T = () => Z.T;
  const telefono = () => matchMedia('(max-width: 720px)').matches;
  const LARG = { testo: 180, stato: 132, persona: 120, timeline: 168, data: 118, valutazione: 120, avanzamento: 140, numero: 120, dropdown: 170, checkbox: 92, link: 160 };
  const GIORNI = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
  const I = (id) => (N.Aiuto ? N.Aiuto.i(id) : '');
  const giorni = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);

  Z.apriBoard = async function (doc, root, shell) {
    const B = await new Z.Board(doc, shell.utente).carica();
    let membri = await D.condivisione.membri(doc.id);
    let info = doc;
    const chiaveV = 'zeno:v:' + doc.id;
    let V = { tipo: 'tabella', filtri: [], ordine: null, cerca: '', kanbanCol: null, calCol: null, mese: null, tlCol: null, tlScala: 'giorni', vistaId: null, chiusi: {}, aperti: {}, nascoste: [], persone: [] };
    try { V = Object.assign(V, JSON.parse(localStorage.getItem(chiaveV) || '{}')); } catch (e) { /* */ }
    let viste = await D.zeno.viste(doc.id);
    let sel = null, attesa = null, chiuso = false, scorriOggi = V.tipo === 'timeline';
    const selez = new Set();
    const ed = B.puoModificare;
    const salvaV = () => { try { localStorage.setItem(chiaveV, JSON.stringify(V)); } catch (e) { /* */ } };
    const ctx = { nome: (id) => shell.nome(id), profilo: (id) => shell.profiloDi(id), io: () => shell.utente.id, membri: () => membri.filter((m) => m.utente), puoModificare: ed };
    Z.ctx = ctx;

    root.innerHTML = '<div class="zb"><header class="zhead" id="zhead"></header><nav class="ztabs" id="ztabs"></nav><div class="ztool" id="ztool"></div><div class="zfiltri" id="zfiltri"></div><div class="zcorpo" id="zcorpo"></div><div class="zmassa" id="zmassa"></div></div>';
    const corpo = U.$('#zcorpo', root);

    /* ---------- dati della vista ---------- */
    const colPer = (id) => B.dati.colonne[id];
    const colonne = () => B.colonne().filter((c) => !V.nascoste.includes(c.id));
    const statoCol = () => { const s = B.colonne().filter((c) => c.tipo === 'stato'); return s.find((c) => c.id === V.kanbanCol) || s.find((c) => c.id === B.calc.colonnaStato) || s[0]; };
    const tlCol = () => { const s = B.colonne().filter((c) => c.tipo === 'timeline' || c.tipo === 'data'); return s.find((c) => c.id === V.tlCol) || s.find((c) => c.tipo === 'timeline') || s[0]; };
    const calCol = () => { const s = B.colonne().filter((c) => c.tipo === 'data' || c.tipo === 'timeline'); return s.find((c) => c.id === V.calCol) || s[0]; };
    const coloreStato = (e) => { const st = colPer(B.calc.colonnaStato || '') || statoCol(); const o = st ? (st.opzioni || []).find((x) => x.id === B.cella(e.id, st.id)) : null; return o ? o.colore : 'var(--line)'; };
    function visibili(gruppo) {
      let l = B.elementi(gruppo).filter((e) => !(B.dati.gruppi[e.gruppo] || {}).eliminato);
      if (V.cerca) { const q = V.cerca.toLowerCase(); l = l.filter((e) => String(e.nome || '').toLowerCase().includes(q) || B.figli(e.id).some((f) => String(f.nome).toLowerCase().includes(q))); }
      if (V.persone.length) { const pc = B.colonne().filter((c) => c.tipo === 'persona'); l = l.filter((e) => [e].concat(B.figli(e.id)).some((x) => pc.some((c) => (B.cella(x.id, c.id) || []).some((p) => V.persone.includes(p))))); }
      V.filtri.forEach((f) => { const c = colPer(f.col); if (c && !c.eliminato) l = l.filter((e) => Z.passa(f, B.valore(e.id, c), c, ctx)); });
      if (V.ordine) {
        const o = V.ordine, c = colPer(o.col);
        l.sort((a, b) => o.dir * (o.col === 'nome' ? String(a.nome).localeCompare(String(b.nome), 'it') : c ? T()[c.tipo].confronta(B.valore(a.id, c), B.valore(b.id, c), c, ctx) : 0));
      }
      return l;
    }
    const ncomm = (e) => Object.values(B.dati.commenti).filter((x) => x.elemento === e.id && !x.eliminato).length;
    const tv = (v, c) => { if (!c) return v == null || v === '' ? 'vuoto' : String(v); const s = T()[c.tipo].csv(v, c, ctx); return s === '' ? 'vuoto' : s; };

    /* ---------- intestazione: titolo, descrizione, avanzamento, membri ---------- */
    function intestazione() {
      const av = B.calc.board, mem = membri.filter((m) => m.utente);
      U.$('#zhead', root).innerHTML = '<div class="zh-l"><h1 class="ztit' + (ed ? ' ed' : '') + '" data-c="titolo">' + esc(info.titolo) + '</h1>' +
        '<p class="zdesc' + (info.descrizione ? '' : ' vuota') + (ed ? ' ed' : '') + '" data-c="desc">' + esc(info.descrizione || (ed ? 'Aggiungi una descrizione della board' : '')) + '</p></div>' +
        '<div class="zh-r"><div class="zprog" title="Avanzamento della board: media degli elementi; è il valore che Meridian leggerà"><span class="anello" style="--p:' + av.percentuale + '"><b>' + av.percentuale + '%</b></span><span class="zpt"><b>Avanzamento ' + I('avanzamento') + '</b><small>' + av.completati + ' di ' + av.totali + ' completati</small></span></div>' +
        '<span class="zmem" title="' + esc(mem.map((m) => m.nome).join(', ')) + '">' + mem.slice(0, 4).map((m) => UI.avatar(ctx.profilo(m.utente), 28)).join('') + (mem.length > 4 ? '<span class="chip">+' + (mem.length - 4) + '</span>' : '') + '</span>' +
        '<span class="chip ruolo">' + UI.ruolo(doc.ruolo) + '</span><button class="btn sm" data-c="attivita" title="Log attività: chi ha cambiato cosa">' + ico('clock') + '<span class="solo-l">Log attività</span></button>' + I('log') + '</div>';
    }

    /* ---------- schede delle viste e barra strumenti ---------- */
    function schede() {
      const t = (k, i, n) => '<button class="zt-tab' + (!V.vistaId && V.tipo === k ? ' on' : '') + '" data-c="' + k + '">' + ico(i) + '<span>' + n + '</span></button>';
      U.$('#ztabs', root).innerHTML = t('tabella', 'table', 'Tabella principale') + t('kanban', 'kanban', 'Kanban') + t('calendario', 'cal', 'Calendario') + t('timeline', 'timeline', 'Timeline') +
        viste.map((v) => '<button class="zt-tab' + (V.vistaId === v.id ? ' on' : '') + '" data-vista="' + v.id + '">' + ico(v.tipo === 'kanban' ? 'kanban' : v.tipo === 'calendario' ? 'cal' : v.tipo === 'timeline' ? 'timeline' : 'table') + '<span>' + esc(v.nome) + '</span>' + (V.vistaId === v.id ? '<span class="vx" data-delvista="' + v.id + '" title="Elimina vista">' + ico('x') + '</span>' : '') + '</button>').join('') +
        '<button class="zt-tab piu" data-c="salvavista" title="Salva la vista attuale con un nome">' + ico('plus') + '</button><span class="ztab-i">' + I('viste') + '</span>';
    }
    function barra() {
      const nf = V.filtri.length, np = V.persone.length, nn = V.nascoste.length;
      const sc = (lista, attiva, id) => '<select class="sm" id="' + id + '">' + lista.map((c) => '<option value="' + c.id + '"' + (attiva && attiva.id === c.id ? ' selected' : '') + '>' + esc(c.nome) + '</option>').join('') + '</select>';
      U.$('#ztool', root).innerHTML = (ed ? '<span class="nuovo"><button class="btn sm pri" data-c="nuovo">' + ico('plus') + 'Nuovo elemento</button><button class="btn sm pri freccia" data-pop data-c="nuovomenu" aria-label="Altre creazioni">' + ico('chevd') + '</button></span>' : '') +
        '<label class="cerca">' + ico('search') + '<input id="zcerca" placeholder="Cerca" value="' + esc(V.cerca) + '"></label>' +
        '<button class="btn sm t' + (np ? ' attivo' : '') + '" data-pop data-c="persone">' + ico('user') + '<span class="solo-l">Owner</span>' + (np ? '<span class="cnt">' + np + '</span>' : '') + '</button>' +
        '<button class="btn sm t' + (nf ? ' attivo' : '') + '" data-pop data-c="filtri">' + ico('filter') + '<span class="solo-l">Filtra</span>' + (nf ? '<span class="cnt">' + nf + '</span>' : '') + '</button>' +
        '<button class="btn sm t' + (V.ordine ? ' attivo' : '') + '" data-pop data-c="ordina">' + ico('sort') + '<span class="solo-l">Ordina</span></button>' +
        (V.tipo === 'tabella' ? '<button class="btn sm t' + (nn ? ' attivo' : '') + '" data-pop data-c="nascondi">' + ico('grid') + '<span class="solo-l">Nascondi</span>' + (nn ? '<span class="cnt">' + nn + '</span>' : '') + '</button>' : '') +
        (V.tipo === 'kanban' && B.colonne().some((c) => c.tipo === 'stato') ? sc(B.colonne().filter((c) => c.tipo === 'stato'), statoCol(), 'zkcol') : '') +
        (V.tipo === 'calendario' && calCol() ? sc(B.colonne().filter((c) => c.tipo === 'data' || c.tipo === 'timeline'), calCol(), 'zccol') : '') +
        (V.tipo === 'timeline' && tlCol() ? sc(B.colonne().filter((c) => c.tipo === 'timeline' || c.tipo === 'data'), tlCol(), 'ztcol') + '<select class="sm" id="ztscala" title="Scala"><option value="giorni"' + (V.tlScala !== 'mesi' ? ' selected' : '') + '>Giorni</option><option value="mesi"' + (V.tlScala === 'mesi' ? ' selected' : '') + '>Mesi</option></select>' : '') +
        I('strumenti') + '<span class="sp"></span><button class="ib0" data-pop data-c="menu" aria-label="Altre azioni">' + ico('menu') + '</button>';
      U.$('#zfiltri', root).innerHTML = (np ? '<span class="fchip">Owner: <b>' + esc(V.persone.map((p) => ctx.nome(p).split(' ')[0]).join(', ')) + '</b><button class="ib0" data-nopers aria-label="Togli">' + ico('x') + '</button></span>' : '') +
        V.filtri.map((f, i) => { const c = colPer(f.col); if (!c) return ''; const op = (Z.OPERATORI[c.tipo].find((o) => o[0] === f.op) || [])[1]; return '<span class="fchip">' + esc(c.nome) + ' ' + esc(op || '') + ' <b>' + esc(valoreFiltro(f, c)) + '</b><button class="ib0" data-delf="' + i + '" aria-label="Togli filtro">' + ico('x') + '</button></span>'; }).join('') +
        (nf + np ? '<button class="btn sm link" data-c="nofiltri">Togli tutti</button>' : '');
      const k = U.$('#zkcol', root); if (k) k.onchange = () => { V.kanbanCol = k.value; salvaV(); disegnaCorpo(); };
      const cc = U.$('#zccol', root); if (cc) cc.onchange = () => { V.calCol = cc.value; salvaV(); disegnaCorpo(); };
      const tc = U.$('#ztcol', root); if (tc) tc.onchange = () => { V.tlCol = tc.value; salvaV(); scorriOggi = true; disegnaCorpo(); };
      const ts = U.$('#ztscala', root); if (ts) ts.onchange = () => { V.tlScala = ts.value; salvaV(); scorriOggi = true; disegnaCorpo(); };
      const c = U.$('#zcerca', root); c.oninput = U.debounce(() => { V.cerca = c.value; salvaV(); disegnaCorpo(); }, 150);
    }
    function valoreFiltro(f, c) {
      if (Z.SENZA_VALORE.includes(f.op)) return '';
      if (c.tipo === 'stato' || c.tipo === 'dropdown') return ((c.opzioni || []).find((o) => o.id === f.val) || {}).nome || '';
      if (c.tipo === 'persona') return f.val === 'io' ? 'me' : ctx.nome(f.val);
      if (c.tipo === 'data') return U.data(f.val);
      return f.val || '';
    }

    /* ---------- corpo ---------- */
    function disegna() { intestazione(); schede(); barra(); disegnaCorpo(); }
    function disegnaCorpo() {
      const sx = corpo.scrollLeft, sy = corpo.scrollTop;
      corpo.className = 'zcorpo v-' + V.tipo;
      if (V.tipo === 'kanban') corpo.innerHTML = kanban();
      else if (V.tipo === 'calendario') corpo.innerHTML = calendario();
      else if (V.tipo === 'timeline') corpo.innerHTML = timelineVista();
      else corpo.innerHTML = telefono() ? schedeTel() : tabella();
      corpo.scrollLeft = sx; corpo.scrollTop = sy;
      if (V.tipo === 'timeline' && scorriOggi) { scorriOggi = false; const o = U.$('.tloggi', corpo); if (o) corpo.scrollLeft = Math.max(0, parseFloat(o.style.left) - 420); }
      B.cambiate.clear(); massa();
      if (sel) Z.dettaglio.aggiorna();
    }
    const cellaHtml = (e, c) => {
      const t = T()[c.tipo], k = e.id + '|' + c.id, mod = ed && !t.calcolata;
      return '<td class="zc t-' + c.tipo + (B.cambiate.has(k) ? ' flash' : '') + (mod ? ' ed' : '') + '" data-el="' + e.id + '" data-col="' + c.id + '">' + t.mostra(B.valore(e.id, c), c, ctx, B.fatto(e.id)) + '</td>';
    };
    function riga(e, cols) {
      const f = B.figli(e.id), nc = ncomm(e), aperto = V.aperti[e.id], trasc = ed && !V.ordine;
      return '<tr data-el="' + e.id + '" class="' + (selez.has(e.id) ? 'scelta ' : '') + (sel === e.id ? 'sel' : '') + '"' + (trasc ? ' draggable="true"' : '') + '><td class="zsel"><input type="checkbox" data-sel="' + e.id + '"' + (selez.has(e.id) ? ' checked' : '') + ' aria-label="Seleziona"></td>' +
        '<td class="zn"><span class="maniglia">' + (trasc ? ico('drag') : '') + '</span><button class="esp' + (f.length ? ' ha' : '') + '" data-c="espandi" title="' + (f.length ? f.length + ' sotto-elementi' : 'Aggiungi sotto-elementi') + '">' + ico(aperto ? 'chevd' : 'chev') + '</button>' +
        '<span class="ntx' + (ed ? ' ed' : '') + '" data-c="nome">' + esc(e.nome || 'Senza nome') + '</span>' + (f.length ? '<button class="nsub" data-c="espandi" title="Sotto-elementi">' + f.length + '</button>' : '') +
        '<button class="apri" data-c="apri">Apri</button><button class="bolla' + (nc ? ' ha' : '') + '" data-c="commenti" title="Commenti">' + ico('chat') + (nc ? '<small>' + nc + '</small>' : '') + '</button></td>' +
        cols.map((c) => cellaHtml(e, c)).join('') + '<td></td></tr>' + (aperto ? sottoRighe(e, f, cols) : '');
    }
    function sottoRighe(e, f, cols) {
      return f.map((s) => { const nc = ncomm(s); return '<tr class="sub' + (selez.has(s.id) ? ' scelta' : '') + (sel === s.id ? ' sel' : '') + '" data-el="' + s.id + '"><td class="zsel"><input type="checkbox" data-sel="' + s.id + '"' + (selez.has(s.id) ? ' checked' : '') + ' aria-label="Seleziona"></td><td class="zn"><span class="ind"></span><span class="ntx' + (ed ? ' ed' : '') + '" data-c="nome">' + esc(s.nome || 'Senza nome') + '</span><button class="apri" data-c="apri">Apri</button><button class="bolla' + (nc ? ' ha' : '') + '" data-c="commenti" title="Commenti">' + ico('chat') + (nc ? '<small>' + nc + '</small>' : '') + '</button></td>' + cols.map((c) => cellaHtml(s, c)).join('') + '<td></td></tr>'; }).join('') +
        (ed ? '<tr class="subadd"><td></td><td colspan="' + (cols.length + 2) + '"><input data-addsub="' + e.id + '" placeholder="+ Aggiungi sotto-elemento"></td></tr>' : (f.length ? '' : '<tr class="subadd"><td></td><td colspan="' + (cols.length + 2) + '" class="muted small">Nessun sotto-elemento</td></tr>'));
    }
    function tabella() {
      const cols = colonne(), gr = B.gruppi();
      const largh = cols.map((c) => c.larghezza || LARG[c.tipo]);
      const tot = 36 + 340 + largh.reduce((a, b) => a + b, 0) + 44;
      if (!gr.length) return '<div class="vuoto">Nessun gruppo. ' + (ed ? '<button class="btn sm" data-c="addgruppo">' + ico('plus') + 'Aggiungi gruppo</button>' : '') + '</div>';
      return gr.map((g, gi) => {
        const els = visibili(g.id), chiusoG = V.chiusi[g.id], av = B.calc.gruppi[g.id] || { completati: 0, totali: 0, percentuale: 0 };
        const tuttiSel = els.length && els.every((e) => selez.has(e.id));
        return '<section class="zg" data-g="' + g.id + '" style="--gc:' + (g.colore || Z.COLORI[0]) + '"><div class="zgh"><button class="ib0 gchev" data-c="chiudi" aria-label="Apri o chiudi gruppo">' + ico(chiusoG ? 'chev' : 'chevd') + '</button><b class="gnome' + (ed ? ' ed' : '') + '" data-c="gnome">' + esc(g.nome) + '</b>' +
          '<span class="gmeta">' + els.length + (els.length === 1 ? ' elemento' : ' elementi') + '</span><span class="gav" title="Avanzamento del gruppo">' + Z.barra(av.percentuale) + '<small>' + av.completati + ' di ' + av.totali + ' completati</small></span>' + (gi === 0 ? I('gruppi') : '') + (ed ? '<button class="ib0" data-pop data-c="gmenu" aria-label="Azioni gruppo">' + ico('menu') + '</button>' : '') + '</div>' +
          (chiusoG ? '' : '<div class="ztw"><table class="zt" style="width:' + tot + 'px"><colgroup><col style="width:36px"><col style="width:340px">' + largh.map((w) => '<col style="width:' + w + 'px">').join('') + '<col style="width:44px"></colgroup>' +
          '<thead><tr><th class="zsel"><input type="checkbox" data-selg="' + g.id + '"' + (tuttiSel ? ' checked' : '') + ' aria-label="Seleziona tutto il gruppo"></th><th class="zhn">Elemento' + (gi === 0 ? I('colonne') : '') + '</th>' + cols.map((c) => '<th data-hcol="' + c.id + '" data-pop' + (c.descrizione ? ' title="' + esc(c.descrizione) + '"' : '') + '><span class="hico">' + ico(T()[c.tipo].ico) + '</span>' + esc(c.nome) + (c.descrizione ? ico('info', 'hinfo') : '') + (V.ordine && V.ordine.col === c.id ? ico(V.ordine.dir > 0 ? 'down' : 'up', 'ord') : '') + '</th>').join('') + '<th>' + (ed ? '<button class="ib0" data-pop data-c="addcol" aria-label="Aggiungi colonna">' + ico('plus') + '</button>' : '') + '</th></tr></thead><tbody>' +
          els.map((e) => riga(e, cols)).join('') +
          (ed ? '<tr class="zadd"><td></td><td colspan="' + (cols.length + 2) + '"><input data-addel="' + g.id + '" placeholder="+ Aggiungi elemento"></td></tr>' : '') +
          '</tbody>' + (els.length ? '<tfoot><tr class="zpiede"><td></td><td></td>' + cols.map((c) => '<td class="p-' + c.tipo + '">' + (T()[c.tipo].piede ? T()[c.tipo].piede(els.map((e) => B.valore(e.id, c)), c, ctx) : '') + '</td>').join('') + '<td></td></tr></tfoot>' : '') + '</table></div>') + '</section>';
      }).join('') + (ed ? '<button class="btn sm addg" data-c="addgruppo">' + ico('plus') + 'Aggiungi gruppo</button>' : '');
    }
    function schedeTel() {
      const cols = B.colonne(), st = statoCol(), pers = cols.find((c) => c.tipo === 'persona'), dt = cols.find((c) => c.tipo === 'timeline') || cols.find((c) => c.tipo === 'data');
      return B.gruppi().map((g) => { const els = visibili(g.id), av = B.calc.gruppi[g.id] || {}; return '<section class="zg" data-g="' + g.id + '" style="--gc:' + (g.colore || Z.COLORI[0]) + '"><div class="zgh"><button class="ib0 gchev" data-c="chiudi">' + ico(V.chiusi[g.id] ? 'chev' : 'chevd') + '</button><b class="gnome">' + esc(g.nome) + '</b><span class="gav">' + Z.barra(av.percentuale) + '</span></div>' +
        (V.chiusi[g.id] ? '' : '<div class="zschede">' + els.map((e) => { const f = B.figli(e.id); return '<button class="zscheda" data-el="' + e.id + '" data-c="apri" style="--sc:' + coloreStato(e) + '"><b>' + esc(e.nome || 'Senza nome') + '</b><span class="zsm">' + (st ? T().stato.mostra(B.cella(e.id, st.id), st) : '') + (dt ? T()[dt.tipo].mostra(B.cella(e.id, dt.id), dt, ctx, B.fatto(e.id)) : '') + (pers ? T().persona.mostra(B.cella(e.id, pers.id), pers, ctx) : '') + '</span>' + (f.length ? '<span class="zsm">' + Z.barra(B.calc.elementi[e.id]) + '<small class="muted">' + f.length + ' sotto-elementi</small></span>' : '') + '</button>'; }).join('') +
          (ed ? '<input class="zaddm" data-addel="' + g.id + '" placeholder="+ Aggiungi elemento">' : '') + '</div>') + '</section>'; }).join('');
    }
    function kanban() {
      const st = statoCol();
      if (!st) return '<div class="vuoto">Il Kanban usa una colonna di tipo Stato. ' + (ed ? '<button class="btn sm" data-c="addstato">Aggiungi colonna Stato</button>' : '') + '</div>';
      const cols = B.colonne().filter((c) => c.id !== st.id && ['persona', 'timeline', 'data', 'valutazione', 'numero'].includes(c.tipo)).slice(0, 3);
      const tutti = visibili(null);
      const corsie = (st.opzioni || []).map((o) => ({ id: o.id, nome: o.nome, colore: o.colore })).concat([{ id: '', nome: 'Senza stato', colore: 'var(--line)' }]);
      return '<div class="kb">' + corsie.map((c) => { const els = tutti.filter((e) => (B.cella(e.id, st.id) || '') === c.id); if (!c.id && !els.length) return ''; return '<div class="kcol" data-corsia="' + c.id + '"><div class="kh" style="--kc:' + c.colore + '"><b>' + esc(c.nome) + '</b><span class="cnt">' + els.length + '</span></div><div class="klist">' +
        els.map((e) => { const f = B.figli(e.id); return '<div class="kcard' + (sel === e.id ? ' sel' : '') + '" data-el="' + e.id + '" data-c="apri" style="--sc:' + c.colore + ';--gc:' + ((B.dati.gruppi[e.gruppo] || {}).colore || Z.COLORI[2]) + '"' + (ed ? ' draggable="true"' : '') + '><b>' + esc(e.nome || 'Senza nome') + '</b><small class="muted">' + esc((B.dati.gruppi[e.gruppo] || {}).nome || '') + '</small><div class="kmeta">' + cols.map((cc) => T()[cc.tipo].mostra(B.valore(e.id, cc), cc, Object.assign({}, ctx, { puoModificare: false }), B.fatto(e.id))).join('') + (ncomm(e) ? '<span class="chip">' + ico('chat') + ncomm(e) + '</span>' : '') + '</div>' + (f.length ? '<div class="kprog">' + Z.barra(B.calc.elementi[e.id]) + '<small class="muted">' + f.filter((x) => B.fatto(x.id)).length + '/' + f.length + '</small></div>' : '') + '</div>'; }).join('') +
        (ed && c.id ? '<button class="kadd" data-c="kadd" data-corsia="' + c.id + '">' + ico('plus') + 'Aggiungi</button>' : '') + '</div></div>'; }).join('') + '</div>';
    }
    /* calendario (punto 190): elementi sulla data o sul periodo scelto */
    function calendario() {
      const dc = calCol();
      if (!dc) return '<div class="vuoto">Il Calendario usa una colonna Data o Periodo. ' + (ed ? '<button class="btn sm" data-c="adddata">Aggiungi colonna Data</button>' : '') + '</div>';
      const m = V.mese || U.oggi().slice(0, 7), y = +m.slice(0, 4), mm = +m.slice(5, 7);
      const off = (new Date(y, mm - 1, 1).getDay() + 6) % 7, n = new Date(y, mm, 0).getDate();
      const iso = (d) => m + '-' + String(d).padStart(2, '0'), primo = iso(1), ultimo = iso(n), oggi = U.oggi();
      const per = {};
      const metti = (g, e) => { (per[g] = per[g] || []).push(e); };
      visibili(null).forEach((e) => {
        const v = B.cella(e.id, dc.id); if (!v) return;
        if (dc.tipo === 'data') { if (v >= primo && v <= ultimo) metti(v, e); return; }
        if (!v.da) return; let g = v.da < primo ? primo : v.da; const fine = (v.a || v.da) > ultimo ? ultimo : (v.a || v.da);
        while (g <= fine) { metti(g, e); g = U.piuGiorni(g, 1); }
      });
      const celle = []; for (let i = 0; i < off; i++) celle.push(null); for (let d = 1; d <= n; d++) celle.push(iso(d)); while (celle.length % 7) celle.push(null);
      return '<div class="cal"><div class="calh"><button class="ib0" data-c="meseprec" aria-label="Mese precedente">' + ico('back') + '</button><b>' + Z.MESI_LUNGHI[mm - 1] + ' ' + y + '</b><button class="ib0" data-c="mesesucc" aria-label="Mese successivo">' + ico('chev') + '</button><button class="btn sm" data-c="meseoggi">Oggi</button><span class="sp"></span><small class="muted">' + (ed ? 'Doppio clic su un giorno per aggiungere un elemento' : '') + '</small></div>' +
        '<div class="calg">' + GIORNI.map((d) => '<span class="cald">' + d + '</span>').join('') + celle.map((g) => { if (!g) return '<div class="calc fuori"></div>'; const l = per[g] || []; return '<div class="calc' + (g === oggi ? ' oggi' : '') + '" data-giorno="' + g + '"><span class="caln">' + (+g.slice(8)) + '</span>' + l.slice(0, 3).map((e) => '<button class="calchip" data-c="apri" data-el="' + e.id + '" style="--cc:' + coloreStato(e) + '" title="' + esc(e.nome) + '">' + esc(e.nome || 'Senza nome') + '</button>').join('') + (l.length > 3 ? '<small class="calpiu">+' + (l.length - 3) + ' altri</small>' : '') + '</div>'; }).join('') + '</div></div>';
    }

    /* timeline (punto 463): barre sul Periodo, per gruppo; la pianificazione vera resta a Meridian */
    function timelineVista() {
      const tc = tlCol();
      if (!tc) return '<div class="vuoto">La Timeline usa una colonna Periodo o Data. ' + (ed ? '<button class="btn sm" data-c="addperiodo">Aggiungi colonna Periodo</button>' : '') + '</div>';
      const px = V.tlScala === 'mesi' ? 9 : 30, oggi = U.oggi();
      const rng = (e) => { const v = B.cella(e.id, tc.id); if (!v) return null; if (tc.tipo === 'timeline') return v.da ? { da: v.da, a: v.a || v.da } : null; return { da: v, a: v }; };
      const gr = B.gruppi().map((g) => ({ g, els: visibili(g.id).map((e) => ({ e, r: rng(e) })) }));
      const tutte = [].concat.apply([], gr.map((x) => x.els.filter((y) => y.r).map((y) => y.r)));
      let ini = tutte.length ? tutte.map((r) => r.da).sort()[0] : U.piuGiorni(oggi, -7), fin = tutte.length ? tutte.map((r) => r.a).sort().pop() : U.piuGiorni(oggi, 30);
      if (oggi < ini) ini = oggi; if (oggi > fin) fin = oggi;
      ini = U.piuGiorni(ini, -3); fin = U.piuGiorni(fin, V.tlScala === 'mesi' ? 20 : 7);
      const n = giorni(ini, fin) + 1, W = n * px, x = (d) => giorni(ini, d) * px;
      const gg = []; for (let i = 0; i < n; i++) gg.push(U.piuGiorni(ini, i));
      const mesi = []; gg.forEach((d) => { const k = d.slice(0, 7); if (!mesi.length || mesi[mesi.length - 1].k !== k) mesi.push({ k, n: 0 }); mesi[mesi.length - 1].n++; });
      const dow = (d) => (new Date(d + 'T12:00:00').getDay() + 6) % 7;
      const testa = '<div class="tlmesi">' + mesi.map((m) => '<span style="width:' + (m.n * px) + 'px">' + (m.n * px > 70 ? '<i>' + Z.MESI_LUNGHI[+m.k.slice(5) - 1] + ' ' + m.k.slice(0, 4) + '</i>' : '') + '</span>').join('') + '</div><div class="tlgg">' +
        gg.map((d) => '<span class="' + (dow(d) > 4 ? 'fe' : '') + (d === oggi ? ' og' : '') + '" style="width:' + px + 'px">' + (px >= 30 || dow(d) === 0 ? +d.slice(8) : '') + '</span>').join('') + '</div>';
      const barra = (e, r, g) => { const f = B.fatto(e.id), w = Math.max(px, (giorni(r.da, r.a) + 1) * px); return '<button class="tlb' + (f ? ' fatta' : '') + '" data-c="apri" data-el="' + e.id + '" style="left:' + x(r.da) + 'px;width:' + w + 'px;--gc:' + (g.colore || Z.COLORI[2]) + '" title="' + esc(e.nome + ': ' + Z.intervallo(r.da, r.a)) + '"><span>' + esc(w > 90 ? e.nome : '') + '</span></button>' + (w <= 90 ? '<span class="tlfuori" style="left:' + (x(r.da) + w + 6) + 'px">' + esc(e.nome) + '</span>' : ''); };
      return '<div class="tlv" style="width:' + (280 + W) + 'px;--px:' + px + 'px"><span class="tloggi" style="left:' + (280 + x(oggi) + px / 2) + 'px" title="Oggi"></span>' +
        '<div class="tlr tlh"><div class="tll"></div><div class="tlt" style="width:' + W + 'px">' + testa + '</div></div>' +
        gr.map(({ g, els }) => '<div class="tlr tlg" style="--gc:' + (g.colore || Z.COLORI[0]) + '"><div class="tll"><b>' + esc(g.nome) + '</b><small>' + Z.barra((B.calc.gruppi[g.id] || {}).percentuale || 0) + '</small></div><div class="tlt" style="width:' + W + 'px"></div></div>' +
          els.map(({ e, r }) => '<div class="tlr"><div class="tll"><button class="tln" data-c="apri" data-el="' + e.id + '">' + esc(e.nome || 'Senza nome') + '</button>' + (r ? '' : '<small class="muted">senza ' + esc(tc.nome.toLowerCase()) + '</small>') + '</div><div class="tlt" style="width:' + W + 'px">' + (r ? barra(e, r, g) : '') + '</div></div>').join('')).join('') + '</div>';
    }

    /* ---------- selezione multipla e azioni di massa ---------- */
    function massa() {
      const el = U.$('#zmassa', root);
      for (const id of Array.from(selez)) { const e = B.dati.elementi[id]; if (!e || e.eliminato) selez.delete(id); }
      if (!selez.size) { el.classList.remove('on'); el.innerHTML = ''; return; }
      el.classList.add('on');
      el.innerHTML = '<span class="mn"><b>' + selez.size + '</b> ' + (selez.size === 1 ? 'selezionato' : 'selezionati') + '</span>' +
        (ed ? '<button class="mb" data-pop data-m="stato">' + ico('check') + 'Stato</button><button class="mb" data-pop data-m="persona">' + ico('user') + 'Owner</button><button class="mb" data-pop data-m="sposta">' + ico('chev') + 'Sposta</button><button class="mb" data-m="duplica">' + ico('copy') + 'Duplica</button><button class="mb rosso" data-m="elimina">' + ico('trash') + 'Elimina</button>' : '') +
        '<button class="mb" data-m="csv">' + ico('down') + 'CSV</button>' + I('selezione') + '<button class="ib0" data-m="via" aria-label="Annulla la selezione">' + ico('x') + '</button>';
    }
    function azioneMassa(b) {
      const ids = Array.from(selez), k = b.dataset.m;
      if (k === 'via') { selez.clear(); return disegnaCorpo(); }
      if (k === 'stato') { const st = statoCol(); if (!st) return UI.toast('Nessuna colonna Stato'); return UI.menu(b, (st.opzioni || []).map((o) => ({ testo: o.nome, fai: () => { B.invia(ids.map((id) => ({ t: 'cella', el: id, col: st.id, v: o.id }))); } })).concat(['-', { testo: 'Nessuno', fai: () => B.invia(ids.map((id) => ({ t: 'cella', el: id, col: st.id, v: null }))) }]), { destra: false }); }
      if (k === 'persona') {
        const pc = B.colonne().find((c) => c.tipo === 'persona'); if (!pc) return UI.toast('Nessuna colonna Owner');
        return UI.menu(b, ctx.membri().map((m) => ({ testo: m.nome, fai: () => { const tutti = ids.every((id) => (B.cella(id, pc.id) || []).includes(m.utente)); B.invia(ids.map((id) => { const s = new Set(B.cella(id, pc.id) || []); if (tutti) s.delete(m.utente); else s.add(m.utente); return { t: 'cella', el: id, col: pc.id, v: s.size ? Array.from(s) : null }; })); UI.toast(tutti ? m.nome + ' tolto' : m.nome + ' assegnato'); } })), { destra: false });
      }
      if (k === 'sposta') return UI.menu(b, B.gruppi().map((g) => ({ testo: g.nome, fai: () => { const ops = []; ids.map((id) => B.dati.elementi[id]).filter((e) => !e.padre).forEach((e) => { ops.push({ t: 'agg', tab: 'elementi', id: e.id, dati: { gruppo: g.id, ordine: B.prossimoOrdine('elementi', (x) => x.gruppo === g.id) + ops.length } }); B.figli(e.id).forEach((f) => ops.push({ t: 'agg', tab: 'elementi', id: f.id, dati: { gruppo: g.id } })); }); B.invia(ops); selez.clear(); UI.toast('Spostati in ' + g.nome); } })), { destra: false });
      if (k === 'duplica') { ids.filter((id) => !B.dati.elementi[id].padre).forEach(duplica); selez.clear(); return UI.toast('Elementi duplicati'); }
      if (k === 'elimina') { const tutti = new Set(ids); ids.forEach((id) => B.figli(id).forEach((f) => tutti.add(f.id))); selez.clear(); return elimina('elementi', Array.from(tutti), tutti.size + ' eliminati'); }
      if (k === 'csv') return Z.csv.esporta(B, ctx, doc, null, new Set(ids));
    }

    /* ---------- editor delle celle (anche dal pannello di dettaglio) ---------- */
    function salvaCella(el, col, v) { B.invia({ t: 'cella', el, col, v }); }
    function modifica(td, bersaglio) {
      const el = td.dataset.el, c = colPer(td.dataset.col); if (!c || !ed) return;
      const v = B.cella(el, c.id), tipo = T()[c.tipo].editor;
      if (!tipo) return UI.toast('Calcolato dallo stato dei sotto-elementi');
      if (tipo === 'toggle') return salvaCella(el, c.id, !v);
      if (tipo === 'stelle') { const s = bersaglio && bersaglio.closest('[data-stella]'); if (!s) return; const n = +s.dataset.stella; return salvaCella(el, c.id, n === v ? null : n); }
      if (tipo === 'input') {
        const val = c.tipo === 'numero' ? (v == null ? '' : String(v).replace('.', ',')) : (v || '');
        td.innerHTML = '<input class="cin' + (c.tipo === 'numero' ? ' mono' : '') + '"' + (c.tipo === 'numero' ? ' inputmode="decimal"' : '') + ' value="' + esc(val) + '">';
        const i = td.querySelector('input'); i.focus(); i.select();
        let fatto = false;
        const fine = (salva) => { if (fatto) return; fatto = true; if (salva) { let nv = c.tipo === 'numero' ? U.leggiNum(i.value) : i.value.trim() || null; if (c.tipo === 'numero' && i.value.trim() && nv === null) { UI.toast('Numero non valido'); nv = v; } if (JSON.stringify(nv) !== JSON.stringify(v == null ? null : v)) return salvaCella(el, c.id, nv); } disegnaCorpo(); };
        i.onkeydown = (e) => { if (e.key === 'Enter') fine(true); if (e.key === 'Escape') fine(false); };
        i.onblur = () => fine(true); return;
      }
      if (tipo === 'etichetta') {
        const p = UI.pop(td, '<div class="menu opz">' + (c.opzioni || []).map((o) => '<button data-o="' + o.id + '"' + (o.id === v ? ' class="on"' : '') + '><span class="et" style="background:' + o.colore + '">' + esc(o.nome) + '</span></button>').join('') + '<button data-o="">Nessuno</button><hr><button data-etichette>' + ico('edit') + 'Modifica etichette</button></div>');
        p.onclick = (e) => { const b = e.target.closest('[data-o]'); if (b) { UI.chiudiPop(); salvaCella(el, c.id, b.dataset.o || null); } if (e.target.closest('[data-etichette]')) { UI.chiudiPop(); etichette(c); } };
        return;
      }
      if (tipo === 'multi' || tipo === 'persone') {
        const lista = tipo === 'multi' ? (c.opzioni || []).map((o) => [o.id, '<span class="tag" style="border-color:' + o.colore + ';background:' + o.colore + '66">' + esc(o.nome) + '</span>']) : ctx.membri().map((m) => [m.utente, UI.avatar(ctx.profilo(m.utente), 24) + '<span>' + esc(m.nome) + '</span>']);
        const cur = new Set(v || []);
        const p = UI.pop(td, '<div class="menu chk">' + lista.map(([id, h]) => '<label><input type="checkbox" value="' + id + '"' + (cur.has(id) ? ' checked' : '') + '>' + h + '</label>').join('') + (tipo === 'multi' ? '<hr><button data-etichette>' + ico('edit') + 'Modifica etichette</button>' : '') + '</div>', { noFocus: true });
        p.onchange = () => { const nv = U.$$('input:checked', p).map((x) => x.value); salvaCella(el, c.id, nv.length ? nv : null); };
        p.onclick = (e) => { if (e.target.closest('[data-etichette]')) { UI.chiudiPop(); etichette(c); } };
        return;
      }
      if (tipo === 'data') {
        const p = UI.pop(td, '<div class="pdata"><input type="date" value="' + esc(v || '') + '"><div class="riga"><button class="btn sm" data-oggi>Oggi</button><button class="btn sm link" data-no>Rimuovi</button></div></div>');
        const i = p.querySelector('input');
        i.onchange = () => { if (i.value) { UI.chiudiPop(); salvaCella(el, c.id, i.value); } };
        p.querySelector('[data-oggi]').onclick = () => { UI.chiudiPop(); salvaCella(el, c.id, U.oggi()); };
        p.querySelector('[data-no]').onclick = () => { UI.chiudiPop(); salvaCella(el, c.id, null); };
        return;
      }
      if (tipo === 'periodo') {
        const p = UI.pop(td, '<form class="pdata"><label class="campo"><span>Inizio</span><input type="date" name="da" value="' + esc((v || {}).da || '') + '" required></label><label class="campo"><span>Fine</span><input type="date" name="a" value="' + esc((v || {}).a || '') + '"></label><div class="riga"><button class="btn sm pri">Salva</button><button type="button" class="btn sm link" data-no>Rimuovi</button></div></form>');
        const f = p.querySelector('form');
        f.onsubmit = (e) => { e.preventDefault(); const da = f.da.value, a = f.a.value || da; UI.chiudiPop(); salvaCella(el, c.id, da <= a ? { da, a } : { da: a, a: da }); };
        p.querySelector('[data-no]').onclick = () => { UI.chiudiPop(); salvaCella(el, c.id, null); };
        return;
      }
      if (tipo === 'link') {
        const p = UI.pop(td, '<form class="plink"><label class="campo"><span>Indirizzo</span><input name="url" value="' + esc((v || {}).url || '') + '" placeholder="https://"></label><label class="campo"><span>Testo da mostrare</span><input name="testo" value="' + esc((v || {}).testo || '') + '"></label><div class="riga"><button class="btn sm pri">Salva</button><button type="button" class="btn sm link" data-no>Rimuovi</button></div></form>');
        const f = p.querySelector('form');
        f.onsubmit = (e) => { e.preventDefault(); UI.chiudiPop(); salvaCella(el, c.id, f.url.value.trim() ? { url: f.url.value.trim(), testo: f.testo.value.trim() } : null); };
        p.querySelector('[data-no]').onclick = () => { UI.chiudiPop(); salvaCella(el, c.id, null); };
      }
    }
    function modificaNome(span) {
      const tr = span.closest('[data-el]'), e = B.dati.elementi[tr.dataset.el];
      if (!ed) return apri(e.id);
      span.outerHTML = '<input class="cin nin" value="' + esc(e.nome || '') + '">';
      const i = U.$('.nin', tr); i.focus(); i.select(); let f = false;
      const fine = (s) => { if (f) return; f = true; if (s && i.value.trim() && i.value.trim() !== e.nome) return B.invia({ t: 'agg', tab: 'elementi', id: e.id, dati: { nome: i.value.trim() } }); disegnaCorpo(); };
      i.onkeydown = (ev) => { if (ev.key === 'Enter') fine(true); if (ev.key === 'Escape') fine(false); }; i.onblur = () => fine(true);
    }
    /* etichette di Stato ed Etichette: nome, colore, "conta come completato" (solo Stato) */
    function etichette(c) {
      let o = U.clone(c.opzioni || []); const st = c.tipo === 'stato';
      const w = UI.modale('<h2>Etichette di "' + esc(c.nome) + '" ' + (st ? I('avanzamento') : '') + '</h2>' + (st ? '<p class="muted small">Spunta le etichette che contano come completato: servono all\'avanzamento e a Meridian.</p>' : '') + '<div id="elist"></div><button class="btn sm" data-add>' + ico('plus') + 'Aggiungi etichetta</button><div class="azioni"><button class="btn" data-x>Annulla</button><button class="btn pri" data-salva>Salva</button></div>', { classe: 'stretta' });
      const lista = () => { U.$('#elist', w.el).innerHTML = o.map((x, i) => '<div class="erow"><button class="sw0" data-col="' + i + '" style="background:' + x.colore + '" title="Cambia colore"></button><input data-n="' + i + '" value="' + esc(x.nome) + '">' + (st ? '<label class="efatto" title="Conta come completato"><input type="checkbox" data-f="' + i + '"' + (x.fatto ? ' checked' : '') + '>' + ico('check') + '</label>' : '') + '<button class="ib0" data-del="' + i + '">' + ico('trash') + '</button></div>').join(''); };
      lista();
      w.el.addEventListener('input', (e) => { const i = e.target.dataset.n; if (i !== undefined) o[+i].nome = e.target.value; });
      w.el.addEventListener('change', (e) => { const i = e.target.dataset.f; if (i !== undefined) o[+i].fatto = e.target.checked; });
      w.el.addEventListener('click', (e) => {
        const cb = e.target.closest('[data-col]'), d = e.target.closest('[data-del]');
        if (cb) { const x = o[+cb.dataset.col]; x.colore = Z.COLORI[(Z.COLORI.indexOf(x.colore) + 1) % Z.COLORI.length]; lista(); }
        if (d) { o.splice(+d.dataset.del, 1); lista(); }
        if (e.target.closest('[data-add]')) { o.push({ id: U.uid(), nome: 'Nuova', colore: Z.COLORI[o.length % Z.COLORI.length] }); lista(); }
        if (e.target.closest('[data-salva]')) { o = o.filter((x) => x.nome.trim()); B.invia({ t: 'agg', tab: 'colonne', id: c.id, dati: { opzioni: o } }); w.chiudi(); }
      });
    }

    /* ---------- azioni ---------- */
    function nuovoElemento(gruppo, nome, extra, padre) {
      const g = padre ? B.dati.elementi[padre].gruppo : gruppo || (B.gruppi()[0] || {}).id;
      if (!g) { UI.toast('Crea prima un gruppo'); return null; }
      const id = U.uid(), dati = { id, gruppo: g, nome: nome || (padre ? 'Nuovo sotto-elemento' : 'Nuovo elemento'), descrizione: '', ordine: padre ? B.prossimoOrdine('elementi', (e) => e.padre === padre) : B.prossimoOrdine('elementi', (e) => e.gruppo === g && !e.padre) };
      if (padre) dati.padre = padre;
      B.invia([{ t: 'crea', tab: 'elementi', dati }].concat(extra ? extra(id) : []));
      return id;
    }
    function duplica(id) {
      const e0 = B.dati.elementi[id]; if (!e0) return null;
      const copia = (x, nid, padre) => [{ t: 'crea', tab: 'elementi', dati: Object.assign({ id: nid, gruppo: x.gruppo, nome: x.nome + (padre ? '' : ' (copia)'), descrizione: x.descrizione || '', ordine: x.ordine + 0.01 }, padre ? { padre } : (x.padre ? { padre: x.padre } : {})) }]
        .concat(B.colonne().filter((c) => B.cella(x.id, c.id) != null).map((c) => ({ t: 'cella', el: nid, col: c.id, v: B.cella(x.id, c.id), base: 0 })));
      const nid = U.uid(); let ops = copia(e0, nid);
      if (!e0.padre) B.figli(id).forEach((f) => { ops = ops.concat(copia(f, U.uid(), nid)); });
      B.invia(ops); return nid;
    }
    function nuovaColonna(tipo) {
      const id = U.uid(), dati = { id, nome: T()[tipo].nome, tipo, ordine: B.prossimoOrdine('colonne') };
      if (tipo === 'stato') dati.opzioni = Z.statoPredefinito().map((o) => Object.assign({}, o, { id: U.uid() }));
      if (tipo === 'dropdown') dati.opzioni = [{ id: U.uid(), nome: 'Opzione 1', colore: Z.COLORI[4] }, { id: U.uid(), nome: 'Opzione 2', colore: Z.COLORI[5] }];
      B.invia({ t: 'crea', tab: 'colonne', dati }); return id;
    }
    function elimina(tab, ids, testo) {
      const ora = U.ora();
      B.invia(ids.map((id) => ({ t: 'agg', tab, id, dati: { eliminato: ora } })));
      UI.toast(testo, '', { testo: 'Annulla', fai: () => B.invia(ids.map((id) => ({ t: 'agg', tab, id, dati: { eliminato: null } }))) });
    }
    function menuColonna(th) {
      const c = colPer(th.dataset.hcol), cols = B.colonne(), i = cols.indexOf(c);
      const ord = (dir) => { V.ordine = { col: c.id, dir }; V.vistaId = null; salvaV(); disegna(); };
      const voci = [{ testo: 'Ordina crescente', ico: 'down', fai: () => ord(1) }, { testo: 'Ordina decrescente', ico: 'up', fai: () => ord(-1) }, { testo: 'Filtra per questa colonna', ico: 'filter', fai: () => aggiungiFiltro(c) }, { testo: 'Nascondi in questa vista', ico: 'grid', fai: () => { V.nascoste.push(c.id); V.vistaId = null; salvaV(); disegna(); } }];
      if (ed) {
        voci.push('-', { testo: 'Rinomina', ico: 'edit', fai: async () => { const n = await UI.chiedi('Rinomina colonna', c.nome); if (n && n.trim()) B.invia({ t: 'agg', tab: 'colonne', id: c.id, dati: { nome: n.trim() } }); } });
        voci.push({ testo: 'Descrizione', ico: 'info', fai: async () => { const n = await UI.chiedi('Descrizione della colonna', c.descrizione || '', 'Compare passando sul titolo'); if (n !== null) B.invia({ t: 'agg', tab: 'colonne', id: c.id, dati: { descrizione: n.trim() } }); } });
        if (c.tipo === 'stato' || c.tipo === 'dropdown') voci.push({ testo: 'Modifica etichette', ico: 'edit', fai: () => etichette(c) });
        if (c.tipo === 'numero') voci.push({ testo: 'Unità di misura' + (c.unita ? ' (' + c.unita + ')' : ''), ico: 'edit', fai: async () => { const n = await UI.chiedi('Unità di misura', c.unita || '', 'Es. €, h, kg'); if (n !== null) B.invia({ t: 'agg', tab: 'colonne', id: c.id, dati: { unita: n.trim() } }); } });
        const scambia = (j) => { const a = cols[i], b = cols[j]; B.invia([{ t: 'agg', tab: 'colonne', id: a.id, dati: { ordine: b.ordine } }, { t: 'agg', tab: 'colonne', id: b.id, dati: { ordine: a.ordine } }]); };
        if (i > 0) voci.push({ testo: 'Sposta a sinistra', ico: 'back', fai: () => scambia(i - 1) });
        if (i < cols.length - 1) voci.push({ testo: 'Sposta a destra', ico: 'chev', fai: () => scambia(i + 1) });
        voci.push('-', { testo: 'Elimina colonna', ico: 'trash', pericolo: true, fai: () => elimina('colonne', [c.id], 'Colonna eliminata') });
      }
      UI.menu(th, voci, { destra: false });
    }
    function menuGruppo(b) {
      const g = B.dati.gruppi[b.closest('[data-g]').dataset.g];
      UI.menu(b, [
        { testo: 'Rinomina', ico: 'edit', fai: async () => { const n = await UI.chiedi('Rinomina gruppo', g.nome); if (n && n.trim()) B.invia({ t: 'agg', tab: 'gruppi', id: g.id, dati: { nome: n.trim() } }); } },
        { testo: 'Cambia colore', ico: 'star', fai: () => B.invia({ t: 'agg', tab: 'gruppi', id: g.id, dati: { colore: Z.COLORI[(Z.COLORI.indexOf(g.colore) + 1) % Z.COLORI.length] } }) },
        { testo: 'Seleziona tutti gli elementi', ico: 'check', fai: () => { visibili(g.id).forEach((e) => selez.add(e.id)); disegnaCorpo(); } },
        '-', { testo: 'Elimina gruppo', ico: 'trash', pericolo: true, fai: () => elimina('gruppi', [g.id], 'Gruppo eliminato') }
      ]);
    }
    function aggiungiGruppo() { const id = U.uid(); B.invia({ t: 'crea', tab: 'gruppi', dati: { id, nome: 'Nuovo gruppo', colore: Z.COLORI[(B.gruppi().length + 4) % Z.COLORI.length], ordine: B.prossimoOrdine('gruppi') } }); return id; }
    function menuAddCol(b) { UI.menu(b, Z.TIPI.map((t) => ({ testo: T()[t].nome, ico: T()[t].ico, fai: () => nuovaColonna(t) }))); }

    /* filtri, persone, colonne nascoste, ordinamenti */
    function aggiungiFiltro(c) { const op = Z.OPERATORI[c.tipo][0][0]; V.filtri.push({ col: c.id, op, val: c.tipo === 'stato' || c.tipo === 'dropdown' ? ((c.opzioni || [])[0] || {}).id : c.tipo === 'persona' ? 'io' : c.tipo === 'data' ? U.oggi() : '' }); V.vistaId = null; salvaV(); disegna(); }
    function popFiltri(b) {
      const cols = B.colonne();
      const valIn = (f, c, i) => {
        if (Z.SENZA_VALORE.includes(f.op)) return '';
        if (c.tipo === 'stato' || c.tipo === 'dropdown') return '<select data-fv="' + i + '">' + (c.opzioni || []).map((o) => '<option value="' + o.id + '"' + (o.id === f.val ? ' selected' : '') + '>' + esc(o.nome) + '</option>').join('') + '</select>';
        if (c.tipo === 'persona') return '<select data-fv="' + i + '"><option value="io">Me</option>' + ctx.membri().map((m) => '<option value="' + m.utente + '"' + (m.utente === f.val ? ' selected' : '') + '>' + esc(m.nome) + '</option>').join('') + '</select>';
        if (c.tipo === 'data') return '<input type="date" data-fv="' + i + '" value="' + esc(f.val || '') + '">';
        return '<input data-fv="' + i + '" value="' + esc(f.val || '') + '" placeholder="valore">';
      };
      const html = () => '<div class="pfiltri"><p class="ey">Filtri</p>' + (V.filtri.length ? '' : '<p class="muted small">Nessun filtro attivo.</p>') + V.filtri.map((f, i) => { const c = colPer(f.col); return '<div class="frow"><select data-fc="' + i + '">' + cols.map((x) => '<option value="' + x.id + '"' + (x.id === f.col ? ' selected' : '') + '>' + esc(x.nome) + '</option>').join('') + '</select><select data-fo="' + i + '">' + Z.OPERATORI[c.tipo].map((o) => '<option value="' + o[0] + '"' + (o[0] === f.op ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>' + valIn(f, c, i) + '<button class="ib0" data-fx="' + i + '">' + ico('x') + '</button></div>'; }).join('') +
        '<div class="riga"><button class="btn sm" data-fadd>' + ico('plus') + 'Aggiungi filtro</button></div></div>';
      const p = UI.pop(b, html(), { noFocus: true });
      const rifai = () => { p.innerHTML = html(); salvaV(); barra(); disegnaCorpo(); };
      p.addEventListener('change', (e) => {
        const t = e.target, d = t.dataset;
        if (d.fc !== undefined) { const c = colPer(t.value); V.filtri[+d.fc] = { col: c.id, op: Z.OPERATORI[c.tipo][0][0], val: c.tipo === 'stato' || c.tipo === 'dropdown' ? ((c.opzioni || [])[0] || {}).id : c.tipo === 'persona' ? 'io' : '' }; }
        if (d.fo !== undefined) V.filtri[+d.fo].op = t.value;
        if (d.fv !== undefined) V.filtri[+d.fv].val = t.value;
        V.vistaId = null; rifai();
      });
      p.addEventListener('click', (e) => {
        if (e.target.closest('[data-fadd]')) { V.filtri.push({ col: cols[0].id, op: Z.OPERATORI[cols[0].tipo][0][0], val: '' }); rifai(); }
        const x = e.target.closest('[data-fx]'); if (x) { V.filtri.splice(+x.dataset.fx, 1); rifai(); }
      });
    }
    function popPersone(b) {
      const html = () => '<div class="ppers"><p class="ey">Mostra gli elementi di</p><div class="pavs">' + ctx.membri().map((m) => '<button class="pavb' + (V.persone.includes(m.utente) ? ' on' : '') + '" data-p="' + m.utente + '" title="' + esc(m.nome) + '">' + UI.avatar(ctx.profilo(m.utente), 34) + '<small>' + esc(m.nome.split(' ')[0]) + '</small></button>').join('') + '</div>' + (V.persone.length ? '<button class="btn sm link" data-pno>Tutti</button>' : '') + '</div>';
      const p = UI.pop(b, html(), { noFocus: true, destra: false });
      p.addEventListener('click', (e) => {
        const x = e.target.closest('[data-p]'); if (x) { const id = x.dataset.p; V.persone = V.persone.includes(id) ? V.persone.filter((y) => y !== id) : V.persone.concat(id); }
        if (e.target.closest('[data-pno]')) V.persone = [];
        if (x || e.target.closest('[data-pno]')) { V.vistaId = null; salvaV(); p.innerHTML = html(); barra(); disegnaCorpo(); }
      });
    }
    function popNascondi(b) {
      const html = () => '<div class="menu chk"><p class="ey">Colonne visibili</p>' + B.colonne().map((c) => '<label><input type="checkbox" value="' + c.id + '"' + (V.nascoste.includes(c.id) ? '' : ' checked') + '>' + ico(T()[c.tipo].ico) + '<span>' + esc(c.nome) + '</span></label>').join('') + (V.nascoste.length ? '<hr><button data-tutte>Mostra tutte</button>' : '') + '</div>';
      const p = UI.pop(b, html(), { noFocus: true, destra: false });
      p.addEventListener('change', () => { V.nascoste = U.$$('input:not(:checked)', p).map((x) => x.value); V.vistaId = null; salvaV(); barra(); disegnaCorpo(); });
      p.addEventListener('click', (e) => { if (e.target.closest('[data-tutte]')) { V.nascoste = []; salvaV(); p.innerHTML = html(); barra(); disegnaCorpo(); } });
    }
    function popOrdina(b) {
      const o = V.ordine || {};
      UI.menu(b, [{ testo: 'Ordine manuale', attiva: !V.ordine, fai: () => { V.ordine = null; salvaV(); disegna(); } }, '-', { testo: 'Nome', attiva: o.col === 'nome', fai: () => { V.ordine = { col: 'nome', dir: o.col === 'nome' ? -o.dir : 1 }; salvaV(); disegna(); } }]
        .concat(B.colonne().map((c) => ({ testo: c.nome + (o.col === c.id ? (o.dir > 0 ? ' (crescente)' : ' (decrescente)') : ''), attiva: o.col === c.id, fai: () => { V.ordine = { col: c.id, dir: o.col === c.id ? -o.dir : 1 }; V.vistaId = null; salvaV(); disegna(); } }))));
    }
    async function salvaVista() {
      const n = await UI.chiedi('Salva vista', '', 'Nome della vista (filtri, ordine e colonne attuali)'); if (!n || !n.trim()) return;
      const v = { id: U.uid(), board: doc.id, nome: n.trim(), tipo: V.tipo, filtri: U.clone(V.filtri), ordine: V.ordine, kanbanCol: V.kanbanCol, calCol: V.calCol, tlCol: V.tlCol, tlScala: V.tlScala, cerca: V.cerca, nascoste: V.nascoste.slice(), persone: V.persone.slice() };
      await D.zeno.salvaVista(v); viste = await D.zeno.viste(doc.id); V.vistaId = v.id; salvaV(); schede(); UI.toast('Vista salvata');
    }
    function menuBoard(b) {
      const voci = [];
      if (ed) voci.push({ testo: 'Aggiungi gruppo', ico: 'plus', fai: aggiungiGruppo }, { testo: 'Aggiungi colonna', ico: 'plus', fai: () => menuAddCol(b) });
      voci.push('-', { testo: 'Esporta CSV (vista corrente)', ico: 'down', fai: () => Z.csv.esporta(B, ctx, doc, visibili) }, { testo: 'Esporta CSV (tutta la board)', ico: 'down', fai: () => Z.csv.esporta(B, ctx, doc, null) });
      if (ed) voci.push({ testo: 'Importa CSV', ico: 'up', fai: () => Z.csv.importa(B, ctx) }, '-', { testo: 'Elementi eliminati', ico: 'trash', fai: cestino });
      if (B.nonInviate.length) voci.push({ testo: 'Modifiche non inviate (' + B.nonInviate.length + ')', ico: 'alert', fai: nonInviate });
      UI.menu(b, voci);
    }
    /* log attività della board: chi ha cambiato cosa, dallo storico */
    function attivita() {
      const l = B.dati.storico.slice().reverse().slice(0, 150);
      const w = UI.modale('<h2>Log attività ' + I('log') + '</h2><p class="muted small">Ogni modifica di nomi e celle, dalla più recente; si conserva per 90 giorni.</p>' + (l.length ? '<div class="att">' + l.map((s) => { const c = s.col === 'nome' ? null : colPer(s.col), e = B.dati.elementi[s.el]; return '<button class="arow" data-ap="' + s.el + '">' + UI.avatar(ctx.profilo(s.da), 28) + '<span class="atx"><span><b>' + esc(ctx.nome(s.da)) + '</b> ha cambiato <b>' + esc(s.col === 'nome' ? 'il nome' : c ? c.nome : 'una colonna eliminata') + '</b> di <b>' + esc(e ? e.nome : 'un elemento eliminato') + '</b></span><small><span class="prima">' + esc(tv(s.prima, c)) + '</span> ' + ico('chev') + ' ' + esc(tv(s.dopo, c)) + '</small></span><small class="muted">' + U.fa(s.il) + '</small></button>'; }).join('') + '</div>' : '<p class="muted">Nessuna modifica registrata negli ultimi 90 giorni.</p>'), { classe: 'media' });
      w.el.onclick = (e) => { const r = e.target.closest('[data-ap]'); if (r && B.dati.elementi[r.dataset.ap] && !B.dati.elementi[r.dataset.ap].eliminato) { w.chiudi(); apri(r.dataset.ap); } };
    }
    function cestino() {
      const el = Object.values(B.dati.elementi).filter((e) => e.eliminato).sort((a, b) => String(b.eliminato).localeCompare(a.eliminato));
      const w = UI.modale('<h2>Elementi eliminati</h2>' + (el.length ? '<div class="plist2">' + el.map((e) => '<div class="prow"><span class="ptx"><b>' + esc(e.nome) + '</b><small class="muted">' + (e.padre ? 'sotto-elemento, ' : '') + 'eliminato ' + U.fa(e.eliminato) + '</small></span><button class="btn sm" data-r="' + e.id + '">' + ico('undo') + 'Ripristina</button></div>').join('') + '</div>' : '<p class="muted">Nessun elemento eliminato.</p>'), { classe: 'stretta' });
      w.el.onclick = (e) => { const r = e.target.closest('[data-r]'); if (r) { const x = B.dati.elementi[r.dataset.r]; const ops = [{ t: 'agg', tab: 'elementi', id: x.id, dati: { eliminato: null } }]; if ((B.dati.gruppi[x.gruppo] || {}).eliminato) ops.push({ t: 'agg', tab: 'gruppi', id: x.gruppo, dati: { eliminato: null } }); if (x.padre && (B.dati.elementi[x.padre] || {}).eliminato) ops.push({ t: 'agg', tab: 'elementi', id: x.padre, dati: { eliminato: null } }); B.invia(ops); r.closest('.prow').remove(); } };
    }
    function nonInviate() {
      const w = UI.modale('<h2>Modifiche non inviate</h2><p class="muted">Il server le ha rifiutate. Puoi riprovare (per esempio dopo che il proprietario ti ha ridato il ruolo) oppure scartarle.</p><div class="plist2">' + B.nonInviate.map((x) => '<div class="prow"><span class="ptx"><b>' + esc(descriviOp(x.op)) + '</b><small class="muted">' + esc(x.motivo) + '</small></span></div>').join('') + '</div><div class="azioni"><button class="btn" data-scarta>Scarta tutte</button><button class="btn pri" data-riprova>Riprova</button></div>', { classe: 'stretta' });
      w.el.onclick = (e) => {
        if (e.target.closest('[data-scarta]')) { B.nonInviate = []; w.chiudi(); B.carica().then(disegna); }
        if (e.target.closest('[data-riprova]')) { const ops = B.nonInviate.map((x) => x.op); B.nonInviate = []; w.chiudi(); B.invia(ops); }
      };
    }
    function descriviOp(op) {
      if (op.t === 'cella') { const c = colPer(op.col), e = B.dati.elementi[op.el]; return (c ? c.nome : 'Cella') + ' di "' + (e ? e.nome : '?') + '"'; }
      return ({ crea: 'Nuovo ', agg: 'Modifica di ' }[op.t] || '') + ({ elementi: 'elemento', gruppi: 'gruppo', colonne: 'colonna', commenti: 'commento', allegati: 'allegato' }[op.tab] || op.tab);
    }
    async function rinominaBoard() { const t = await UI.chiedi('Rinomina board', info.titolo, 'Titolo'); if (!t || !t.trim()) return; try { await D.documenti.rinomina(doc.id, t); info = Object.assign({}, info, { titolo: t.trim() }); shell.doc.titolo = t.trim(); intestazione(); } catch (e) { UI.errore(e); } }
    async function descriviBoard() { const t = await UI.chiedi('Descrizione della board', info.descrizione || '', 'A cosa serve questa board'); if (t === null) return; try { await D.documenti.descrivi(doc.id, t); info = Object.assign({}, info, { descrizione: t.trim() }); intestazione(); } catch (e) { UI.errore(e); } }
    function cambiaMese(n) { const m = V.mese || U.oggi().slice(0, 7); const d = new Date(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1); V.mese = n === 0 ? null : d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); salvaV(); disegnaCorpo(); }

    /* ---------- eventi ---------- */
    root.addEventListener('click', (e) => {
      const t = e.target;
      if (t.closest('[data-lk]') || t.closest('input[type=checkbox]')) return;
      const mb = t.closest('[data-m]'); if (mb) return azioneMassa(mb);
      if (t.closest('[data-nopers]')) { V.persone = []; salvaV(); return disegna(); }
      const df = t.closest('[data-delf]'); if (df) { V.filtri.splice(+df.dataset.delf, 1); V.vistaId = null; salvaV(); return disegna(); }
      const dv = t.closest('[data-delvista]'); if (dv) { e.stopPropagation(); D.zeno.eliminaVista(dv.dataset.delvista).then(async () => { viste = await D.zeno.viste(doc.id); V.vistaId = null; salvaV(); disegna(); }); return; }
      const vs = t.closest('[data-vista]'); if (vs) { const v = viste.find((x) => x.id === vs.dataset.vista); Object.assign(V, { tipo: v.tipo, filtri: U.clone(v.filtri || []), ordine: v.ordine, kanbanCol: v.kanbanCol, calCol: v.calCol, tlCol: v.tlCol, tlScala: v.tlScala || 'giorni', cerca: v.cerca || '', nascoste: (v.nascoste || []).slice(), persone: (v.persone || []).slice(), vistaId: v.id }); selez.clear(); salvaV(); return disegna(); }
      const th = t.closest('[data-hcol]'); if (th) return menuColonna(th);
      const b = t.closest('[data-c]');
      if (b) {
        const k = b.dataset.c;
        if (k === 'tabella' || k === 'kanban' || k === 'calendario' || k === 'timeline') { V.tipo = k; V.vistaId = null; scorriOggi = k === 'timeline'; salvaV(); return disegna(); }
        if (k === 'addperiodo') { V.tlCol = nuovaColonna('timeline'); salvaV(); return; }
        if (k === 'titolo') return ed && rinominaBoard();
        if (k === 'desc') return ed && descriviBoard();
        if (k === 'attivita') return attivita();
        if (k === 'filtri') return popFiltri(b);
        if (k === 'persone') return popPersone(b);
        if (k === 'nascondi') return popNascondi(b);
        if (k === 'ordina') return popOrdina(b);
        if (k === 'nofiltri') { V.filtri = []; V.persone = []; salvaV(); return disegna(); }
        if (k === 'salvavista') return salvaVista();
        if (k === 'menu') return menuBoard(b);
        if (k === 'nuovo') { const id = nuovoElemento((B.gruppi()[0] || {}).id); if (id) apri(id); return; }
        if (k === 'nuovomenu') return UI.menu(b, [{ testo: 'Nuovo gruppo', ico: 'plus', fai: aggiungiGruppo }, { testo: 'Nuova colonna', ico: 'plus', fai: () => menuAddCol(b) }, { testo: 'Importa da CSV', ico: 'up', fai: () => Z.csv.importa(B, ctx) }], { destra: false });
        if (k === 'addgruppo') return aggiungiGruppo();
        if (k === 'addcol') return menuAddCol(b);
        if (k === 'addstato') { V.kanbanCol = nuovaColonna('stato'); salvaV(); return; }
        if (k === 'adddata') { V.calCol = nuovaColonna('data'); salvaV(); return; }
        if (k === 'gmenu') return menuGruppo(b);
        if (k === 'chiudi') { const g = b.closest('[data-g]').dataset.g; V.chiusi[g] = !V.chiusi[g]; salvaV(); return disegnaCorpo(); }
        if (k === 'gnome' && ed) { const g = B.dati.gruppi[b.closest('[data-g]').dataset.g]; UI.chiedi('Rinomina gruppo', g.nome).then((n) => { if (n && n.trim()) B.invia({ t: 'agg', tab: 'gruppi', id: g.id, dati: { nome: n.trim() } }); }); return; }
        if (k === 'espandi') { const id = b.closest('[data-el]').dataset.el; V.aperti[id] = !V.aperti[id]; salvaV(); disegnaCorpo(); if (V.aperti[id] && ed && !B.figli(id).length) { const i = U.$('[data-addsub="' + id + '"]', root); if (i) i.focus(); } return; }
        if (k === 'nome') return modificaNome(b);
        if (k === 'apri') return apri(b.closest('[data-el]').dataset.el);
        if (k === 'commenti') return apri(b.closest('[data-el]').dataset.el, 'commenti');
        if (k === 'kadd') { const st = statoCol(), cor = b.dataset.corsia; const id = nuovoElemento(null, null, (nid) => [{ t: 'cella', el: nid, col: st.id, v: cor, base: 0 }]); if (id) apri(id); return; }
        if (k === 'meseprec') return cambiaMese(-1);
        if (k === 'mesesucc') return cambiaMese(1);
        if (k === 'meseoggi') return cambiaMese(0);
      }
      const td = t.closest('td.zc'); if (td && corpo.contains(td)) return modifica(td, t);
    });
    root.addEventListener('change', (e) => {
      const s = e.target.closest('[data-sel]'), g = e.target.closest('[data-selg]');
      if (s) { if (s.checked) selez.add(s.dataset.sel); else selez.delete(s.dataset.sel); s.closest('tr').classList.toggle('scelta', s.checked); massa(); const sez = s.closest('[data-g]'); if (sez) { const all = visibili(sez.dataset.g).every((x) => selez.has(x.id)); const h = U.$('[data-selg]', sez); if (h) h.checked = all; } }
      if (g) { visibili(g.dataset.selg).forEach((x) => { if (g.checked) selez.add(x.id); else selez.delete(x.id); }); disegnaCorpo(); }
    });
    root.addEventListener('dblclick', (e) => {
      const d = e.target.closest('[data-giorno]'); if (!d || !ed || e.target.closest('.calchip')) return;
      const dc = calCol(), g = d.dataset.giorno;
      const id = nuovoElemento(null, null, (nid) => [{ t: 'cella', el: nid, col: dc.id, v: dc.tipo === 'data' ? g : { da: g, a: g }, base: 0 }]); if (id) apri(id);
    });
    root.addEventListener('keydown', (e) => {
      const i = e.target.closest('[data-addel]'), s = e.target.closest('[data-addsub]');
      if (i && e.key === 'Enter' && i.value.trim()) { const g = i.dataset.addel; nuovoElemento(g, i.value.trim()); setTimeout(() => { const n = U.$('[data-addel="' + g + '"]', root); if (n) n.focus(); }, 30); }
      if (s && e.key === 'Enter' && s.value.trim()) { const p = s.dataset.addsub; nuovoElemento(null, s.value.trim(), null, p); setTimeout(() => { const n = U.$('[data-addsub="' + p + '"]', root); if (n) n.focus(); }, 30); }
    });
    /* trascinamento: righe nella tabella (ordine e gruppo), schede tra le corsie del Kanban */
    let trascinato = null;
    root.addEventListener('dragstart', (e) => { const r = e.target.closest('[data-el][draggable]'); if (!r) return; trascinato = r.dataset.el; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', trascinato); } catch (er) { /* */ } r.classList.add('trasc'); });
    root.addEventListener('dragend', () => { trascinato = null; U.$$('.trasc,.sopra', root).forEach((x) => x.classList.remove('trasc', 'sopra')); });
    root.addEventListener('dragover', (e) => { if (!trascinato) return; const z = e.target.closest('tr[data-el]:not(.sub),.kcol'); if (z) { e.preventDefault(); U.$$('.sopra', root).forEach((x) => x.classList.remove('sopra')); z.classList.add('sopra'); } });
    root.addEventListener('drop', (e) => {
      if (!trascinato) return; e.preventDefault();
      const kc = e.target.closest('.kcol');
      if (kc) { const st = statoCol(); B.invia({ t: 'cella', el: trascinato, col: st.id, v: kc.dataset.corsia || null }); return; }
      const tr = e.target.closest('tr[data-el]:not(.sub)'); if (!tr || tr.dataset.el === trascinato) return;
      const dest = B.dati.elementi[tr.dataset.el], lista = B.elementi(dest.gruppo).filter((x) => x.id !== trascinato), i = lista.findIndex((x) => x.id === dest.id);
      const prima = lista[i - 1], ordine = prima ? (prima.ordine + dest.ordine) / 2 : dest.ordine - 1;
      B.invia([{ t: 'agg', tab: 'elementi', id: trascinato, dati: { gruppo: dest.gruppo, ordine } }].concat(B.figli(trascinato).map((f) => ({ t: 'agg', tab: 'elementi', id: f.id, dati: { gruppo: dest.gruppo } }))));
    });

    /* ---------- dettaglio, conflitti, tempo reale ---------- */
    function apri(id, tab) { sel = id; Z.dettaglio.apri(B, id, { ctx, modifica, elimina, nuovoElemento, duplica, apri, membri: () => membri, chiudi: () => { sel = null; disegnaCorpo(); } }, tab); disegnaCorpo(); }
    const occupato = () => !!document.querySelector('.pop') || (document.activeElement && document.activeElement.closest && document.activeElement.closest('.zb,.zdet') && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && document.activeElement.type !== 'checkbox');
    async function ricarica() {
      if (chiuso) return;
      if (occupato()) { clearTimeout(attesa); attesa = setTimeout(ricarica, 700); return; }
      await B.carica(); disegna();
    }
    B.on((why) => {
      if (why === 'conflitti') Z.dettaglio.conflitti(B, ctx);
      if (why === 'rifiutate') UI.toast('Alcune modifiche sono state rifiutate dal server', 'bad', { testo: 'Vedi', fai: nonInviate });
      if (why === 'locale' || why === 'server') { if (why === 'server' && occupato()) return ricarica(); intestazione(); disegnaCorpo(); }
    });
    const stacca = D.on(async (m) => {
      if (N.Sync.offline) return;
      if (m.cosa === 'zeno' && m.doc === doc.id) ricarica();
      if (m.cosa === 'membri' && m.doc === doc.id) { membri = await D.condivisione.membri(doc.id); intestazione(); }
      if (m.cosa === 'documenti' && m.doc === doc.id) { try { info = await D.documenti.apri(doc.id); intestazione(); } catch (er) { /* */ } }
    });
    let eraOffline = N.Sync.offline;
    const suSync = () => { if (eraOffline === N.Sync.offline) return; eraOffline = N.Sync.offline; if (!N.Sync.offline && !chiuso) { B.svuota(); if (!B.coda.length) ricarica(); } };
    N.Sync.on(suSync);
    const suRidim = U.debounce(() => { if (!chiuso) disegnaCorpo(); }, 200);
    addEventListener('resize', suRidim);
    disegna();
    let daAprire = null; try { daAprire = sessionStorage.getItem('zeno:apriEl'); sessionStorage.removeItem('zeno:apriEl'); } catch (e) { /* */ }
    if (daAprire && B.dati.elementi[daAprire]) { const e0 = B.dati.elementi[daAprire]; if (e0.padre) { V.aperti[e0.padre] = true; disegnaCorpo(); } apri(daAprire); }
    if (B.coda.length) B.svuota();
    return {
      chiudi() { chiuso = true; stacca(); removeEventListener('resize', suRidim); N.Sync.asc = N.Sync.asc.filter((f) => f !== suSync); Z.dettaglio.chiudi(true); N.Sync.imposta({ attesa: 0 }); }
    };
  };
})(window.N = window.N || {});
