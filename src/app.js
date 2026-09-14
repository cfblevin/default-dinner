'use strict';
/* =========================================================================
   Default Dinner — cooking mode, onboarding, events, routing
   ========================================================================= */

const $ = (sel, root = document) => root.querySelector(sel);
let SHEET = null;          // null | 'switch' | {confirm}
let OB = null;             // onboarding scratch state
const OPEN = {};           // remembered <details> open state
let lastRoute = '';

/* ---------- Toast ---------- */
let toastTimer = 0;
function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
}

/* ---------- Confirm sheet (window.confirm can be blocked in sandboxes) ---------- */
function askConfirm(title, text, yesLabel, onYes) {
  SHEET = { confirm:true, title, text, yesLabel, onYes };
  renderSheet();
}

/* ---------- Theme ---------- */
function applyTheme() {
  const t = S.prefs.theme;
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-app-theme', t);
  else document.documentElement.removeAttribute('data-app-theme');
}

/* ---------- Audio + wake lock for cooking ---------- */
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
  const sch = schedule(steps);
  return { r, c, steps, sch, count: steps.length };
}
function startCook(rid) {
  const r = RECIPE[rid];
  if (!r) return;
  ensureAudio();
  const opts = getOpts(r);
  if (!S.cook || S.cook.rid !== rid || JSON.stringify(S.cook.opts) !== JSON.stringify(opts) || S.cook.portion !== S.prefs.portion) {
    S.cook = { rid, opts, portion: S.prefs.portion, i:0, timers:{}, paused:false, started: Date.now() };
  }
  if (r.type === 'dinner') setTonight(rid);
  save();
  location.hash = '#/cook';
}
function timerLeft(t) { return t.running ? Math.max(0, (t.end - Date.now()) / 1000) : (t.left != null ? t.left : t.total); }

function renderCook() {
  const root = $('#cook');
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
      ? `<dl class="kv big">${r.bakes ? `<div><dt>Oven</dt><dd>${esc(pn.temp)}</dd></div>` : ''}${c.y.pan ? `<div><dt>Pan</dt><dd>${esc(c.y.pan)}</dd></div>` : ''}<div><dt>${r.bakes ? 'Parchment / spray' : 'To store'}</dt><dd>${esc(pn.lining)}</dd></div><div><dt>Measuring tools</dt><dd>${esc(pn.tools.join(', '))}</dd></div>${r.ahead ? `<div><dt>Ahead</dt><dd>${esc(r.ahead)}</dd></div>` : ''}</dl>`
      : `<h2 class="h3">Get out</h2>${bullets(r.mise)}<h2 class="h3">Equipment</h2>${bullets(r.equipment)}`;
    const summary = isBake
      ? `${esc(c.y.label)}${c.v ? ' · ' + esc(c.v.label) : ''}${c.g ? ' · ' + esc(c.g.label) + (c.g.id === 'none' ? '' : ' glaze') : ''}`
      : `${c.n} ${c.n > 1 ? 'servings' : 'serving'} · ${c.tier[0].toUpperCase() + c.tier.slice(1)}${r.hasCarbChoice ? ' · ' + (c.carb === 'potato' ? 'potatoes' : 'rice') : ''}${c.carb === 'rice' ? ' · ' + (c.rice === 'ready' ? 'rice already cooked' : 'fresh rice') : ''}`;
    body = `<p class="cook-step mono">${isBake ? 'Before you start' : 'Mise en place'} · about ${fmtDur(sch.total)}</p>
      <h1 id="cook-title" class="cook-title">${isBake ? 'Before you start' : 'Get everything out'}</h1>
      <p class="cook-sub">${summary}</p>
      ${top}
      <h2 class="h3">Ingredients</h2>${ingredientList(c, r.id, 'cook-')}`;
    controls = `<button type="button" class="btn" data-a="cook-exit">Not now</button><button type="button" class="btn primary span3" data-a="cook-next">Start step 1</button>`;
  } else if (i <= count) {
    const s = steps[i - 1];
    const t = ck.timers[i];
    let timer = '';
    if (s.timer) {
      if (!t) timer = `<button type="button" class="btn timer-start" data-a="timer-start" data-i="${i}"><span class="mono">${fmtSec(s.timer * 60)}</span> Start timer</button>${s.timerNote ? `<p class="fine center">${esc(s.timerNote)}</p>` : ''}`;
      else if (t.done) timer = `<div class="timer done" role="status"><span class="timer-big mono">0:00</span><span class="timer-label">Timer done</span><div class="pair"><button type="button" class="btn" data-a="timer-reset" data-i="${i}">Restart</button></div></div>`;
      else timer = `<div class="timer ${t.running ? 'running' : 'paused'}"><span class="timer-big mono" data-timer="${i}">${fmtSec(timerLeft(t))}</span><span class="timer-label">${t.running ? 'Running — you can move on' : 'Timer paused'}</span><div class="pair">${t.running ? `<button type="button" class="btn" data-a="timer-pause" data-i="${i}">Pause timer</button>` : `<button type="button" class="btn" data-a="timer-start" data-i="${i}">Resume timer</button>`}<button type="button" class="btn" data-a="timer-reset" data-i="${i}">Reset</button></div></div>`;
    }
    const at = sch.items[i - 1] ? sch.items[i - 1].t : 0;
    body = `<p class="cook-step mono">Step ${i} of ${count} · ${fmtClock(at)}</p>
      <h1 id="cook-title" class="cook-title">${esc(s.title)}</h1>
      <p class="cook-text">${esc(fill(s.text, c))}</p>
      ${s.batch ? `<p class="callout">${esc(s.batch)}</p>` : ''}
      ${s.warn ? `<p class="callout warn"><strong>Heads up</strong> ${esc(s.warn)}</p>` : ''}
      ${s.safety ? `<p class="callout safe"><strong>Food safety</strong> ${esc(s.safety)}</p>` : ''}
      ${s.tip ? `<p class="callout tip"><strong>Tip</strong> ${esc(fill(s.tip, c))}</p>` : ''}
      ${timer}`;
    controls = `<button type="button" class="btn" data-a="cook-back">Back</button><button type="button" class="btn" data-a="cook-pause">Pause</button><button type="button" class="btn" data-a="cook-skip">Skip</button><button type="button" class="btn primary" data-a="cook-next">Done</button>`;
  } else {
    const nu = nutrition(c);
    const extra = r.type === 'dinner' && c.n > 1;
    body = `<p class="cook-step mono">Finished</p>
      <h1 id="cook-title" class="cook-title">${isBake ? 'Done.' : 'Dinner’s ready.'}</h1>
      ${r.type === 'dinner' ? `<p class="cook-text">${esc(r.finish)}</p>` : `<p class="cook-text">${esc(r.storage.room)}</p>`}
      ${r.type === 'dinner'
        ? `<h2 class="h3">If you’re not finishing it</h2>${bullets(r.leftovers.separate)}<h2 class="h3">Storage</h2>${bullets(r.leftovers.storage.slice(0, 2))}`
        : `<dl class="kv"><div><dt>Fridge</dt><dd>${esc(r.storage.fridge)}</dd></div><div><dt>Freezer</dt><dd>${esc(r.storage.freezer)}</dd></div><div><dt>Reheat</dt><dd>${esc(r.storage.reheat)}</dd></div></dl>`}
      ${extra ? (() => { const left = c.n - 1, fridge = Math.min(left, FRIDGE_SLOTS - 1), freezer = left - fridge; return `<div class="check-line"><input type="checkbox" id="cook-pack" checked><label for="cook-pack">Save the other ${left} ${left > 1 ? 'servings' : 'serving'} as containers: ${fridge} in the fridge${freezer ? `, ${freezer} in the freezer` : ''}</label></div>`; })() : ''}
      <p class="fine">~${roundKcal(nu.kcal)} kcal · ${roundG(nu.protein)} g protein per ${isBake ? c.y.unit : 'serving'}, approximate.</p>`;
    controls = `<button type="button" class="btn" data-a="cook-back">Back</button><button type="button" class="btn primary span3" data-a="cook-finish">Log it and finish</button>`;
  }

  // Running timers from other steps
  const others = Object.entries(ck.timers).filter(([k, t]) => +k !== i && !t.cleared && (t.running || t.done || t.left != null));
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

/* ---------- Onboarding ---------- */
const OB_ITEMS = ['chicken','beef','rice','ricepouch','broccoli','yogurt','eggs','protein','bananas','oats','blackbeans','corn','lettuce','cucumber','tomato','spinach','salsa','bbq','soy','honey','garlic','lemon','lime','milk','cocoa','chips'];
function renderOnboarding() {
  const root = $('#onboarding');
  if (S.onboarded) { root.hidden = true; root.innerHTML = ''; return; }
  if (!OB) OB = { step:1, days:4, have:new Set(), basics:true, meal:S.prefs.defaultMeal };
  let body = '';
  if (OB.step === 1) {
    body = `<h1 class="display" id="ob-title">How many dinners do you want to prep?</h1>
      <p class="lede">You can change this any time in Prep.</p>
      <div class="ob-choices">${[[2,'2','A couple of days'],[4,'4','Most of the week'],[7,'7','A full week'],[0,'None','Not right now']].map(([v, big, small]) =>
        `<button type="button" class="ob-choice${OB.days === v ? ' on' : ''}" aria-pressed="${OB.days === v}" data-a="ob-days" data-v="${v}"><span class="ob-big mono">${big}</span><span>${small}</span></button>`).join('')}</div>
      <button type="button" class="btn primary xl" data-a="ob-next">Next</button>`;
  } else if (OB.step === 2) {
    body = `<h1 class="display" id="ob-title">What’s already in your kitchen?</h1>
      <p class="lede">Tap what you have. Rough is fine — it’s all adjustable later.</p>
      <div class="ob-grid">${OB_ITEMS.map(id => `<button type="button" class="chip big" aria-pressed="${OB.have.has(id)}" data-a="ob-have" data-id="${id}">${esc(itemName(id).replace(/\s*\(.*\)$/, ''))}</button>`).join('')}</div>
      <button type="button" class="chip big basics" aria-pressed="${OB.basics}" data-a="ob-basics">Oil, salt, pepper and common spices</button>
      <button type="button" class="btn primary xl" data-a="ob-next">Next</button>`;
  } else {
    body = `<h1 class="display" id="ob-title">Pick your default dinner.</h1>
      <p class="lede">It’s the fallback when you don’t want to think about it.</p>
      <ul class="pick">${DINNERS.map(r => `<li><button type="button" class="pick-row${OB.meal === r.id ? ' current' : ''}" aria-pressed="${OB.meal === r.id}" data-a="ob-meal" data-id="${r.id}">${bowlSVG(r, 52)}<span class="pick-body"><span class="pick-name">${esc(r.name)}</span><span class="meta">${esc(r.flavor)}</span></span></button></li>`).join('')}</ul>
      <button type="button" class="btn primary xl" data-a="ob-finish">Show me tonight</button>`;
  }
  root.innerHTML = `<div class="ob" role="dialog" aria-modal="true" aria-labelledby="ob-title">
    <div class="ob-top"><span class="mono muted">${OB.step} of 3</span>${OB.step > 1 ? `<button type="button" class="text-btn" data-a="ob-back">Back</button>` : '<span></span>'}<button type="button" class="text-btn" data-a="ob-skip">Skip setup</button></div>
    <div class="ob-body">${body}</div></div>`;
  root.hidden = false;
}
function finishOnboarding(applyAnswers) {
  if (applyAnswers && OB) {
    if (OB.days) { S.prep.days = OB.days; S.prep.split = null; }
    OB.have.forEach(id => setInv(id, 'in'));
    if (OB.basics) ITEMS.filter(i => i.staple).forEach(i => setInv(i.id, 'in'));
    S.prefs.defaultMeal = OB.meal;
    setTonight(OB.meal);
  }
  S.onboarded = true;
  OB = null;
  save();
  location.hash = '#/tonight';
  render();
}

/* ---------- Sheet ---------- */
let sheetReturnFocus = null;
function renderSheet() {
  const root = $('#sheet');
  if (!SHEET) { root.hidden = true; root.innerHTML = ''; if (sheetReturnFocus) { try { sheetReturnFocus.focus(); } catch (e) {} sheetReturnFocus = null; } return; }
  if (!sheetReturnFocus) sheetReturnFocus = document.activeElement;
  let inner;
  if (SHEET === 'switch') inner = sheetSwitch();
  else if (SHEET.confirm) inner = `<div class="sheet-inner"><h2 class="h2" id="sheet-title">${esc(SHEET.title)}</h2><p class="muted">${esc(SHEET.text)}</p><div class="pair"><button type="button" class="btn" data-a="close-sheet">Cancel</button><button type="button" class="btn danger-fill" data-a="confirm-yes">${esc(SHEET.yesLabel)}</button></div></div>`;
  root.innerHTML = `<div class="backdrop" data-a="close-sheet"></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">${inner}</div>`;
  root.hidden = false;
  const first = root.querySelector('.sheet button');
  if (first) first.focus();
}

/* ---------- Router + render ---------- */
function parseRoute() {
  const h = (location.hash || '').replace(/^#\/?/, '');
  const [a, b] = h.split('/');
  return { a: a || 'tonight', b };
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

  let html;
  let tab = a;
  try {
    switch (a) {
      case 'tonight': html = viewTonight(); break;
      case 'meals': html = viewMeals(); break;
      case 'meal': html = viewMeal(b); tab = 'meals'; break;
      case 'sweet': html = b ? viewDessert(b) : viewSweet(); break;
      case 'prep': html = viewPrep(b); break;
      case 'inventory': html = viewInventory(b); break;
      case 'nocook': html = viewNoCook(); tab = 'tonight'; break;
      case 'week': html = viewWeek(); tab = 'tonight'; break;
      case 'settings': html = viewSettings(); tab = 'tonight'; break;
      case 'cook': html = null; break;
      default: location.replace('#/tonight'); return;
    }
  } catch (err) {
    console.error(err);
    html = emptyState('Something went wrong on this screen.', 'Your data is safe. Try another tab, or reset from Settings if it keeps happening.', '<a class="btn" href="#/tonight">Go to Tonight</a>');
  }

  if (a === 'cook') {
    if (!S.cook) { location.replace('#/tonight'); return; }
    $('#view').innerHTML = '';
    renderCook();
  } else {
    $('#cook').hidden = true; $('#cook').innerHTML = '';
    document.body.classList.remove('cooking');
    keepAwake(false);
    $('#view').innerHTML = html;
    document.querySelectorAll('.tabbar a').forEach(el => { if (el.dataset.tab === tab) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
    // restore remembered <details> state
    document.querySelectorAll('#view details[data-d]').forEach(d => { if (d.dataset.d in OPEN) d.open = OPEN[d.dataset.d]; });
    if (sameRoute) window.scrollTo(0, y);
    else { window.scrollTo(0, 0); const h1 = $('#view h1'); if (h1 && lastRoute) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll:true }); } }
    if (sameRoute && fk) { const el = document.querySelector(fk); if (el) el.focus({ preventScroll:true }); }
  }
  lastRoute = key;
  renderSheet();
  renderOnboarding();
  $('#storage-warn').hidden = Store.ok;
  save();
}

/* ---------- Actions ---------- */
function randomOther(list, cur) { const pool = list.filter(r => r.id !== cur); return pool[Math.floor(Math.random() * pool.length)]; }

function needsFromBuild(c) {
  return c.ings.filter(i => !(i.extra === 'Heat' && S.prefs.heat === 'mild')).map(i => {
    const a = avail(i, false);
    return { id: a.st !== 'out' ? a.via : altIds(i, true)[0], g: i.sg, st: a.st };
  }).filter(e => ITEM[e.id]);
}

const ACT = {
  fav(el) { const id = el.dataset.id; S.favorites = isFav(id) ? S.favorites.filter(x => x !== id) : S.favorites.concat(id); save(); render(); },
  'start-cook'(el) { startCook(el.dataset.id); },
  resume() { ensureAudio(); location.hash = '#/cook'; },
  switch() { SHEET = 'switch'; renderSheet(); },
  'close-sheet'() { SHEET = null; renderSheet(); },
  'confirm-yes'() { const fn = SHEET && SHEET.onYes; SHEET = null; renderSheet(); if (fn) fn(); },
  'pick-meal'(el) { setTonight(el.dataset.id); SHEET = null; render(); toast('Tonight: ' + RECIPE[el.dataset.id].name); },
  surprise() { const r = randomOther(DINNERS, recommendTonight()); setTonight(r.id); SHEET = null; if (parseRoute().a !== 'tonight') location.hash = '#/tonight'; render(); toast('Surprise: ' + r.name); },
  'surprise-go'() { const r = randomOther(DINNERS, recommendTonight()); setTonight(r.id); location.hash = '#/meal/' + r.id; },
  'surprise-dessert'() { const cur = parseRoute().b; const r = randomOther(DESSERTS, cur); location.hash = '#/sweet/' + r.id; },
  opt(el) {
    const { rid, k } = el.dataset;
    let v = el.dataset.v;
    if (k === 'servings') v = SERVING_OPTS.includes(+v) ? +v : 1;
    setOpt(rid, k, v);
    render();
  },
  pref(el) {
    const k = el.dataset.k, v = el.dataset.v;
    S.prefs[k] = v;
    if (k === 'carb' && S.opts.bbq) delete S.opts.bbq.carb;
    if (k === 'heat' && S.opts.bbq) delete S.opts.bbq.sauce;
    if (k === 'defaultMeal') { S.lastMeal = null; if (!S.prefs.autoRecommend) S.tonight = null; }
    if (['protein','carb','defaultMeal'].includes(k) && S.tonight && S.tonight.auto) S.tonight = null;
    save(); render();
  },
  'pref-toggle'(el) {
    const k = el.dataset.k;
    S.prefs[k] = !S.prefs[k];
    if (k === 'autoRecommend') S.tonight = null;
    save(); render();
  },
  'clear-checks'(el) { delete S.checks[el.dataset.id]; save(); render(); },
  'recipe-missing'(el) {
    const r = RECIPE[el.dataset.id];
    const needs = needsFromBuild(build(r));
    const n = addMissingToList(needs);
    render();
    toast(n ? `Added ${n} ${n > 1 ? 'items' : 'item'} to your shopping list` : 'You have everything for this one');
  },
  'prep-days'(el) { const v = el.dataset.v; const cur = prepCount(); S.prep.days = v === 'custom' ? 'custom' : +v; if (v === 'custom') S.prep.custom = cur; else S.prep.split = null; save(); render(); },
  'prep-custom'(el) { S.prep.custom = clamp(prepCount() + (+el.dataset.d), 1, 14); S.prep.days = 'custom'; S.prep.split = null; save(); render(); },
  split(el) {
    const sp = Object.assign({}, prepSplit());
    sp[el.dataset.id] = Math.max(0, sp[el.dataset.id] + (+el.dataset.d));
    const total = sum(Object.values(sp));
    if (total < 1) { toast('Keep at least one dinner in the plan'); return; }
    if (total > 14) { toast('14 dinners is the most that stays safe to store'); return; }
    S.prep.split = sp;
    S.prep.days = [2, 4, 7].includes(total) ? total : 'custom';
    S.prep.custom = total;
    save(); render();
  },
  'prep-missing'() { const agg = aggregate(planBuilds(prepSplit())); const n = addMissingToList(Object.values(agg)); render(); toast(n ? `Added ${n} items to your shopping list` : 'You have everything for this plan'); },
  'prep-reset'() { S.prep.done = {}; save(); render(); },
  comp(el) {
    const steps = { rice:0.5, chicken:0.5, beef:0.25, broccoli:1 };
    const k = el.dataset.k;
    S.prep.comp[k] = clamp(Math.round(((+S.prep.comp[k] || 0) + (+el.dataset.d) * steps[k]) * 100) / 100, 0, k === 'broccoli' ? 20 : 10);
    save(); render();
  },
  'comp-finish'() {
    const cp = S.prep.comp;
    const now = Date.now();
    if (cp.rice > 0) { S.inv.p_rice = 'in'; S.invDates.p_rice = now; }
    if (cp.chicken > 0) { S.inv.p_chicken = 'in'; S.invDates.p_chicken = now; }
    if (cp.beef > 0) { S.inv.p_beef = 'in'; S.invDates.p_beef = now; }
    S.prep.compDone = {};
    logHistory('components', null, { name:'rice, chicken, beef' });
    render();
    toast('Marked as cooked. Five-minute mode is stocked.');
  },
  'bake-yield'(el) { const id = el.dataset.id; if (S.prep.bake.sel[id]) S.prep.bake.sel[id].yield = el.dataset.v; save(); render(); },
  'bake-suggest'() { S.prep.bake.sel = { bread:{ yield:'full' }, brownies:{ yield:'full' } }; save(); render(); },
  'bake-missing'() { const builds = DESSERTS.filter(r => S.prep.bake.sel[r.id]).map(r => build(r, { yield:S.prep.bake.sel[r.id].yield, tier:'base' })); const n = addMissingToList(Object.values(aggregate(builds))); render(); toast(n ? `Added ${n} items to your shopping list` : 'You have everything for this bake'); },
  'bake-reset'() { S.prep.bake.done = {}; save(); render(); },
  'bake-log'() {
    const chosen = DESSERTS.filter(r => S.prep.bake.sel[r.id]);
    chosen.forEach(r => logHistory('dessert', r.id));
    S.prep.bake.done = {};
    save(); render();
    toast('Logged ' + chosen.map(r => r.short.toLowerCase()).join(' and '));
  },
  'pack-save'() {
    const plan = packingPlan(prepSplit());
    const now = Date.now();
    const packed = plan.filter(p => S.prep.packed[p.n]);
    if (!packed.length) return;
    packed.forEach(p => S.containers.push({ uid: uid(), rid: p.rid, packed: now, frozen: p.freeze, thawed: null }));
    logHistory('prep', null, { n: packed.length, name: 'containers' });
    S.prep.packed = {};
    save(); render();
    toast(`Saved ${packed.length} ${packed.length > 1 ? 'containers' : 'container'}`);
  },
  'start-prep'() { S.prep.days = 4; S.prep.split = null; save(); location.hash = '#/prep/dinners'; },
  thaw(el) { const ct = S.containers.find(x => x.uid === el.dataset.id); if (ct) { ct.frozen = false; ct.thawed = Date.now(); } save(); render(); toast('Moved to the fridge. Thaw overnight, eat within 3–4 days.'); },
  eat(el) {
    const idx = S.containers.findIndex(x => x.uid === el.dataset.id);
    if (idx < 0) return;
    const ct = S.containers[idx];
    const c = build(RECIPE[ct.rid], { servings:1, tier:'base' });
    const nu = nutrition(c);
    S.containers.splice(idx, 1);
    logHistory('leftover', ct.rid, { protein: nu.protein, veg: vegCups(c) });
    render();
    toast('Logged. ' + S.containers.filter(x => containerState(x) === 'good').length + ' ready to heat left.');
  },
  discard(el) {
    const ct = S.containers.find(x => x.uid === el.dataset.id);
    if (!ct) return;
    askConfirm('Remove this container?', RECIPE[ct.rid].name + ' will come off your list.', 'Remove', () => {
      S.containers = S.containers.filter(x => x.uid !== ct.uid); save(); render();
    });
  },
  inv(el) { cycleInv(el.dataset.id); render(); },
  'inv-filter'(el) { S.ui.invFilter = el.dataset.v; save(); render(); },
  basics() { ITEMS.filter(i => i.staple).forEach(i => setInv(i.id, 'in')); save(); render(); toast('Marked oil, salt, pepper and spices as in stock'); },
  'build-list'() { S.shopSources.tonight = true; S.shopSources.prep = true; const n = addMissingToList(shoppingNeeds()); location.hash = '#/inventory/shopping'; toast(`Added ${n} items for tonight and your prep plan`); },
  'reset-inv'() { askConfirm('Reset inventory?', 'Every item goes back to Out. Your shopping list and recipes stay.', 'Reset inventory', () => { S.inv = {}; S.invDates = {}; save(); render(); toast('Inventory reset'); }); },
  'shop-addall'() { const n = addMissingToList(shoppingNeeds()); render(); toast(`Added ${n} ${n === 1 ? 'item' : 'items'}`); },
  'shop-putaway'() {
    const checked = S.shopping.filter(x => x.checked);
    checked.forEach(x => { if (ITEM[x.id]) setInv(x.id, 'in'); });
    S.shopping = S.shopping.filter(x => !x.checked);
    save(); render();
    toast(`${checked.length} marked in stock`);
  },
  'shop-clear'() { askConfirm('Clear the shopping list?', 'This removes every item on the list.', 'Clear list', () => { S.shopping = []; save(); render(); }); },
  'quick-log'(el) {
    const q = QUICK.find(x => x.id === el.dataset.id);
    if (!q) return;
    const c = { ings: q.ing.filter(i => !i.opt || avail(i).st !== 'out').map(i => Object.assign({}, i, { sq:i.q, sg:i.g })), pieces:1 };
    const nu = nutrition(c);
    const veg = sum(c.ings.filter(i => ['broccoli','corn','blackbeans','cucumber','tomato','spinach','lettuce','berries'].includes(i.id) && i.u === 'cup').map(i => i.q));
    logHistory('quick', q.id, { name:q.name, protein:nu.protein, veg });
    render();
    toast('Logged ' + q.name.toLowerCase());
  },
  'rerun-setup'() { S.onboarded = false; OB = null; save(); render(); },
  'reset-app'() { askConfirm('Reset everything?', 'Inventory, favorites, prep plans, containers, history and settings are all erased from this device.', 'Erase everything', () => { Store.clear(); S = defaultState(); OB = null; location.hash = '#/tonight'; render(); }); },

  // cooking
  'cook-exit'() { S.cook && save(); location.hash = S.cook && RECIPE[S.cook.rid].type === 'dessert' ? '#/sweet/' + S.cook.rid : '#/tonight'; },
  'cook-next'() { ensureAudio(); cookMove(1); },
  'cook-skip'() { cookMove(1); },
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
    const { r, c } = cookContext();
    if (r.type === 'dinner') {
      const nu = nutrition(c);
      logHistory('dinner', r.id, { protein: nu.protein, veg: vegCups(c), n: c.n });
      const pack = $('#cook-pack');
      if (pack && pack.checked) {
        for (let k = 1; k < c.n; k++) S.containers.push({ uid: uid(), rid: r.id, packed: Date.now(), frozen: k >= FRIDGE_SLOTS, thawed:null });
      }
    } else {
      logHistory('dessert', r.id, { n: c.pieces });
    }
    const dest = r.type === 'dinner' ? '#/tonight' : '#/sweet/' + r.id;
    S.cook = null;
    save();
    location.hash = dest;
    toast(r.type === 'dinner' ? 'Logged. Nice work.' : 'Logged.');
  },

  // onboarding
  'ob-days'(el) { OB.days = +el.dataset.v; renderOnboarding(); },
  'ob-have'(el) { const id = el.dataset.id; OB.have.has(id) ? OB.have.delete(id) : OB.have.add(id); renderOnboarding(); },
  'ob-basics'() { OB.basics = !OB.basics; renderOnboarding(); },
  'ob-meal'(el) { OB.meal = el.dataset.id; renderOnboarding(); },
  'ob-next'() { OB.step = Math.min(3, OB.step + 1); renderOnboarding(); const t = $('#ob-title'); if (t) { t.setAttribute('tabindex', '-1'); t.focus(); } },
  'ob-back'() { OB.step = Math.max(1, OB.step - 1); renderOnboarding(); },
  'ob-skip'() { finishOnboarding(false); },
  'ob-finish'() { finishOnboarding(true); },
};

const CHANGE = {
  check(el) { const { rid, key } = el.dataset; S.checks[rid] = Object.assign({}, S.checks[rid], { [key]: el.checked }); save(); },
  'prep-done'(el) { S.prep.done[el.dataset.id] = el.checked; save(); render(); },
  'comp-done'(el) { S.prep.compDone[el.dataset.id] = el.checked; save(); render(); },
  'bake-done'(el) { S.prep.bake.done[el.dataset.id] = el.checked; save(); render(); },
  'bake-sel'(el) { const id = el.dataset.id; if (el.checked) S.prep.bake.sel[id] = { yield: RECIPE[id].yields[0].id }; else delete S.prep.bake.sel[id]; save(); render(); },
  pack(el) { S.prep.packed[el.dataset.id] = el.checked; save(); render(); },
  'shop-src'(el) { S.shopSources[el.dataset.k] = el.checked; save(); render(); },
  'shop-check'(el) { const x = S.shopping.find(s => s.id === el.dataset.id); if (x) x.checked = el.checked; save(); render(); },
};

document.addEventListener('click', e => {
  const skip = e.target.closest('.skip');
  if (skip) { e.preventDefault(); const v = $('#view'); v.focus(); v.scrollIntoView(); return; }
  const el = e.target.closest('[data-a]');
  if (!el || el.tagName === 'INPUT' || el.tagName === 'FORM') return;
  const fn = ACT[el.dataset.a];
  if (!fn) return;
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
  if (match) upsertShopping(match.id, 0);
  else S.shopping.push({ id: 'custom-' + uid(), name, g:0, checked:false });
  save(); render();
  const again = document.getElementById('add-item'); if (again) again.focus();
});
document.addEventListener('toggle', e => {
  const d = e.target;
  if (d.tagName === 'DETAILS' && d.dataset.d) OPEN[d.dataset.d] = d.open;
}, true);
document.addEventListener('keydown', e => {
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
  // keep keyboard focus inside an open sheet
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
