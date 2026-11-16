/* nucleo - utilità comuni a zeno e iris: testo, date e numeri in formato italiano, CSV, file */
(function (N) {
  'use strict';
  const U = {};

  U.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.$ = (sel, el) => (el || document).querySelector(sel);
  U.$$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
  U.uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  U.codice = (n) => { const a = 'abcdefghijkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < (n || 10); i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
  U.ora = () => new Date().toISOString();
  U.debounce = (f, ms) => { let t; return function () { const a = arguments; clearTimeout(t); t = setTimeout(() => f.apply(this, a), ms); }; };
  U.clone = (o) => JSON.parse(JSON.stringify(o));
  U.ordina = (list, key) => list.slice().sort((a, b) => (a[key || 'ordine'] || 0) - (b[key || 'ordine'] || 0));

  /* date: memorizzate come aaaa-mm-gg, mostrate come gg/mm/aaaa */
  const p2 = (n) => String(n).padStart(2, '0');
  U.data = (iso) => { if (!iso) return ''; const s = String(iso).slice(0, 10).split('-'); return s.length === 3 ? s[2] + '/' + s[1] + '/' + s[0] : ''; };
  U.dataOra = (iso) => { if (!iso) return ''; const d = new Date(iso); return p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()); };
  U.oggi = () => { const d = new Date(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
  U.piuGiorni = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
  U.leggiData = (s) => {
    s = String(s || '').trim(); if (!s) return null;
    let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
    if (m) { let y = +m[3]; if (y < 100) y += 2000; const d = new Date(y, +m[2] - 1, +m[1]); if (d.getMonth() !== +m[2] - 1) return null; return y + '-' + p2(+m[2]) + '-' + p2(+m[1]); }
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[1] + '-' + m[2] + '-' + m[3];
    return null;
  };
  U.fa = (iso) => {
    if (!iso) return ''; const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return 'adesso'; if (s < 3600) return Math.floor(s / 60) + ' min fa'; if (s < 86400) return Math.floor(s / 3600) + ' h fa';
    if (s < 86400 * 7) return Math.floor(s / 86400) + ' g fa'; return U.data(iso);
  };

  /* numeri: virgola decimale, punto delle migliaia, due decimali */
  U.num = (v, dec) => {
    if (v === null || v === undefined || v === '' || isNaN(v)) return '';
    const d = dec === undefined ? 2 : dec;
    const [i, f] = Math.abs(+v).toFixed(d).split('.');
    return (v < 0 ? '-' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (d ? ',' + f : '');
  };
  U.leggiNum = (s) => {
    if (typeof s === 'number') return s; s = String(s || '').trim().replace(/\s|€/g, ''); if (!s) return null;
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    const n = Number(s); return isNaN(n) ? null : n;
  };

  /* CSV in formato italiano: separatore ";", virgolette doppie, BOM UTF-8 per Excel */
  U.csvScrivi = (righe) => '﻿' + righe.map((r) => r.map((c) => {
    const s = c == null ? '' : String(c);
    return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(';')).join('\r\n') + '\r\n';
  U.csvLeggi = (testo) => {
    testo = String(testo || '').replace(/^﻿/, '');
    const sep = (testo.split(/\r?\n/)[0] || '').split(';').length >= (testo.split(/\r?\n/)[0] || '').split(',').length ? ';' : ',';
    const out = []; let riga = [], campo = '', q = false;
    for (let i = 0; i < testo.length; i++) {
      const c = testo[i];
      if (q) {
        if (c === '"') { if (testo[i + 1] === '"') { campo += '"'; i++; } else q = false; }
        else campo += c;
      } else if (c === '"') q = true;
      else if (c === sep) { riga.push(campo); campo = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && testo[i + 1] === '\n') i++; riga.push(campo); out.push(riga); riga = []; campo = ''; }
      else campo += c;
    }
    if (campo !== '' || riga.length) { riga.push(campo); out.push(riga); }
    return out.filter((r) => r.some((c) => c.trim() !== ''));
  };

  /* persone */
  const COLORI = ['#2F9184', '#C99A4E', '#B4544A', '#4E7FA6', '#7A6AA8', '#5E8C4A', '#A8656F', '#3E7C8C'];
  U.colore = (id) => { let h = 0; String(id || '').split('').forEach((c) => { h = (h * 31 + c.charCodeAt(0)) >>> 0; }); return COLORI[h % COLORI.length]; };
  U.iniziali = (nome) => String(nome || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0] || '').join('').toUpperCase() || '?';

  /* file */
  U.scarica = (contenuto, nome, tipo) => {
    const blob = contenuto instanceof Blob ? contenuto : new Blob([contenuto], { type: tipo || 'application/octet-stream' });
    /* nell'anteprima pubblicata su claude.ai i download passano dalla capacità "downloads" */
    if (typeof window !== 'undefined' && window.__INLINE__ && window.claude && window.claude.use) {
      window.claude.use('downloads').then((d) => { if (!d) throw { code: 'unavailable' }; return d.save({ filename: nome, data: blob }); })
        .catch((e) => { if (e && e.code === 'declined') return; if (N.UI) N.UI.toast('In questa anteprima il download di questo file non è disponibile; nell\'app pubblicata sì', 'bad'); });
      return;
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  U.scegliFile = (accept, multiplo) => new Promise((ok) => {
    const i = document.createElement('input'); i.type = 'file'; if (accept) i.accept = accept; i.multiple = !!multiplo;
    i.onchange = () => ok(Array.from(i.files || [])); i.click();
  });
  U.leggiTesto = (f) => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsText(f); });
  U.leggiDataUrl = (f) => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(f); });
  /* immagini ridotte prima del salvataggio, per restare nello spazio gratuito */
  U.riduciImmagine = (f, lato) => new Promise((ok, ko) => {
    const img = new Image(); const url = URL.createObjectURL(f);
    img.onload = () => {
      const m = lato || 1600, k = Math.min(1, m / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      ok({ dataUrl: c.toDataURL(f.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85), larghezza: c.width, altezza: c.height });
    };
    img.onerror = ko; img.src = url;
  });
  U.peso = (b) => b < 1024 ? b + ' B' : b < 1048576 ? U.num(b / 1024, 0) + ' kB' : U.num(b / 1048576, 1) + ' MB';
  U.pesoDataUrl = (d) => Math.round((String(d).length - String(d).indexOf(',') - 1) * 3 / 4);

  N.U = U;
})(typeof window !== 'undefined' ? (window.N = window.N || {}) : (globalThis.N = globalThis.N || {}));
