/* zeno - copia locale della board, coda delle modifiche ("posta in uscita"), invio e conflitti per cella
   (punti 144, 168, 274-279). Lo schermo non aspetta mai la rete: ogni modifica si applica subito qui. */
(function (N) {
  'use strict';
  const U = N.U, D = N.D, UI = N.UI;
  const Z = N.Z = N.Z || {};

  class Board {
    constructor(doc, utente) {
      this.id = doc.id; this.doc = doc; this.utente = utente; this.dati = null; this.coda = []; this.inviando = false;
      this.conflitti = []; this.nonInviate = []; this.asc = []; this.cambiate = new Set();
      this.chiaveCoda = 'zcoda:' + utente.id + ':' + doc.id;
    }
    on(f) { this.asc.push(f); }
    avvisa(why) { this.asc.forEach((f) => f(why)); }
    get puoModificare() { return this.doc.ruolo !== 'lettore'; }
    salvaCoda() { try { sessionStorage.setItem(this.chiaveCoda, JSON.stringify(this.coda)); } catch (e) { /* */ } N.Sync.imposta({ attesa: this.coda.length }); }

    async carica() {
      const server = await D.zeno.carica(this.id);
      const prima = this.dati;
      try { this.coda = JSON.parse(sessionStorage.getItem(this.chiaveCoda) || '[]'); } catch (e) { this.coda = []; }
      this.coda.forEach((op) => Board.applica(server, op, this.utente.id));
      this.cambiate = new Set();
      if (prima) Object.keys(server.celle).forEach((k) => { if (!prima.celle[k] || prima.celle[k].ver !== server.celle[k].ver) this.cambiate.add(k); });
      this.dati = server; this.ricalcola(); N.Sync.imposta({ attesa: this.coda.length });
      return this;
    }

    /* applica un'operazione alla copia locale, con la stessa logica del server ma senza controlli */
    static applica(b, op, uid) {
      const ora = U.ora();
      if (op.t === 'cella') { const k = op.el + '|' + op.col, cur = b.celle[k]; b.celle[k] = { v: op.v, ver: cur ? cur.ver : 0, da: uid, il: ora, locale: true }; }
      else if (op.t === 'crea') b[op.tab][op.dati.id] = Object.assign({ creato: ora, da: uid }, op.dati);
      else if (op.t === 'agg' && b[op.tab][op.id]) b[op.tab][op.id] = Object.assign({}, b[op.tab][op.id], op.dati);
    }

    /* accoda: due modifiche della stessa cella in coda diventano una sola, con la versione di partenza */
    invia(ops) {
      ops = [].concat(ops);
      ops.forEach((op) => {
        if (op.t === 'cella' && op.base === undefined) op.base = (this.dati.celle[op.el + '|' + op.col] || {}).ver || 0;
        Board.applica(this.dati, op, this.utente.id);
        const doppia = op.t === 'cella' && this.coda.find((x) => x.t === 'cella' && x.el === op.el && x.col === op.col);
        if (doppia) { doppia.v = op.v; if (op.forza) doppia.forza = true; }
        else this.coda.push(op);
      });
      this.salvaCoda(); this.ricalcola(); this.avvisa('locale');
      this.svuota();
    }
    cella(el, col) { return (this.dati.celle[el + '|' + col] || {}).v; }

    async svuota() {
      if (this.inviando || N.Sync.offline || !this.coda.length) return;
      this.inviando = true;
      const ops = this.coda.slice();
      try {
        const esito = await D.zeno.applica(this.id, ops);
        this.coda = this.coda.slice(ops.length); this.salvaCoda();
        this.conflitti = this.conflitti.concat(esito.conflitti);
        if (esito.rifiutate.length) { this.nonInviate = this.nonInviate.concat(esito.rifiutate); this.avvisa('rifiutate'); }
        await this.carica();
        this.avvisa('server');
        if (this.conflitti.length) this.avvisa('conflitti');
      } catch (e) {
        UI.errore(e);
      } finally { this.inviando = false; }
      if (this.coda.length && !N.Sync.offline) setTimeout(() => this.svuota(), 400);
    }

    ricalcola() { this.calc = D.zeno.calcola(this.dati); }
    /* elementi visibili in ordine, con eliminati esclusi; i sotto-elementi hanno "padre" */
    gruppi() { return U.ordina(Object.values(this.dati.gruppi).filter((g) => !g.eliminato)); }
    colonne() { return U.ordina(Object.values(this.dati.colonne).filter((c) => !c.eliminato)); }
    elementi(gruppo) { return U.ordina(Object.values(this.dati.elementi).filter((e) => !e.eliminato && !e.padre && (!gruppo || e.gruppo === gruppo))); }
    figli(id) { return U.ordina(Object.values(this.dati.elementi).filter((e) => !e.eliminato && e.padre === id)); }
    /* valore da mostrare: per l'avanzamento è calcolato, per le altre colonne è la cella */
    valore(el, c) { return c.tipo === 'avanzamento' ? (this.calc.elementi[el] || 0) : this.cella(el, c.id); }
    fatto(el) { return this.calc.elementi[el] === 100; }
    prossimoOrdine(tab, filtro) { const l = Object.values(this.dati[tab]).filter(filtro || (() => true)); return l.length ? Math.max.apply(null, l.map((x) => x.ordine || 0)) + 1 : 1; }
  }
  Z.Board = Board;
})(window.N = window.N || {});
