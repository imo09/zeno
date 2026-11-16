/* zeno - tipi di colonna (punto 174, esteso nella 0.3): ogni tipo sa mostrare, confrontare, riassumere nel piede
   del gruppo e convertire da e verso CSV. La modifica la gestisce viste.js con l'editor indicato da "editor". */
(function (N) {
  'use strict';
  const U = N.U, UI = N.UI, esc = U.esc;
  const Z = N.Z = N.Z || {};

  const COLORI = ['#C9D1D3', '#EBC583', '#93CDBF', '#E2A098', '#B4C8E2', '#CBBDE2', '#C3DCA8', '#E9BDC8', '#F0DC9E', '#A3D0DE'];
  Z.COLORI = COLORI;
  const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  Z.MESI_LUNGHI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const opz = (col, id) => (col.opzioni || []).find((o) => o.id === id);
  const nomePers = (id, ctx) => ctx.nome(id);
  /* data breve: "16 feb", con l'anno solo se diverso da quello corrente */
  Z.breve = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return (+d) + ' ' + MESI[+m - 1] + (+y !== new Date().getFullYear() ? ' ' + y.slice(2) : ''); };
  Z.intervallo = (a, b) => !a ? '' : a === b || !b ? Z.breve(a) : Z.breve(a) + ' - ' + Z.breve(b);
  const giorni = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
  const batteria = (conteggi, tot) => tot ? '<span class="batt" title="' + esc(conteggi.map((c) => c.nome + ': ' + c.n).join(', ')) + '">' + conteggi.filter((c) => c.n).map((c) => '<i style="width:' + (100 * c.n / tot) + '%;background:' + c.colore + '"></i>').join('') + '</span>' : '';
  const stelle = (v, ed) => '<span class="stelle' + (ed ? ' ed' : '') + '">' + [1, 2, 3, 4, 5].map((i) => '<i data-stella="' + i + '" class="' + (v >= i ? 'on' : '') + '">' + UI.ico('star') + '</i>').join('') + '</span>';
  Z.barra = (p) => '<span class="avz"><span class="avb"><i style="width:' + (p || 0) + '%"></i></span><b>' + (p || 0) + '%</b></span>';

  const T = {
    testo: {
      nome: 'Testo', ico: 'list', editor: 'input',
      mostra: (v) => v ? '<span class="tx">' + esc(v) + '</span>' : '',
      confronta: (a, b) => String(a || '').localeCompare(String(b || ''), 'it'),
      csv: (v) => v || '', daCsv: (s) => s || null, vuoto: (v) => !v
    },
    stato: {
      nome: 'Stato', ico: 'check', editor: 'etichetta',
      mostra: (v, col) => { const o = opz(col, v); return o ? '<span class="et" style="background:' + o.colore + '">' + esc(o.nome) + '</span>' : '<span class="et vuota"></span>'; },
      confronta: (a, b, col) => { const l = col.opzioni || []; return l.findIndex((o) => o.id === a) - l.findIndex((o) => o.id === b); },
      csv: (v, col) => (opz(col, v) || {}).nome || '',
      daCsv: (s, col) => { const o = (col.opzioni || []).find((x) => x.nome.toLowerCase() === String(s).trim().toLowerCase()); return o ? o.id : null; },
      vuoto: (v) => !v,
      piede: (vals, col) => { const c = (col.opzioni || []).map((o) => ({ nome: o.nome, colore: o.colore, n: vals.filter((v) => v === o.id).length })); c.push({ nome: 'Vuoto', colore: 'var(--line)', n: vals.filter((v) => !opz(col, v)).length }); return batteria(c, vals.length); }
    },
    persona: {
      nome: 'Owner', ico: 'user', editor: 'persone',
      mostra: (v, col, ctx) => (v || []).length ? '<span class="avs">' + v.slice(0, 3).map((id) => UI.avatar(ctx.profilo(id), 24)).join('') + (v.length > 3 ? '<span class="chip">+' + (v.length - 3) + '</span>' : '') + (v.length === 1 ? '<span class="pn">' + esc(nomePers(v[0], ctx).split(' ')[0]) + '</span>' : '') + '</span>' : '<span class="avvuoto">' + UI.ico('user') + '</span>',
      confronta: (a, b, col, ctx) => T.persona.csv(a, col, ctx).localeCompare(T.persona.csv(b, col, ctx), 'it'),
      csv: (v, col, ctx) => (v || []).map((id) => nomePers(id, ctx)).join(', '),
      daCsv: (s, col, ctx) => { const n = String(s || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean); const ids = ctx.membri().filter((m) => n.includes(String(m.nome).toLowerCase()) || n.includes(String(m.email).toLowerCase())).map((m) => m.utente); return ids.length ? ids : null; },
      vuoto: (v) => !v || !v.length,
      piede: (vals, col, ctx) => { const s = Array.from(new Set([].concat.apply([], vals.map((v) => v || [])))); return s.length ? '<span class="avs">' + s.slice(0, 4).map((id) => UI.avatar(ctx.profilo(id), 22)).join('') + (s.length > 4 ? '<span class="chip">+' + (s.length - 4) + '</span>' : '') + '</span>' : ''; }
    },
    timeline: {
      nome: 'Periodo', ico: 'cal', editor: 'periodo',
      mostra: (v) => {
        if (!v || !v.da) return '';
        const a = v.a || v.da, oggi = U.oggi(), tot = giorni(v.da, a) + 1;
        const f = oggi < v.da ? 0 : oggi > a ? 1 : (giorni(v.da, oggi) + 1) / tot;
        return '<span class="tl' + (oggi > a ? ' passata' : '') + '" title="' + U.data(v.da) + ' - ' + U.data(a) + ' (' + tot + ' giorni)"><i style="width:' + Math.round(f * 100) + '%"></i><span>' + esc(Z.intervallo(v.da, a)) + '</span></span>';
      },
      confronta: (a, b) => String((a || {}).da || '9999').localeCompare(String((b || {}).da || '9999')),
      csv: (v) => v && v.da ? U.data(v.da) + ' - ' + U.data(v.a || v.da) : '',
      daCsv: (s) => { const p = String(s || '').split(/\s+-\s+|\s*->\s*/); const da = U.leggiData(p[0]); if (!da) return null; const a = U.leggiData(p[1] || p[0]) || da; return da <= a ? { da, a } : { da: a, a: da }; },
      vuoto: (v) => !v || !v.da,
      piede: (vals) => { const l = vals.filter((v) => v && v.da); if (!l.length) return ''; const da = l.map((v) => v.da).sort()[0], a = l.map((v) => v.a || v.da).sort().pop(); return '<span class="rng">' + esc(Z.intervallo(da, a)) + '</span>'; }
    },
    data: {
      nome: 'Data', ico: 'cal', editor: 'data',
      mostra: (v, col, ctx, fatto) => { if (!v) return ''; const scad = v < U.oggi() && !fatto; return '<span class="dt' + (scad ? ' scad' : v === U.oggi() ? ' oggi' : '') + '">' + (scad ? UI.ico('alert') : '') + U.data(v) + '</span>'; },
      confronta: (a, b) => String(a || '9999').localeCompare(String(b || '9999')),
      csv: (v) => U.data(v), daCsv: (s) => U.leggiData(s), vuoto: (v) => !v,
      piede: (vals) => { const l = vals.filter(Boolean).sort(); return l.length ? '<span class="rng">' + esc(Z.intervallo(l[0], l[l.length - 1])) + '</span>' : ''; }
    },
    valutazione: {
      nome: 'Priorità', ico: 'star', editor: 'stelle',
      mostra: (v, col, ctx) => stelle(v || 0, ctx && ctx.puoModificare),
      confronta: (a, b) => (a || 0) - (b || 0),
      csv: (v) => v ? String(v) : '', daCsv: (s) => { const n = Math.round(U.leggiNum(s)); return n >= 1 && n <= 5 ? n : null; }, vuoto: (v) => !v,
      piede: (vals) => { const l = vals.filter(Boolean); return l.length ? '<span class="mstella">' + UI.ico('star') + U.num(l.reduce((a, b) => a + b, 0) / l.length, 1) + '</span>' : ''; }
    },
    avanzamento: {
      nome: 'Avanzamento', ico: 'sync', editor: null, calcolata: true,
      mostra: (v) => Z.barra(v),
      confronta: (a, b) => (a || 0) - (b || 0),
      csv: (v) => (v || 0) + '%', daCsv: () => null, vuoto: () => false,
      piede: (vals) => vals.length ? Z.barra(Math.round(vals.reduce((a, b) => a + (b || 0), 0) / vals.length)) : ''
    },
    numero: {
      nome: 'Numero', ico: 'sort', editor: 'input',
      mostra: (v, col) => v === null || v === undefined || v === '' ? '' : '<span class="nm mono">' + U.num(v, col.decimali === undefined ? 2 : col.decimali) + (col.unita ? ' ' + esc(col.unita) : '') + '</span>',
      confronta: (a, b) => (a == null ? -Infinity : a) - (b == null ? -Infinity : b),
      csv: (v, col) => v == null ? '' : U.num(v, col.decimali === undefined ? 2 : col.decimali).replace(/\./g, ''),
      daCsv: (s) => U.leggiNum(s), vuoto: (v) => v === null || v === undefined || v === '',
      piede: (vals, col) => { const l = vals.filter((v) => typeof v === 'number'); return l.length ? '<span class="somma"><b class="mono">' + U.num(l.reduce((a, b) => a + b, 0), col.decimali === undefined ? 2 : col.decimali) + (col.unita ? ' ' + esc(col.unita) : '') + '</b><small>somma</small></span>' : ''; }
    },
    dropdown: {
      nome: 'Etichette', ico: 'chevd', editor: 'multi',
      mostra: (v, col) => (v || []).map((id) => { const o = opz(col, id); return o ? '<span class="tag" style="border-color:' + o.colore + ';background:' + o.colore + '66">' + esc(o.nome) + '</span>' : ''; }).join(''),
      confronta: (a, b, col) => T.dropdown.csv(a, col).localeCompare(T.dropdown.csv(b, col), 'it'),
      csv: (v, col) => (v || []).map((id) => (opz(col, id) || {}).nome).filter(Boolean).join(', '),
      daCsv: (s, col) => { const n = String(s || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean); const ids = (col.opzioni || []).filter((o) => n.includes(o.nome.toLowerCase())).map((o) => o.id); return ids.length ? ids : null; },
      vuoto: (v) => !v || !v.length,
      piede: (vals, col) => { const tutti = [].concat.apply([], vals.map((v) => v || [])); return batteria((col.opzioni || []).map((o) => ({ nome: o.nome, colore: o.colore, n: tutti.filter((x) => x === o.id).length })), tutti.length); }
    },
    checkbox: {
      nome: 'Casella', ico: 'check', editor: 'toggle',
      mostra: (v) => '<span class="cb' + (v ? ' on' : '') + '">' + (v ? UI.ico('check') : '') + '</span>',
      confronta: (a, b) => (a ? 1 : 0) - (b ? 1 : 0),
      csv: (v) => v ? 'Sì' : 'No', daCsv: (s) => /^(s[iì]|x|1|true|vero)$/i.test(String(s).trim()), vuoto: (v) => !v,
      piede: (vals) => vals.length ? '<span class="muted small">' + vals.filter(Boolean).length + ' / ' + vals.length + '</span>' : ''
    },
    link: {
      nome: 'Link', ico: 'link', editor: 'link',
      mostra: (v) => v && v.url ? '<a class="lk" href="' + esc(/^https?:\/\//.test(v.url) ? v.url : 'https://' + v.url) + '" target="_blank" rel="noopener" data-lk>' + UI.ico('link') + esc(v.testo || v.url.replace(/^https?:\/\//, '')) + '</a>' : '',
      confronta: (a, b) => String((a || {}).testo || (a || {}).url || '').localeCompare(String((b || {}).testo || (b || {}).url || ''), 'it'),
      csv: (v) => v && v.url ? (v.testo && v.testo !== v.url ? v.testo + ' (' + v.url + ')' : v.url) : '',
      daCsv: (s) => { s = String(s || '').trim(); if (!s) return null; const m = s.match(/^(.*)\((https?:\/\/[^)]+)\)$/); return m ? { testo: m[1].trim(), url: m[2] } : { url: s, testo: '' }; },
      vuoto: (v) => !v || !v.url
    }
  };
  Z.T = T;
  Z.TIPI = ['stato', 'persona', 'timeline', 'data', 'valutazione', 'avanzamento', 'numero', 'testo', 'dropdown', 'checkbox', 'link'];

  /* filtri (punto 178): operatori per tipo */
  const NUM = [['>', 'maggiore di'], ['<', 'minore di'], ['=', 'uguale a']];
  Z.OPERATORI = {
    testo: [['contiene', 'contiene'], ['vuoto', 'è vuoto'], ['pieno', 'non è vuoto']],
    link: [['vuoto', 'è vuoto'], ['pieno', 'non è vuoto']],
    stato: [['uno', 'è'], ['nonuno', 'non è'], ['vuoto', 'è vuoto']],
    dropdown: [['ha', 'contiene'], ['vuoto', 'è vuoto']],
    persona: [['ha', 'include'], ['vuoto', 'nessuno']],
    data: [['prima', 'prima del'], ['dopo', 'dopo il'], ['scaduta', 'è scaduta'], ['settimana', 'entro 7 giorni'], ['vuoto', 'è vuota']],
    timeline: [['incorso', 'in corso oggi'], ['scaduta', 'è finito'], ['settimana', 'inizia entro 7 giorni'], ['vuoto', 'è vuoto']],
    numero: NUM.concat([['vuoto', 'è vuoto']]),
    valutazione: NUM.concat([['vuoto', 'nessuna']]),
    avanzamento: NUM,
    checkbox: [['si', 'spuntata'], ['no', 'non spuntata']]
  };
  Z.SENZA_VALORE = ['vuoto', 'pieno', 'scaduta', 'settimana', 'si', 'no', 'incorso'];
  Z.passa = (f, v, col, ctx) => {
    const t = T[col.tipo]; const vu = t.vuoto(v); const oggi = U.oggi();
    if (col.tipo === 'timeline' && !vu) {
      if (f.op === 'incorso') return v.da <= oggi && (v.a || v.da) >= oggi;
      if (f.op === 'scaduta') return (v.a || v.da) < oggi;
      if (f.op === 'settimana') return v.da >= oggi && v.da <= U.piuGiorni(oggi, 7);
    }
    switch (f.op) {
      case 'vuoto': return vu; case 'pieno': return !vu;
      case 'contiene': return String(t.csv(v, col, ctx)).toLowerCase().includes(String(f.val || '').toLowerCase());
      case 'uno': return v === f.val; case 'nonuno': return v !== f.val;
      case 'ha': return (v || []).includes(f.val === 'io' ? ctx.io() : f.val);
      case 'prima': return !vu && v < f.val; case 'dopo': return !vu && v > f.val;
      case 'scaduta': return !vu && v < oggi; case 'settimana': return !vu && v >= oggi && v <= U.piuGiorni(oggi, 7);
      case 'incorso': return false;
      case '>': return !vu && v > U.leggiNum(f.val); case '<': return !vu && v < U.leggiNum(f.val); case '=': return !vu && v === U.leggiNum(f.val);
      case 'si': return !!v; case 'no': return !v;
      default: return true;
    }
  };
  /* "Fatto" conta come completato: è il valore che userà Meridian (punto 195) */
  Z.statoPredefinito = () => [
    { id: 'o-da', nome: 'Da fare', colore: COLORI[0] }, { id: 'o-in', nome: 'In corso', colore: COLORI[1] },
    { id: 'o-ok', nome: 'Fatto', colore: COLORI[2], fatto: true }, { id: 'o-bl', nome: 'Bloccato', colore: COLORI[3] }
  ];
})(window.N = window.N || {});
