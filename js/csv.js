/* zeno - import ed export CSV in formato italiano (punti 153, 181): separatore ";", decimali con ",",
   date gg/mm/aaaa, BOM UTF-8 per Excel. I sotto-elementi seguono il loro elemento, con la colonna "Elemento padre". */
(function (N) {
  'use strict';
  const U = N.U, UI = N.UI, esc = U.esc;
  const Z = N.Z = N.Z || {};

  Z.csv = {
    righe(B, ctx, visibili, scelti) {
      const cols = B.colonne();
      const out = [['Gruppo', 'Nome', 'Elemento padre'].concat(cols.map((c) => c.nome), ['Descrizione'])];
      const riga = (g, e, padre) => out.push([g.nome, e.nome, padre ? padre.nome : ''].concat(cols.map((c) => Z.T[c.tipo].csv(B.valore(e.id, c), c, ctx)), [e.descrizione || '']));
      B.gruppi().forEach((g) => (visibili ? visibili(g.id) : B.elementi(g.id)).forEach((e) => {
        const figli = B.figli(e.id);
        if (!scelti || scelti.has(e.id)) riga(g, e);
        figli.forEach((f) => { if (!scelti || scelti.has(f.id) || scelti.has(e.id)) riga(g, f, e); });
      }));
      return out;
    },
    esporta(B, ctx, doc, visibili, scelti) {
      const r = Z.csv.righe(B, ctx, visibili, scelti);
      U.scarica(U.csvScrivi(r), (doc.titolo || 'board').replace(/[^\w\- àèéìòù]+/gi, '').trim() + ' - ' + U.data(U.oggi()).replace(/\//g, '-') + '.csv', 'text/csv;charset=utf-8');
      UI.toast((r.length - 1) + ' righe esportate');
    },
    /* abbina le intestazioni alle colonne, poi aggiunge o aggiorna per nome */
    piano(B, ctx, righe, mappa, modo) {
      const cols = B.colonne(), ops = [], stat = { nuovi: 0, aggiornati: 0, scartati: 0 };
      const gruppiNome = {}; B.gruppi().forEach((g) => { gruppiNome[g.nome.toLowerCase()] = g.id; });
      const nuoveCol = {};
      mappa.forEach((m, i) => { if (m === '+') { const id = U.uid(); nuoveCol[i] = id; ops.push({ t: 'crea', tab: 'colonne', dati: { id, nome: righe[0][i] || 'Colonna', tipo: 'testo', ordine: B.prossimoOrdine('colonne') + i } }); } });
      const colDi = (i) => nuoveCol[i] ? { id: nuoveCol[i], tipo: 'testo' } : cols.find((c) => c.id === mappa[i]);
      const perNome = {}; Object.values(B.dati.elementi).filter((e) => !e.eliminato).forEach((e) => { perNome[String(e.nome).toLowerCase()] = e; });
      const iN = mappa.indexOf('nome'), iG = mappa.indexOf('gruppo'), iD = mappa.indexOf('descrizione'), iP = mappa.indexOf('padre');
      let ordine = B.prossimoOrdine('elementi');
      const gruppoDi = (gn) => {
        if (!gn) return null; let gid = gruppiNome[gn.toLowerCase()];
        if (!gid) { gid = U.uid(); gruppiNome[gn.toLowerCase()] = gid; ops.push({ t: 'crea', tab: 'gruppi', dati: { id: gid, nome: gn, colore: Z.COLORI[Object.keys(gruppiNome).length % Z.COLORI.length], ordine: B.prossimoOrdine('gruppi') + Object.keys(gruppiNome).length } }); }
        return gid;
      };
      righe.slice(1).forEach((r) => {
        const nome = iN >= 0 ? String(r[iN] || '').trim() : ''; if (!nome) { stat.scartati++; return; }
        const padre = iP >= 0 && String(r[iP] || '').trim() ? perNome[String(r[iP]).trim().toLowerCase()] : null;
        let gid = padre ? padre.gruppo : gruppoDi(iG >= 0 ? String(r[iG] || '').trim() : '');
        let e = modo === 'aggiorna' ? perNome[nome.toLowerCase()] : null;
        if (!e) {
          if (!gid) gid = (B.gruppi()[0] || {}).id || Object.values(gruppiNome)[0] || gruppoDi('Importati');
          e = { id: U.uid(), gruppo: gid, nome };
          ops.push({ t: 'crea', tab: 'elementi', dati: Object.assign({ id: e.id, gruppo: gid, nome, descrizione: iD >= 0 ? r[iD] || '' : '', ordine: ordine++ }, padre ? { padre: padre.id } : {}) });
          stat.nuovi++; perNome[nome.toLowerCase()] = e;
        } else { stat.aggiornati++; const d = {}; if (gid && gid !== e.gruppo && !e.padre) d.gruppo = gid; if (iD >= 0) d.descrizione = r[iD] || ''; if (Object.keys(d).length) ops.push({ t: 'agg', tab: 'elementi', id: e.id, dati: d }); }
        mappa.forEach((m, i) => { const c = colDi(i); if (!c || ['nome', 'gruppo', 'descrizione', 'padre', ''].includes(m)) return; const s = r[i]; if (s === undefined || String(s).trim() === '') return; const v = Z.T[c.tipo].daCsv(s, c, ctx); if (v === null || v === undefined) { stat.scartati++; return; } ops.push({ t: 'cella', el: e.id, col: c.id, v }); });
      });
      return { ops, stat };
    },
    async importa(B, ctx) {
      const [f] = await U.scegliFile('.csv,text/csv'); if (!f) return;
      const righe = U.csvLeggi(await U.leggiTesto(f));
      if (righe.length < 2) return UI.toast('Il file non contiene righe da importare');
      const cols = B.colonne().filter((c) => !Z.T[c.tipo].calcolata);
      const auto = (h) => { h = String(h || '').trim().toLowerCase(); if (['nome', 'elemento', 'attività', 'titolo'].includes(h)) return 'nome'; if (h === 'gruppo') return 'gruppo'; if (h === 'descrizione') return 'descrizione'; if (['elemento padre', 'padre'].includes(h)) return 'padre'; if (B.colonne().some((x) => x.nome.toLowerCase() === h && Z.T[x.tipo].calcolata)) return ''; const c = cols.find((x) => x.nome.toLowerCase() === h); return c ? c.id : '+'; };
      const mappa = righe[0].map(auto);
      if (!mappa.includes('nome')) mappa[0] = 'nome';
      const opz = '<option value="">Ignora</option><option value="nome">Nome</option><option value="gruppo">Gruppo</option><option value="padre">Elemento padre</option><option value="descrizione">Descrizione</option>' + cols.map((c) => '<option value="' + c.id + '">' + esc(c.nome) + ' (' + Z.T[c.tipo].nome + ')</option>').join('') + '<option value="+">Nuova colonna di testo</option>';
      const w = UI.modale('<h2>Importa CSV ' + (N.Aiuto ? N.Aiuto.i('csv') : '') + '</h2><p class="muted small">' + (righe.length - 1) + ' righe trovate in "' + esc(f.name) + '". Abbina le colonne del file a quelle della board.</p>' +
        '<div class="imap">' + righe[0].map((h, i) => '<div class="irow"><span><b>' + esc(h || 'Colonna ' + (i + 1)) + '</b><small class="muted">' + esc(righe.slice(1, 3).map((r) => r[i]).filter(Boolean).join(' / ').slice(0, 60)) + '</small></span><select data-m="' + i + '">' + opz + '</select></div>').join('') + '</div>' +
        '<div class="riga"><label class="sw"><input type="radio" name="modo" value="aggiungi" checked><span>Aggiungi come nuovi elementi</span></label><label class="sw"><input type="radio" name="modo" value="aggiorna"><span>Aggiorna gli elementi con lo stesso nome</span></label></div>' +
        '<div class="azioni"><button class="btn" data-x>Annulla</button><button class="btn pri" data-vai>Importa</button></div>', { classe: 'media' });
      U.$$('[data-m]', w.el).forEach((s) => { s.value = mappa[+s.dataset.m]; });
      w.el.querySelector('[data-vai]').onclick = () => {
        const m = U.$$('[data-m]', w.el).map((s) => s.value);
        if (!m.includes('nome')) return UI.toast('Indica quale colonna contiene il nome');
        const { ops, stat } = Z.csv.piano(B, ctx, righe, m, w.el.querySelector('[name=modo]:checked').value);
        w.chiudi(); B.invia(ops);
        UI.toast(stat.nuovi + ' aggiunti, ' + stat.aggiornati + ' aggiornati' + (stat.scartati ? ', ' + stat.scartati + ' valori non riconosciuti' : ''));
      };
    }
  };
})(window.N = window.N || {});
