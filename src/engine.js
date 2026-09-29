'use strict';
/* =========================================================================
   Pantry — engine: state, formatting, scaling, nutrition, scheduling,
   inventory, prep plans, shopping.
   ========================================================================= */

/* ---------- Storage (never breaks if localStorage is unavailable) ---------- */
const STORE_KEY = 'pantry.v1';
const Store = (() => {
  let ok = true, mem = null;
  try { localStorage.setItem('__pantry_t', '1'); localStorage.removeItem('__pantry_t'); } catch (e) { ok = false; }
  return {
    get ok() { return ok; },
    load() {
      if (!ok) return mem;
      try { const raw = localStorage.getItem(STORE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
    },
    save(s) {
      mem = s;
      if (!ok) return;
      try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) { ok = false; }
    },
    clear() { mem = null; if (ok) try { localStorage.removeItem(STORE_KEY); } catch (e) {} },
  };
})();

function defaultState() {
  return {
    v: 3,
    prefs: { portion:'standard', chickenCut:'breast', heat:'mild', theme:'system' },
    inv: {},          // id -> 'out' (anything not listed is on hand)
    shopping: [],     // [{ id, g, why, checked }]
    opts: {},         // per-recipe choices
    checks: {},       // ticked ingredient boxes
    notes: {},        // per-recipe notes
    cook: null,
    lastBackup: 0,
    ui: { mealFilter:'all', invSearch:'', rtabs:{} },
  };
}

function loadState() {
  const d = defaultState();
  const s = Store.load();
  if (!s || typeof s !== 'object') return d;
  const out = Object.assign(d, s);
  const fresh = defaultState();
  out.prefs = Object.assign(fresh.prefs, isObj(s.prefs) ? s.prefs : {});
  out.ui = Object.assign(fresh.ui, isObj(s.ui) ? s.ui : {});
  ['inv','opts','checks','notes'].forEach(k => { if (!isObj(out[k])) out[k] = {}; });
  if (!Array.isArray(out.shopping)) out.shopping = [];
  if (!isObj(out.ui.rtabs)) out.ui.rtabs = {};
  if (typeof out.ui.invSearch !== 'string') out.ui.invSearch = '';
  if (!['all','dinners','prep','sweet'].includes(out.ui.mealFilter)) out.ui.mealFilter = 'all';
  Object.keys(out.notes).forEach(k => { if (!RECIPE[k] || typeof out.notes[k] !== 'string') delete out.notes[k]; });
  Object.keys(out.opts).forEach(k => { if (!RECIPE[k] || !isObj(out.opts[k])) delete out.opts[k]; });
  // v3: inventory is two-state now, and anything not on hand is on the list
  Object.keys(out.inv).forEach(k => { if (!ITEM[k] || out.inv[k] !== 'out') delete out.inv[k]; });
  out.shopping = out.shopping.filter(x => isObj(x) && typeof x.id === 'string' && (ITEM[x.id] || typeof x.name === 'string'))
    .map(x => ({ id:x.id, name:x.name, g: typeof x.g === 'number' ? x.g : 0, why: typeof x.why === 'string' ? x.why : '', checked: !!x.checked }));
  out.shopping.forEach(x => { if (ITEM[x.id]) out.inv[x.id] = 'out'; });
  if (typeof out.lastBackup !== 'number' || !isFinite(out.lastBackup)) out.lastBackup = 0;
  if (out.cook && (!isObj(out.cook) || !RECIPE[out.cook.rid] || !isObj(out.cook.timers) || typeof out.cook.i !== 'number')) out.cook = null;
  if (out.cook) {
    Object.keys(out.cook.timers).forEach(k => { const t = out.cook.timers[k]; if (!isObj(t) || !(t.total > 0)) delete out.cook.timers[k]; });
    if (!isObj(out.cook.opts)) out.cook.opts = {};
  }
  out.v = 3;
  return out;
}

function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
let S = loadState();
function save() { Store.save(S); }

/* ---------- Small helpers ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const sum = arr => arr.reduce((a, b) => a + b, 0);
const DAY = 86400000;
function dayKey(d = new Date()) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function startOfDay(t) { const d = new Date(t); d.setHours(0,0,0,0); return d.getTime(); }
function fmtDay(t, withDate) {
  const d = new Date(t);
  const w = d.toLocaleDateString(undefined, { weekday:'short' });
  return withDate ? w + ' ' + (d.getMonth() + 1) + '/' + d.getDate() : w;
}
function fmtClock(min) { min = Math.round(min); return Math.floor(min / 60) + ':' + String(min % 60).padStart(2, '0'); }
function fmtDur(min) {
  min = Math.round(min);
  if (min < 60) return min + ' min';
  const h = Math.floor(min / 60), m = min % 60;
  return h + ' hr' + (m ? ' ' + m + ' min' : '');
}
function fmtSec(sec) { sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
function lcFirst(s) { return s ? s[0].toLowerCase() + s.slice(1) : s; }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

/* ---------- Quantity formatting ---------- */
const GLYPH = { 0.125:'⅛', 0.25:'¼', 0.333:'⅓', 0.5:'½', 0.667:'⅔', 0.75:'¾' };
function pickFrac(x, fracs) {
  let w = Math.floor(x + 1e-9), r = x - w, best = 0, bd = Infinity;
  for (const f of fracs) { const d = Math.abs(r - f); if (d < bd - 1e-9) { bd = d; best = f; } }
  if (best >= 1) { w += 1; best = 0; }
  return [w, best];
}
function fracStr(w, f) {
  const g = f ? GLYPH[f] || '' : '';
  if (!w && !g) return '0';
  return (w ? String(w) : '') + g;
}
function fmtNum(x, fracs = [0, 0.25, 0.5, 0.75, 1]) { const [w, f] = pickFrac(x, fracs); return fracStr(w, f); }

const VOL = { tsp:1, tbsp:3, cup:48 };
const PLURAL = { clove:'cloves', egg:'eggs', banana:'bananas', wedge:'wedges', sheet:'sheets', lime:'limes', lemon:'lemons', olive:'olives', scoop:'scoops' };

function fmtQ(q, u) {
  if (!(q > 0)) return '';
  if (VOL[u]) {
    const tsp = q * VOL[u];
    if (tsp >= 12) {
      const cups = tsp / 48;
      const [w, f] = pickFrac(cups, [0, 0.125, 0.25, 0.333, 0.375, 0.5, 0.625, 0.667, 0.75, 0.875, 1]);
      const eighth = { 0.125:0, 0.375:0.25, 0.625:0.5, 0.875:0.75 };
      if (f in eighth) {
        const base = fracStr(w, eighth[f]);
        return (base === '0' ? '' : base + ' cup' + (w + eighth[f] > 1 ? 's' : '') + ' + ') + '2 tbsp';
      }
      return fracStr(w, f) + ' cup' + (w + f > 1 ? 's' : '');
    }
    if (tsp >= 3) {
      const [w, f] = pickFrac(tsp / 3, [0, 0.25, 0.5, 0.75, 1]);
      return fracStr(w, f) + ' tbsp';
    }
    const [w, f] = pickFrac(tsp, [0, 0.125, 0.25, 0.5, 0.75, 1]);
    if (!w && !f) return 'pinch';
    return fracStr(w, f) + ' tsp';
  }
  if (u === 'oz' || u === 'lb') {
    const oz = u === 'lb' ? q * 16 : q;
    if (oz >= 16) return fmtNum(oz / 16) + ' lb';
    return fmtNum(oz, [0, 0.5, 1]) + ' oz';
  }
  if (u === 'egg') {
    const whole = Math.floor(q + 0.08);
    const rest = q - whole;
    const tb = Math.round(rest * 3 * 2) / 2; // 1 egg ≈ 3 tbsp beaten
    if (whole === 0) return fmtNum(Math.max(0.5, tb), [0, 0.5, 1]) + ' tbsp beaten egg';
    const e = whole + ' egg' + (whole > 1 ? 's' : '');
    return tb >= 0.5 ? e + ' + ' + fmtNum(tb, [0, 0.5, 1]) + ' tbsp beaten egg' : e;
  }
  if (u === 'wedge') { const n = Math.max(1, Math.round(q)); return n + ' ' + (n > 1 ? 'wedges' : 'wedge'); }
  // other counts
  const [w, f] = pickFrac(q, [0, 0.5, 1]);
  const n = (w || f) ? fracStr(w, f) : '½';
  const plural = (w + f) > 1 ? (PLURAL[u] || u + 's') : u;
  return n + ' ' + plural;
}

/* ---------- Recipe options ---------- */
const SERVING_OPTS = [1, 2, 3, 4, 5, 6, 8];
// "Tonight" or a run of days. Crock pot meals start at a batch.
function SERVING_PRESETS(r) {
  return r.crockpot
    ? [[4, '4 days'], [6, '6 days'], [8, '8 days']]
    : [[1, 'Tonight'], [2, '2 days'], [4, '4 days'], [6, '6 days']];
}
function chickenCut() { return S.prefs.chickenCut === 'thigh' ? 'thigh' : 'breast'; }
function portionFactor(portion) { return (portion || S.prefs.portion) === 'large' ? { protein:1.25, carb:4/3 } : { protein:1, carb:1 }; }

function getOpts(r) {
  const saved = S.opts[r.id] || {};
  const o = Object.assign({}, saved);
  if (!['base','better','loaded'].includes(o.tier)) o.tier = 'base';
  if (r.type === 'dinner') {
    o.servings = SERVING_OPTS.includes(+o.servings) ? +o.servings : (r.defaultServings || 1);
    o.mode = o.mode === 'amount' ? 'amount' : 'servings';
    o.amountUnit = o.amountUnit === 'oz' ? 'oz' : 'lb';
    const prot = r.ingredients.find(i => i.role === 'protein');
    o.amountOz = Number.isFinite(+o.amountOz) && +o.amountOz > 0 ? clamp(+o.amountOz, 2, 96) : Math.round(o.servings * prot.q * portionFactor().protein);
    o.plates = Number.isInteger(+o.plates) && +o.plates >= 1 && +o.plates <= 6 ? +o.plates : null;
    o.cut = r.hasCut ? (['breast','thigh'].includes(o.cut) ? o.cut : chickenCut()) : 'breast';
    if (o.mode === 'amount' && o.amountDate !== dayKey()) { o.mode = 'servings'; o.plates = null; }
    const carbs = r.carbs || ['rice'];
    o.carb = carbs.includes(o.carb) ? o.carb : (r.defaultCarb || (carbs.includes(S.prefs.carb) ? S.prefs.carb : carbs[0]));
    if (!['fresh','ready'].includes(o.rice)) o.rice = 'fresh';
    if (r.hasSauceChoice && !['regular','smoky','spicy'].includes(o.sauce)) o.sauce = S.prefs.heat === 'mild' ? 'regular' : 'spicy';
  } else {
    if (!r.yields.some(y => y.id === o.yield)) o.yield = r.yields[0].id;
    if (r.variations && !r.variations.some(v => v.id === o.variation)) o.variation = r.variations[0].id;
    if (r.glazes && !r.glazes.some(g => g.id === o.glaze)) o.glaze = 'chocolate';
    o.mode = r.have && o.mode === 'amount' && o.amountDate === dayKey() ? 'amount' : 'servings';
    if (r.have) o.haveCount = Number.isInteger(+o.haveCount) ? clamp(+o.haveCount, r.have.min, r.have.max) : r.have.base;
  }
  return o;
}
function setOpt(rid, k, v) {
  const patch = { [k]: v };
  if (['mode','amountOz','plates','amountUnit','haveCount'].includes(k)) patch.amountDate = dayKey();
  S.opts[rid] = Object.assign({}, S.opts[rid], patch);
  save();
}

function cond(expr, c) {
  if (!expr) return true;
  return expr.split('&').every(t => {
    if (t === 'fresh') return c.carb === 'rice' && c.rice === 'fresh';
    if (t === 'ready') return c.carb === 'rice' && c.rice === 'ready';
    if (t === 'rice') return c.carb === 'rice';
    if (t === 'potato') return c.carb === 'potato';
    if (t === 'hash') return c.carb === 'hash';
    if (t === 'nocarb') return c.carb === 'none';
    if (t === 'loaded') return c.tier === 'loaded';
    if (t === 'better') return c.tier !== 'base';
    if (t === 'glazed') return !!(c.g && c.g.id !== 'none');
    if (t === 'unglazed') return !!(c.g && c.g.id === 'none');
    if (t === 'warmglaze') return !!(c.g && c.g.warm);
    if (t === 'coldglaze') return !!(c.g && c.g.id !== 'none' && !c.g.warm);
    if (t.startsWith('sauce:')) return c.sauce === t.slice(6);
    return true;
  });
}

function tierAdds(r, tier) {
  const out = [];
  if (!r.tiers) return out;
  const seen = new Set();
  const addAll = (list, label) => (list || []).forEach(i => { const k = i.key || i.id; if (!seen.has(k)) { seen.add(k); out.push([i, label]); } });
  if (tier === 'better' || tier === 'loaded') addAll(r.tiers.better.add, 'Better');
  if (tier === 'loaded') addAll(r.tiers.loaded.add, 'Loaded');
  return out;
}

/* Build a fully-resolved recipe context: scaled ingredients, options, yield. */
function build(r, overrides) {
  const o = Object.assign(getOpts(r), overrides || {});
  const c = Object.assign({}, o, { r, heat: o.heat || S.prefs.heat, portion: o.portion || S.prefs.portion, ings: [] });
  const push = (ing, scale, extra) => c.ings.push(Object.assign({}, ing, { sq: ing.q * scale, sg: ing.g * scale, key: ing.key || ing.id, extra }));
  if (r.type === 'dinner') {
    const pf = portionFactor(c.portion);
    // Planning code passes explicit servings; "I have…" only applies on the recipe itself.
    if (overrides && overrides.servings != null && overrides.mode == null) c.mode = 'servings';
    const prot = r.ingredients.find(i => i.role === 'protein');
    let scaleN = o.servings;
    if (c.mode === 'amount') {
      scaleN = c.amountOz / (prot.q * pf.protein);         // standard servings' worth of everything
      c.plates = c.plates || clamp(Math.round(scaleN), 1, 6);
    } else {
      c.plates = o.servings;
    }
    c.scaleN = scaleN;
    c.n = c.pieces = c.plates;
    c.proteinOz = prot.q * scaleN * pf.protein;
    c.big = c.proteinOz >= 28; // about 1¾ lb or more: one skillet won't brown it all
    for (let ing of r.ingredients) {
      if (!cond(ing.if, c)) continue;
      if (ing.id === 'chicken' && c.cut === 'thigh') {
        ing = Object.assign({}, ing, { id:'thighs', key:'chicken', name:'Chicken thighs', any:['thighs','p_chicken'], note:'raw, boneless skinless · about {cooked} cooked', sub:'Chicken breast works too: switch Chicken to Breast.' });
      }
      push(ing, scaleN * (ing.role === 'protein' ? pf.protein : ing.role === 'carb' ? pf.carb : 1));
    }
    (r.heat[c.heat] || []).forEach(ing => push(ing, scaleN, 'Heat'));
    tierAdds(r, o.tier).forEach(([ing, label]) => push(ing, c.plates, label));
  } else {
    if (overrides && overrides.yield != null && overrides.mode == null) c.mode = 'servings';
    const y = c.mode === 'amount' && r.have ? haveYield(r, c.haveCount) : (r.yields.find(y => y.id === o.yield) || r.yields[0]);
    c.y = y; c.n = c.pieces = y.pieces;
    const v = r.variations ? (r.variations.find(v => v.id === o.variation) || r.variations[0]) : null;
    c.v = v;
    const removed = new Set((v && v.remove) || []);
    r.ingredients.forEach(ing => { if (!removed.has(ing.key || ing.id)) push(ing, y.f); });
    ((v && v.add) || []).forEach(ing => push(ing, y.f, v.label));
    if (r.glazes) {
      const g = r.glazes.find(g => g.id === o.glaze) || r.glazes[0];
      c.g = g;
      g.ing.forEach(ing => push(ing, y.f, 'Glaze'));
    }
    tierAdds(r, o.tier).forEach(([ing, label]) => push(ing, y.pieces, label));
  }
  c.byKey = {};
  c.ings.forEach(i => { if (!c.byKey[i.key]) c.byKey[i.key] = i; });
  return c;
}

// "2 servings" or "1 lb chicken thighs · 2 plates"
function amountLabel(c) {
  if (c.r.type !== 'dinner') return '';
  if (c.mode !== 'amount') return c.n + ' ' + (c.n > 1 ? 'servings' : 'serving');
  const p = c.ings.find(i => i.role === 'protein');
  return fmtQ(c.amountOz, 'oz') + ' ' + lcName(p) + ' · ' + c.plates + ' ' + (c.plates > 1 ? 'plates' : 'plate');
}
// Dessert batch sized to what you have (bananas).
function haveYield(r, count) {
  const f = count / r.have.base;
  const b = count + (count === 1 ? ' banana' : ' bananas');
  if (r.id === 'icecream') return { id:'have', label:b + ' → ' + count + (count === 1 ? ' bowl' : ' bowls'), f, pieces:count, unit:'bowl' };
  if (f < 0.75) { const m = Math.max(2, Math.round(f * 12)); return { id:'have', label:b + ' → ' + m + ' muffins', f, pieces:m, unit:'muffin', pan:'muffin tin (' + m + ' cups, lined or sprayed)', bake:'20–25 minutes', bakeMin:22 }; }
  if (f <= 1.15) return { id:'have', label:b + ' → 1 loaf', f, pieces:Math.round(10 * f), unit:'slice', pan:'8½ × 4½-inch loaf pan', bake:f < 0.9 ? '45–55 minutes' : '50–60 minutes', bakeMin:f < 0.9 ? 50 : 55, loaf:true };
  const m = Math.max(2, Math.round((f - 1) * 12));
  return { id:'have', label:b + ' → 1 loaf + ' + m + ' muffins', f, pieces:10 + m, unit:'piece', pan:'8½ × 4½-inch loaf pan (fill it about ¾ full; the rest goes into ' + m + ' lined muffin cups)', bake:'about 50–60 minutes for the loaf and 20–25 for the muffins (take the muffins out first)', bakeMin:55, loaf:true };
}
function bakeMin(c) { return c.y ? (c.y.bakeMin || 0) + ((c.v && c.v.bakeExtra) || 0) : 0; }

/* ---------- Nutrition (per serving / per piece) ---------- */
function nutrition(c) {
  const t = NUT_KEYS.map(() => 0);
  c.ings.forEach(i => {
    const n = NUT[i.nutId || i.id];
    if (!n) return;
    const f = i.nutFactor == null ? 1 : i.nutFactor; // e.g. pasta-water salt, most of which drains
    for (let k = 0; k < t.length; k++) t[k] += n[k] * i.sg * f / 100;
  });
  const out = {};
  NUT_KEYS.forEach((k, idx) => { out[k] = t[idx] / (c.pieces || 1); });
  return out;
}
function vegCups(c) {
  return sum(c.ings.filter(i => i.role === 'veg' || (i.extra && ['peppers','spinach','lettuce','broccoli'].includes(i.id)))
    .map(i => i.u === 'cup' ? i.sq : 0)) / (c.pieces || 1);
}
const roundKcal = v => Math.round(v / 10) * 10;
const roundG = v => Math.round(v);

/* ---------- Templates ---------- */
function fill(text, c) {
  if (!text) return '';
  let guard = 0;
  let out = text;
  while (/\{[a-zA-Z]+(?::[a-zA-Z0-9_]+)?\}/.test(out) && guard++ < 4) {
    out = out.replace(/\{([a-zA-Z]+)(?::([a-zA-Z0-9_]+))?\}/g, (m, k, arg) => {
      switch (k) {
        case 'q': { const i = c.byKey[arg]; return i ? fmtQ(i.sq, i.u) : ''; }
        case 'dry': { const i = c.byKey.rice; return i ? fmtQ(i.sq / 3, 'cup') : ''; }
        case 'potSize': { const i = c.byKey.rice; const dry = i ? i.sq / 3 : 0; return dry <= 1 ? 'small pot' : dry <= 2.5 ? 'medium pot' : 'large pot'; }
        case 'riceMin': { const i = c.byKey.rice; return i && i.sq / 3 > 2.5 ? '15' : '12'; }
        case 'cooked': { const p = c.ings.find(x => x.role === 'protein'); return p ? fmtQ(p.sq * (COOKED_YIELD[p.id] || 0.75), 'oz') : ''; }
        case 'brownTime': return c.big ? '10–12 minutes total (6–8 per batch if you split it)' : '6–8 minutes total';
        case 'searTime': return c.big ? '12–14 minutes total (8–10 per batch if you split it)' : '8–10 minutes total';
        case 'vegWater': { const cups = vegMicroCups(c); return cups > 2 && cups <= 4 ? '3 tbsp' : '2 tbsp'; }
        case 'vegTime': { const cups = vegMicroCups(c); return cups > 4 ? 'in batches of about 3 cups (2 tbsp water per batch), 3–4 minutes each' : cups > 2 ? 'for 5–6 minutes (frozen: 6–7), stirring halfway' : 'for 3–4 minutes (frozen: 4–5)'; }
        case 'potTime': { const i = c.byKey.potatoes; const lb = i ? i.sq / 16 : 0; return lb > 2.2 ? 'in batches of about 1 lb, 6 minutes each' : lb > 1.1 ? '9–10 minutes, stirring halfway' : '6 minutes'; }
        case 'potPans': { const i = c.byKey.potatoes; return i && i.sq > 18 ? ' (use two pans, or crisp them in batches)' : ''; }
        case 'water': { const i = c.byKey.rice; if (!i) return ''; const dry = i.sq / 3; return fmtQ(dry * 1.25 + (dry < 1 ? 0.125 : 0), 'cup'); }
        case 'heat': { const h = c.r.heatText; if (c.heat === 'mild' || !h) return ''; return typeof h === 'string' ? h : (h[c.heat] || ''); }
        case 'varWet': return (c.v && c.v.wet) || '';
        case 'varDry': return (c.v && c.v.dry) || '';
        case 'tierFinish': {
          if (!c.r.tiers || c.tier === 'base') return '';
          let s = c.r.tiers.better.finish ? ' ' + c.r.tiers.better.finish : '';
          if (c.tier === 'loaded' && c.r.tiers.loaded.finish) s += ' ' + c.r.tiers.loaded.finish;
          return s;
        }
        case 'sauceStyle': return c.sauce === 'smoky' ? ' and {q:smokyBoost} extra smoked paprika' : c.sauce === 'spicy' ? ' and {q:hotsauce} hot sauce' : '';
        case 'carbName': return c.carb === 'potato' ? 'Crispy potatoes' : c.carb === 'hash' ? 'Crispy hash browns' : 'Rice';
        case 'chiliBase': return c.carb === 'rice' ? 'Rice in the bowl first, then the chili over it. ' : c.carb === 'hash' ? 'Hash browns in the bowl, chili spooned over them so they stay crisp at the edges. ' : 'Chili straight into a deep bowl. ';
        case 'mix': return (c.v && c.v.mix) || 'No mix-ins for this version — move on.';
        case 'fill': return (c.v && c.v.fill) || '';
        case 'blend': return (c.v && c.v.blend) || '';
        case 'pan': return c.y ? c.y.pan : '';
        case 'bake': {
          if (!c.y) return '';
          const extra = c.v && c.v.bakeExtra ? ' (add ' + c.v.bakeExtra + ' minutes for ' + c.v.label.toLowerCase() + ')' : '';
          return c.y.bake + extra;
        }
        case 'tent': return c.r.id === 'bread' && c.y && (c.y.id === 'full' || c.y.loaf) ? ' At 35 minutes, if the top is already deep brown, lay a sheet of foil loosely over it.' : '';
        case 'lining': return c.r.prepNotes ? 'Prep the ' + (c.y ? c.y.pan : 'pan') + ': ' + lcFirst(c.r.prepNotes.lining) + '.' : '';
        case 'pieces': return String(c.pieces);
        case 'glazeMake': return (c.g && c.g.make) || '';
        case 'glazeApply': return (c.g && c.g.apply) || '';
      }
      return m;
    });
  }
  return out.replace(/\s{2,}/g, ' ').trim();
}

/* ---------- Steps & timeline ---------- */
function stepsFor(c) {
  const bigBatch = c.r.type === 'dinner' && !!c.big;
  const cups = c.r.type === 'dinner' ? vegMicroCups(c) : 0;
  const potLb = c.byKey && c.byKey.potatoes ? c.byKey.potatoes.sq / 16 : 0;
  const dryRice = c.byKey && c.byKey.rice ? c.byKey.rice.sq / 3 : 0;
  return c.r.steps.filter(s => cond(s.if, c)).map(s => {
    const st = Object.assign({}, s);
    if (bigBatch && (s.key === 'beef' || s.key === 'chicken')) {
      st.passive = (s.passive || 0) + 4;
      st.timer = (s.timer || 0) + 4;
      st.batch = 'Big batch: use your largest pan, or cook in two batches so it browns instead of steaming. Allow about 4 extra minutes.';
    }
    if (c.cut === 'thigh' && st.safety === CHICKEN_SAFETY) st.safety = THIGH_SAFETY;
    if (s.key === 'veg' && cups > 2 && cups <= 4) { st.timer = 6; st.passive = 6; }
    if (s.key === 'veg' && cups > 4) { st.passive = Math.ceil(cups / 3) * 4; }
    if (s.key === 'potmic' && potLb > 1.1 && potLb <= 2.2) { st.timer = 10; st.passive = 10; }
    if (s.key === 'potmic' && potLb > 2.2) { st.passive = Math.ceil(potLb) * 6; }
    if (s.key === 'rice' && dryRice > 2.5) { st.timer = 15; st.passive = 20; }
    if (st.passive === 'bake') st.passive = bakeMin(c);
    if (st.timer === 'bake') st.timer = bakeMin(c);
    if (c.r.id === 'donuts' && st.key === 'bake' && c.y && c.y.id === 'twelve') st.batch = 'One pan at a time? Bake the second pan right after the first; wipe and re-grease it first.';
    return st;
  });
}

// Tasks run back to back while hands-on; passive time (simmering, baking)
// runs in the background, and later steps can wait on a keyed task.
function schedule(steps) {
  let cursor = 0;
  const ready = {};
  const items = steps.map(s => {
    const hands = s.hands || 0, passive = s.passive || 0;
    let t = cursor;
    if (s.waitFor && ready[s.waitFor] != null) t = Math.max(t, ready[s.waitFor]);
    if (s.waitAll) Object.values(ready).forEach(x => { t = Math.max(t, x); });
    cursor = t + hands;
    if (s.key) ready[s.key] = t + hands + passive;
    else cursor += passive;
    return { s, t };
  });
  const total = Math.max(cursor, 0, ...Object.values(ready));
  return { items, total };
}

// For multi-recipe plans: whenever something finishes (roast, bake), its
// follow-up task runs next instead of waiting behind unrelated prep.
function schedulePlan(tasks) {
  const keys = new Set(tasks.filter(t => t.key).map(t => t.key));
  const ids = new Set(tasks.map(t => t.id));
  const doneIds = new Set();
  const ready = {};
  const done = new Set();
  const items = [];
  let cursor = 0;
  while (done.size < tasks.length) {
    let best = null, bestT = Infinity, bestWait = false;
    tasks.forEach((t, idx) => {
      if (done.has(idx)) return;
      // keep order relative to earlier "wait for everything" tasks and to unmet dependencies
      if (tasks.some((o, j) => j < idx && !done.has(j) && o.waitAll)) return;
      if (t.waitFor && keys.has(t.waitFor) && ready[t.waitFor] == null) return;
      if (t.after && ids.has(t.after) && !doneIds.has(t.after)) return;
      if (t.waitAll && tasks.some((o, j) => j !== idx && !done.has(j) && !o.waitAll && j < idx)) return;
      let start = cursor;
      if (t.waitFor && ready[t.waitFor] != null) start = Math.max(start, ready[t.waitFor]);
      if (t.waitAll) Object.values(ready).forEach(v => { start = Math.max(start, v); });
      const isWait = !!t.waitFor;
      if (start < bestT || (start === bestT && isWait && !bestWait)) { best = idx; bestT = start; bestWait = isWait; }
    });
    if (best != null && !tasks[best].waitFor) {
      // next time-critical task whose dependency is already running
      let crit = null, critT = Infinity;
      tasks.forEach((t, idx) => {
        if (done.has(idx) || !t.waitFor || ready[t.waitFor] == null || ready[t.waitFor] <= cursor) return;
        if (t.after && ids.has(t.after) && !doneIds.has(t.after)) return;
        if (ready[t.waitFor] < critT) { crit = idx; critT = ready[t.waitFor]; }
      });
      if (crit != null && bestT + (tasks[best].hands || 0) > critT + 2) {
        // prefer a shorter hands-on task that fits the gap; otherwise wait for the critical one
        let fit = null;
        tasks.forEach((t, idx) => {
          if (fit != null || done.has(idx) || t.waitFor || t.waitAll) return;
          if (tasks.some((o, j) => j < idx && !done.has(j) && o.waitAll)) return;
          if (t.after && ids.has(t.after) && !doneIds.has(t.after)) return;
          if (cursor + (t.hands || 0) <= critT + 2) fit = idx;
        });
        if (fit != null) { best = fit; bestT = cursor; }
        else { best = crit; bestT = critT; }
      }
    }
    if (best == null) { // unreachable dependency: fall back to array order
      best = tasks.findIndex((t, i) => !done.has(i)); bestT = cursor;
    }
    const t = tasks[best];
    items.push({ s:t, t:bestT });
    done.add(best);
    doneIds.add(t.id);
    cursor = bestT + (t.hands || 0);
    if (t.key) ready[t.key] = cursor + (t.passive || 0);
    else cursor += t.passive || 0;
  }
  const total = Math.max(cursor, 0, ...Object.values(ready));
  return { items, total };
}

function times(c) {
  const steps = stepsFor(c);
  const sch = schedule(steps);
  const active = sum(steps.map(s => s.hands || 0));
  if (c.r.type === 'dinner') {
    const prep = sum(steps.filter(s => s.prep).map(s => s.hands || 0));
    return { prep, cook: sch.total - prep, total: sch.total, active, steps, sch };
  }
  return { active, bake: bakeMin(c), total: sch.total, steps, sch };
}

/* ---------- Inventory ---------- */
const RANK = { out:0, in:2 };
// Two states: on hand (default) or out, which means it's on the shopping list.
function inv(id) { return S.inv[id] === 'out' ? 'out' : 'in'; }

function altIds(ing) { const ids = ing.any || [ing.id]; return ids.length ? ids : [ing.id]; }
function avail(ing) {
  const ids = altIds(ing);
  let best = { st:'out', via:ids[0] };
  ids.forEach(id => { if (inv(id) === 'in') best = { st:'in', via:id }; });
  return best;
}
function itemName(id) { return ITEM[id] ? ITEM[id].name : id; }

function readiness(r, overrides) {
  const c = build(r, Object.assign(r.type === 'dinner' ? { servings:1, tier:'base' } : { tier:'base' }, overrides || {}));
  const req = c.ings.filter(i => !i.extra && !i.opt);
  const seen = new Set();
  const missingCore = [], missing = [];
  req.forEach(i => {
    const a = avail(i);
    if (seen.has(a.via)) return;
    seen.add(a.via);
    if (a.st === 'out') (i.core ? missingCore : missing).push(i);
  });
  const level = missingCore.length || missing.length ? (missingCore.length ? 'no' : 'almost') : 'ready';
  return { level, missingCore, missing, low:[], c };
}
function bestReadiness(r) {
  if (!r.hasCarbChoice) return readiness(r);
  const a = readiness(r, { carb:'rice' }), b = readiness(r, { carb:'potato' });
  const score = x => (x.level === 'ready' ? 100 : x.level === 'almost' ? 50 : 0) - x.missing.length - x.missingCore.length * 5;
  const best = score(b) > score(a) ? b : a;
  best.carb = best === b ? 'potato' : 'rice';
  return best;
}
const SHORT_NAMES = { beef:'Ground beef', chicken:'Chicken', rice:'Rice', ricepouch:'Rice pouches', potatoes:'Potatoes', oats:'Oat flour', broccoli:'Broccoli',
  corn:'Corn', blackbeans:'Black beans', lettuce:'Romaine', tomato:'Cherry tomatoes', spinach:'Spinach', peppers:'Peppers & onions', greenonion:'Green onion',
  lemon:'Lemon', lime:'Lime', soy:'Soy sauce', bbq:'BBQ sauce', yogurt:'Greek yogurt', protein:'Protein powder', ginger:'Ginger', chips:'Chocolate chips',
  darkchoc:'Dark chocolate', cocoa:'Cocoa', applesauce:'Applesauce', oliveoil:'Olive oil', sesameoil:'Sesame oil', garlicpowder:'Garlic powder',
  onionpowder:'Onion powder', smokedpaprika:'Smoked paprika', bakingpowder:'Baking powder', chilisauce:'Chili sauce', crispyonion:'Crispy onions',
  pickledonion:'Pickled onions', herbs:'Fresh herbs', creamcheese:'Cream cheese', powdered:'Powdered sugar', chiliflakes:'Pepper flakes' };
function niceName(id) { return SHORT_NAMES[id] || itemName(id).replace(/\s*\(.*\)$/, ''); }
function lcName(i) { const n = i.name || niceName(i.id); return n.replace(/\s*\(.*\)$/, '').toLowerCase().replace(/\bbbq\b/g, 'BBQ').replace(/\bgreek\b/g, 'Greek'); }

/* Which items are used by which recipes (ingredient reuse) */
const USED_IN = (() => {
  const m = {};
  RECIPES.forEach(r => {
    const ids = new Set();
    const addIng = i => { ids.add(i.id); (i.any || []).forEach(a => { if (ITEM[a] && !ITEM[a].prepped) ids.add(a); }); };
    r.ingredients.forEach(addIng);
    (r.variations || []).forEach(v => (v.add || []).forEach(addIng));
    (r.glazes || []).forEach(g => g.ing.forEach(addIng));
    if (r.tiers) ['better','loaded'].forEach(t => (r.tiers[t].add || []).forEach(addIng));
    if (r.heat) Object.values(r.heat).forEach(list => list.forEach(addIng));
    ids.forEach(id => { (m[id] = m[id] || []).push(r.id); });
  });
  return m;
})();

// How much veg goes in the microwave at once, for the batch wording in steps.
function vegMicroCups(c) {
  return sum(['broccoli','corn'].map(k => c.byKey && c.byKey[k] && c.byKey[k].u === 'cup' ? c.byKey[k].sq : 0)) || 0;
}

/* ---------- What a cook used ---------- */
// The fresh things a recipe used, for the "what did you run out of" step.
function usedItems(c) {
  const seen = new Set(), out = [];
  c.ings.forEach(i => {
    if (i.opt || (i.extra === 'Heat' && c.heat === 'mild')) return;
    const a = avail(i);
    const id = a.st !== 'out' ? a.via : altIds(i)[0];
    const it = ITEM[id];
    if (seen.has(id) || !it || it.staple) return;
    seen.add(id);
    out.push(id);
  });
  return out;
}
function freshUsed(c) { return usedItems(c).filter(id => ITEM[id].fresh && inv(id) !== 'out'); }
const COOKED_YIELD = { beef:0.8, chicken:0.727, thighs:0.7, pork:0.65, chuck:0.7 };

/* ---------- Buying units ---------- */
function fmtBuy(id, g) {
  const it = ITEM[id];
  if (!it || !(g > 0)) return '';
  const sh = it.shop;
  if (sh.u === 'lb') { const lb = Math.ceil((g / 453.6) * 4 - 0.05) / 4; return fmtNum(Math.max(0.25, lb)) + ' lb'; }
  if (sh.u === 'unit') {
    const step = sh.round || 0.5;
    const n = Math.max(step, Math.ceil(g / sh.g / step - 0.05) * step);
    return fmtNum(n, [0, 0.5, 1]) + ' ' + (n <= 1 ? sh.one : sh.many);
  }
  return '';
}

/* ---------- Shopping list ----------
   The list and the ingredient states are the same fact: anything on the list
   is something you're out of, and buying it puts it back on hand.          */
function onList(id) { return S.shopping.some(x => x.id === id); }
function addNeed(id, g, why) {
  const ex = S.shopping.find(x => x.id === id);
  if (ex) {
    if (g) ex.g = Math.max(ex.g || 0, g);
    if (why && !ex.why) ex.why = why;
    ex.checked = false;
  } else {
    S.shopping.push({ id, g: g || 0, why: why || '', checked:false });
  }
  if (ITEM[id]) S.inv[id] = 'out';
  save();
}
function removeNeed(id) {
  S.shopping = S.shopping.filter(x => x.id !== id);
  delete S.inv[id];
  save();
}
function toggleNeed(id) { inv(id) === 'out' ? removeNeed(id) : addNeed(id); }
// Everything a recipe needs that you don't have, with the amount to buy.
function missingFor(c) {
  const need = {};
  c.ings.forEach(i => {
    if (i.opt || (i.extra === 'Heat' && c.heat === 'mild')) return;
    const a = avail(i);
    if (a.st !== 'out') return;
    const id = altIds(i)[0];
    if (!ITEM[id]) return;
    (need[id] = need[id] || { id, g:0 }).g += i.sg;
  });
  return Object.values(need);
}
