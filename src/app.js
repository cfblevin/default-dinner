'use strict';
/* =========================================================================
   Default Dinner — cooking mode, events, routing
   ========================================================================= */

const $ = (sel, root = document) => root.querySelector(sel);
let SHEET = null;        // null | { confirm } | { paste } | { backupText }
const OPEN = {};         // remembered <details> state
let lastRoute = '';

/* ---------- Toast ---------- */
let toastTimer = 0;
function toast(msg, action) {
  const el = $('#toast');
  if (!el) return;
  el.innerHTML = esc(msg) + (action ? ` <button type="button" class="toast-act" data-a="${action.act}">${esc(action.label)}</button>` : '');
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3400);
}
function askConfirm(title, text, yesLabel, onYes, altLabel, onAlt) {
  SHEET = { confirm:true, title, text, yesLabel, onYes, altLabel, onAlt };
  renderSheet();
}
function applyTheme() {
  const t = S.prefs.theme;
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-app-theme', t);
  else document.documentElement.removeAttribute('data-app-theme');
}

/* ---------- Audio + wake lock ---------- */
let audioCtx = null;
function ensureAudio() {
  try {
    if (!audioCtx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) audioCtx = new AC(); }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { audioCtx = null; }
}
function beep() {
  try {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    [0, 0.35, 0.7].forEach(off => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, now + off);
      g.gain.exponentialRampToValueAtTime(0.35, now + off + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + off + 0.25);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(now + off); o.stop(now + off + 0.3);
    });
  } catch (e) {}
  try { if (navigator.vibrate) navigator.vibrate([300, 150, 300]); } catch (e) {}
}
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wakeLock && document.visibilityState === 'visible') {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { wakeLock = null; }
}

/* ---------- Cooking mode ---------- */
function cookContext() {
  const ck = S.cook;
  const r = RECIPE[ck.rid];
  const c = build(r, ck.opts || {});
  const steps = stepsFor(c);
  return { r, c, steps, sch: schedule(steps), count: steps.length };
}
function cookSig(r, o) {
  const keys = r.type === 'dinner'
    ? ['mode','servings','amountOz','plates','cut','carb','rice','sauce','tier','portion','heat']
    : ['mode','yield','haveCount','variation','tier'];
  return JSON.stringify(keys.map(k => (o && o[k] != null) ? o[k] : null));
}
function startCook(rid) {
  const r = RECIPE[rid];
  if (!r) return;
  ensureAudio();
  const opts = Object.assign(getOpts(r), r.type === 'dinner' ? { portion: S.prefs.portion, heat: S.prefs.heat } : {});
  const go = () => { save(); location.hash = '#/cook'; };
  const begin = () => { S.cook = { rid, opts, i:0, timers:{}, paused:false, started: Date.now() }; go(); };
  if (!S.cook) return begin();
  if (S.cook.rid === rid && cookSig(r, Object.assign({ portion: S.prefs.portion, heat: S.prefs.heat }, S.cook.opts)) === cookSig(r, opts)) return go();
  const started = (S.cook.i || 0) > 0 || Object.keys(S.cook.timers || {}).length > 0;
  if (!started) return begin();
  const cur = RECIPE[S.cook.rid];
  askConfirm('Start over?',
    `You’re on step ${S.cook.i} of ${cur.name}. Starting ${S.cook.rid === rid ? 'again with these options' : r.name} clears that and its timers.`,
    'Start over', begin, 'Resume ' + cur.short, () => { location.hash = '#/cook'; });
}
function timerLeft(t) { return t.running ? Math.max(0, (t.end - Date.now()) / 1000) : (t.left != null ? t.left : t.total); }

// After cooking: tap what ran out, and it lands on the shopping list.
function kitchenUpdate(c) {
  const ids = usedItems(c).filter(id => inv(id) !== 'out');
  if (!ids.length) return '';
  return `<h2 class="h3 first">Run out of anything?</h2><p class="fine">Tap it and it goes on the shopping list.</p>
    <ul class="inv cook-inv">${ids.map(id => `<li><button type="button" class="inv-row" data-a="cook-out" data-id="${id}"><span class="inv-body"><span class="inv-name">${esc(itemName(id))}</span></span><span class="pill in">Have</span></button></li>`).join('')}</ul>`;
}

function renderCook() {
  const root = $('#cook');
  const prevBody = $('#cook-body');
  const prevScroll = prevBody ? prevBody.scrollTop : 0;
  const prevStep = root.dataset.step;
  const prevFocus = root.contains(document.activeElement) ? focusKey(document.activeElement) : null;
  if (!S.cook || !RECIPE[S.cook.rid]) { root.hidden = true; root.innerHTML = ''; keepAwake(false); return; }
  const { r, c, steps, sch, count } = cookContext();
  const ck = S.cook;
  ck.i = clamp(ck.i || 0, 0, count + 1);
  const i = ck.i;
  const isBake = r.type === 'dessert';
  let body = '', controls = '';
  const pct = Math.round(i / (count + 1) * 100);

  if (i === 0) {
    const pn = r.prepNotes;
    const top = isBake
      ? `<dl class="kv big"><div><dt>Oven</dt><dd>${esc(pn.temp)}</dd></div>${c.y.pan ? `<div><dt>Pan</dt><dd>${esc(c.y.pan)}</dd></div>` : ''}<div><dt>Parchment</dt><dd>${esc(pn.lining)}</dd></div><div><dt>Tools</dt><dd>${esc(pn.tools.join(', '))}</dd></div></dl>`
      : `<h2 class="h3">Get out</h2>${bullets(r.mise)}<h2 class="h3">Equipment</h2>${bullets(r.equipment)}`;
    const summary = isBake ? `${esc(c.y.label)}${c.v ? ' · ' + esc(c.v.label) : ''}` : esc(amountLabel(c));
    body = `<p class="cook-step mono">${isBake ? 'Before you start' : 'Mise en place'} · ${r.crockpot ? times(c).active + ' min hands-on' : 'about ' + fmtDur(sch.total)}</p>
      <h1 id="cook-title" class="cook-title">${isBake ? 'Before you start' : 'Get everything out'}</h1>
      <p class="cook-sub">${summary}</p>
      ${noteCallout(r.id)}
      ${top}
      <h2 class="h3">Ingredients</h2>${ingredientList(c, r.id, 'cook-')}`;
    controls = `<button type="button" class="btn" data-a="cook-exit">Not now</button><button type="button" class="btn primary span2" data-a="cook-next">Start step 1</button>`;
  } else if (i <= count) {
    const s = steps[i - 1];
    const t = ck.timers[i];
    let timer = '';
    if (s.timer) {
      const lockNote = '<p class="fine center">Keep this screen open: iPhone can’t sound a timer while it’s locked or you’re in another app.</p>';
      if (!t) timer = `<button type="button" class="btn timer-start" data-a="timer-start" data-i="${i}"><span class="mono">${fmtSec(s.timer * 60)}</span> Start timer</button>${s.timerNote ? `<p class="fine center">${esc(s.timerNote)}</p>` : ''}${ck.lockNoteSeen ? '' : lockNote}`;
      else if (t.done) timer = `<div class="timer done" role="status"><span class="timer-big mono">0:00</span><span class="timer-label">Timer done</span><div class="pair"><button type="button" class="btn" data-a="timer-reset" data-i="${i}">Restart</button></div></div>`;
      else timer = `<div class="timer ${t.running ? 'running' : 'paused'}"><span class="timer-big mono" data-timer="${i}">${fmtSec(timerLeft(t))}</span><span class="timer-label">${t.running ? 'Running · keep this screen open' : 'Timer paused'}</span><div class="pair">${t.running ? `<button type="button" class="btn" data-a="timer-pause" data-i="${i}">Pause timer</button>` : `<button type="button" class="btn" data-a="timer-start" data-i="${i}">Resume timer</button>`}<button type="button" class="btn" data-a="timer-reset" data-i="${i}">Reset</button></div></div>`;
    }
    const at = sch.items[i - 1] ? sch.items[i - 1].t : 0;
    body = `<p class="cook-step mono">Step ${i} of ${count}${r.crockpot ? '' : ' · ' + fmtClock(at)}</p>
      <h1 id="cook-title" class="cook-title">${esc(s.title)}</h1>
      <p class="cook-text">${esc([fill(s.text, c), s.safety, s.batch].filter(Boolean).join(' '))}</p>
      ${s.warn ? `<p class="callout warn"><strong>Heads up</strong> ${esc(s.warn)}</p>` : ''}
      ${timer}`;
    controls = `<button type="button" class="btn" data-a="cook-back">Back</button><button type="button" class="btn" data-a="cook-pause">Pause</button><button type="button" class="btn primary span2" data-a="cook-next">Done</button>`;
  } else {
    const nu = nutrition(c);
    body = `<p class="cook-step mono">Finished</p>
      <h1 id="cook-title" class="cook-title">${isBake ? 'Done.' : 'That’s dinner.'}</h1>
      <p class="cook-text">${esc(isBake ? r.storage.room : r.finish)}</p>
      ${kitchenUpdate(c)}
      ${c.n > 1 && !isBake ? `<p class="callout safe"><strong>${c.n} portions</strong> Pack them now, fridge once the steam stops. Days 1–4 in the fridge, freeze the rest today.</p>` : ''}
      <details class="more" data-d="finish-storage"><summary>Storing it</summary>${isBake
        ? `<dl class="kv"><div><dt>Fridge</dt><dd>${esc(r.storage.fridge)}</dd></div><div><dt>Freezer</dt><dd>${esc(r.storage.freezer)}</dd></div></dl>`
        : bullets(r.leftovers.storage)}</details>
      ${noteCallout(r.id)}
      <p class="fine">~${roundKcal(nu.kcal)} kcal · ${roundG(nu.protein)} g protein per ${isBake ? c.y.unit : 'serving'}, approximate.</p>`;
    controls = `<button type="button" class="btn" data-a="cook-back">Back</button><button type="button" class="btn primary span2" data-a="cook-finish">Finish</button>`;
  }

  const others = Object.entries(ck.timers).filter(([k, t]) => +k !== i && (t.running || t.done || t.left != null));
  const strip = others.length ? `<div class="timer-strip" aria-label="Other timers">${others.map(([k, t]) => {
    const st = steps[k - 1];
    if (!st) return '';
    return `<button type="button" class="tchip ${t.done ? 'done' : t.running ? 'running' : ''}" data-a="cook-goto" data-i="${k}"><span class="tchip-name">${esc(st.title)}</span><span class="mono" data-timer="${k}">${t.done ? 'Done' : fmtSec(timerLeft(t))}</span></button>`;
  }).join('')}</div>` : '';

  root.innerHTML = `<div class="cook ${ck.paused ? 'is-paused' : ''}" role="dialog" aria-modal="true" aria-labelledby="cook-title">
    <header class="cook-top">
      <button type="button" class="icon-btn" data-a="cook-exit" aria-label="Leave cooking mode (progress is saved)">${ICON.close}</button>
      <span class="cook-recipe">${esc(r.short)}</span>
      <span class="mono cook-count">${i === 0 ? 'Prep' : i <= count ? i + ' / ' + count : 'Done'}</span>
    </header>
    <div class="progress" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="${count + 1}" aria-valuenow="${i}"><span style="width:${pct}%"></span></div>
    ${strip}
    <div class="cook-body" id="cook-body">${body}</div>
    <footer class="cook-controls">${controls}</footer>
    ${ck.paused ? `<div class="paused" role="alertdialog" aria-labelledby="paused-title"><p id="paused-title" class="cook-title">Paused</p><p class="muted">Timers are stopped. Everything is where you left it.</p><button type="button" class="btn primary xl" data-a="cook-resume">Resume</button></div>` : ''}
  </div>`;
  root.hidden = false;
  root.dataset.step = String(i);
  const bodyEl = $('#cook-body');
  if (bodyEl && prevStep === String(i)) bodyEl.scrollTop = prevScroll;
  if (prevFocus && prevStep === String(i)) { const el = root.querySelector(prevFocus); if (el) el.focus({ preventScroll:true }); }
  document.body.classList.add('cooking');
  keepAwake(true);
}
function cookMove(delta) {
  const { count } = cookContext();
  S.cook.i = clamp((S.cook.i || 0) + delta, 0, count + 1);
  save();
  renderCook();
  const b = $('#cook-body'); if (b) b.scrollTop = 0;
  const title = $('#cook-title'); if (title) { title.setAttribute('tabindex', '-1'); title.focus({ preventScroll:true }); }
}
function tick() {
  if (!S.cook) return;
  let finished = false;
  Object.entries(S.cook.timers).forEach(([k, t]) => {
    if (t.running && Date.now() >= t.end) {
      t.running = false; t.done = true; t.left = 0; finished = true;
      const { steps } = cookContext();
      const st = steps[k - 1];
      beep();
      toast('Timer done: ' + (st ? st.title : 'step ' + k));
    }
  });
  if (finished) { save(); if (!$('#cook').hidden) renderCook(); return; }
  document.querySelectorAll('[data-timer]').forEach(el => {
    const t = S.cook.timers[el.dataset.timer];
    if (t && !t.done) el.textContent = fmtSec(timerLeft(t));
  });
}

/* ---------- Sheet ---------- */
let sheetReturnFocus = null;
function renderSheet() {
  const root = $('#sheet');
  if (!SHEET) { root.hidden = true; root.innerHTML = ''; if (sheetReturnFocus) { try { sheetReturnFocus.focus(); } catch (e) {} sheetReturnFocus = null; } return; }
  if (!sheetReturnFocus) sheetReturnFocus = document.activeElement;
  let inner = '';
  if (SHEET.confirm) inner = `<div class="sheet-inner"><h2 class="h2" id="sheet-title">${esc(SHEET.title)}</h2><p class="muted">${esc(SHEET.text)}</p>${SHEET.altLabel
      ? `<div class="pair"><button type="button" class="btn primary" data-a="confirm-alt">${esc(SHEET.altLabel)}</button><button type="button" class="btn danger" data-a="confirm-yes">${esc(SHEET.yesLabel)}</button></div><button type="button" class="text-btn" data-a="close-sheet">Cancel</button>`
      : `<div class="pair"><button type="button" class="btn" data-a="close-sheet">Cancel</button><button type="button" class="btn danger-fill" data-a="confirm-yes">${esc(SHEET.yesLabel)}</button></div>`}</div>`;
  else if (SHEET.paste) inner = `<div class="sheet-inner"><div class="sheet-head"><h2 class="h2" id="sheet-title">Paste backup text</h2><button type="button" class="icon-btn" data-a="close-sheet" aria-label="Close">${ICON.close}</button></div><label for="paste-box" class="muted">Paste the whole backup, then Restore.</label><textarea id="paste-box" class="note-input" rows="6" autocomplete="off"></textarea><button type="button" class="btn primary wide" data-a="restore-from-paste">Restore</button></div>`;
  else if (SHEET.backupText) inner = `<div class="sheet-inner"><div class="sheet-head"><h2 class="h2" id="sheet-title">Copy this</h2><button type="button" class="icon-btn" data-a="close-sheet" aria-label="Close">${ICON.close}</button></div><textarea id="backup-box" class="note-input mono" rows="6" readonly>${esc(SHEET.backupText)}</textarea><button type="button" class="btn primary wide" data-a="backup-copy">Copy text</button></div>`;
  root.innerHTML = `<div class="backdrop" data-a="close-sheet"></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">${inner}</div>`;
  root.hidden = false;
  const first = root.querySelector('.sheet button');
  if (first) first.focus();
}

/* ---------- Router ---------- */
function parseRoute() {
  const h = (location.hash || '').replace(/^#\/?/, '');
  const [a, b] = h.split('/');
  return { a: a || 'meals', b };
}
function focusKey(el) {
  if (!el || !el.dataset) return null;
  if (el.id) return '#' + CSS.escape(el.id);
  if (!el.dataset.a) return null;
  let sel = `[data-a="${el.dataset.a}"]`;
  ['id','v','k','i','rid','d'].forEach(k => { if (el.dataset[k] != null) sel += `[data-${k}="${CSS.escape(el.dataset[k])}"]`; });
  return sel;
}
function render() {
  applyTheme();
  const { a, b } = parseRoute();
  const key = a + '/' + (b || '');
  const sameRoute = key === lastRoute;
  const fk = focusKey(document.activeElement);
  const y = window.scrollY;

  let html, tab = a;
  try {
    switch (a) {
      case 'meals': html = viewMeals(b); break;
      case 'meal': html = viewRecipe(b); tab = 'meals'; break;
      case 'ingredients': html = viewIngredients(); break;
      case 'shopping': html = viewShopping(); break;
      case 'settings': html = viewSettings(); tab = 'meals'; break;
      case 'cook': html = null; break;
      default: location.replace('#/meals'); return;
    }
  } catch (err) {
    console.error(err);
    html = emptyState('Something went wrong on this screen.', 'Your data is safe. Try another tab, or reset from Settings if it keeps happening.', '<a class="btn" href="#/meals">Go to Meals</a>');
  }

  if (a === 'cook') {
    if (!S.cook) { location.replace('#/meals'); return; }
    $('#view').innerHTML = '';
    renderCook();
  } else {
    $('#cook').hidden = true; $('#cook').innerHTML = '';
    document.body.classList.remove('cooking');
    keepAwake(false);
    $('#view').innerHTML = html;
    document.querySelectorAll('.tabbar a').forEach(el => { if (el.dataset.tab === tab) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
    document.querySelectorAll('#view details[data-d]').forEach(d => { if (d.dataset.d in OPEN) d.open = OPEN[d.dataset.d]; });
    if (sameRoute) window.scrollTo(0, y);
    else { window.scrollTo(0, 0); const h1 = $('#view h1'); if (h1 && lastRoute) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll:true }); } }
    if (sameRoute && fk) { const el = document.querySelector(fk); if (el) el.focus({ preventScroll:true }); }
  }
  lastRoute = key;
  renderSheet();
  $('#storage-warn').hidden = Store.ok;
  save();
}

/* ---------- Backup ---------- */
function restoreBackupText(text) {
  let parsed = null;
  try { parsed = JSON.parse(String(text || '').trim()); } catch (e) {}
  if (!parsed || parsed.app !== 'default-dinner' || !isObj(parsed.state)) { toast('That isn’t a Default Dinner backup'); return; }
  const when = parsed.exported ? new Date(parsed.exported).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' }) : 'an unknown date';
  askConfirm('Restore this backup?', 'From ' + when + '. It replaces everything on this device.', 'Restore', () => {
    Store.save(parsed.state);
    S = loadState();
    save();
    location.hash = '#/meals';
    render();
    toast('Backup restored');
  });
}

/* ---------- Actions ---------- */
const ACT = {
  'meal-filter'(el) { S.ui.mealFilter = el.dataset.v; save(); render(); },
  rtab(el) { S.ui.rtabs = Object.assign({}, S.ui.rtabs, { [el.dataset.rid]: el.dataset.v }); save(); render(); const t = document.getElementById('rtab-' + el.dataset.v); if (t) t.focus({ preventScroll:true }); },
  opt(el) {
    const { rid, k } = el.dataset;
    let v = el.dataset.v;
    if (k === 'servings') {
      if (v === 'amount') { setOpt(rid, 'mode', 'amount'); render(); const inp = document.getElementById('amount-' + rid); if (inp) inp.focus({ preventScroll:true }); return; }
      v = SERVING_OPTS.includes(+v) ? +v : 1;
      setOpt(rid, 'mode', 'servings');
      setOpt(rid, 'amountOz', null); setOpt(rid, 'plates', null);
    }
    if (k === 'yield') {
      if (v === 'have') { setOpt(rid, 'mode', 'amount'); render(); return; }
      setOpt(rid, 'mode', 'servings');
    }
    if (k === 'plates') v = clamp(parseInt(v, 10) || 1, 1, 6);
    setOpt(rid, k, v);
    render();
  },
  'amount-preset'(el) { setOpt(el.dataset.rid, 'amountOz', +el.dataset.v); setOpt(el.dataset.rid, 'plates', null); render(); },
  'have-step'(el) {
    const r = RECIPE[el.dataset.rid];
    const cur = getOpts(r).haveCount;
    const next = clamp(cur + (+el.dataset.d), r.have.min, r.have.max);
    if (next === cur) { toast(next === r.have.min ? 'That’s the smallest batch' : 'That’s as big as this recipe goes'); return; }
    setOpt(r.id, 'haveCount', next); render();
  },
  pref(el) {
    const k = el.dataset.k;
    S.prefs[k] = el.dataset.v;
    if (k === 'chickenCut') DINNERS.filter(r => r.hasCut && S.opts[r.id]).forEach(r => { delete S.opts[r.id].cut; });
    save(); render();
  },
  'start-cook'(el) { startCook(el.dataset.id); },
  'clear-checks'(el) { delete S.checks[el.dataset.id]; save(); render(); },

  // ingredients ↔ shopping
  inv(el) { toggleNeed(el.dataset.id); render(); },
  'cook-out'(el) { addNeed(el.dataset.id); renderCook(); toast(itemName(el.dataset.id) + ' added to the list'); },
  'inv-search-clear'() { S.ui.invSearch = ''; save(); render(); const el = $('#inv-search'); if (el) el.focus(); },
  'add-custom'(el) { S.shopping.push({ id:'custom-' + uid(), name: el.dataset.name, g:0, why:'', checked:false }); S.ui.invSearch = ''; save(); location.hash = '#/shopping'; toast('Added to the list'); },
  'recipe-missing'(el) {
    const r = RECIPE[el.dataset.id];
    const c = build(r);
    const miss = missingFor(c);
    miss.forEach(e => addNeed(e.id, e.g, r.short));
    render();
    toast(miss.length ? `Added ${miss.length} ${miss.length > 1 ? 'things' : 'thing'} for ${r.short}` : 'You have everything for this');
  },
  'shop-bought'() {
    const bought = S.shopping.filter(x => x.checked);
    bought.forEach(x => { if (ITEM[x.id]) delete S.inv[x.id]; });
    S.shopping = S.shopping.filter(x => !x.checked);
    save(); render();
    toast(`${bought.length} back on hand`);
  },
  'shop-clear'() { askConfirm('Clear the list?', 'Everything on it goes back to on hand.', 'Clear', () => { S.shopping.forEach(x => { if (ITEM[x.id]) delete S.inv[x.id]; }); S.shopping = []; save(); render(); }); },
  async 'shop-copy'() {
    const groups = {};
    S.shopping.filter(x => !x.checked).forEach(x => { const a = ITEM[x.id] ? ITEM[x.id].aisle : 'Other'; (groups[a] = groups[a] || []).push((ITEM[x.id] ? ITEM[x.id].name : x.name) + (ITEM[x.id] && x.g && fmtBuy(x.id, x.g) ? ' — ' + fmtBuy(x.id, x.g) : '')); });
    const text = Object.entries(groups).map(([a, list]) => a + '\n' + list.map(l => '- ' + l).join('\n')).join('\n\n');
    if (!text) { toast('Nothing left to copy'); return; }
    try { await navigator.clipboard.writeText(text); toast('List copied'); }
    catch (e) { SHEET = { backupText: text }; renderSheet(); }
  },
  'reset-inv'() { askConfirm('Mark everything as on hand?', 'This empties the shopping list too.', 'Mark all on hand', () => { S.inv = {}; S.shopping = S.shopping.filter(x => !ITEM[x.id]); save(); render(); }); },

  // sheets and backup
  'close-sheet'() { SHEET = null; renderSheet(); },
  'confirm-yes'() { const fn = SHEET && SHEET.onYes; SHEET = null; renderSheet(); if (fn) fn(); },
  'confirm-alt'() { const fn = SHEET && SHEET.onAlt; SHEET = null; renderSheet(); if (fn) fn(); },
  'restore-paste'() { SHEET = { paste:true }; renderSheet(); const t = $('#paste-box'); if (t) t.focus(); },
  'restore-from-paste'() { const t = $('#paste-box'); restoreBackupText(t ? t.value : ''); },
  async 'backup-save'() {
    const stamp = new Date();
    const name = 'default-dinner-backup-' + stamp.getFullYear() + '-' + String(stamp.getMonth() + 1).padStart(2, '0') + '-' + String(stamp.getDate()).padStart(2, '0') + '.json';
    const data = JSON.stringify({ app:'default-dinner', exported: Date.now(), state: S });
    const done = msg => { S.lastBackup = Date.now(); save(); render(); if (msg) toast(msg); };
    try {
      const file = new File([data], name, { type:'application/json' });
      if (navigator.canShare && navigator.canShare({ files:[file] })) { await navigator.share({ files:[file], title:'Default Dinner backup' }); return done('Backup saved'); }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    try {
      if (window.top !== window) throw new Error('embedded');
      const url = URL.createObjectURL(new Blob([data], { type:'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return done('Backup downloaded: ' + name);
    } catch (e) {
      SHEET = { backupText: data }; renderSheet();
      S.lastBackup = Date.now(); save();
    }
  },
  async 'backup-copy'() {
    const box = $('#backup-box');
    try { await navigator.clipboard.writeText(box.value); toast('Copied'); }
    catch (e) { box.focus(); box.select(); toast('Select all and copy'); }
  },
  'reset-app'() { askConfirm('Reset everything?', 'Ingredients, list, notes and settings are erased from this device.', 'Erase everything', () => { Store.clear(); S = defaultState(); location.hash = '#/meals'; render(); }); },

  // cooking
  'cook-exit'() { const rid = S.cook && S.cook.rid; save(); location.hash = rid ? '#/meal/' + rid : '#/meals'; },
  'cook-next'() { ensureAudio(); cookMove(1); },
  'cook-back'() { cookMove(-1); },
  'cook-goto'(el) { S.cook.i = +el.dataset.i; save(); renderCook(); },
  'cook-pause'() {
    S.cook.paused = true;
    Object.values(S.cook.timers).forEach(t => { if (t.running) { t.left = timerLeft(t); t.running = false; t.held = true; } });
    save(); renderCook();
    const b = $('.paused .btn'); if (b) b.focus();
  },
  'cook-resume'() {
    ensureAudio();
    S.cook.paused = false;
    Object.values(S.cook.timers).forEach(t => { if (t.held) { t.end = Date.now() + t.left * 1000; t.running = true; t.held = false; } });
    save(); renderCook();
  },
  'timer-start'(el) {
    ensureAudio();
    S.cook.lockNoteSeen = true;
    const i = +el.dataset.i;
    const { steps } = cookContext();
    const s = steps[i - 1];
    if (!s || !s.timer) return;
    const t = S.cook.timers[i] || { total: s.timer * 60 };
    const left = t.left != null && !t.done ? t.left : t.total;
    Object.assign(t, { end: Date.now() + left * 1000, running:true, done:false, left:null });
    S.cook.timers[i] = t;
    save(); renderCook();
  },
  'timer-pause'(el) { const t = S.cook.timers[el.dataset.i]; if (t && t.running) { t.left = timerLeft(t); t.running = false; } save(); renderCook(); },
  'timer-reset'(el) { delete S.cook.timers[el.dataset.i]; save(); renderCook(); },
  'cook-finish'() {
    const { r } = cookContext();
    delete S.checks[r.id];
    S.cook = null;
    save();
    location.hash = '#/meal/' + r.id;
    toast('Nice work.');
  },
};

const CHANGE = {
  check(el) { const { rid, key } = el.dataset; S.checks[rid] = Object.assign({}, S.checks[rid], { [key]: el.checked }); save(); },
  'shop-check'(el) { const x = S.shopping.find(s => s.id === el.dataset.id); if (x) x.checked = el.checked; save(); render(); },
  'amount-num'(el) {
    const rid = el.dataset.rid;
    const o = getOpts(RECIPE[rid]);
    const val = parseFloat(String(el.value).replace(',', '.'));
    const oz = o.amountUnit === 'lb' ? val * 16 : val;
    if (!(oz >= 2 && oz <= 96)) { toast('Enter an amount between 2 oz and 6 lb'); deferRender(); return; }
    setOpt(rid, 'amountOz', Math.round(oz * 10) / 10);
    setOpt(rid, 'plates', null);
    deferRender();
  },
  'restore-file'(el) {
    const file = el.files && el.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('That file is too big to be a backup'); el.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => { el.value = ''; restoreBackupText(reader.result); };
    reader.onerror = () => toast('Couldn’t read that file');
    reader.readAsText(file);
  },
};

/* ---------- Events ---------- */
// A change event fires when the amount box loses focus, on the way to tapping
// something else. Rebuilding right then would swallow that tap.
let pendingRender = 0;
function deferRender() { clearTimeout(pendingRender); pendingRender = setTimeout(() => { pendingRender = 0; render(); }, 400); }
function flushRender() { if (!pendingRender) return false; clearTimeout(pendingRender); pendingRender = 0; return true; }

document.addEventListener('input', e => {
  const el = e.target;
  if (!el.dataset) return;
  if (el.dataset.a === 'inv-search') {
    S.ui.invSearch = el.value.slice(0, 40);
    save(); render();
    const box = $('#inv-search');
    if (box) { box.focus(); box.setSelectionRange(box.value.length, box.value.length); }
  } else if (el.dataset.a === 'note') {
    const t = el.value.slice(0, 1000);
    if (t.trim()) S.notes[el.dataset.rid] = t; else delete S.notes[el.dataset.rid];
    save();
  }
});
document.addEventListener('click', e => {
  const hadPending = flushRender();
  const skip = e.target.closest('.skip');
  if (skip) { e.preventDefault(); const v = $('#view'); v.focus(); v.scrollIntoView(); return; }
  const el = e.target.closest('[data-a]');
  if (!el || ['INPUT','TEXTAREA','FORM'].includes(el.tagName)) { if (!el && hadPending) render(); return; }
  const fn = ACT[el.dataset.a];
  if (!fn) { if (hadPending) render(); return; }
  e.preventDefault();
  fn(el, e);
});
document.addEventListener('change', e => {
  const el = e.target;
  if (!el.dataset || !el.dataset.a) return;
  const fn = CHANGE[el.dataset.a];
  if (fn) fn(el, e);
});
document.addEventListener('submit', e => {
  const form = e.target;
  if (form.dataset.a !== 'shop-add') return;
  e.preventDefault();
  const input = form.querySelector('input');
  const name = (input.value || '').trim().slice(0, 60);
  if (!name) { input.focus(); return; }
  const match = ITEMS.find(i => i.name.toLowerCase() === name.toLowerCase());
  if (match) addNeed(match.id);
  else S.shopping.push({ id:'custom-' + uid(), name, g:0, why:'', checked:false });
  save(); render();
  const again = document.getElementById('add-item'); if (again) again.focus();
});
document.addEventListener('toggle', e => {
  const d = e.target;
  if (d.tagName === 'DETAILS' && d.dataset.d) OPEN[d.dataset.d] = d.open;
}, true);
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('amount-input')) { e.preventDefault(); e.target.blur(); flushRender(); render(); return; }
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key) && e.target.matches && e.target.matches('[role="radio"],[role="tab"]')) {
    const group = e.target.closest('[role="radiogroup"],[role="tablist"]');
    if (group) {
      const items = [...group.querySelectorAll('[role="radio"],[role="tab"]')];
      const idx = items.indexOf(e.target);
      const next = items[(idx + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length];
      e.preventDefault(); next.focus(); next.click();
      return;
    }
  }
  if (e.key === 'Escape') {
    if (SHEET) { SHEET = null; renderSheet(); return; }
    if (!$('#cook').hidden && S.cook && S.cook.paused) { ACT['cook-resume'](); return; }
  }
  if (!$('#cook').hidden && S.cook && !S.cook.paused && !SHEET) {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if (e.key === 'ArrowRight') { e.preventDefault(); cookMove(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); cookMove(-1); }
  }
  if (e.key === 'Tab' && SHEET) {
    const f = [...document.querySelectorAll('#sheet .sheet button')];
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { tick(); if (!$('#cook').hidden) keepAwake(true); }
});
window.addEventListener('hashchange', render);
window.addEventListener('storage', e => { if (e.key === STORE_KEY) { S = loadState(); render(); } });
setInterval(tick, 500);

/* ---------- Offline support (hosted build only) ---------- */
if (window.__OFFLINE__ && 'serviceWorker' in navigator && window.top === window) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('./sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) toast('Update downloaded. Close and reopen the app to use it.');
    else if (parseRoute().a === 'settings') render();
  });
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
}

render();
