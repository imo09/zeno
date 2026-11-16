/* zeno - pannello di dettaglio dell'elemento (punto 176): campi, descrizione, commenti, allegati, storico
   con ripristino (punto 180); finestra dei conflitti per cella (punti 144, 179) */
(function (N) {
  'use strict';
  const U = N.U, UI = N.UI, D = N.D, esc = U.esc, ico = UI.ico;
  const Z = N.Z = N.Z || {};
  let S = null; /* { B, id, opz, el, tab } */

  function testoValore(v, c, ctx) { if (!c) return v == null ? '' : String(v); const s = Z.T[c.tipo].csv(v, c, ctx); return s === '' ? 'vuoto' : s; }

  const Det = {
    apri(B, id, opz, tab) {
      if (!S || !S.el) { const el = document.createElement('aside'); el.className = 'zdet'; el.setAttribute('aria-label', 'Dettaglio elemento'); document.body.appendChild(el); S = { el, tab: 'commenti' }; Det.eventi(); }
      Object.assign(S, { B, id, opz }); if (tab) S.tab = tab; Det.disegna(); S.el.classList.add('aperto');
    },
    chiudi(silenzioso) { if (!S) return; const o = S.opz; S.el.remove(); S = null; if (!silenzioso && o) o.chiudi(); },
    aggiorna() {
      if (!S) return;
      if (!S.B.dati.elementi[S.id] || S.B.dati.elementi[S.id].eliminato) return Det.chiudi();
      const f = document.activeElement; if (f && S.el.contains(f) && /INPUT|TEXTAREA/.test(f.tagName)) return;
      Det.disegna();
    },
    disegna() {
      const { B, id, opz } = S, e = B.dati.elementi[id], ctx = opz.ctx, ed = B.puoModificare;
      const comm = Object.values(B.dati.commenti).filter((x) => x.elemento === id && !x.eliminato).sort((a, b) => String(a.creato).localeCompare(b.creato));
      const all = Object.values(B.dati.allegati).filter((x) => x.elemento === id && !x.eliminato);
      const st = B.dati.storico.filter((x) => x.el === id).slice().reverse();
      const tabs = [['commenti', 'Commenti', comm.length], ['allegati', 'Allegati', all.length], ['storico', 'Storico', st.length]];
      let corpo = '';
      if (S.tab === 'commenti') corpo = (comm.length ? comm.map((c) => '<div class="com"><span>' + UI.avatar(ctx.profilo(c.autore || c.da), 28) + '</span><div><p class="cm"><b>' + esc(ctx.nome(c.autore || c.da)) + '</b> <small class="muted">' + U.fa(c.creato) + '</small>' + ((c.autore || c.da) === ctx.io() ? '<button class="ib0 cdel" data-delc="' + c.id + '" aria-label="Elimina commento">' + ico('trash') + '</button>' : '') + '</p><p class="ct">' + esc(c.testo).replace(/\n/g, '<br>') + '</p></div></div>').join('') : '<p class="muted small">Nessun commento. Scrivi il primo qui sotto.</p>') +
        '<form class="cnew"><textarea name="t" placeholder="Scrivi un commento" rows="2"></textarea><button class="btn sm pri">Invia</button></form>';
      if (S.tab === 'allegati') corpo = (all.length ? all.map((a) => '<div class="prow">' + ico(/^image/.test(a.tipo) ? 'image' : 'file') + '<span class="ptx"><b>' + esc(a.nome) + '</b><small class="muted">' + U.peso(a.dimensione || 0) + ' - ' + U.fa(a.creato) + '</small></span><button class="ib0" data-scar="' + a.id + '" aria-label="Scarica">' + ico('down') + '</button>' + (ed ? '<button class="ib0" data-dela="' + a.id + '" aria-label="Elimina">' + ico('trash') + '</button>' : '') + '</div>').join('') : '<p class="muted small">Nessun allegato.</p>') +
        (ed ? '<button class="btn sm" data-adda>' + ico('clip') + 'Aggiungi allegato</button><p class="muted small">Massimo 5 MB per file; le immagini vengono ridotte.</p>' : '');
      if (S.tab === 'storico') corpo = st.length ? st.map((s) => { const c = s.col === 'nome' ? { nome: 'Nome' } : B.dati.colonne[s.col]; const reale = s.col === 'nome' ? null : c; return '<div class="sto"><span>' + UI.avatar(ctx.profilo(s.da), 24) + '</span><div><p><b>' + esc(ctx.nome(s.da)) + '</b> ha cambiato <b>' + esc(c ? c.nome : 'una colonna eliminata') + '</b></p><p class="small"><span class="prima">' + esc(testoValore(s.prima, reale, ctx)) + '</span> ' + ico('chev') + ' <span>' + esc(testoValore(s.dopo, reale, ctx)) + '</span></p><p class="muted small">' + U.dataOra(s.il) + '</p></div>' + (ed && c && !(c.eliminato) ? '<button class="btn sm" data-rip="' + s.id + '">' + ico('undo') + 'Ripristina</button>' : '') + '</div>'; }).join('') : '<p class="muted small">Nessuna modifica registrata. Lo storico si conserva per 90 giorni.</p>';
      S.el.innerHTML = '<header class="dh"><button class="ib0" data-chiudi aria-label="Chiudi">' + ico('x') + '</button>' + (N.Aiuto ? N.Aiuto.i('dettaglio') : '') + '<span class="sp"></span>' + (ed ? '<button class="ib0" data-pop data-dmenu aria-label="Azioni">' + ico('menu') + '</button>' : '') + '</header><div class="dscroll">' +
        '<textarea class="dnome" rows="1"' + (ed ? '' : ' readonly') + '>' + esc(e.nome || '') + '</textarea>' +
        (e.padre ? '<p class="dmeta muted small">Sotto-elemento di <button class="dpadre" data-vai="' + e.padre + '">' + esc((B.dati.elementi[e.padre] || {}).nome || '') + '</button> - creato da ' + esc(ctx.nome(e.da)) + ' ' + U.fa(e.creato) + '</p>' :
        '<p class="dmeta muted small">Gruppo ' + (ed ? '<select class="dgr">' + B.gruppi().map((g) => '<option value="' + g.id + '"' + (g.id === e.gruppo ? ' selected' : '') + '>' + esc(g.nome) + '</option>').join('') + '</select>' : '<b>' + esc((B.dati.gruppi[e.gruppo] || {}).nome || '') + '</b>') + ' - creato da ' + esc(ctx.nome(e.da)) + ' ' + U.fa(e.creato) + '</p>') +
        '<div class="dcampi">' + B.colonne().map((c) => { const v = B.valore(id, c), mod = ed && !Z.T[c.tipo].calcolata; return '<div class="dcampo"><span class="lab">' + ico(Z.T[c.tipo].ico) + esc(c.nome) + '</span><div class="zc t-' + c.tipo + (mod ? ' ed' : '') + '" data-el="' + id + '" data-col="' + c.id + '">' + ((Z.T[c.tipo].vuoto(v) && c.tipo !== 'valutazione') ? '<span class="muted small">' + (mod ? 'Aggiungi' : '-') + '</span>' : Z.T[c.tipo].mostra(v, c, ctx, B.fatto(id))) + '</div></div>'; }).join('') + '</div>' +
        (e.padre ? '' : Det.sotto(B, id, ed)) +
        '<label class="campo"><span>Descrizione</span><textarea class="ddesc" rows="3"' + (ed ? '' : ' readonly') + ' placeholder="' + (ed ? 'Aggiungi una descrizione' : '') + '">' + esc(e.descrizione || '') + '</textarea></label>' +
        '<div class="dtabs">' + tabs.map((t) => '<button class="vt' + (S.tab === t[0] ? ' on' : '') + '" data-tab="' + t[0] + '">' + t[1] + (t[2] ? '<span class="cnt">' + t[2] + '</span>' : '') + '</button>').join('') + '</div><div class="dcorpo">' + corpo + '</div></div>';
      S.el.style.setProperty('--gc', (B.dati.gruppi[e.gruppo] || {}).colore || Z.COLORI[2]);
      const n = S.el.querySelector('.dnome'); n.style.height = 'auto'; n.style.height = n.scrollHeight + 'px';
    },
    /* sotto-elementi dell'elemento aperto: avanzamento, elenco e aggiunta */
    sotto(B, id, ed) {
      const f = B.figli(id), st = B.calc.colonnaStato ? B.dati.colonne[B.calc.colonnaStato] : null, pc = B.colonne().find((c) => c.tipo === 'persona');
      return '<div class="dsub"><div class="dsubh"><b>Sotto-elementi</b>' + (N.Aiuto ? N.Aiuto.i('sottoelementi') : '') + (f.length ? Z.barra(B.calc.elementi[id]) + '<small class="muted">' + f.filter((x) => B.fatto(x.id)).length + ' di ' + f.length + ' completati</small>' : '') + '</div>' +
        f.map((x) => '<div class="dsrow">' + (st ? '<span class="zc t-stato mini' + (ed ? ' ed' : '') + '" data-el="' + x.id + '" data-col="' + st.id + '">' + Z.T.stato.mostra(B.cella(x.id, st.id), st) + '</span>' : '') + '<button class="dsnome" data-vai="' + x.id + '">' + esc(x.nome || 'Senza nome') + '</button>' + (pc ? Z.T.persona.mostra(B.cella(x.id, pc.id), pc, S.opz.ctx) : '') + '</div>').join('') +
        (ed ? '<input class="dsadd" data-dsadd="' + id + '" placeholder="+ Aggiungi sotto-elemento">' : (f.length ? '' : '<p class="muted small">Nessun sotto-elemento.</p>')) + '</div>';
    },
    eventi() {
      const el = S.el;
      el.addEventListener('click', async (e) => {
        if (!S) return;
        const { B, id, opz } = S, t = e.target;
        if (t.closest('[data-lk]')) return;
        if (t.closest('[data-chiudi]')) return Det.chiudi();
        const tb = t.closest('[data-tab]'); if (tb) { S.tab = tb.dataset.tab; return Det.disegna(); }
        const zc = t.closest('.zc'); if (zc) return opz.modifica(zc, t);
        const vai = t.closest('[data-vai]'); if (vai) return opz.apri(vai.dataset.vai);
        if (t.closest('[data-dmenu]')) return UI.menu(t.closest('[data-dmenu]'), [
          { testo: 'Duplica', ico: 'copy', fai: () => { const nid = opz.duplica(id); if (nid) { UI.toast('Duplicato'); opz.apri(nid); } } },
          '-', { testo: 'Elimina elemento', ico: 'trash', pericolo: true, fai: () => { opz.elimina('elementi', [id], 'Elemento eliminato'); Det.chiudi(); } }
        ]);
        const dc = t.closest('[data-delc]'); if (dc) { B.invia({ t: 'agg', tab: 'commenti', id: dc.dataset.delc, dati: { eliminato: U.ora() } }); return; }
        const sc = t.closest('[data-scar]'); if (sc) { const a = B.dati.allegati[sc.dataset.scar]; try { const u = await D.file.url(a.file); if (!u) throw new Error('File non disponibile su questo dispositivo'); const blob = await (await fetch(u)).blob(); U.scarica(blob, a.nome); } catch (er) { UI.errore(er); } return; }
        const da = t.closest('[data-dela]'); if (da) { const a = B.dati.allegati[da.dataset.dela]; B.invia({ t: 'agg', tab: 'allegati', id: a.id, dati: { eliminato: U.ora() } }); D.file.elimina(a.file).catch(() => {}); return; }
        if (t.closest('[data-adda]')) {
          const fs = await U.scegliFile('', true);
          for (const f of fs) {
            try {
              const img = /^image\/(png|jpeg|webp)/.test(f.type);
              const dati = img ? (await U.riduciImmagine(f, 1600)).dataUrl : await U.leggiDataUrl(f);
              const r = await D.file.carica(B.id, dati, f.name, img ? (f.type === 'image/png' ? 'image/png' : 'image/jpeg') : f.type);
              B.invia({ t: 'crea', tab: 'allegati', dati: { id: r.id, elemento: id, nome: f.name, tipo: r.tipo, dimensione: r.dimensione, file: r.id } });
            } catch (er) { UI.errore(er); }
          }
          return;
        }
        const rp = t.closest('[data-rip]'); if (rp) {
          const s = B.dati.storico.find((x) => x.id === rp.dataset.rip);
          if (s.col === 'nome') B.invia({ t: 'agg', tab: 'elementi', id, dati: { nome: s.prima || 'Senza nome' } });
          else B.invia({ t: 'cella', el: id, col: s.col, v: s.prima });
          UI.toast('Valore ripristinato');
        }
      });
      el.addEventListener('submit', (e) => {
        e.preventDefault(); if (!S) return; const tx = e.target.t.value.trim(); if (!tx) return;
        S.B.invia({ t: 'crea', tab: 'commenti', dati: { id: U.uid(), elemento: S.id, autore: S.opz.ctx.io(), testo: tx } }); e.target.t.value = '';
      });
      el.addEventListener('keydown', (e) => {
        if (e.target.dataset && e.target.dataset.dsadd && e.key === 'Enter' && e.target.value.trim()) { const p = e.target.dataset.dsadd, nome = e.target.value.trim(); e.target.value = ''; e.target.blur(); S.opz.nuovoElemento(null, nome, null, p); setTimeout(() => { const n = S && S.el.querySelector('[data-dsadd]'); if (n) n.focus(); }, 40); return; } if (e.target.name === 't' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) e.target.form.requestSubmit(); if (e.target.classList.contains('dnome') && e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });
      el.addEventListener('input', (e) => { if (e.target.classList.contains('dnome')) { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; } });
      el.addEventListener('change', (e) => {
        if (!S) return; const { B, id } = S, x = B.dati.elementi[id];
        if (e.target.classList.contains('dnome') && e.target.value.trim() && e.target.value.trim() !== x.nome) B.invia({ t: 'agg', tab: 'elementi', id, dati: { nome: e.target.value.trim() } });
        if (e.target.classList.contains('ddesc') && e.target.value !== (x.descrizione || '')) B.invia({ t: 'agg', tab: 'elementi', id, dati: { descrizione: e.target.value } });
        if (e.target.classList.contains('dgr')) B.invia({ t: 'agg', tab: 'elementi', id, dati: { gruppo: e.target.value, ordine: B.prossimoOrdine('elementi', (y) => y.gruppo === e.target.value) } });
      });
    },

    /* conflitti: le due versioni della cella, una alla volta; scorciatoie se sono più di una */
    conflitti(B, ctx) {
      if (document.querySelector('.mconf') || !B.conflitti.length) return;
      const c = B.conflitti[0], col = B.dati.colonne[c.op.col], el = B.dati.elementi[c.op.el], resto = B.conflitti.length - 1;
      const mostra = (v) => col ? (Z.T[col.tipo].mostra(v, col, ctx) || '<span class="muted">vuoto</span>') : esc(String(v));
      const w = UI.modale('<h2>Due versioni della stessa cella ' + (N.Aiuto ? N.Aiuto.i('conflitti') : '') + '</h2><p class="muted">Mentre eri offline, ' + esc(ctx.nome(c.attuale.da)) + ' ha modificato <b>' + esc(col ? col.nome : 'una cella') + '</b> di <b>' + esc(el ? el.nome : '?') + '</b>. Scegli quale tenere.</p>' +
        '<div class="conf"><div class="cv"><p class="ey">La tua versione</p><div class="cvv">' + mostra(c.op.v) + '</div><button class="btn pri" data-mia>Tieni la mia</button></div><div class="cv"><p class="ey">Versione di ' + esc(ctx.nome(c.attuale.da)) + '</p><p class="muted small">' + U.dataOra(c.attuale.il) + '</p><div class="cvv">' + mostra(c.attuale.v) + '</div><button class="btn" data-altra>Tieni questa</button></div></div>' +
        (resto ? '<p class="muted small">Ci sono altri ' + resto + ' conflitti.</p><div class="azioni sx"><button class="btn sm link" data-tuttemie>Tieni sempre la mia</button><button class="btn sm link" data-tuttealtre>Tieni sempre l\'altra</button></div>' : ''), { classe: 'media mconf', ferma: true });
      const risolvi = (mie, tutte) => {
        const lista = tutte ? B.conflitti.splice(0) : B.conflitti.splice(0, 1);
        w.chiudi();
        const ops = mie ? lista.map((x) => ({ t: 'cella', el: x.op.el, col: x.op.col, v: x.op.v, base: x.attuale.ver })) : [];
        if (ops.length) B.invia(ops); else B.carica().then(() => B.avvisa('server'));
        setTimeout(() => Det.conflitti(B, ctx), 60);
      };
      w.el.onclick = (e) => {
        if (e.target.closest('[data-mia]')) risolvi(true); if (e.target.closest('[data-altra]')) risolvi(false);
        if (e.target.closest('[data-tuttemie]')) risolvi(true, true); if (e.target.closest('[data-tuttealtre]')) risolvi(false, true);
      };
      w.el.querySelector('[data-x]').remove();
    }
  };
  Z.dettaglio = Det;
})(window.N = window.N || {});
