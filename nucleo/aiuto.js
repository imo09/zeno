/* nucleo - spiegazioni: icone "i" con una nuvoletta breve e la Guida a paragrafi, come in sestante.
   Le icone si spengono nelle Impostazioni; la Guida resta sempre raggiungibile da lì. */
(function (N) {
  'use strict';
  const U = N.U, UI = N.UI, esc = U.esc, ico = UI.ico;
  const PAR = [['serve', 'A cosa serve'], ['come', 'Come funziona'], ['opzioni', 'Opzioni'], ['esempio', 'Esempio'], ['attenzione', 'Attenzione']];

  const A = {
    capitoli: [],
    /* capitoli comuni alle due app; ogni app aggiunge i suoi prima di questi */
    COMUNI: [
      { id: 'accesso', titolo: 'Accesso', breve: 'Entri con la tua email: ricevi un codice a 6 cifre, oppure apri il link dell\'email.',
        serve: 'Riconosce chi sei, così vedi solo i documenti tuoi e quelli condivisi con te.',
        come: 'Scrivi l\'email, premi "Invia il codice" e digita il codice ricevuto. Sul telefono, con l\'app installata, il codice è più comodo del link.',
        attenzione: 'In modalità prova il codice compare a schermo e puoi entrare come Simo, Giulia o Marco per provare i ruoli.' },
      { id: 'condivisione', titolo: 'Condivisione e ruoli', breve: 'Inviti dalla rubrica o con un link; ogni persona ha un ruolo: Proprietario, Editor o Lettore.',
        serve: 'Decide chi vede e chi modifica un documento.',
        come: 'Dal pulsante Condividi scegli un contatto e il ruolo, oppure crei un link con ruolo e scadenza. Chi non ha ancora un account riceve un invito che si attiva al primo accesso.',
        opzioni: 'Proprietario: tutto, compresi inviti, ruoli e cestino. Editor: modifica i contenuti. Lettore: legge, esporta e commenta.',
        attenzione: 'Un link vale per chiunque lo riceva finché non scade o lo revochi.' },
      { id: 'rubrica', titolo: 'Rubrica', breve: 'I tuoi collaboratori, gli stessi in zeno e in iris.',
        serve: 'Ti evita di riscrivere le email ogni volta che condividi.',
        come: 'Dal menu del tuo profilo apri Rubrica e aggiungi nome ed email esatta. Non esiste un elenco pubblico degli utenti.' },
      { id: 'sincronizzazione', titolo: 'Sincronizzazione e offline', breve: 'Il pulsante in alto dice se tutto è salvato, se ci sono modifiche in coda o se sei offline.',
        serve: 'Puoi lavorare anche senza rete: le modifiche restano in coda e partono al rientro.',
        come: 'Ogni modifica si salva subito sul dispositivo e poi sul server. Se nel frattempo qualcun altro ha cambiato la stessa cella di zeno, l\'app ti fa scegliere quale versione tenere; in iris le modifiche si fondono da sole.',
        opzioni: '"Simula offline" serve a provare questo comportamento in modalità prova.',
        attenzione: 'In modalità prova i dati restano in questo browser: tempo reale e presenza funzionano tra schede dello stesso browser.' },
      { id: 'backup', titolo: 'Backup', breve: 'Un file con tutti i tuoi documenti, da conservare dove vuoi.',
        serve: 'È la tua copia di sicurezza, anche se il servizio avesse problemi.',
        come: 'Dal menu del profilo apri Backup e premi "Scarica backup". "Ripristina da file" aggiunge i documenti come copie, senza toccare quelli esistenti.',
        attenzione: 'La pagina iniziale ti ricorda il backup se l\'ultimo ha più di 7 giorni.' },
      { id: 'impostazioni', titolo: 'Impostazioni e spiegazioni', breve: 'Tema, icone "i" e questa Guida.',
        serve: 'Adatta l\'app a come ti trovi meglio.',
        come: 'Dal menu del profilo apri Impostazioni. Lì scegli il tema, accendi o spegni le icone "i" e apri la Guida.',
        attenzione: 'Spegnere le icone non toglie la Guida: resta sempre nelle Impostazioni.' }
    ],
    attive() { return (((N.Shell || {}).utente || {}).preferenze || {}).spiegazioni !== false; },
    /* l'icona da mettere accanto a una funzione; vuota se le spiegazioni sono spente */
    i(id) { return A.attive() && A.trova(id) ? '<button class="ibtn" data-aiuto="' + id + '" data-pop aria-label="Spiegazione" title="Spiegazione">i</button>' : ''; },
    trova(id) { return A.capitoli.find((c) => c.id === id); },
    nuvoletta(b) {
      const c = A.trova(b.dataset.aiuto); if (!c) return;
      const p = UI.pop(b, '<div class="nuv"><b>' + esc(c.titolo) + '</b><p>' + esc(c.breve) + '</p><button class="btn sm link" data-guida="' + c.id + '">Leggi nella guida</button></div>', { noFocus: true, destra: false });
      p.querySelector('[data-guida]').onclick = () => { UI.chiudiPop(); A.guida(c.id); };
    },
    guida(id) {
      const w = UI.modale('<h2>Guida di ' + esc(N.Shell.cfg.nome) + '</h2><div class="guida"><nav class="gindice">' + A.capitoli.map((c) => '<button data-cap="' + c.id + '">' + esc(c.titolo) + '</button>').join('') + '</nav><div class="gtesto">' +
        A.capitoli.map((c) => '<section id="cap-' + c.id + '"><h3>' + esc(c.titolo) + '</h3><p class="gbreve">' + esc(c.breve) + '</p>' + PAR.filter(([k]) => c[k]).map(([k, t]) => '<p><b>' + t + '.</b> ' + esc(c[k]) + '</p>').join('') + '</section>').join('') + '</div></div>', { classe: 'larga' });
      const testo = w.el.querySelector('.gtesto');
      const vai = (k) => { const s = w.el.querySelector('#cap-' + k); if (s) { testo.scrollTop = s.offsetTop - testo.offsetTop; U.$$('[data-cap]', w.el).forEach((x) => x.classList.toggle('on', x.dataset.cap === k)); } };
      w.el.querySelector('.gindice').onclick = (e) => { const b = e.target.closest('[data-cap]'); if (b) vai(b.dataset.cap); };
      if (id) setTimeout(() => vai(id), 30);
    }
  };
  if (typeof document !== 'undefined') document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-aiuto]'); if (!b) return;
    e.preventDefault(); e.stopPropagation(); A.nuvoletta(b);
  }, true);

  N.Aiuto = A;
})(window.N = window.N || {});
