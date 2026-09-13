/* ==========================================================================
   BIKA — Encomendas para levar
   Site estático, sem backend. O pedido é composto aqui e enviado por WhatsApp.
   Toda a carta vem de data/menu.json, todos os parâmetros de data/config.json.
   ========================================================================== */
(function () {
  'use strict';

  const I18N = window.BIKA_I18N || {};
  const LANGS = ['pt', 'en', 'fr'];
  const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  /* Deux services partagent ce code et la même carte :
     - 'takeaway' : index.html, le client vient chercher au balcão
     - 'salon'    : salao.html, a BIKA leva ao lugar do cliente no salão ao lado */
  const SERVICE = document.body.dataset.service === 'salon' ? 'salon' : 'takeaway';
  const isSalon = () => SERVICE === 'salon';
  const NS = isSalon() ? 'bika.salao.' : 'bika.';
  const STORE = {
    lang: 'bika.lang',
    name: 'bika.name',
    nif: 'bika.nif',
    cart: NS + 'cart.v1',
    payMethod: NS + 'paymethod',
    pending: NS + 'pending.v1',
    lastOrder: NS + 'last_order.v1',
    cache: NS + 'cache.v1',
  };
  const PENDING_TTL_MS = 6 * 60 * 60 * 1000;   // o último pedido fica visível 6 h
  const CART_TTL_MS = 24 * 60 * 60 * 1000;     // um saco de ontem é esvaziado
  const LAST_ORDER_TTL_MS = 90 * 24 * 60 * 60 * 1000; // « repetir o último pedido » só durante 90 dias
  const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sem I e O (confundem-se com 1 e 0)
  const URL_BUDGET = 1800;

  /* ---------- SVG icons ---------- */
  const ICON = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2m0 1.67c4.54 0 8.24 3.7 8.24 8.24s-3.7 8.24-8.24 8.24c-1.49 0-2.94-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24M8.53 7.33c-.16 0-.43.06-.66.31-.22.25-.87.86-.87 2.07 0 1.22.89 2.39 1 2.56.14.17 1.76 2.67 4.25 3.73.59.27 1.05.42 1.41.53.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.16-.48-.27-.25-.14-1.47-.74-1.69-.82-.23-.08-.37-.12-.56.12-.16.25-.64.81-.78.97-.15.17-.29.19-.53.07-.26-.13-1.06-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.12-.24-.01-.39.11-.5.11-.11.27-.29.37-.44.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.11-.56-1.35-.77-1.84-.2-.48-.4-.42-.56-.43-.14 0-.3-.01-.47-.01"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',
    sms: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    repeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  };

  /* ---------- safe storage ---------- */
  const mem = {};
  function sget(k) { try { const v = localStorage.getItem(k); return v == null ? (k in mem ? mem[k] : null) : v; } catch (e) { return k in mem ? mem[k] : null; } }
  function sset(k, v) { mem[k] = v; try { localStorage.setItem(k, v); } catch (e) { /* quota / private mode */ } }
  function sdel(k) { delete mem[k]; try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  function sjson(k) { try { const v = sget(k); return v ? JSON.parse(v) : null; } catch (e) { sdel(k); return null; } }

  /* ---------- state ---------- */
  const state = {
    lang: 'pt',
    menu: null,
    config: null,
    itemsById: {},
    catOfItem: {},
    cart: [],            // [{ key, id, choice, mods, qty }]
    promo: null,         // code de réduction appliqué
    pending: null,       // último pedido composto (código, mensagem, href…)
    previewCode: null,
    pickupChoice: 'asap',
    pickupSlot: null,
    stale: false,
    showcase: false,     // sem número WhatsApp válido
    paused: false,       // ordering.paused
    testNow: null,       // ?now=YYYY-MM-DDTHH:MM
    openSheet: null,
    lastFocus: null,
    view: 'menu',
  };
  const params = new URLSearchParams(location.search);

  /* ---------- helpers ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d; }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function toMin(hhmm) { const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim()); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
  function fmtTime(min) { return pad2(Math.floor(min / 60) % 24) + ':' + pad2(min % 60); }
  function ceilTo(v, step) { return Math.ceil(v / step) * step; }
  function range(from, to, step) { const out = []; for (let v = from; v <= to; v += step) out.push(v); return out; }
  // O último horário cai sempre na hora limite (ex. 14:50), mesmo fora do passo de 15 min.
  function withLast(slots, last, from) { if (last >= from && (!slots.length || slots[slots.length - 1] < last)) slots.push(last); return slots; }
  const moneyFmt = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
  function fmtMoney(c, plain) { const s = moneyFmt.format(c / 100); return plain ? s.replace(/[  ]/g, ' ') : s.replace(/[  ]/g, ' '); }
  function cents(price) { const n = Number(price); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN; }
  function clean(s, max) {
    return String(s == null ? '' : s)
      .replace(/[ -]+/g, ' ')
      .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '$1')
      .replace(/\s+/g, ' ').trim().slice(0, max);
  }

  /* En mode salon, une clé « salon.xxx » remplace « xxx » quand elle existe.
     Tous les autres textes restent communs aux deux services. */
  function t(key, vars) {
    const table = I18N[state.lang] || {};
    const base = I18N.pt || {};
    let s;
    if (isSalon()) { s = table['salon.' + key]; if (s == null) s = base['salon.' + key]; }
    if (s == null) s = table[key];
    if (s == null) s = base[key];
    if (s == null) return key;
    if (Array.isArray(s)) return s;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    return s;
  }
  function tr(obj) { // {pt,en,fr} -> texto na língua atual, nunca undefined
    if (obj == null) return '';
    if (typeof obj === 'string') return obj;
    return obj[state.lang] || obj.pt || obj.en || obj.fr || '';
  }
  function toast(msg, ms) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('is-visible'), ms || 2600);
  }

  /* ---------- config accessors ---------- */
  const cfg = () => state.config || {};
  const biz = () => cfg().business || {};
  const ord = () => cfg().ordering || {};
  const fb = () => cfg().fallbacks || {};
  function waDigits() {
    const dbg = cfg().debug && params.get('wa');
    const raw = String(dbg || biz().whatsapp_number || '');
    if (/x/i.test(raw)) return '';
    let d = raw.replace(/\D/g, '');
    if (d.startsWith('00')) d = d.slice(2);
    if (d.length < 9 || d.length > 15 || /^0+$/.test(d)) return '';
    return d;
  }
  function telHref() { const d = waDigits(); return d ? 'tel:+' + d : ''; }
  function phoneDisplay() { return biz().phone_display || (waDigits() ? '+' + waDigits() : ''); }
  function orderingOff() { return state.showcase || state.paused; }

  /* ---------- Lisbon time ---------- */
  function partsFor(date, tz) {
    const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    const p = {};
    f.formatToParts(date).forEach((x) => { if (x.type !== 'literal') p[x.type] = x.value; });
    const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
    return { date: p.year + '-' + p.month + '-' + p.day, y: +p.year, m: +p.month, d: +p.day, dow: dow < 0 ? 0 : dow, minutes: (Number(p.hour) % 24) * 60 + Number(p.minute) };
  }
  function nowLisbon() {
    if (state.testNow) return Object.assign({}, state.testNow);
    const tz = cfg().timezone || 'Europe/Lisbon';
    try { return partsFor(new Date(), tz); } catch (e) { return partsFor(new Date(), undefined); }
  }
  function parseTestNow() {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(params.get('now') || '');
    if (!m) return null;
    const dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return { date: m[1] + '-' + m[2] + '-' + m[3], y: +m[1], m: +m[2], d: +m[3], dow: dt.getUTCDay(), minutes: +m[4] * 60 + +m[5] };
  }
  function addDays(di, n) {
    const dt = new Date(Date.UTC(di.y, di.m - 1, di.d + n));
    return { date: dt.getUTCFullYear() + '-' + pad2(dt.getUTCMonth() + 1) + '-' + pad2(dt.getUTCDate()), y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), dow: dt.getUTCDay(), minutes: 0 };
  }
  function ddmm(di) { return pad2(di.d) + '/' + pad2(di.m); }

  function parseIntervals(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map((iv) => {
      if (Array.isArray(iv)) return { open: toMin(iv[0]), close: toMin(iv[1]) };
      if (iv && typeof iv === 'object') return { open: toMin(iv.open), close: toMin(iv.close) };
      return null;
    }).filter((iv) => iv && iv.open != null && iv.close != null && iv.close > iv.open).sort((a, b) => a.open - b.open);
  }
  function closureFor(di) {
    const list = Array.isArray(cfg().closures) ? cfg().closures : [];
    for (const c of list) {
      if (typeof c === 'string') { if (c === di.date) return { reason: null }; }
      else if (c && typeof c === 'object') {
        const from = c.from || c.date, to = c.to || c.from || c.date;
        if (from && to && di.date >= from && di.date <= to) return { reason: c.reason || null };
      }
    }
    return null;
  }
  function intervalsFor(di) {
    if (closureFor(di)) return [];
    const sp = cfg().special_hours && cfg().special_hours[di.date];
    if (Array.isArray(sp)) return parseIntervals(sp);
    return parseIntervals((cfg().hours || {})[DAY_KEYS[di.dow]]);
  }
  function effectivePrep(now) {
    const base = num(ord().prep_minutes, 15);
    let best = null;
    (Array.isArray(ord().rush) ? ord().rush : []).forEach((r) => {
      const days = Array.isArray(r.days) && r.days.length ? r.days : DAY_KEYS;
      const from = toMin(r.from), to = toMin(r.to);
      if (days.includes(DAY_KEYS[now.dow]) && from != null && to != null && now.minutes >= from && now.minutes < to) {
        const p = num(r.prep_minutes, base); if (best == null || p > best) best = p;
      }
    });
    return { prep: best == null ? base : best, rush: best != null };
  }

  /* Estado (aberto/fechado) e opções de levantamento. Tudo em minutos de Lisboa. */
  function computePickup() {
    const o = ord();
    const step = Math.max(5, num(o.slot_step_minutes, 15));
    const lastBefore = num(o.last_order_minutes_before_close, 15);
    const firstAfter = num(o.first_slot_minutes_after_open, 15);
    const preWindow = num(o.preorder_before_open_minutes, 60);
    const now = nowLisbon();
    const today = intervalsFor(now);
    const cur = today.find((i) => now.minutes >= i.open && now.minutes < i.close) || null;
    const later = today.find((i) => i.open > now.minutes) || null;
    const ep = effectivePrep(now);

    let nextOpen = null;
    if (later) nextOpen = { dayOffset: 0, di: now, open: later.open, close: later.close };
    else for (let k = 1; k <= 14; k++) { const di = addDays(now, k); const iv = intervalsFor(di); if (iv.length) { nextOpen = { dayOffset: k, di, open: iv[0].open, close: iv[0].close }; break; } }

    const res = { now, cur, later, nextOpen, prep: ep.prep, rush: ep.rush, openNow: !!cur, mode: 'blocked', asap: null, slots: [], dayOffset: 0, di: now, lastOrder: null, closure: closureFor(now) };

    if (cur) {
      const lastOrder = cur.close - lastBefore;
      res.lastOrder = lastOrder;
      const a = ceilTo(now.minutes + ep.prep, 5);
      if (a <= lastOrder) {
        res.mode = 'open'; res.asap = a;
        res.slots = withLast(range(ceilTo(a + 1, step), lastOrder, step), lastOrder, a + 1);
        return res;
      }
    }
    if (later && preWindow > 0 && now.minutes >= later.open - preWindow) {
      const slots = withLast(range(later.open + firstAfter, later.close - lastBefore, step), later.close - lastBefore, later.open + firstAfter);
      if (slots.length) { res.mode = 'today_later'; res.slots = slots; res.open = later.open; return res; }
    }
    if (nextOpen && nextOpen.dayOffset > 0 && o.allow_preorder_next_day === true) {
      const slots = withLast(range(nextOpen.open + firstAfter, nextOpen.close - lastBefore, step), nextOpen.close - lastBefore, nextOpen.open + firstAfter);
      if (slots.length) { res.mode = 'next_day'; res.slots = slots; res.dayOffset = nextOpen.dayOffset; res.di = nextOpen.di; res.open = nextOpen.open; return res; }
    }
    return res;
  }
  function resolvePickup(pk) {
    if (pk.mode === 'blocked') return null;
    if (pk.mode === 'open') {
      if (state.pickupChoice === 'slot' && pk.slots.includes(state.pickupSlot)) return { minutes: state.pickupSlot, dayOffset: 0, di: pk.now, asap: false };
      return { minutes: pk.asap, dayOffset: 0, di: pk.now, asap: true };
    }
    const m = pk.slots.includes(state.pickupSlot) ? state.pickupSlot : pk.slots[0];
    return { minutes: m, dayOffset: pk.dayOffset, di: pk.di, asap: false };
  }
  function dayLabel(dayOffset, di) {
    if (dayOffset === 0) return t('day.today');
    if (dayOffset === 1) return t('day.tomorrow');
    if (dayOffset <= 6) return t('day.names')[di.dow];
    return t('day.names')[di.dow] + ' ' + ddmm(di);
  }
  /* Libellé de l'heure de retrait en portugais : c'est ce que lit le comptoir. */
  function whenLabelPT(p) {
    if (!p) return '';
    const P = I18N.pt;
    const time = fmtTime(p.minutes);
    let day = P['msg.today'];
    if (p.dayOffset === 1) day = P['msg.tomorrow'] + ' ' + ddmm(p.di);
    else if (p.dayOffset > 1) day = P['day.short'][p.di.dow] + ' ' + ddmm(p.di);
    return day + ' às ' + time;
  }
  function whenLabel(p) {
    const time = fmtTime(p.minutes);
    if (p.dayOffset === 0) return t('order.when_today', { time });
    if (p.dayOffset === 1) return t('order.when_tomorrow', { date: ddmm(p.di), time });
    return t('order.when_day', { day: t('day.names')[p.di.dow], date: ddmm(p.di), time });
  }

  /* ---------- status chip ---------- */
  function renderStatus(pk) {
    const el = $('#status');
    pk = pk || computePickup();
    if (pk.openNow) {
      el.textContent = t('status.open', { close: fmtTime(pk.cur.close) });
      el.classList.remove('is-closed');
    } else {
      el.classList.add('is-closed');
      if (!pk.nextOpen) el.textContent = t('status.closed');
      else if (pk.nextOpen.dayOffset === 0) el.textContent = t('status.closed_today', { open: fmtTime(pk.nextOpen.open) });
      else el.textContent = t('status.closed_next', { day: dayLabel(pk.nextOpen.dayOffset, pk.nextOpen.di), open: fmtTime(pk.nextOpen.open) });
    }
    return pk;
  }

  /* ---------- data loading ---------- */
  async function fetchJSON(url) {
    const res = await fetch(url + '?v=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error(url + ' ' + res.status);
    return res.json();
  }
  /* Fusion profonde : config.salao.json ne contient que les différences. */
  function deepMerge(base, over) {
    if (!over || typeof over !== 'object' || Array.isArray(over)) return over === undefined ? base : over;
    const out = Object.assign({}, base);
    Object.keys(over).forEach((k) => {
      if (k === '_comment') return;
      const b = base ? base[k] : undefined;
      out[k] = (b && typeof b === 'object' && !Array.isArray(b)) ? deepMerge(b, over[k]) : over[k];
    });
    return out;
  }
  async function loadData() {
    const cached = sjson(STORE.cache);
    try {
      const jobs = [fetchJSON('data/menu.json'), fetchJSON('data/config.json')];
      if (isSalon()) jobs.push(fetchJSON('data/config.salao.json').catch(() => ({})));
      const [menu, baseConfig, salonConfig] = await Promise.all(jobs);
      if (!menu || !Array.isArray(menu.categories) || !baseConfig || typeof baseConfig !== 'object') throw new Error('shape');
      const config = isSalon() ? deepMerge(baseConfig, salonConfig || {}) : baseConfig;
      state.menu = menu; state.config = config; state.stale = false;
      sset(STORE.cache, JSON.stringify({ menu, config, at: Date.now() }));
    } catch (e) {
      console.warn('BIKA: falha ao carregar dados', e);
      if (cached && cached.menu && cached.config) { state.menu = cached.menu; state.config = cached.config; state.stale = true; }
      else throw e;
    }
    indexMenu();
  }
  function indexMenu() {
    state.itemsById = {}; state.catOfItem = {};
    (state.menu.categories || []).forEach((cat, ci) => {
      cat._station = cat.station || (/croiss|pastel|doce|bolo|padaria|bakery|kitchen|sandu|sande|tost|kubo|salgad|melt|chips|gelad|crolad/i.test(cat.id + ' ' + (cat.name && cat.name.pt)) ? 'kitchen' : 'bar');
      cat._index = ci;
      (cat.items || []).forEach((it) => {
        if (!it || !it.id) return;
        if (state.itemsById[it.id]) { console.warn('BIKA: id duplicado', it.id); return; }
        state.itemsById[it.id] = it; state.catOfItem[it.id] = cat;
      });
    });
  }

  /* ---------- availability ---------- */
  function soldOutToday(id) {
    const s = ord().sold_out_today;
    if (!s || !Array.isArray(s.item_ids) || !s.date) return false;
    return s.date === nowLisbon().date && s.item_ids.includes(id);
  }
  function itemVisible(it) { return !!it && it.hidden !== true; }
  function itemAvailable(it) { return itemVisible(it) && it.available !== false && !soldOutToday(it.id) && Number.isFinite(cents(it.price)); }
  function askStaff(it) { return it.ask_staff === true || (it.tags || []).includes('ask_staff'); }

  /* ---------- cart ---------- */
  function lineKey(id, choice, mods) { return id + '|' + (choice || '') + '|' + (mods || []).slice().sort().join(','); }
  function loadCart() {
    const c = sjson(STORE.cart);
    if (!c || !Array.isArray(c.lines)) { state.cart = []; return; }
    const tooOld = !c.updatedAt || Date.now() - c.updatedAt > CART_TTL_MS;
    state.cart = tooOld ? [] : c.lines.filter((l) => l && l.id && l.qty > 0).map((l) => ({ key: l.key, id: l.id, choice: l.choice || null, mods: Array.isArray(l.mods) ? l.mods : [], qty: Math.max(1, Math.floor(num(l.qty, 1))) }));
    state.promo = !tooOld && typeof c.promo === 'string' ? c.promo : null;
  }
  function saveCart() { sset(STORE.cart, JSON.stringify({ lines: state.cart, promo: state.promo || null, updatedAt: Date.now() })); }
  function reconcileCart() {
    const removed = [];
    state.cart = state.cart.filter((l) => {
      const it = state.itemsById[l.id];
      if (!itemAvailable(it)) { removed.push(l); return false; }
      if (it.choice && it.choice.options && l.choice && !it.choice.options.some((o) => o.id === l.choice)) { removed.push(l); return false; }
      if (it.choice && it.choice.options && it.choice.options.length && it.choice.required !== false && !l.choice) { removed.push(l); return false; }
      const mods = state.menu.modifiers || {};
      l.mods = (l.mods || []).filter((m) => mods[m] && (it.modifiers || []).includes(m));
      l.key = lineKey(l.id, l.choice, l.mods);
      return true;
    });
    // fundir linhas iguais
    const merged = [];
    state.cart.forEach((l) => { const e = merged.find((x) => x.key === l.key); if (e) e.qty += l.qty; else merged.push(l); });
    state.cart = merged;
    if (removed.length) {
      saveCart();
      // esgotado (artigo ainda na carta) ou desaparecido (carta mudou) : mensagens diferentes
      const known = removed.filter((l) => state.itemsById[l.id]).map((l) => tr(state.itemsById[l.id].name));
      const gone = removed.length - known.length;
      const msg = [known.length ? t('order.removed', { item: known.join(', ') }) : '', gone ? t('order.gone') : ''].filter(Boolean).join(' ');
      setTimeout(() => toast(msg, 4500), 600);
    }
  }
  function linePrice(l) {
    const it = state.itemsById[l.id]; if (!it) return 0;
    let p = cents(it.price); if (!Number.isFinite(p)) p = 0;
    if (it.choice && l.choice) { const o = it.choice.options.find((x) => x.id === l.choice); if (o && o.price) p += cents(o.price) || 0; }
    const mods = state.menu.modifiers || {};
    (l.mods || []).forEach((m) => { if (mods[m]) p += cents(mods[m].price) || 0; });
    return p;
  }
  function lineOptsText(l, lang) {
    const it = state.itemsById[l.id]; if (!it) return '';
    const parts = [];
    const pick = (o) => (lang ? (o && (o[lang] || o.pt)) || '' : tr(o));
    if (it.choice && l.choice) { const o = it.choice.options.find((x) => x.id === l.choice); if (o) parts.push(pick(o.name)); }
    const mods = state.menu.modifiers || {};
    (l.mods || []).forEach((m) => { if (mods[m]) parts.push(pick(mods[m].name)); });
    return parts.filter(Boolean).join(', ');
  }
  function cartCount() { return state.cart.reduce((a, l) => a + l.qty, 0); }
  function cartTotal() { return state.cart.reduce((a, l) => a + linePrice(l) * l.qty, 0); }
  function itemQty(id) { return state.cart.filter((l) => l.id === id).reduce((a, l) => a + l.qty, 0); }
  function hasOptions(it) { return !!((it.choice && it.choice.options && it.choice.options.length) || (it.modifiers && it.modifiers.length)); }
  function caps() { return { qty: num(ord().max_qty_per_item, 6), items: num(ord().max_items_per_order, 12), lines: num(ord().max_lines, 10) }; }

  function addLine(id, choice, mods, qty, quiet) {
    const it = state.itemsById[id]; if (!itemAvailable(it)) return false;
    const c = caps();
    const key = lineKey(id, choice, mods);
    let l = state.cart.find((x) => x.key === key);
    if (!l && state.cart.length >= c.lines) { toast(t('order.max_lines', { n: c.lines }), 3500); return false; }
    const room = Math.min(c.qty - itemQty(id), c.items - cartCount());
    if (room <= 0) { toast(itemQty(id) >= c.qty ? t('order.max_qty', { n: c.qty }) : t('order.max_order', { n: c.items }), 3500); return false; }
    const add = Math.min(qty, room);
    if (!l) { l = { key, id, choice: choice || null, mods: (mods || []).slice().sort(), qty: 0 }; state.cart.push(l); }
    l.qty += add;
    if (add < qty) toast(t('order.max_qty', { n: c.qty }), 3500);
    else if (!quiet) toast(t('item.added'), 1500);
    saveCart(); afterCartChange(id);
    return true;
  }
  function changeLine(key, delta) {
    const l = state.cart.find((x) => x.key === key); if (!l) return;
    if (delta > 0) { addLine(l.id, l.choice, l.mods, delta, true); return; }
    l.qty += delta;
    if (l.qty <= 0) state.cart = state.cart.filter((x) => x.key !== key);
    saveCart(); afterCartChange(l.id);
  }
  function decrementItem(id) {
    const lines = state.cart.filter((l) => l.id === id);
    if (lines.length) changeLine(lines[lines.length - 1].key, -1);
  }
  function clearCart() { state.cart = []; state.promo = null; saveCart(); afterCartChange(); }
  function afterCartChange(id) {
    if (id) renderItemControl(id); else $$('.item[data-id]').forEach((el) => renderItemControl(el.dataset.id));
    renderCartBar();
    renderReorder();
    if (state.openSheet === 'sheet-order') { renderOrderLines(); renderPromoBox(); renderOrderFoot(); renderPreview(); }
  }

  /* ---------- rendering: static texts ---------- */
  function renderStatic() {
    document.documentElement.lang = state.lang === 'pt' ? 'pt-PT' : state.lang;
    document.title = t('app.title');
    $$('#lang-switch button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)));
    $$('[data-close]').forEach((b) => { b.setAttribute('aria-label', t('a11y.close')); b.innerHTML = ICON.close; });
    const prep = num(ord().prep_minutes, 15);
    $('#hero-title').textContent = t('hero.title');
    $('#hero-sub').textContent = t('hero.sub', { prep });
    const maps = $('#hero-maps');
    if (biz().maps_url) { maps.href = biz().maps_url; maps.innerHTML = ICON.pin + esc(t('hero.maps')); maps.classList.remove('hidden'); } else maps.classList.add('hidden');
    $('#hero-prep').innerHTML = ICON.clock + esc(t('hero.prep', { prep }));
    $('#cart-open').textContent = t('cart.view');
    $('#order-title').textContent = t('order.title');
    renderNotices();
    renderFooter();
  }
  function renderNotices() {
    const box = $('#notices');
    const parts = [];
    const notice = (cls, txt, id) => '<div class="notice ' + cls + '"' + (id ? ' id="' + id + '"' : '') + '>' + ICON.info + '<p>' + esc(txt) + '</p></div>';
    if (state.testNow) parts.push(notice('danger', t('notice.test', { now: state.testNow.date + ' ' + fmtTime(state.testNow.minutes) })));
    const offline = typeof navigator.onLine === 'boolean' && !navigator.onLine;
    const pk = computePickup();
    const closureReason = pk.closure && pk.closure.reason && tr(pk.closure.reason);
    const pausedMsg = ord().paused_message && tr(ord().paused_message);
    const ann = cfg().announcement && tr(cfg().announcement);
    if (offline) parts.push(notice('warn', t('notice.offline'), 'notice-offline'));
    else if (state.stale) parts.push(notice('warn', t('notice.stale')));
    else if (state.paused) parts.push(notice('warn', pausedMsg || t('notice.paused')));
    else if (state.showcase) parts.push(notice('warn', t('notice.showcase')));
    else if (closureReason) parts.push(notice('info', closureReason));
    else if (ann) parts.push(notice('info', ann));
    box.innerHTML = parts.join('');
  }
  function renderFooter() {
    const f = $('#footer');
    const days = t('day.names');
    const hours = cfg().hours || {};
    const todayDow = nowLisbon().dow;
    const rows = [1, 2, 3, 4, 5, 6, 0].map((d) => {
      const iv = parseIntervals(hours[DAY_KEYS[d]]);
      const txt = iv.length ? iv.map((i) => fmtTime(i.open) + '–' + fmtTime(i.close)).join(', ') : t('footer.closed');
      return (d === todayDow ? '<strong>' : '<span>') + esc(days[d]) + ' ' + esc(txt) + (d === todayDow ? '</strong>' : '</span>');
    });
    const all = state.menu && state.menu.allergens ? Object.keys(state.menu.allergens).map((k) => esc(k) + ' ' + esc(tr(state.menu.allergens[k]))).join(' · ') : '';
    const ig = (biz().instagram || '').replace(/^@/, '');
    f.innerHTML =
      '<div><strong>' + esc(t('footer.hours')) + '</strong></div>' +
      '<div class="legend">' + rows.join(' · ') + '</div>' +
      '<div>' + esc(t('footer.last_orders', { min: num(ord().last_order_minutes_before_close, 15) })) + '</div>' +
      (biz().address ? '<div>' + (biz().maps_url ? '<a href="' + esc(biz().maps_url) + '" target="_blank" rel="noopener">' + esc(biz().address) + '</a>' : esc(biz().address)) + '</div>' : '') +
      (phoneDisplay() && telHref() ? '<div><a href="' + esc(telHref()) + '">' + esc(phoneDisplay()) + '</a></div>' : '') +
      (ig ? '<div><a href="https://instagram.com/' + esc(ig) + '" target="_blank" rel="noopener">@' + esc(ig) + '</a></div>' : '') +
      '<div>' + esc(t('footer.payment')) + '</div>' +
      (all ? '<div class="legend"><strong>' + esc(t('footer.allergens')) + '</strong> · ' + all + '</div>' : '') +
      '<div>' + esc(t('footer.alcohol')) + '</div>' +
      '<div>' + esc(t('footer.prices')) + '</div>' +
      '<div>' + esc(t('footer.privacy')) + '</div>' +
      (isStandalone() ? '' : '<div>' + esc(t('footer.install')) + (isIOS() ? ' ' + esc(t('footer.install_ios')) : '') + '</div>') +
      '<div>' + esc(t('footer.made')) + '</div>';
  }
  function isStandalone() { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; }
  function isIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream; }

  /* ---------- rendering: reorder banner ---------- */
  function renderReorder() {
    const host = $('#reorder'); if (!host) return;
    const lo = sjson(STORE.lastOrder);
    if (!lo || !Array.isArray(lo.lines) || !lo.lines.length || state.cart.length || orderingOff() || state.view !== 'menu') { host.innerHTML = ''; return; }
    if (lo.at && Date.now() - lo.at > LAST_ORDER_TTL_MS) { host.innerHTML = ''; return; }
    const avail = lo.lines.filter((l) => itemAvailable(state.itemsById[l.id]));
    if (!avail.length) { host.innerHTML = ''; return; }
    // mesmo preço que o botão « repetir » : só as opções que o artigo ainda oferece
    const total = avail.reduce((a, l) => a + linePrice({ id: l.id, choice: l.choice, mods: (l.mods || []).filter((m) => (state.itemsById[l.id].modifiers || []).includes(m)) }) * l.qty, 0);
    const summary = avail.map((l) => l.qty + '× ' + tr(state.itemsById[l.id].name)).join(', ');
    host.innerHTML = '<div class="notice info reorder">' + ICON.repeat + '<div class="reorder-text"><strong>' + esc(t('reorder.title')) + '</strong><span>' + esc(summary) + ' · ' + esc(fmtMoney(total)) + '</span></div><button type="button" class="btn navy" id="reorder-btn">' + esc(t('reorder.cta')) + '</button></div>';
  }
  function reorderLast() {
    const lo = sjson(STORE.lastOrder); if (!lo) return;
    const skipped = [], gone = [];
    lo.lines.forEach((l) => {
      const it = state.itemsById[l.id];
      if (!it) { gone.push(l.name || l.id); return; }
      if (!itemAvailable(it)) { skipped.push(tr(it.name)); return; }
      const choice = it.choice && it.choice.options && it.choice.options.some((o) => o.id === l.choice) ? l.choice : (it.choice && it.choice.options && it.choice.options.length ? it.choice.options[0].id : null);
      const mods = (l.mods || []).filter((m) => (it.modifiers || []).includes(m));
      addLine(l.id, choice, mods, l.qty, true);
    });
    if (gone.length) toast(t('reorder.gone', { item: gone.join(', ') }), 4500);
    else if (skipped.length) toast(t('reorder.partial', { item: skipped.join(', ') }), 4000);
    else toast(t('item.added'), 1500);
  }

  /* ---------- rendering: menu ---------- */
  function tagHTML(tag) {
    const map = { new: 'new', veggie: 'veggie', vege: 'veggie', vegan: 'vegan', popular: 'popular', dog: 'dog', alcohol: 'alcohol', hot: 'hot', cold: 'cold' };
    const k = map[tag]; if (!k) return '';
    return '<span class="tag ' + k + '">' + esc(t('tag.' + k)) + '</span>';
  }
  function allergensHTML(it) {
    const list = Array.isArray(it.allergens) ? it.allergens.map(String) : [];
    if (!list.length && !askStaff(it)) return '';
    const all = state.menu.allergens || {};
    const parts = list.map((k) => '<abbr title="' + esc(tr(all[k]) || k) + '">' + esc(k) + '</abbr>');
    if (askStaff(it)) parts.push('*');
    return '<span class="allergens">' + parts.join('·') + '</span>';
  }
  function renderMenu() {
    const nav = $('#catnav ul');
    const menu = $('#menu');
    const cats = (state.menu.categories || []).map((c) => ({ cat: c, items: (c.items || []).filter(itemVisible) })).filter((x) => x.items.length);
    nav.innerHTML = cats.map((x, i) => '<li><button type="button" data-cat="' + esc(x.cat.id) + '"' + (i === 0 ? ' aria-current="true"' : '') + '>' + esc(tr(x.cat.name)) + '</button></li>').join('');
    menu.innerHTML = cats.map((x) =>
      '<section class="section" id="cat-' + esc(x.cat.id) + '" aria-labelledby="h-' + esc(x.cat.id) + '">' +
      '<div class="section-head"><h2 id="h-' + esc(x.cat.id) + '">' + esc(tr(x.cat.name)) + (x.cat.tags || []).map(tagHTML).join('') + '</h2>' + (x.cat.tagline && tr(x.cat.tagline) ? '<p>' + esc(tr(x.cat.tagline)) + '</p>' : '') + '</div>' +
      '<ul class="items">' + x.items.map(itemHTML).join('') + '</ul></section>'
    ).join('') + (state.menu.footnote && tr(state.menu.footnote)
      ? '<p class="menu-footnote">' + esc(tr(state.menu.footnote)) + '</p>' : '');
    $$('.item[data-id]').forEach((el) => renderItemControl(el.dataset.id));
    setupScrollSpy();
  }
  function itemHTML(it) {
    const avail = itemAvailable(it);
    const tags = (it.tags || []).map(tagHTML).join('');
    const desc = it.desc && tr(it.desc);
    const p = cents(it.price);
    const from = it.choice && it.choice.options && it.choice.options.some((o) => o.price);
    return '<li class="item' + (avail ? '' : ' is-unavailable') + '" data-id="' + esc(it.id) + '">' +
      '<button type="button" class="item-main" data-open="' + esc(it.id) + '"' + (avail ? '' : ' disabled') + '>' +
      '<div class="item-name"><span>' + esc(tr(it.name)) + '</span>' + tags + (avail ? '' : '<span class="tag soldout">' + esc(t('item.soldout')) + '</span>') + '</div>' +
      (desc ? '<p class="item-desc">' + esc(desc) + '</p>' : '') +
      (askStaff(it) ? '<p class="item-desc">' + esc(t('item.ask_staff')) + '</p>' : '') +
      '<div class="item-meta"><span class="item-price">' + (from ? '<span class="from">' + esc(t('item.from')) + '</span>' : '') + esc(Number.isFinite(p) ? fmtMoney(p) : '—') + '</span>' + allergensHTML(it) + '</div>' +
      '</button>' +
      '<div class="item-side" data-control></div>' +
      '</li>';
  }
  function renderItemControl(id) {
    const it = state.itemsById[id];
    const host = $('.item[data-id="' + CSS.escape(id) + '"] [data-control]');
    if (!it || !host) return;
    if (!itemAvailable(it) || orderingOff()) { host.innerHTML = ''; return; }
    const q = itemQty(id);
    const p = cents(it.price);
    if (q === 0) {
      host.innerHTML = '<button type="button" class="btn-add" data-add="' + esc(id) + '" aria-label="' + esc(t('item.add_aria', { item: tr(it.name), price: fmtMoney(p) })) + '">' + ICON.plus + '</button>';
    } else {
      host.innerHTML = '<div class="stepper" role="group" aria-label="' + esc(tr(it.name)) + '">' +
        '<button type="button" data-dec="' + esc(id) + '" aria-label="' + esc(t('item.less')) + '">' + (q === 1 ? ICON.trash : ICON.minus) + '</button>' +
        '<output aria-live="polite">' + q + '</output>' +
        '<button type="button" data-add="' + esc(id) + '" aria-label="' + esc(t('item.more')) + '">' + ICON.plus + '</button></div>';
    }
  }
  function setupScrollSpy() {
    if (setupScrollSpy._io) setupScrollSpy._io.disconnect();
    if (!('IntersectionObserver' in window)) return;
    const visible = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => visible.set(e.target.id, e.isIntersecting ? e.boundingClientRect.top : null));
      let best = null, bestTop = Infinity;
      visible.forEach((top, id) => { if (top != null && top < bestTop) { bestTop = top; best = id; } });
      if (!best) return;
      const catId = best.replace(/^cat-/, '');
      $$('#catnav button').forEach((b) => {
        const on = b.dataset.cat === catId;
        b.setAttribute('aria-current', on ? 'true' : 'false');
        if (on && typeof b.scrollIntoView === 'function') b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      });
    }, { rootMargin: '-70px 0px -55% 0px', threshold: [0, 0.1] });
    $$('.section').forEach((s) => io.observe(s));
    setupScrollSpy._io = io;
  }

  /* ---------- cart bar ---------- */
  function renderCartBar() {
    const bar = $('#cartbar');
    const n = cartCount();
    const show = n > 0 && state.view === 'menu' && !orderingOff();
    bar.classList.toggle('is-visible', show);
    bar.setAttribute('aria-hidden', String(!show));
    document.body.classList.toggle('has-cart', show);
    $('#cart-count').textContent = n === 1 ? t('cart.items_one') : t('cart.items', { n });
    $('#cart-total').textContent = fmtMoney(orderTotals().total);
  }

  /* ---------- sheets ---------- */
  /* iOS ignore overflow:hidden sur body : on fige la page à sa position. */
  function lockScroll() {
    const b = document.body;
    if (b.dataset.lockY) return;
    const y = window.scrollY || 0;
    b.dataset.lockY = String(y);
    b.style.position = 'fixed'; b.style.top = -y + 'px'; b.style.left = '0'; b.style.right = '0';
  }
  function unlockScroll() {
    const b = document.body;
    if (!b.dataset.lockY) return;
    const y = Number(b.dataset.lockY) || 0;
    delete b.dataset.lockY;
    b.style.position = ''; b.style.top = ''; b.style.left = ''; b.style.right = '';
    window.scrollTo({ top: y, behavior: 'instant' });
  }
  function openSheet(id, opener) {
    state.lastFocus = opener || document.activeElement;
    closeSheetDOM(true);
    lockScroll();
    const sh = $('#' + id);
    sh.classList.add('is-open'); sh.setAttribute('aria-hidden', 'false');
    $('#backdrop').classList.add('is-open');
    document.body.classList.add('sheet-open');
    state.openSheet = id;
    try { history.pushState({ sheet: id }, ''); } catch (e) { /* ignore */ }
    setTimeout(() => { const f = sh.querySelector('button[data-close]'); if (f) f.focus({ preventScroll: true }); }, 80);
  }
  function closeSheetDOM(keepLock) {
    $$('.sheet').forEach((s) => { s.classList.remove('is-open'); s.setAttribute('aria-hidden', 'true'); });
    $('#backdrop').classList.remove('is-open');
    document.body.classList.remove('sheet-open');
    state.openSheet = null;
    if (keepLock !== true) unlockScroll();
  }
  function restoreFocus() { const f = state.lastFocus; state.lastFocus = null; if (f && f.focus && document.contains(f)) f.focus({ preventScroll: true }); }
  function closeSheet() {
    if (!state.openSheet) return;
    if (history.state && history.state.sheet) { history.back(); return; } // popstate -> closeSheetDOM
    closeSheetDOM(); restoreFocus();
  }
  window.addEventListener('popstate', () => { if (state.openSheet) { closeSheetDOM(); restoreFocus(); } });

  /* ---------- item sheet ---------- */
  let sheetItem = null; // { id, choice, mods:Set, qty }
  function openItemSheet(id, opener) {
    const it = state.itemsById[id]; if (!itemAvailable(it)) return;
    sheetItem = { id, choice: it.choice && it.choice.options && it.choice.options.length ? (it.choice.required === false ? null : it.choice.options[0].id) : null, mods: new Set(), qty: 1 };
    $('#item-title').textContent = tr(it.name);
    renderItemSheet();
    openSheet('sheet-item', opener);
  }
  function renderItemSheet() {
    const it = state.itemsById[sheetItem.id];
    const all = state.menu.allergens || {};
    const mods = state.menu.modifiers || {};
    // « Contém » : os alergénios do artigo mais os das opções marcadas (coberturas, etc.)
    const keys = [];
    (it.allergens || []).concat(...Array.from(sheetItem.mods).map((m) => (mods[m] && mods[m].allergens) || [])).forEach((k) => { if (!keys.includes(String(k))) keys.push(String(k)); });
    const contains = keys.map((k) => tr(all[k]) || k).filter(Boolean).join(', ');
    let html = '';
    if (it.desc && tr(it.desc)) html += '<p class="muted">' + esc(tr(it.desc)) + '</p>';
    if (contains) html += '<p class="muted small mt-8">' + esc(t('item.contains')) + ': ' + esc(contains) + '</p>';
    if (askStaff(it)) html += '<p class="muted small mt-8">' + esc(t('item.ask_staff_long')) + '</p>';
    html += '<p class="muted small mt-8">' + esc(t('item.allergy_note')) + '</p>';
    if (it.choice && it.choice.options && it.choice.options.length) {
      html += '<div class="card mt-12"><h3>' + esc(tr(it.choice.name) || t('item.choose')) + '</h3><div class="choices" role="radiogroup">' +
        it.choice.options.map((o) => '<label class="choice' + (sheetItem.choice === o.id ? ' is-checked' : '') + '"><input type="radio" name="choice" value="' + esc(o.id) + '"' + (sheetItem.choice === o.id ? ' checked' : '') + '><span class="choice-label"><span class="check">' + ICON.check + '</span>' + esc(tr(o.name)) + '</span>' + (o.price ? '<span class="price">+' + esc(fmtMoney(cents(o.price))) + '</span>' : '') + '</label>').join('') +
        '</div></div>';
    }
    const modIds = (it.modifiers || []).filter((m) => mods[m]);
    if (modIds.length) {
      html += '<div class="card mt-12"><h3>' + esc(t('item.options')) + '</h3><div class="choices">' +
        modIds.map((m) => '<label class="choice' + (sheetItem.mods.has(m) ? ' is-checked' : '') + '"><input type="checkbox" name="mod" value="' + esc(m) + '"' + (sheetItem.mods.has(m) ? ' checked' : '') + '><span class="choice-label"><span class="check">' + ICON.check + '</span>' + esc(tr(mods[m].name)) + (Array.isArray(mods[m].allergens) && mods[m].allergens.length ? '<span class="allergens">' + esc(mods[m].allergens.join('·')) + '</span>' : '') + '</span><span class="price">' + (mods[m].price ? '+' + esc(fmtMoney(cents(mods[m].price))) : '') + '</span></label>').join('') +
        '</div></div>';
    }
    html += '<div class="card mt-12 row-between"><span class="label" style="font-weight:800">' + esc(t('item.qty')) + '</span>' +
      '<div class="stepper" role="group"><button type="button" data-sq="-1" aria-label="' + esc(t('item.less')) + '">' + ICON.minus + '</button><output>' + sheetItem.qty + '</output><button type="button" data-sq="1" aria-label="' + esc(t('item.more')) + '">' + ICON.plus + '</button></div></div>';
    $('#item-body').innerHTML = html;
    const needChoice = it.choice && it.choice.options && it.choice.options.length && it.choice.required !== false && !sheetItem.choice;
    const price = linePrice({ id: it.id, choice: sheetItem.choice, mods: Array.from(sheetItem.mods) }) * sheetItem.qty;
    $('#item-foot').innerHTML = '<button type="button" class="btn primary big block" id="item-add"' + (needChoice ? ' disabled' : '') + '>' + esc(needChoice ? t('item.choose_first') : t('item.add_price', { price: fmtMoney(price) })) + '</button>';
  }
  $('#item-body').addEventListener('change', (e) => {
    const inp = e.target;
    if (inp.name === 'choice') sheetItem.choice = inp.value;
    if (inp.name === 'mod') { if (inp.checked) sheetItem.mods.add(inp.value); else sheetItem.mods.delete(inp.value); }
    renderItemSheet();
  });
  $('#item-body').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sq]'); if (!b) return;
    sheetItem.qty = Math.min(caps().qty, Math.max(1, sheetItem.qty + Number(b.dataset.sq)));
    renderItemSheet();
  });
  $('#item-foot').addEventListener('click', (e) => {
    if (!e.target.closest('#item-add')) return;
    if (addLine(sheetItem.id, sheetItem.choice, Array.from(sheetItem.mods), sheetItem.qty)) closeSheet();
  });

  /* ---------- order sheet ---------- */
  function openOrderSheet(opener) {
    const pk = computePickup();
    state.pickupChoice = pk.mode === 'open' ? 'asap' : 'slot';
    if (!pk.slots.includes(state.pickupSlot)) state.pickupSlot = pk.slots[0] || null;
    renderOrderSheet(pk);
    openSheet('sheet-order', opener);
  }
  function renderOrderSheet(pk) {
    const name = sget(STORE.name) || '';
    const noteMax = num(ord().note_max_chars, 120);
    $('#order-body').innerHTML =
      '<div id="order-lines"></div>' +
      '<div class="field mt-12"><label for="f-name">' + esc(t('order.name_label')) + '</label><input id="f-name" type="text" autocomplete="given-name" maxlength="30" placeholder="' + esc(t('order.name_ph')) + '" value="' + esc(name) + '" enterkeyhint="done" aria-describedby="f-name-err"><span class="error" id="f-name-err">' + esc(t('order.name_error')) + '</span></div>' +
      '<div id="order-pickup" class="mt-12"></div>' +
      payFieldHTML() +
      extrasHTML() +
      '<div class="field mt-12"><label for="f-note">' + esc(t('order.note_label')) + ' <span class="opt">' + esc(t('order.note_opt')) + '</span></label><input id="f-note" type="text" maxlength="' + noteMax + '" placeholder="' + esc(t('order.note_ph')) + '" enterkeyhint="done"></div>' +
      '<details class="card mt-12" id="order-preview"><summary style="font-weight:800;cursor:pointer">' + esc(t('order.preview')) + '</summary><p class="hint mt-8">' + esc(t('order.preview_hint')) + '</p><pre class="order-text mt-8" id="preview-text" aria-label="' + esc(t('order.preview_aria')) + '"></pre></details>' +
      '<div id="order-after"></div>';
    renderOrderLines();
    renderPickupBlock(pk);
    renderPromoBox();
    renderOrderFoot(pk);
    renderPreview();
  }
  function renderOrderLines() {
    const host = $('#order-lines'); if (!host) return;
    if (!state.cart.length) {
      host.innerHTML = '<div class="empty"><img src="assets/mascot-navy.png" alt="" width="480" height="534"><div>' + esc(t('cart.empty_title')) + '</div><button type="button" class="btn ghost mt-12" data-close>' + esc(t('cart.empty_cta')) + '</button></div>';
      $$('#order-body > :not(#order-lines)').forEach((el) => el.classList.add('hidden'));
      return;
    }
    $$('#order-body > :not(#order-lines)').forEach((el) => el.classList.remove('hidden'));
    host.innerHTML = '<div class="card"><div class="lines">' + state.cart.map((l) => {
      const it = state.itemsById[l.id];
      const opts = lineOptsText(l);
      return '<div class="line"><div><div class="line-name">' + esc(tr(it.name)) + '</div>' + (opts ? '<div class="line-opts">' + esc(opts) + '</div>' : '') + '</div>' +
        '<div class="line-right"><div class="stepper small" role="group" aria-label="' + esc(tr(it.name)) + '"><button type="button" data-line="' + esc(l.key) + '" data-d="-1" aria-label="' + esc(t('item.less')) + '">' + (l.qty === 1 ? ICON.trash : ICON.minus) + '</button><output>' + l.qty + '</output><button type="button" data-line="' + esc(l.key) + '" data-d="1" aria-label="' + esc(t('item.more')) + '">' + ICON.plus + '</button></div>' +
        '<span class="line-price">' + esc(fmtMoney(linePrice(l) * l.qty)) + '</span></div></div>';
    }).join('') + '</div>' +
      totalsHTML() +
      '<p class="hint mt-8">' + esc(t('order.pay_note')) + '</p><p class="hint">' + esc(t('order.confirm_note')) + '</p></div>';
  }
  function renderPickupBlock(pk) {
    const host = $('#order-pickup'); if (!host) return;
    pk = pk || computePickup();
    let html = '<div class="card"><h3>' + esc(t('order.pickup_label')) + '</h3>';
    if (pk.mode === 'blocked') {
      const n = pk.nextOpen;
      if (pk.openNow && pk.lastOrder != null) html += '<p class="hint">' + esc(t('order.no_slots_today', { time: fmtTime(pk.lastOrder) })) + '</p>';
      html += '<p class="hint mt-8">' + esc(n ? t('order.closed_blocked', { day: dayLabel(n.dayOffset, n.di), open: fmtTime(n.open) }) : t('status.closed_long')) + '</p>';
    } else {
      if (pk.mode === 'open') {
        html += '<div class="segmented"><button type="button" data-pc="asap" aria-pressed="' + (state.pickupChoice === 'asap') + '">' + esc(t('order.asap')) + '<small>' + esc(t('order.asap_time', { time: fmtTime(pk.asap) })) + '</small></button>' +
          '<button type="button" data-pc="slot" aria-pressed="' + (state.pickupChoice === 'slot') + '"' + (pk.slots.length ? '' : ' disabled') + '>' + esc(t('order.choose_time')) + '<small>' + esc(t('day.today')) + '</small></button></div>';
        if (pk.rush) html += '<p class="hint mt-8">' + esc(t('order.rush_note', { min: pk.prep })) + '</p>';
      } else if (pk.mode === 'today_later') {
        html += '<p class="hint">' + esc(t('order.before_open', { time: fmtTime(pk.slots[0]) })) + '</p>';
      } else if (pk.mode === 'next_day') {
        html += '<p class="hint">' + esc(t('order.closed_preorder', { day: dayLabel(pk.dayOffset, pk.di), time: fmtTime(pk.slots[0]) })) + '</p>';
      }
      const showSelect = pk.mode !== 'open' || state.pickupChoice === 'slot';
      if (showSelect && pk.slots.length) {
        const sel = pk.slots.includes(state.pickupSlot) ? state.pickupSlot : pk.slots[0];
        state.pickupSlot = sel;
        html += '<div class="field mt-12"><label for="f-slot">' + esc(t('order.slot_select')) + '</label><div class="select-wrap"><select id="f-slot">' +
          pk.slots.map((s) => '<option value="' + s + '"' + (s === sel ? ' selected' : '') + '>' + fmtTime(s) + '</option>').join('') + '</select></div></div>';
      }
    }
    html += '</div>';
    host.innerHTML = html;
  }
  function renderOrderFoot(pk) {
    const foot = $('#order-foot');
    const after = $('#order-after');
    if (!state.cart.length) { foot.innerHTML = ''; if (after) after.innerHTML = ''; return; }
    pk = pk || computePickup();
    if (pk.mode === 'blocked' || orderingOff()) {
      const n = pk.nextOpen;
      foot.innerHTML = '<button type="button" class="btn navy big block" disabled>' + esc(n ? t('order.closed_blocked', { day: dayLabel(n.dayOffset, n.di), open: fmtTime(n.open) }) : t('status.closed')) + '</button>';
      if (after) after.innerHTML = '';
      return;
    }
    foot.innerHTML =
      '<a class="btn primary big block" id="send-btn" href="#" target="_blank" rel="noopener">' + ICON.wa + '<span>' + esc(t('order.send')) + '</span></a>';
    if (after) after.innerHTML =
      '<p class="hint small mt-12" style="text-align:center">' + esc(t('order.send_hint')) + '</p>' +
      '<button type="button" class="btn subtle block mt-8" id="no-wa">' + esc(t('order.no_whatsapp')) + '</button>';
    updateSendHref();
  }
  /* Mode de paiement : purement indicatif. Le client règle sur place,
     au comptoir ou au terminal que l'équipe apporte au salon. */
  const PAY_METHODS = ['cash', 'card', 'mbway'];
  function currentPayMethod() {
    const box = $('#f-pay');
    if (box) { const v = box.querySelector('input[name="paymethod"]:checked'); return v ? v.value : ''; }
    const saved = sget(STORE.payMethod);
    return PAY_METHODS.includes(saved) ? saved : '';
  }
  function payFieldHTML() {
    const saved = currentPayMethod();
    return '<div class="field mt-12" id="f-pay"><span class="label">' + esc(t('pay.how')) + '</span>' +
      '<div class="choices">' + PAY_METHODS.map((m) =>
        '<label class="choice' + (saved === m ? ' is-checked' : '') + '"><input type="radio" name="paymethod" value="' + m + '"' + (saved === m ? ' checked' : '') + '>' +
        '<span class="choice-label"><span class="check">' + ICON.check + '</span>' + esc(t('pay.' + m)) + '</span></label>').join('') +
      '</div><span class="error">' + esc(t('pay.required')) + '</span></div>';
  }
  function validatePayMethod() {
    const box = $('#f-pay'); if (!box) return true;
    const ok = !!currentPayMethod();
    box.classList.toggle('has-error', !ok);
    if (!ok) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return ok;
  }
  function payLabelPT(method) {
    const P = I18N.pt;
    return P['msg.pay_' + (method || currentPayMethod())] || P['msg.pay_onsite'];
  }
  /* ---------- codes de réduction ----------
     Définis dans config.json > discounts. Le site n'a pas de serveur : la remise
     est calculée ici pour l'affichage, et l'équipe l'applique à l'encaissement. */
  const normCode = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
  function promoList() { const d = cfg().discounts; return d && Array.isArray(d.codes) ? d.codes : []; }
  function findPromo(code) { const c = normCode(code); return c ? promoList().find((p) => p && normCode(p.code) === c) || null : null; }
  function evaluatePromo(code, subtotal) {
    const p = findPromo(code);
    if (!p || p.active === false) return { ok: false, reason: 'invalid' };
    const today = nowLisbon().date;
    if (p.valid_from && today < p.valid_from) return { ok: false, reason: 'not_yet', promo: p };
    if (p.valid_until && today > p.valid_until) return { ok: false, reason: 'expired', promo: p };
    const svc = p.service || 'all';
    if (svc !== 'all' && svc !== SERVICE) return { ok: false, reason: 'service', promo: p };
    const min = cents(p.min_order || 0) || 0;
    if (subtotal < min) return { ok: false, reason: 'min', promo: p, min };
    let d = 0;
    if (p.type === 'percent') {
      d = Math.round(subtotal * num(p.value, 0) / 100);
      const cap = cents(p.max_discount);
      if (Number.isFinite(cap) && cap > 0) d = Math.min(d, cap);
    } else if (p.type === 'amount') d = cents(p.value) || 0;
    d = Math.max(0, Math.min(d, subtotal));
    if (d <= 0) return { ok: false, reason: 'invalid', promo: p };
    return { ok: true, promo: p, code: normCode(p.code), discount: d };
  }
  function orderTotals() {
    const subtotal = cartTotal();
    const ev = state.promo ? evaluatePromo(state.promo, subtotal) : null;
    const discount = ev && ev.ok ? ev.discount : 0;
    return { subtotal, discount, total: subtotal - discount, promo: ev };
  }
  function promoShort(p, ascii) {
    const minus = ascii ? '-' : '−';
    return p.type === 'percent' ? minus + String(num(p.value, 0)).replace('.', ',') + ' %' : minus + fmtMoney(cents(p.value), ascii);
  }
  function promoReason(ev) {
    if (!ev) return t('promo.invalid');
    if (ev.reason === 'expired') return t('promo.expired');
    if (ev.reason === 'not_yet') return t('promo.not_yet');
    if (ev.reason === 'service') return t('promo.service');
    if (ev.reason === 'min') return t('promo.min', { min: fmtMoney(ev.min) });
    return t('promo.invalid');
  }
  function totalsHTML() {
    const tot = orderTotals();
    let h = '<div class="totals">';
    if (tot.discount) {
      h += '<div class="row"><span>' + esc(t('order.subtotal')) + '</span><span class="amt">' + esc(fmtMoney(tot.subtotal)) + '</span></div>' +
        '<div class="row discount"><span>' + esc(t('order.discount')) + ' · ' + esc(tot.promo.code) + '</span><span class="amt">−' + esc(fmtMoney(tot.discount)) + '</span></div>';
    }
    return h + '<div class="row grand"><span>' + esc(t('order.total')) + '</span><span class="amt">' + esc(fmtMoney(tot.total)) + '</span></div></div>';
  }
  function renderPromoBox(msg) {
    const box = $('#promo-box'); if (!box) return;
    const tot = orderTotals();
    if (state.promo && tot.promo && tot.promo.promo) {
      const p = tot.promo.promo, ok = tot.promo.ok;
      box.innerHTML = '<div class="promo-applied' + (ok ? '' : ' is-off') + '">' +
        '<span class="promo-code">' + esc(normCode(p.code)) + '</span>' +
        '<span class="promo-value">' + (ok ? esc(promoShort(p)) + ' · −' + esc(fmtMoney(tot.discount)) : esc(promoReason(tot.promo))) + '</span>' +
        '<button type="button" class="btn subtle" id="promo-remove">' + esc(t('promo.remove')) + '</button></div>' +
        (ok ? '<p class="hint small mt-8">' + esc(t('promo.till_note')) + '</p>' : '');
      return;
    }
    box.innerHTML = '<div class="promo-row">' +
      '<input id="f-code" type="text" autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false" maxlength="20" placeholder="' + esc(t('promo.placeholder')) + '" enterkeyhint="go" aria-label="' + esc(t('promo.toggle')) + '">' +
      '<button type="button" class="btn navy" id="promo-apply">' + esc(t('promo.apply')) + '</button></div>' +
      (msg ? '<p class="promo-error" role="alert">' + esc(msg) + '</p>' : '');
  }
  function refreshTotals() { renderOrderLines(); renderCartBar(); renderPreview(); }
  function applyPromo() {
    const input = $('#f-code'); if (!input) return;
    const code = normCode(input.value);
    if (!code) { renderPromoBox(t('promo.empty')); const i = $('#f-code'); if (i) i.focus(); return; }
    const ev = evaluatePromo(code, cartTotal());
    if (!ev.ok) { renderPromoBox(promoReason(ev)); const i = $('#f-code'); if (i) { i.value = code; i.focus(); } return; }
    state.promo = ev.code; saveCart();
    renderPromoBox(); refreshTotals();
    toast(t('promo.applied', { code: ev.code }), 2200);
  }
  function removePromo() { state.promo = null; saveCart(); renderPromoBox(); refreshTotals(); }

  /* ---------- NIF : contrôle officiel portugais (9 chiffres, modulo 11) ---------- */
  const nifDigits = (v) => String(v || '').replace(/[^0-9]/g, '');
  function validNIF(v) {
    const d = nifDigits(v);
    if (!/^[0-9]{9}$/.test(d)) return false;
    if (!('1235689'.includes(d[0]) || ['45', '70', '71', '72', '74', '75', '77', '78', '79'].includes(d.slice(0, 2)))) return false;
    let sum = 0;
    for (let i = 0; i < 8; i++) sum += Number(d[i]) * (9 - i);
    const m = sum % 11;
    return (m < 2 ? 0 : 11 - m) === Number(d[8]);
  }
  function currentNIF() { const el = $('#f-nif'); return nifDigits(el ? el.value : (sget(STORE.nif) || '')).slice(0, 9); }
  function nifForMessage() { const d = currentNIF(); return validNIF(d) ? d : ''; }
  function validateNIF() {
    const el = $('#f-nif'); if (!el) return true;
    const raw = nifDigits(el.value);
    const ok = raw === '' || validNIF(raw);
    const box = el.closest('.field'); if (box) box.classList.toggle('has-error', !ok);
    if (!ok) { const det = $('#x-nif'); if (det) det.open = true; el.setAttribute('aria-invalid', 'true'); el.focus(); }
    else el.removeAttribute('aria-invalid');
    return ok;
  }
  function extrasHTML() {
    const nif = sget(STORE.nif) || '';
    return '<div class="card mt-12 extras">' +
      '<details id="x-code"' + (state.promo ? ' open' : '') + '><summary>' + esc(t('promo.toggle')) + '</summary>' +
        '<div class="extra-body" id="promo-box"></div></details>' +
      '<details id="x-nif"' + (nif ? ' open' : '') + '><summary>' + esc(t('nif.toggle')) + '</summary>' +
        '<div class="extra-body field"><label for="f-nif" class="sr-only">NIF</label>' +
        '<input id="f-nif" type="text" inputmode="numeric" autocomplete="off" maxlength="11" placeholder="' + esc(t('nif.placeholder')) + '" value="' + esc(nif) + '" enterkeyhint="done" aria-describedby="f-nif-help f-nif-err">' +
        '<span class="help" id="f-nif-help">' + esc(t('nif.help')) + '</span>' +
        '<span class="error" id="f-nif-err">' + esc(t('nif.error')) + '</span></div></details>' +
      '</div>';
  }
  function currentName() { const el = $('#f-name'); return clean(el ? el.value : (sget(STORE.name) || ''), 30); }
  function currentNote() { const el = $('#f-note'); return clean(el ? el.value.replace(/[\r\n]+/g, ' / ') : '', num(ord().note_max_chars, 120)); }
  function previewCode() { return state.previewCode || (state.previewCode = genCode()); }
  function renderPreview() {
    const pre = $('#preview-text'); if (!pre) return;
    const pk = computePickup();
    const box = $('#order-preview');
    if (box) box.classList.toggle('hidden', pk.mode === 'blocked' || orderingOff());
    const p = resolvePickup(pk);
    pre.textContent = composeMessage({ code: previewCode(), pickup: p, name: currentName() || '…', note: currentNote(), lang: state.lang, payMethod: currentPayMethod(), nif: nifForMessage() });
    updateSendHref();
  }
  function updateSendHref() {
    const a = $('#send-btn'); if (!a) return;
    const p = resolvePickup(computePickup());
    const msg = composeMessage({ code: previewCode(), pickup: p, name: currentName() || '…', note: currentNote(), lang: state.lang, payMethod: currentPayMethod(), nif: nifForMessage() });
    a.href = waHref(msg) || '#';
  }

  $('#order-body').addEventListener('click', (e) => {
    if (e.target.closest('#promo-apply')) { applyPromo(); return; }
    if (e.target.closest('#promo-remove')) { removePromo(); return; }
    if (e.target.closest('#no-wa')) { e.preventDefault(); onSend(e, null); return; }
    const lb = e.target.closest('[data-line]');
    if (lb) { changeLine(lb.dataset.line, Number(lb.dataset.d)); return; }
    const pc = e.target.closest('[data-pc]');
    if (pc) { state.pickupChoice = pc.dataset.pc; renderPickupBlock(); renderPreview(); }
  });
  $('#order-body').addEventListener('change', (e) => {
    if (e.target.id === 'f-slot') { state.pickupSlot = Number(e.target.value); state.pickupChoice = 'slot'; renderPreview(); }
    if (e.target.name === 'paymethod') {
      sset(STORE.payMethod, e.target.value);
      $$('#f-pay .choice').forEach((el) => el.classList.toggle('is-checked', !!el.querySelector('input:checked')));
      $('#f-pay').classList.remove('has-error');
      renderPreview();
    }
  });
  $('#order-body').addEventListener('input', (e) => {
    if (e.target.id === 'f-name') { sset(STORE.name, currentName()); const f = $('#f-name'); f.closest('.field').classList.remove('has-error'); f.removeAttribute('aria-invalid'); }
    if (e.target.id === 'f-nif') { sset(STORE.nif, nifDigits(e.target.value).slice(0, 9)); const b = e.target.closest('.field'); if (b) b.classList.remove('has-error'); e.target.removeAttribute('aria-invalid'); }
    if (e.target.id === 'f-code') { const er = $('#promo-box .promo-error'); if (er) er.remove(); }
    renderPreview();
  });
  $('#order-body').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'f-code') { e.preventDefault(); applyPromo(); return; }
    if (e.key === 'Enter' && (e.target.id === 'f-name' || e.target.id === 'f-note' || e.target.id === 'f-nif')) { e.preventDefault(); e.target.blur(); }
  });
  $('#order-body').addEventListener('focusin', (e) => {
    if (!e.target.matches('input[type="text"], textarea')) return;
    setTimeout(() => { try { e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (err) { /* ignore */ } }, 320);
  });
  $('#order-foot').addEventListener('pointerdown', (e) => { if (e.target.closest('#send-btn')) updateSendHref(); });
  $('#order-foot').addEventListener('click', (e) => {
    const send = e.target.closest('#send-btn');
    if (send) { onSend(e, send); return; }
    if (e.target.closest('#no-wa')) { e.preventDefault(); onSend(e, null); }
  });

  /* ---------- order: compose / send ---------- */
  function genCode() { return CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)] + '-' + (10 + Math.floor(Math.random() * 90)); }
  /* Mensagem SEMPRE em português (língua do balcão). Linha 1 = o que se vê na lista de conversas. */
  function composeMessage(o) {
    const P = I18N.pt;
    const lines = [];
    const time = o.pickup ? fmtTime(o.pickup.minutes) : '--:--';
    let day = '';
    if (o.pickup && o.pickup.dayOffset === 1) day = P['msg.tomorrow'].toUpperCase() + ' ' + ddmm(o.pickup.di) + ' ';
    else if (o.pickup && o.pickup.dayOffset > 1) day = P['day.short'][o.pickup.di.dow].toUpperCase() + ' ' + ddmm(o.pickup.di) + ' ';
    const head = isSalon() ? 'SALÃO' : 'BIKA';
    lines.push('*' + head + ' ' + day + time + ' · ' + o.name + ' · ' + o.code + '*');
    lines.push('');
    const kitchen = [], bar = [];
    state.cart.forEach((l) => {
      const it = state.itemsById[l.id]; if (!it) return;
      const opts = lineOptsText(l, 'pt');
      const txt = l.qty + '× ' + ((it.name && it.name.pt) || tr(it.name) || it.id) + (opts ? ' (' + opts + ')' : '');
      (state.catOfItem[l.id] && state.catOfItem[l.id]._station === 'kitchen' ? kitchen : bar).push(txt);
    });
    if (kitchen.length) lines.push(...kitchen);
    if (kitchen.length && bar.length) lines.push('—');
    if (bar.length) lines.push(...bar);
    lines.push('');
    if (o.note) lines.push(P['msg.note'] + ': ' + o.note);
    const tot = orderTotals();
    if (tot.discount) {
      lines.push(P['msg.subtotal'] + ': ' + fmtMoney(tot.subtotal, true));
      lines.push(P['msg.discount'] + ' ' + tot.promo.code + ' (' + promoShort(tot.promo.promo, true) + '): -' + fmtMoney(tot.discount, true));
    }
    lines.push(P['msg.total'] + ': ' + fmtMoney(tot.total, true) + ' · ' + payLabelPT(o.payMethod));
    if (o.nif) lines.push(P['msg.nif'] + ': ' + o.nif);
    lines.push(P['msg.sent'] + ' ' + fmtTime(nowLisbon().minutes) + ' ' + P['msg.via'] + (o.lang && o.lang !== 'pt' ? ' · ' + P['msg.lang'] + ': ' + o.lang.toUpperCase() : ''));
    return lines.join('\n');
  }
  function waHref(msg) {
    const d = waDigits(); if (!d) return '';
    try { return 'https://wa.me/' + d + '?text=' + encodeURIComponent(msg); } catch (e) { return ''; }
  }
  function validateName() {
    const el = $('#f-name'); if (!el) return false;
    const ok = currentName().length >= 2;
    el.closest('.field').classList.toggle('has-error', !ok);
    if (!ok) { el.setAttribute('aria-invalid', 'true'); el.focus(); } else el.removeAttribute('aria-invalid');
    return ok;
  }
  function onSend(e, anchor) {
    if (!state.cart.length) { e.preventDefault(); return; }
    if (!validateName()) { e.preventDefault(); return; }
    if (!validatePayMethod()) { e.preventDefault(); return; }
    if (!validateNIF()) { e.preventDefault(); return; }
    const pk = computePickup();
    if (pk.mode === 'blocked') { e.preventDefault(); renderPickupBlock(pk); renderOrderFoot(pk); return; }
    if (state.pickupChoice === 'slot' && state.pickupSlot != null && !pk.slots.includes(state.pickupSlot)) {
      e.preventDefault();
      const p = resolvePickup(pk); state.pickupSlot = p.minutes; if (pk.mode === 'open') state.pickupChoice = 'asap';
      renderPickupBlock(pk); renderPreview();
      toast(t('order.slot_passed', { time: fmtTime(p.minutes) }), 4500);
      return;
    }
    if (anchor && anchor.dataset.locked === '1') { e.preventDefault(); return; }
    const p = resolvePickup(pk);
    const order = {
      code: state.previewCode || genCode(),
      name: currentName(),
      note: currentNote(),
      payMethod: currentPayMethod(),
      nif: nifForMessage(),
      promo: orderTotals().discount ? state.promo : null,
      pickup: p,
      lang: state.lang,
      total: orderTotals().total,
      lines: state.cart.map((l) => ({ id: l.id, choice: l.choice, mods: l.mods, qty: l.qty, name: tr(state.itemsById[l.id].name), opts: lineOptsText(l) })),
      createdAt: Date.now(),
    };
    order.message = composeMessage({ code: order.code, pickup: p, name: order.name, note: order.note, lang: order.lang, payMethod: order.payMethod, nif: order.nif });
    order.href = waHref(order.message);
    const tooLong = !order.href || order.href.length > URL_BUDGET;
    state.pending = order;
    sset(STORE.pending, JSON.stringify(order));
    sset(STORE.lastOrder, JSON.stringify({ lines: order.lines, at: order.createdAt }));
    if (anchor && !tooLong) {
      anchor.href = order.href;
      anchor.dataset.locked = '1';
      anchor.querySelector('span').textContent = t('order.sending');
      setTimeout(() => { delete anchor.dataset.locked; }, 3000);
      setTimeout(() => showConfirm(true), 120);
    } else {
      e.preventDefault();
      if (tooLong) toast(t('order.too_long'), 4000);
      showConfirm(false);
    }
  }

  /* ---------- confirmation view ---------- */
  function showConfirm(openedWA) {
    state.previewCode = null;
    closeSheetDOM();
    if (history.state && history.state.sheet) { try { history.replaceState({}, ''); } catch (e) { /* ignore */ } }
    state.view = 'confirm';
    renderConfirm(openedWA);
    $('#view-menu').classList.add('hidden');
    $('#view-confirm').classList.remove('hidden');
    renderCartBar();
    window.scrollTo(0, 0);
  }
  function renderConfirm(openedWA) {
    const o = state.pending; if (!o) return;
    const p = o.pickup && typeof o.pickup === 'object' ? o.pickup : null;
    const when = p ? whenLabel(p) : (o.pickupText || o.pickupLabel || '');
    const mins = num(ord().reply_expectation_minutes, 10);
    // Pedido feito com a loja fechada: o 👍 só chega à abertura, não em 10 minutos.
    const pkNow = computePickup();
    const step2 = !pkNow.openNow && pkNow.nextOpen ? t('confirm.step2_closed', { day: dayLabel(pkNow.nextOpen.dayOffset, pkNow.nextOpen.di), open: fmtTime(pkNow.nextOpen.open) }) : t('confirm.step2', { min: mins });
    const digits = waDigits();
    const desktop = window.matchMedia && window.matchMedia('(pointer: fine) and (min-width: 900px)').matches;
    const smsHref = digits && fb().sms_enabled === true ? 'sms:+' + digits + '?&body=' + encodeURIComponent(o.message) : '';
    const mailHref = biz().email ? 'mailto:' + encodeURIComponent(biz().email) + '?subject=' + encodeURIComponent('BIKA · Pedido ' + o.code) + '&body=' + encodeURIComponent(o.message) : '';
    const recap = (o.lines || []).map((l) => l.qty + '× ' + l.name + (l.opts ? ' (' + l.opts + ')' : '')).join(', ');
    $('#view-confirm').innerHTML =
      '<div class="confirm">' +
      '<div class="confirm-hero"><div class="eyebrow">' + esc(t('confirm.eyebrow')) + '</div><div class="code">' + esc(o.code) + '</div><div class="when">' + esc(t('confirm.when', { when })) + '</div>' +
      '<div class="when" style="font-size:14.5px;margin-top:6px;max-width:70%">' + esc(o.name) + ' · ' + esc(recap) + ' · ' + esc(fmtMoney(o.total)) + '</div>' +
      '<img class="mascot" src="assets/mascot-orange.png" alt="" aria-hidden="true"></div>' +
      '<h2 style="font-size:26px">' + esc(t('confirm.title')) + '</h2>' +
      '<p class="muted">' + esc(t('confirm.explain')) + '</p>' +
      '<div class="card"><div class="steps">' +
          '<div class="step"><span class="n">1</span><span>' + t('confirm.step1') + '</span></div>' +
          '<div class="step"><span class="n">2</span><span>' + step2 + '</span></div>' +
          '<div class="step"><span class="n">3</span><span>' + t('confirm.step3') + '</span></div>' +
      '</div><p class="hint mt-12">' + esc(t('confirm.change')) + '</p></div>' +
      '<div class="actions">' +
      (o.href ? '<a class="btn primary big block" href="' + esc(o.href) + '" target="_blank" rel="noopener">' + ICON.wa + '<span>' + esc(t('confirm.reopen')) + '</span></a>' : '') +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
      (telHref() ? '<a class="btn ghost" href="' + esc(telHref()) + '">' + ICON.phone + esc(t('confirm.call')) + '</a>' : '') +
      (biz().maps_url ? '<a class="btn ghost" href="' + esc(biz().maps_url) + '" target="_blank" rel="noopener">' + ICON.pin + esc(t('confirm.directions')) + '</a>' : '') +
      '</div></div>' +
      '<details class="card" id="fallback"' + (openedWA && !desktop ? '' : ' open') + '><summary style="font-weight:800;cursor:pointer">' + esc(t('fallback.title')) + '</summary>' +
      '<p class="hint mt-8">' + esc(t('fallback.hint')) + '</p>' +
      '<div class="actions mt-12">' +
      '<button type="button" class="btn navy block" id="copy-btn">' + ICON.copy + esc(t('fallback.copy')) + '</button>' +
      (smsHref ? '<a class="btn ghost block" href="' + esc(smsHref) + '">' + ICON.sms + esc(t('fallback.sms')) + '</a>' : '') +
      (mailHref ? '<a class="btn ghost block" href="' + esc(mailHref) + '">' + ICON.mail + esc(t('fallback.email')) + '</a>' : '') +
      '</div>' +
      (phoneDisplay() ? '<p class="hint mt-12">' + esc(t('fallback.call', { code: o.code, number: phoneDisplay() })) + '</p>' : '') +
      '<p class="hint mt-8">' + esc(t('confirm.show_counter')) + '</p>' +
      '<p class="hint mt-8">' + esc(t('fallback.inapp')) + '</p>' +
      '<pre class="order-text mt-8" id="order-text">' + esc(o.message) + '</pre>' +
      '</details>' +
      '<button type="button" class="btn ghost block" id="new-order">' + esc(t('confirm.new')) + '</button>' +
      '</div>';
  }
  $('#view-confirm').addEventListener('click', async (e) => {
    if (e.target.closest('#copy-btn')) {
      const txt = state.pending ? state.pending.message : '';
      let ok = false;
      try { await navigator.clipboard.writeText(txt); ok = true; } catch (err) {
        try { const ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); document.body.removeChild(ta); } catch (e2) { ok = false; }
      }
      if (ok) toast(t('fallback.copied', { number: phoneDisplay() }), 3500);
      else { const pre = $('#order-text'); if (pre) { const r = document.createRange(); r.selectNodeContents(pre); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); toast(t('fallback.copy_manual'), 3500); } }
    }
    if (e.target.closest('#new-order')) newOrder();
  });
  function newOrder() {
    state.pending = null; sdel(STORE.pending);
    clearCart();
    showMenuView();
  }
  function showMenuView() {
    state.view = 'menu';
    $('#view-confirm').classList.add('hidden');
    $('#view-menu').classList.remove('hidden');
    renderCartBar(); renderReorder();
    window.scrollTo(0, 0);
  }

  /* ---------- language ---------- */
  function detectLang() {
    const q = (params.get('lang') || '').toLowerCase();
    if (LANGS.includes(q)) { sset(STORE.lang, q); return q; }
    const saved = sget(STORE.lang);
    if (LANGS.includes(saved)) return saved;
    const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || '']).map((l) => String(l).toLowerCase().slice(0, 2));
    for (const l of langs) if (LANGS.includes(l)) return l;
    const L = cfg().languages || {};
    return LANGS.includes(L.fallback) ? L.fallback : (LANGS.includes(L.default) ? L.default : 'pt');
  }
  function setLang(l) {
    if (!LANGS.includes(l)) return;
    state.lang = l; sset(STORE.lang, l);
    renderAll();
  }
  function renderAll() {
    renderStatic();
    renderStatus();
    if (state.menu) { renderMenu(); renderCartBar(); renderReorder(); }
    if (state.view === 'confirm') renderConfirm(true);
    if (state.openSheet === 'sheet-order') renderOrderSheet();
    if (state.openSheet === 'sheet-item' && sheetItem) { $('#item-title').textContent = tr(state.itemsById[sheetItem.id].name); renderItemSheet(); }
  }

  /* ---------- global events ---------- */
  $('#lang-switch').addEventListener('click', (e) => { const b = e.target.closest('button[data-lang]'); if (b) setLang(b.dataset.lang); });
  $('#logo-link').addEventListener('click', (e) => { e.preventDefault(); if (state.view === 'confirm') showMenuView(); else window.scrollTo({ top: 0, behavior: 'smooth' }); });
  $('#menu').addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) { const it = state.itemsById[add.dataset.add]; if (!it) return; if (hasOptions(it)) openItemSheet(it.id, add); else addLine(it.id, null, [], 1); return; }
    const dec = e.target.closest('[data-dec]');
    if (dec) { decrementItem(dec.dataset.dec); return; }
    const open = e.target.closest('[data-open]');
    if (open && !orderingOff()) openItemSheet(open.dataset.open, open);
  });
  $('#reorder').addEventListener('click', (e) => { if (e.target.closest('#reorder-btn')) reorderLast(); });
  $('#catnav').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-cat]'); if (!b) return;
    const sec = $('#cat-' + CSS.escape(b.dataset.cat)); if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('#cart-open').addEventListener('click', (e) => openOrderSheet(e.currentTarget));
  $('#backdrop').addEventListener('click', closeSheet);
  document.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSheet(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.openSheet) closeSheet(); });
  window.addEventListener('online', () => { renderNotices(); if (!state.menu) location.reload(); });
  window.addEventListener('offline', renderNotices);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !state.config) return;
    const pk = renderStatus();
    if (state.openSheet === 'sheet-order') { renderPickupBlock(pk); renderOrderFoot(pk); renderPreview(); }
  });
  setInterval(() => { if (state.config) renderStatus(); }, 60 * 1000);

  /* ---------- boot ---------- */
  async function boot() {
    state.testNow = parseTestNow();
    try {
      await loadData();
    } catch (e) {
      $('#menu').innerHTML = '<div class="empty"><img src="assets/mascot-navy.png" alt="" width="480" height="534"><div>' + esc(t('error.load')) + '</div><button type="button" class="btn navy mt-12" id="retry">' + esc(t('error.retry')) + '</button></div>';
      $('#retry').addEventListener('click', () => location.reload());
      return;
    }
    if (cfg().debug !== true) state.testNow = null; // ?now= só em modo de teste
    state.lang = detectLang();
    state.showcase = !waDigits() || ord().enabled === false;
    state.paused = ord().paused === true;
    loadCart();
    reconcileCart();
    const pending = sjson(STORE.pending);
    if (pending && pending.createdAt && Date.now() - pending.createdAt < PENDING_TTL_MS && pending.message) state.pending = pending;
    renderAll();

    if (state.pending) showConfirm(true);
    registerSW();
    window.BIKA = { state, computePickup, composeMessage, nowLisbon };
  }
  function registerSW() {
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* sem SW, sem drama */ });
    }
  }
  boot();
})();
