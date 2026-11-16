/* zeno - avvio dell'app: configurazione del guscio, board nuova, "Le mie attività", backup, dati di prova */
(function (N) {
  'use strict';
  const U = N.U, UI = N.UI, D = N.D, esc = U.esc, ico = UI.ico;
  const Z = N.Z;

  const LOGO = '<svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#0E1D2A"/><rect x="7" y="9" width="12" height="3" rx="1.5" fill="#E9EDEC"/><rect x="7" y="14.5" width="18" height="3" rx="1.5" fill="#E9EDEC"/><rect x="7" y="20" width="9" height="3" rx="1.5" fill="#E9EDEC"/><circle cx="23.5" cy="10.5" r="2.3" fill="#E8A867"/></svg>';

  /* struttura di una board nuova: due gruppi e le tre colonne più usate */
  function scheletro(extra) {
    const g1 = U.uid(), g2 = U.uid(), cs = U.uid(), cp = U.uid(), cd = U.uid(), e1 = U.uid();
    return [
      { t: 'crea', tab: 'gruppi', dati: { id: g1, nome: 'Questa settimana', colore: Z.COLORI[2], ordine: 1 } },
      { t: 'crea', tab: 'gruppi', dati: { id: g2, nome: 'Prossimamente', colore: Z.COLORI[4], ordine: 2 } },
      { t: 'crea', tab: 'colonne', dati: { id: cs, nome: 'Stato', tipo: 'stato', ordine: 1, opzioni: Z.statoPredefinito().map((o) => Object.assign({}, o, { id: U.uid() })) } },
      { t: 'crea', tab: 'colonne', dati: { id: cp, nome: 'Owner', tipo: 'persona', ordine: 2 } },
      { t: 'crea', tab: 'colonne', dati: { id: cd, nome: 'Scadenza', tipo: 'data', ordine: 3 } },
      { t: 'crea', tab: 'elementi', dati: { id: e1, gruppo: g1, nome: 'Primo elemento', descrizione: '', ordine: 1 } }
    ].concat(extra ? extra(e1, cp) : []);
  }

  /* "Le mie attività" (punto 177): elementi assegnati a me su tutte le board */
  async function mie(el, shell) {
    el.innerHTML = '<div class="home"><div class="hhead"><div><p class="ey"><a href="#/">Board</a></p><h1>Le mie attività ' + N.Aiuto.i('mie') + '</h1></div><div class="acts"><label class="sw"><input type="checkbox" id="mfatti"><span>Mostra anche le completate</span></label></div></div><div id="mlist"><p class="muted">Carico...</p></div></div>';
    const lista = await D.zeno.mie();
    const disegna = () => {
      const fatti = U.$('#mfatti', el).checked;
      const l = lista.filter((x) => fatti || x.avanzamento < 100).sort((a, b) => String(a.data || '9999').localeCompare(String(b.data || '9999')));
      const perBoard = {}; l.forEach((x) => { (perBoard[x.board] = perBoard[x.board] || { titolo: x.boardTitolo, el: [] }).el.push(x); });
      U.$('#mlist', el).innerHTML = l.length ? Object.keys(perBoard).map((b) => '<section class="mie"><h2 class="sez">' + esc(perBoard[b].titolo) + ' <span class="cnt">' + perBoard[b].el.length + '</span></h2><div class="mlist">' + perBoard[b].el.map((x) => '<a class="mrow" href="#/d/' + b + '" data-apri="' + x.elemento + '"><span class="ptx"><b>' + esc(x.nome) + '</b><small class="muted">' + esc(x.padre ? 'in ' + x.padre : x.gruppo || '') + '</small></span>' + (x.stato ? '<span class="et" style="background:' + x.stato.colore + '">' + esc(x.stato.nome) + '</span>' : '') + (x.data ? Z.T.data.mostra(x.data, null, null, x.avanzamento === 100) : '<span class="muted small">senza data</span>') + '</a>').join('') + '</div></section>').join('') : '<p class="vuoto muted">Nessuna attività assegnata a te' + (fatti ? '' : ' da completare') + '.</p>';
    };
    disegna();
    U.$('#mfatti', el).onchange = disegna;
    el.onclick = (e) => { const a = e.target.closest('[data-apri]'); if (a) { try { sessionStorage.setItem('zeno:apriEl', a.dataset.apri); } catch (er) { /* */ } } };
  }

  /* backup: contenuto della board con gli allegati, ripristinabile come copia */
  async function esporta(d) {
    const b = await D.zeno.carica(d.id), file = {};
    for (const a of Object.values(b.allegati)) { if (!a.eliminato) { const u = await D.file.url(a.file).catch(() => null); if (u) file[a.file] = u; } }
    return { board: b, file };
  }
  async function importa(d, c) {
    const b = U.clone(c.board);
    for (const a of Object.values(b.allegati)) {
      if (c.file && c.file[a.file]) { const f = await D.file.carica(d.id, c.file[a.file], a.nome, a.tipo); a.file = f.id; } else a.eliminato = a.eliminato || U.ora();
    }
    await D.zeno.importa(d.id, b);
  }

  /* dati di prova: board di Simo condivisa con Giulia (Editor) e Marco (Lettore), board di Giulia condivisa con Simo */
  /* dati di prova (versione 4): board di Simo condivisa con Giulia (Editor) e Marco (Lettore), board di Giulia condivisa con Simo */
  async function semina({ D, entraCome, membro }) {
    for (const id of ['z-trasloco', 'z-blog']) { await N.KV.del('z:' + id); await D._mutaTab('documenti', (t) => { delete t[id]; }); await D._mutaTab('membri', (m) => { Object.keys(m).forEach((k) => { if (k.indexOf(id + '|') === 0) delete m[k]; }); }); }
    let og = 0;
    const g = (id, col, nome) => ({ t: 'crea', tab: 'gruppi', dati: { id, nome, colore: Z.COLORI[col], ordine: ++og } });
    const c = (id, nome, tipo, ordine, extra) => ({ t: 'crea', tab: 'colonne', dati: Object.assign({ id, nome, tipo, ordine }, extra || {}) });
    const e = (id, gr, nome, ordine, desc, padre) => ({ t: 'crea', tab: 'elementi', dati: Object.assign({ id, gruppo: gr, nome, ordine, descrizione: desc || '' }, padre ? { padre } : {}) });
    const v = (el, col, val) => ({ t: 'cella', el, col, v: val });
    const st = [{ id: 'da', nome: 'Da fare', colore: Z.COLORI[0] }, { id: 'in', nome: 'In corso', colore: Z.COLORI[1] }, { id: 'ok', nome: 'Fatto', colore: Z.COLORI[2], fatto: true }, { id: 'bl', nome: 'Bloccato', colore: Z.COLORI[3] }];
    const oggi = U.oggi(), gg = (n) => U.piuGiorni(oggi, n), per = (a, b) => ({ da: gg(a), a: gg(b) });

    entraCome('p-simo');
    const t = await D.documenti.crea('zeno', 'Trasloco', 'z-trasloco');
    await D.documenti.descrivi(t.id, 'Tutto quello che serve per il trasloco di dicembre, diviso per fasi.');
    await D.zeno.applica(t.id, [
      g('g-prima', 2, 'Prima del trasloco'), g('g-sett', 1, 'Settimana del trasloco'), g('g-dopo', 4, 'Dopo'),
      c('c-st', 'Stato', 'stato', 1, { opzioni: st, descrizione: 'Fatto conta come completato' }), c('c-chi', 'Owner', 'persona', 2), c('c-per', 'Periodo', 'timeline', 3), c('c-sc', 'Scadenza', 'data', 4),
      c('c-pri', 'Priorità', 'valutazione', 5), c('c-av', 'Avanzamento', 'avanzamento', 6, { descrizione: 'Calcolato dallo stato dei sotto-elementi' }), c('c-costo', 'Costo', 'numero', 7, { unita: '€' }),
      c('c-cat', 'Categoria', 'dropdown', 8, { opzioni: [{ id: 'casa', nome: 'Casa', colore: Z.COLORI[6] }, { id: 'doc', nome: 'Documenti', colore: Z.COLORI[4] }, { id: 'serv', nome: 'Servizi', colore: Z.COLORI[5] }] }),
      c('c-ric', 'Ricevuta', 'checkbox', 9), c('c-link', 'Link', 'link', 10),
      e('e1', 'g-prima', 'Preventivi ditte di trasloco', 1, 'Chiedere almeno tre preventivi, con e senza montaggio dei mobili.'), e('e2', 'g-prima', 'Disdetta contratto luce e gas', 2), e('e3', 'g-prima', 'Scatoloni e nastro adesivo', 3), e('e4', 'g-prima', 'Cambio di residenza', 4),
      e('e4a', 'g-prima', 'Modulo online', 1, '', 'e4'), e('e4b', 'g-prima', 'Visita dei vigili', 2, '', 'e4'),
      e('e5', 'g-sett', 'Smontare armadio camera', 1), e('e5a', 'g-sett', 'Svuotare cassetti', 1, '', 'e5'), e('e5b', 'g-sett', 'Smontare ante', 2, '', 'e5'), e('e5c', 'g-sett', 'Imballare ripiani', 3, '', 'e5'),
      e('e6', 'g-sett', 'Pulizia vecchia casa', 2), e('e7', 'g-sett', 'Lettura contatori', 3),
      e('e8', 'g-dopo', 'Attivazione internet', 1), e('e9', 'g-dopo', 'Aggiornare indirizzo in banca', 2), e('e10', 'g-dopo', 'Festa per gli amici', 3),
      v('e1', 'c-st', 'ok'), v('e1', 'c-chi', ['p-simo']), v('e1', 'c-per', per(-20, -6)), v('e1', 'c-sc', gg(-6)), v('e1', 'c-pri', 5), v('e1', 'c-cat', ['casa']), v('e1', 'c-ric', true), v('e1', 'c-costo', 1250.5),
      v('e2', 'c-st', 'in'), v('e2', 'c-chi', ['p-giulia']), v('e2', 'c-per', per(-4, 3)), v('e2', 'c-sc', gg(3)), v('e2', 'c-pri', 3), v('e2', 'c-cat', ['serv']),
      v('e3', 'c-st', 'ok'), v('e3', 'c-chi', ['p-simo']), v('e3', 'c-per', per(-10, -8)), v('e3', 'c-pri', 2), v('e3', 'c-costo', 48.9), v('e3', 'c-cat', ['casa']), v('e3', 'c-ric', true),
      v('e4', 'c-st', 'in'), v('e4', 'c-chi', ['p-simo']), v('e4', 'c-per', per(-3, 5)), v('e4', 'c-sc', gg(-1)), v('e4', 'c-pri', 4), v('e4', 'c-cat', ['doc']), v('e4', 'c-link', { url: 'https://www.anagrafenazionale.interno.it', testo: 'ANPR' }),
      v('e4a', 'c-st', 'ok'), v('e4a', 'c-chi', ['p-simo']), v('e4b', 'c-st', 'da'), v('e4b', 'c-chi', ['p-simo']), v('e4b', 'c-sc', gg(4)),
      v('e5', 'c-st', 'in'), v('e5', 'c-chi', ['p-simo', 'p-giulia']), v('e5', 'c-per', per(7, 9)), v('e5', 'c-sc', gg(9)), v('e5', 'c-pri', 3),
      v('e5a', 'c-st', 'ok'), v('e5a', 'c-chi', ['p-giulia']), v('e5b', 'c-st', 'in'), v('e5b', 'c-chi', ['p-simo']), v('e5c', 'c-st', 'da'),
      v('e6', 'c-st', 'bl'), v('e6', 'c-chi', ['p-giulia']), v('e6', 'c-per', per(10, 11)), v('e6', 'c-sc', gg(11)), v('e6', 'c-costo', 180), v('e6', 'c-pri', 2),
      v('e7', 'c-st', 'da'), v('e7', 'c-per', per(12, 12)), v('e7', 'c-sc', gg(12)), v('e7', 'c-cat', ['serv']), v('e7', 'c-pri', 1),
      v('e8', 'c-st', 'da'), v('e8', 'c-chi', ['p-simo']), v('e8', 'c-per', per(13, 16)), v('e8', 'c-sc', gg(15)), v('e8', 'c-cat', ['serv']), v('e8', 'c-costo', 29.9), v('e8', 'c-pri', 4),
      v('e9', 'c-chi', ['p-simo']), v('e9', 'c-cat', ['doc']), v('e9', 'c-per', per(14, 20)),
      v('e10', 'c-per', per(25, 25)), v('e10', 'c-pri', 1),
      { t: 'crea', tab: 'commenti', dati: { id: 'k1', elemento: 'e1', autore: 'p-simo', testo: 'Scelta la seconda ditta: comprende anche lo smontaggio della cucina.' } }
    ]);
    await membro(t.id, 'p-giulia', 'editor'); await membro(t.id, 'p-marco', 'lettore');
    entraCome('p-giulia');
    await D.zeno.applica(t.id, [{ t: 'crea', tab: 'commenti', dati: { id: 'k2', elemento: 'e6', autore: 'p-giulia', testo: 'Aspetto la conferma della data di consegna delle chiavi.' } }, { t: 'cella', el: 'e2', col: 'c-costo', v: 35 }]);
    const b = await D.documenti.crea('zeno', 'Idee per il blog', 'z-blog');
    await D.documenti.descrivi(b.id, 'Articoli in preparazione e già pubblicati.');
    await D.zeno.applica(b.id, [
      g('b-bozze', 1, 'Bozze'), g('b-pub', 2, 'Pubblicati'),
      c('b-st', 'Stato', 'stato', 1, { opzioni: [{ id: 'idea', nome: 'Idea', colore: Z.COLORI[0] }, { id: 'scr', nome: 'In scrittura', colore: Z.COLORI[1] }, { id: 'rev', nome: 'In revisione', colore: Z.COLORI[4] }, { id: 'pub', nome: 'Pubblicato', colore: Z.COLORI[2], fatto: true }] }),
      c('b-aut', 'Owner', 'persona', 2), c('b-data', 'Uscita', 'data', 3), c('b-par', 'Parole', 'numero', 4, { decimali: 0 }), c('b-av', 'Avanzamento', 'avanzamento', 5),
      e('b1', 'b-bozze', 'Dieci app semplici per organizzarsi', 1), e('b1a', 'b-bozze', 'Scaletta', 1, '', 'b1'), e('b1b', 'b-bozze', 'Prima stesura', 2, '', 'b1'), e('b1c', 'b-bozze', 'Immagini', 3, '', 'b1'),
      e('b2', 'b-bozze', 'Come preparare un viaggio leggero', 2), e('b3', 'b-pub', 'Perché scrivere a mano aiuta a ricordare', 1),
      v('b1', 'b-st', 'scr'), v('b1', 'b-aut', ['p-simo']), v('b1', 'b-data', gg(5)), v('b1', 'b-par', 900), v('b1a', 'b-st', 'pub'), v('b1b', 'b-st', 'scr'), v('b1c', 'b-st', 'idea'),
      v('b2', 'b-st', 'idea'), v('b2', 'b-aut', ['p-giulia']),
      v('b3', 'b-st', 'pub'), v('b3', 'b-aut', ['p-giulia']), v('b3', 'b-data', gg(-12)), v('b3', 'b-par', 1400)
    ]);
    await membro(b.id, 'p-simo', 'editor');
  }

  N.Shell.avvia({
    app: 'zeno', nome: 'zeno', titoloInVista: true, versioneSemina: 4, versione: '0.4', aiutoHome: 'board', guida: Z.GUIDA, motto: 'Board di lavoro semplici, da condividere con pochi collaboratori.', logo: LOGO, icoDoc: ico('table'),
    titoloHome: 'Board', nuovo: 'Nuova board', vuoto: 'Nessuna board. Creane una con "Nuova board".',
    azioniHome: '<a class="btn" href="#/p/mie">' + ico('check') + 'Le mie attività</a>',
    semina,
    creaContenuto: async (d) => { await D.zeno.applica(d.id, scheletro((e1, cp) => [{ t: 'cella', el: e1, col: cp, v: [N.Shell.utente.id] }])); },
    apri: (doc, el, shell) => Z.apriBoard(doc, el, shell),
    pagine: { mie: { disegna: mie } },
    esportaContenuto: esporta, importaContenuto: importa
  });
})(window.N = window.N || {});
