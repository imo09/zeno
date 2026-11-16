/* nucleo - componenti di interfaccia: icone, avatar, avvisi, finestre, menu a comparsa */
(function (N) {
  'use strict';
  const U = N.U, esc = U.esc;
  const UI = {};

  const P = {
    plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', check: '<path d="M5 12l5 5 9-10"/>',
    menu: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>', users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3 3 0 0 1 0 6M21 20c0-2.8-1.8-5-4-5.7"/>',
    book: '<path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z"/><path d="M5 18a2 2 0 0 1 2-2h11"/>',
    down: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', up: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    cloud: '<path d="M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z"/>', cloudoff: '<path d="M7 18h10a4 4 0 0 0 2.5-.9M20.5 13A4 4 0 0 0 17.6 10 6 6 0 0 0 9 6M6 9.5A4.3 4.3 0 0 0 7 18M3 3l18 18"/>',
    sync: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M4 4v4h4M20 20v-4h-4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>', out: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', filter: '<path d="M4 5h16l-6 8v6l-4-2v-4z"/>', sort: '<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 10v10"/>', kanban: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="10" rx="1.5"/><rect x="17" y="4" width="4" height="13" rx="1.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', chat: '<path d="M4 5h16v11H9l-5 4z"/>', clip: '<path d="M20 11l-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7"/>',
    chev: '<path d="M9 6l6 6-6 6"/>', chevd: '<path d="M6 9l6 6 6-6"/>', back: '<path d="M15 6l-6 6 6 6"/>', home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>', file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>', grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    drag: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    timeline: '<path d="M3 6h8M7 12h10M5 18h7"/><path d="M3 3v18" opacity=".4"/>', alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'
  };
  UI.ico = (n, cls) => '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (P[n] || '') + '</svg>';

  UI.avatar = (p, size) => {
    p = p || {}; const s = size || 28; const nome = p.nome || p.email || '?';
    if (p.avatar) return '<span class="av" style="width:' + s + 'px;height:' + s + 'px" title="' + esc(nome) + '"><img src="' + esc(p.avatar) + '" alt=""></span>';
    return '<span class="av" style="width:' + s + 'px;height:' + s + 'px;background:' + U.colore(p.id || p.utente || p.email) + ';font-size:' + Math.round(s * 0.4) + 'px" title="' + esc(nome) + '">' + esc(U.iniziali(nome)) + '</span>';
  };
  UI.ruolo = (r) => ({ proprietario: 'Proprietario', editor: 'Editor', lettore: 'Lettore' }[r] || r);

  /* avvisi brevi, con azione facoltativa (es. Annulla) */
  UI.toast = (msg, tipo, azione) => {
    let box = U.$('#toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'toast ' + (tipo || '');
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (azione ? '<button class="tbtn">' + esc(azione.testo) + '</button>' : '');
    if (azione) t.querySelector('button').onclick = () => { azione.fai(); t.remove(); };
    box.appendChild(t); setTimeout(() => t.remove(), azione ? 6000 : 3800);
  };
  UI.errore = (e) => { console.warn(e); UI.toast(e && e.message ? e.message : 'Operazione non riuscita', 'bad'); };

  /* finestra modale: contenuto HTML, chiusura con Esc o clic fuori */
  UI.modale = (html, opz) => {
    opz = opz || {};
    const fondo = document.createElement('div'); fondo.className = 'mfondo';
    fondo.innerHTML = '<div class="modale ' + (opz.classe || '') + '" role="dialog" aria-modal="true"><button class="mx ib0" data-x aria-label="Chiudi">' + UI.ico('x') + '</button>' + html + '</div>';
    document.body.appendChild(fondo);
    const m = fondo.firstChild;
    const chiudi = () => { fondo.remove(); document.removeEventListener('keydown', esc1); if (opz.chiusa) opz.chiusa(); };
    const esc1 = (e) => { if (e.key === 'Escape' && document.body.lastElementChild === fondo) chiudi(); };
    document.addEventListener('keydown', esc1);
    fondo.addEventListener('mousedown', (e) => { if (e.target === fondo && !opz.ferma) chiudi(); });
    m.addEventListener('click', (e) => { if (e.target.closest('[data-x]')) chiudi(); });
    const f = m.querySelector('[autofocus]') || m.querySelector('input,select,textarea'); if (f) setTimeout(() => f.focus(), 30);
    return { el: m, chiudi };
  };
  UI.conferma = (titolo, testo, si, pericolo) => new Promise((ok) => {
    const w = UI.modale('<h2>' + esc(titolo) + '</h2><p class="muted">' + esc(testo) + '</p><div class="azioni"><button class="btn" data-x>Annulla</button><button class="btn ' + (pericolo ? 'pericolo' : 'pri') + '" data-si>' + esc(si || 'Conferma') + '</button></div>', { chiusa: () => ok(false), classe: 'stretta' });
    w.el.querySelector('[data-si]').onclick = () => { ok(true); w.el.parentNode.remove(); };
  });
  UI.chiedi = (titolo, valore, etichetta) => new Promise((ok) => {
    const w = UI.modale('<h2>' + esc(titolo) + '</h2><label class="campo"><span>' + esc(etichetta || 'Nome') + '</span><input value="' + esc(valore || '') + '" autofocus></label><div class="azioni"><button class="btn" data-x>Annulla</button><button class="btn pri" data-si>Salva</button></div>', { chiusa: () => ok(null), classe: 'stretta' });
    const i = w.el.querySelector('input'); setTimeout(() => i.select(), 40);
    const fatto = () => { ok(i.value); w.el.parentNode.remove(); };
    w.el.querySelector('[data-si]').onclick = fatto; i.onkeydown = (e) => { if (e.key === 'Enter') fatto(); };
  });

  /* menu a comparsa ancorato a un elemento; voci: {testo, ico, fai, pericolo} oppure '-' */
  let popAperto = null;
  UI.chiudiPop = () => { if (popAperto) { popAperto.remove(); popAperto = null; } };
  UI.pop = (ancora, contenuto, opz) => {
    UI.chiudiPop(); opz = opz || {};
    const p = document.createElement('div'); p.className = 'pop ' + (opz.classe || '');
    if (typeof contenuto === 'string') p.innerHTML = contenuto; else p.appendChild(contenuto);
    document.body.appendChild(p); popAperto = p;
    const r = ancora.getBoundingClientRect(), w = p.offsetWidth, h = p.offsetHeight;
    let x = opz.destra ? r.right - w : r.left, y = r.bottom + 4;
    if (x + w > innerWidth - 8) x = innerWidth - w - 8; if (x < 8) x = 8;
    if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 4);
    p.style.left = x + 'px'; p.style.top = y + 'px';
    setTimeout(() => { const f = p.querySelector('input'); if (f && !opz.noFocus) f.focus(); }, 20);
    return p;
  };
  UI.menu = (ancora, voci, opz) => {
    const p = UI.pop(ancora, '<div class="menu">' + voci.map((v, i) => v === '-' ? '<hr>' : '<button data-i="' + i + '" class="' + (v.pericolo ? 'pericolo' : '') + (v.attiva ? ' on' : '') + '"' + (v.disab ? ' disabled' : '') + '>' + (v.ico ? UI.ico(v.ico) : '') + '<span>' + esc(v.testo) + '</span></button>').join('') + '</div>', Object.assign({ destra: true }, opz));
    p.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (!b) return; UI.chiudiPop(); voci[+b.dataset.i].fai(); });
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('mousedown', (e) => { if (popAperto && !popAperto.contains(e.target) && !e.target.closest('[data-pop]')) UI.chiudiPop(); }, true);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') UI.chiudiPop(); });
  }

  N.UI = UI;
})(typeof window !== 'undefined' ? (window.N = window.N || {}) : (globalThis.N = globalThis.N || {}));
