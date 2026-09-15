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
    v: 2,
    onboarded: false,
    prefs: { portion:'standard', protein:'any', carb:'rice', heat:'mild', dessert:'any', theme:'system',
             autoRecommend:true, nutritionProminent:true, trackInventory:true, defaultMeal:'korean' },
    inv: {},
    invDates: {},
    shopping: [],
    shopSources: { tonight:true, week:true, prep:false, bake:false },
    favorites: [],
    lastMeal: null,
    tonight: null,
    opts: {},
    checks: {},
    cook: null,
    prep: { days:4, custom:5, split:null, done:{}, comp:{ rice:2, chicken:1.5, beef:1.25, broccoli:4 }, compDone:{}, bake:{ sel:{}, done:{} }, packed:{} },
    containers: [],
    history: [],
    notes: {},
    weekPlan: { start:0, counts:{} },
    lastBackup: 0,
    ui: { prepTab:'dinners', invTab:'kitchen', invFilter:'all', rtabs:{} },
  };
}

function loadState() {
  const d = defaultState();
  const s = Store.load();
  if (!s || typeof s !== 'object') return d;
  const out = Object.assign(d, s);
  const fresh = defaultState();
  out.prefs = Object.assign(fresh.prefs, isObj(s.prefs) ? s.prefs : {});
  out.prep = Object.assign(fresh.prep, isObj(s.prep) ? s.prep : {});
  out.prep.comp = Object.assign(fresh.prep.comp, isObj(out.prep.comp) ? out.prep.comp : {});
  out.prep.bake = Object.assign({ sel:{}, done:{} }, isObj(out.prep.bake) ? out.prep.bake : {});
  ['done','compDone','packed'].forEach(k => { if (!isObj(out.prep[k])) out.prep[k] = {}; });
  out.ui = Object.assign(fresh.ui, isObj(s.ui) ? s.ui : {});
  if (!isObj(out.ui.rtabs)) out.ui.rtabs = {};
  Object.keys(out.ui.rtabs).forEach(k => { if (typeof out.ui.rtabs[k] !== 'string') delete out.ui.rtabs[k]; });
  if (!['all','low','out'].includes(out.ui.invFilter)) out.ui.invFilter = 'all';
  if (!['kitchen','shopping'].includes(out.ui.invTab)) out.ui.invTab = 'kitchen';
  if (!isObj(out.notes)) out.notes = {};
  Object.keys(out.notes).forEach(k => { if (!RECIPE[k] || typeof out.notes[k] !== 'string') delete out.notes[k]; });
  if (!isObj(out.weekPlan) || !isObj(out.weekPlan.counts) || typeof out.weekPlan.start !== 'number') out.weekPlan = { start:0, counts:{} };
  if (typeof out.lastBackup !== 'number' || !isFinite(out.lastBackup)) out.lastBackup = 0;
  out.shopSources = Object.assign(fresh.shopSources, isObj(s.shopSources) ? s.shopSources : {});
  ['inv','invDates','opts','checks'].forEach(k => { if (!isObj(out[k])) out[k] = {}; });
  Object.keys(out.invDates).forEach(k => { if (typeof out.invDates[k] !== 'number' || !isFinite(out.invDates[k])) delete out.invDates[k]; });
  ['shopping','favorites','containers','history'].forEach(k => { if (!Array.isArray(out[k])) out[k] = []; });
  if (!isObj(out.prep.bake.sel)) out.prep.bake.sel = {};
  if (!isObj(out.prep.bake.done)) out.prep.bake.done = {};
  Object.keys(out.prep.bake.sel).forEach(id => { if (!RECIPE[id] || !isObj(out.prep.bake.sel[id])) delete out.prep.bake.sel[id]; });
  if (![2, 4, 7, 'custom'].includes(out.prep.days)) out.prep.days = 4;
  if (!isObj(out.prep.split)) out.prep.split = null;
  Object.keys(out.opts).forEach(id => { if (!isObj(out.opts[id])) delete out.opts[id]; });
  out.containers = out.containers.filter(c => isObj(c) && RECIPE[c.rid] && typeof c.packed === 'number' && typeof c.uid === 'string');
  out.shopping = out.shopping.filter(x => isObj(x) && typeof x.id === 'string' && (ITEM[x.id] || typeof x.name === 'string'));
  out.history = out.history.filter(h => isObj(h) && typeof h.t === 'number');
  out.favorites = out.favorites.filter(id => RECIPE[id]);
  if (out.tonight && (!isObj(out.tonight) || !RECIPE[out.tonight.id])) out.tonight = null;
  if (out.cook && (!isObj(out.cook) || !RECIPE[out.cook.rid] || !isObj(out.cook.timers) || typeof out.cook.i !== 'number')) out.cook = null;
  if (out.cook) {
    Object.keys(out.cook.timers).forEach(k => { const t = out.cook.timers[k]; if (!isObj(t) || !(t.total > 0)) delete out.cook.timers[k]; });
    if (!isObj(out.cook.opts)) out.cook.opts = {};
  }
  // v2: meal prep is tucked away, so shopping no longer includes the prep plan by default
  if (!(s.v >= 2)) { out.shopSources.prep = false; out.v = 2; }
  // keep history bounded
  if (out.history.length > 400) out.history = out.history.slice(-400);
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
const SERVING_OPTS = [1, 2, 4, 6];
function portionFactor(portion) { return (portion || S.prefs.portion) === 'large' ? { protein:1.25, carb:4/3 } : { protein:1, carb:1 }; }

function getOpts(r) {
  const saved = S.opts[r.id] || {};
  const o = Object.assign({}, saved);
  if (!['base','better','loaded'].includes(o.tier)) o.tier = 'base';
  if (r.type === 'dinner') {
    o.servings = SERVING_OPTS.includes(+o.servings) ? +o.servings : 1;
    o.mode = o.mode === 'amount' ? 'amount' : 'servings';
    o.amountUnit = o.amountUnit === 'oz' ? 'oz' : 'lb';
    const prot = r.ingredients.find(i => i.role === 'protein');
    o.amountOz = Number.isFinite(+o.amountOz) && +o.amountOz > 0 ? clamp(+o.amountOz, 2, 96) : Math.round(o.servings * prot.q * portionFactor().protein);
    o.plates = Number.isInteger(+o.plates) && +o.plates >= 1 && +o.plates <= 6 ? +o.plates : null;
    o.cut = r.hasCut && o.cut === 'thigh' ? 'thigh' : 'breast';
    if (o.mode === 'amount' && o.amountDate !== dayKey()) { o.mode = 'servings'; o.plates = null; }
    o.carb = r.hasCarbChoice ? (['rice','potato'].includes(o.carb) ? o.carb : (S.prefs.carb === 'potato' ? 'potato' : 'rice')) : 'rice';
    if (!['fresh','ready'].includes(o.rice)) o.rice = S.prefs.trackInventory && ['in','low'].includes(S.inv.p_rice) ? 'ready' : 'fresh';
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
    const n = NUT[i.id];
    if (!n) return;
    for (let k = 0; k < t.length; k++) t[k] += n[k] * i.sg / 100;
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
        case 'carbName': return c.carb === 'potato' ? 'Crispy potatoes' : 'Rice';
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
const RANK = { out:0, low:1, in:2 };
function inv(id) {
  if (!S.prefs.trackInventory) return 'in';
  const v = S.inv[id];
  if (v === 'in' || v === 'low' || v === 'out') return v;
  return ITEM[id] && ITEM[id].staple ? 'in' : 'out'; // pantry basics are assumed on hand
}
function setInv(id, st) { S.inv[id] = st; if (ITEM[id] && ITEM[id].prepped) { if (st === 'out') delete S.invDates[id]; else if (!S.invDates[id]) S.invDates[id] = Date.now(); } }
function cycleInv(id) { const cur = inv(id); setInv(id, cur === 'in' ? 'low' : cur === 'low' ? 'out' : 'in'); save(); }

function altIds(ing, raw) {
  let ids = ing.any || [ing.id];
  if (raw) ids = ids.filter(x => !(ITEM[x] && ITEM[x].prepped) && x !== 'ricepouch');
  return ids.length ? ids : [ing.id];
}
function avail(ing, raw) {
  const ids = altIds(ing, raw);
  let best = { st:'out', via:ids[0] };
  ids.forEach(id => { const st = inv(id); if (RANK[st] > RANK[best.st]) best = { st, via:id }; });
  return best;
}
function itemName(id) { return ITEM[id] ? ITEM[id].name : id; }

function readiness(r, overrides) {
  const c = build(r, Object.assign(r.type === 'dinner' ? { servings:1, tier:'base' } : { tier:'base' }, overrides || {}));
  const req = c.ings.filter(i => !i.extra && !i.opt);
  const seen = new Set();
  const missingCore = [], missing = [], low = [];
  req.forEach(i => {
    const a = avail(i);
    const k = a.via;
    if (seen.has(k)) return;
    seen.add(k);
    if (a.st === 'out') (i.core ? missingCore : missing).push(i);
    else if (a.st === 'low') low.push(i);
  });
  const level = missingCore.length ? 'no' : missing.length ? 'almost' : 'ready';
  return { level, missingCore, missing, low, c };
}
function bestReadiness(r) {
  if (!r.hasCarbChoice) return readiness(r);
  const a = readiness(r, { carb:'rice' }), b = readiness(r, { carb:'potato' });
  const score = x => (x.level === 'ready' ? 100 : x.level === 'almost' ? 50 : 0) - x.missing.length - x.missingCore.length * 5;
  const best = score(b) > score(a) ? b : a;
  best.carb = best === b ? 'potato' : 'rice';
  return best;
}
function readyLabel(rd) {
  if (!S.prefs.trackInventory) return { cls:'', text:'' };
  const names = list => list.length <= 2 ? list.map(i => lcName(i)).join(' and ') : list.length + ' items';
  if (rd.level === 'ready') return { cls:'ok', text: rd.low.length ? 'Ready · low on ' + names(rd.low) : 'Ready to make' };
  if (rd.level === 'almost') return { cls:'warn', text:'Missing ' + names(rd.missing) };
  return { cls:'bad', text:'Missing ' + names(rd.missingCore.concat(rd.missing)) };
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

/* ---------- Tonight ---------- */
const isFav = id => S.favorites.includes(id);
function lastCooked(rid) {
  for (let i = S.history.length - 1; i >= 0; i--) { const h = S.history[i]; if (h.rid === rid && (h.kind === 'dinner' || h.kind === 'leftover')) return h.t; }
  return 0;
}
function recommendTonight() {
  const today = dayKey();
  if (S.tonight && S.tonight.date === today && RECIPE[S.tonight.id] && !S.tonight.auto) return S.tonight.id;
  let id;
  if (!S.prefs.autoRecommend) {
    id = S.prefs.defaultMeal;
  } else {
    const doy = Math.floor(startOfDay(Date.now()) / DAY);
    let best = null, bs = -Infinity;
    DINNERS.forEach((r, idx) => {
      const rd = bestReadiness(r);
      let s = 0;
      if (isFav(r.id)) s += 3;
      if (S.prefs.protein !== 'any' && r.protein === S.prefs.protein) s += 2;
      if (S.prefs.defaultMeal === r.id) s += 1;
      if (S.prefs.trackInventory) s += rd.level === 'ready' ? 4 : rd.level === 'almost' ? 2 - Math.min(rd.missing.length, 6) * 0.25 : 0;
      if (Date.now() - lastCooked(r.id) < 2 * DAY) s -= 3;
      const planned = weekCounts()[r.id] || 0;
      if (planned > cookedThisWeek(r.id)) s += 1.5;
      s += ((doy + idx) % 4) * 0.1;
      if (s > bs) { bs = s; best = r.id; }
    });
    id = best;
  }
  if (!RECIPE[id]) id = 'korean';
  if (!S.tonight || S.tonight.id !== id || S.tonight.date !== today || !S.tonight.auto) { S.tonight = { date: today, id, auto:true }; save(); }
  return id;
}
function setTonight(id) { S.tonight = { date: dayKey(), id, auto:false }; S.lastMeal = id; save(); }

/* ---------- History ---------- */
function logHistory(kind, rid, extra) {
  S.history.push(Object.assign({ t: Date.now(), kind, rid }, extra || {}));
  if (S.history.length > 400) S.history = S.history.slice(-400);
  save();
}
function weekSummary() {
  const since = Date.now() - 7 * DAY;
  const h = S.history.filter(x => x.t >= since);
  const meals = h.filter(x => ['dinner','leftover','quick'].includes(x.kind));
  const withProtein = meals.filter(x => x.protein > 0 && x.rid !== 'q-yogurt');
  return {
    home: meals.length,
    prepared: sum(h.filter(x => x.kind === 'prep').map(x => x.n || 0)),
    proteinHeavy: meals.filter(x => x.protein >= 40).length,
    veg: Math.round(sum(meals.map(x => x.veg || 0)) * 2) / 2,
    desserts: h.filter(x => x.kind === 'dessert').length,
    avgProtein: withProtein.length ? Math.round(sum(withProtein.map(x => x.protein)) / withProtein.length) : 0,
    cooked: h.filter(x => x.kind === 'dinner').length,
    leftovers: h.filter(x => x.kind === 'leftover').length,
  };
}

/* ---------- This week's dinners ---------- */
function weekStart(t = Date.now()) {
  const d = new Date(startOfDay(t));
  const back = (d.getDay() + 6) % 7; // Monday
  d.setDate(d.getDate() - back);
  return d.getTime();
}
function weekCounts() { return S.weekPlan && S.weekPlan.start === weekStart() ? S.weekPlan.counts : {}; }
function setWeekCount(id, n) {
  const counts = Object.assign({}, weekCounts(), { [id]: clamp(n, 0, 7) });
  S.weekPlan = { start: weekStart(), counts };
  save();
}
function cookedThisWeek(rid) {
  const since = weekStart();
  return S.history.filter(h => h.t >= since && h.rid === rid && (h.kind === 'dinner' || h.kind === 'leftover')).length;
}
function vegMicroCups(c) {
  return sum(['broccoli','corn'].map(k => c.byKey && c.byKey[k] && c.byKey[k].u === 'cup' ? c.byKey[k].sq : 0)) || 0;
}

/* ---------- Containers (packed meals) ---------- */
const FRIDGE_DAYS = 4;  // USDA: cooked leftovers 3–4 days. Eat-by is the end of day 4 after cooking.
const FRIDGE_SLOTS = 4; // containers 1–4 in the fridge, the rest frozen
function eatBy(ct) {
  if (ct.frozen) return null;
  return startOfDay(ct.thawed || ct.packed) + FRIDGE_DAYS * DAY + DAY - 1;
}
function containerState(ct) {
  if (ct.frozen) return 'frozen';
  return Date.now() > eatBy(ct) ? 'expired' : 'good';
}
const PACK_SEPARATE = {
  korean:'green onion and any toppings',
  mexican:'lettuce, salsa and salsa-yogurt sauce',
  med:'cucumber, tomato, spinach and garlic yogurt sauce',
  bbq:'pickles, green onion and extra sauce',
};
const COOKED_YIELD = { beef:0.8, chicken:0.727, thighs:0.7 };
function containerContents(r) {
  const c = build(r, { servings:1, tier:'base' });
  const parts = [];
  c.ings.forEach(i => {
    if (i.role === 'protein') parts.push(fmtQ(i.sq * (COOKED_YIELD[i.id] || 1), 'oz') + ' cooked ' + (i.id === 'beef' ? 'beef' : 'chicken'));
    else if (i.role === 'carb') parts.push(i.id === 'potatoes' ? fmtQ(i.sq * 0.8, 'oz') + ' roasted potatoes' : fmtQ(i.sq, i.u) + ' rice');
    else if (i.role === 'veg' && ['broccoli','corn','blackbeans'].includes(i.id)) parts.push(fmtQ(i.sq, i.u) + ' ' + lcName(i));
  });
  return parts.join(' · ');
}

/* ---------- Prep plan ---------- */
function prepCount() { const d = S.prep.days; return d === 'custom' ? clamp(+S.prep.custom || 1, 1, 14) : clamp(+d || 4, 1, 14); }
function autoSplit(n) {
  const order = [...DINNERS].sort((a, b) => (isFav(b.id) ? 1 : 0) - (isFav(a.id) ? 1 : 0));
  const sp = {}; DINNERS.forEach(r => { sp[r.id] = 0; });
  for (let i = 0; i < n; i++) sp[order[i % order.length].id]++;
  return sp;
}
function prepSplit() {
  const n = prepCount();
  const sp = S.prep.split;
  if (isObj(sp) && DINNERS.every(r => Number.isInteger(sp[r.id]) && sp[r.id] >= 0) && sum(DINNERS.map(r => sp[r.id])) === n) return sp;
  return autoSplit(n);
}
function planBuilds(split) {
  return DINNERS.filter(r => split[r.id] > 0).map(r => build(r, { servings: split[r.id], tier:'base', rice:'fresh' }));
}

function aggregate(builds) {
  const agg = {};
  builds.forEach(c => c.ings.forEach(i => {
    const a = avail(i, true);
    const id = a.st !== 'out' ? a.via : altIds(i, true)[0];
    const e = agg[id] || (agg[id] = { id, g:0, vol:0, wt:0, cnt:{}, role:i.role, core:false, st:a.st, from:new Set() });
    e.g += i.sg;
    if (VOL[i.u]) e.vol += i.sq * VOL[i.u];
    else if (i.u === 'oz' || i.u === 'lb') e.wt += i.u === 'lb' ? i.sq * 16 : i.sq;
    else e.cnt[i.u] = (e.cnt[i.u] || 0) + i.sq;
    if (i.core) e.core = true;
    if (RANK[a.st] > RANK[e.st]) e.st = a.st;
    e.from.add(c.r.id);
  }));
  return agg;
}
function fmtAggUse(e) {
  return [e.vol ? fmtQ(e.vol, 'tsp') : '', e.wt ? fmtQ(e.wt, 'oz') : '', ...Object.entries(e.cnt).map(([u, q]) => fmtQ(q, u))].filter(Boolean).join(' + ');
}
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

// Batch prep task list for a dinner split.
function prepTasks(split) {
  const k = split.korean || 0, x = split.mexican || 0, m = split.med || 0, b = split.bbq || 0;
  const bbqOpts = getOpts(RECIPE.bbq);
  const potato = b > 0 && bbqOpts.carb === 'potato';
  const builds = planBuilds(split);
  const agg = aggregate(builds);
  const useOf = id => agg[id] ? fmtAggUse(agg[id]) : '';
  const pf = portionFactor();
  const riceServ = (k + x + m + (potato ? 0 : b));
  const dryCups = riceServ * 0.5 * pf.carb;
  const chickenOz = (x + m) * 11 * pf.protein, beefOz = (k + b) * 10 * pf.protein;
  const beefBatches = Math.max(1, Math.ceil(beefOz / 32));
  const broccoliCups = k * 1.5 + b;
  const n = k + x + m + b;
  const T = [];
  const kb = k ? build(RECIPE.korean, { servings:k }) : null;
  const bb = b ? build(RECIPE.bbq, { servings:b, tier:'base' }) : null;
  const xb = x ? build(RECIPE.mexican, { servings:x, tier:'base' }) : null;
  const mb = m ? build(RECIPE.med, { servings:m, tier:'base' }) : null;

  if (riceServ) T.push({ id:'rice', key:'rice', title:'Start the rice', hands:4, passive:25,
    text:'Rinse ' + fmtQ(dryCups, 'cup') + ' jasmine rice. Rice cooker on the white/jasmine setting, or a pot: ' + fmtQ(dryCups * 1.25, 'cup') + ' water, boil, cover, low for 15 minutes, then rest 10.' + (dryCups > 3 ? ' That’s a lot of rice — use a wide pot or split it into two batches.' : '') });
  if (chickenOz || potato) T.push({ id:'oven', key:'oven', title:'Heat the oven to 425°F', hands:2, passive:12,
    text:(() => { const pans = (x ? 1 : 0) + (m ? 1 : 0) + (potato ? 1 : 0); return 'Line ' + (pans === 3 ? 'three sheet pans' : pans === 2 ? 'two sheet pans' : 'a sheet pan') + ' with parchment or foil.' + (pans === 3 ? ' No room for three? Mexican and Mediterranean chicken can share one pan with a strip of foil between them.' : ''); })() });
  if (potato) T.push({ id:'potcut', title:'Cut and season the potatoes', hands:3 + b * 2,
    text:'Cut ' + useOf('potatoes') + ' potatoes into ¾-inch cubes. Toss with ' + fmtQ(b * 1.5, 'tsp') + ' olive oil, salt and a pinch of smoked paprika.' });
  if (chickenOz) T.push({ id:'season', title:'Season the chicken', hands:4 + Math.ceil(chickenOz / 16) * 3,
    text:['Cut ' + fmtQ(chickenOz, 'oz') + ' raw chicken into 1-inch pieces and pat dry.',
      xb ? 'Mexican (' + fmtQ(x * 11 * pf.protein, 'oz') + '): toss with ' + fill('{q:oliveoil} olive oil, {q:cumin} cumin, {q:garlicpowder} garlic powder, {q:onionpowder} onion powder, {q:paprika} paprika, {q:salt} salt and half the lime juice ({q:lime} total).', xb) : '',
      mb ? 'Mediterranean (' + fmtQ(m * 11 * pf.protein, 'oz') + '): toss with ' + fill('{q:oliveoil} olive oil, {q:garlic} minced garlic, {q:oregano} oregano, {q:paprika} paprika, {q:lemon} lemon juice and {q:salt} salt.', mb) : ''].filter(Boolean).join(' '),
    warn:'Keep the two seasonings in separate bowls, and wash up after handling raw chicken.' });
  if (potato) T.push({ id:'roastpot', key:'potatoes', waitFor:'oven', after:'potcut', title:'Potatoes into the oven', hands:2, passive:28,
    text:'Potatoes on their own pan in a single layer: 25–30 minutes, flipping halfway, until golden.' });
  if (chickenOz) T.push({ id:'roast', key:'roast', waitFor:'oven', after:'season', title:'Chicken into the oven', hands:2, passive:20,
    text:'Spread the chicken in a single layer' + (x && m ? ' — Mexican on one pan, Mediterranean on the other' : '') + '. Roast 18–22 minutes, to 165°F.' });
  if (beefOz) T.push({ id:'beef', key:'beef', title:'Brown the ground beef', hands:2 * beefBatches, passive:9 * beefBatches,
    text:'Brown ' + fmtQ(beefOz, 'oz') + ' beef in your largest skillet' + (beefBatches > 1 ? ', in ' + beefBatches + ' batches (about 2 lb each)' : '') + '. Press flat, leave 2 minutes, then crumble and cook until no pink remains, 8–10 minutes. Spoon off pooled fat.' , safety:BEEF_SAFETY });
  if (broccoliCups) T.push({ id:'broc', key:'broc', title:'Steam the broccoli', hands:2, passive:Math.ceil(broccoliCups / 3) * 3,
    text:'Microwave ' + fmtQ(broccoliCups, 'cup') + ' florets covered with a splash of water, about 3 minutes per 3 cups. Stop at crisp-tender — it softens more when reheated.' + (bb ? ' Microwave ' + fmtQ(bb.byKey.corn.sq, 'cup') + ' corn (for the BBQ bowls) with the last batch.' : '') });
  if (beefOz) T.push({ id:'beefsauce', waitFor:'beef', title:'Split and sauce the beef', hands:3 + (k && b ? 3 : 0),
    text:[kb ? 'Korean (' + k + ' ' + (k > 1 ? 'portions' : 'portion') + '): back in the pan with ' + fill('{q:garlic} garlic and {q:ginger} ginger for 30 seconds, then {q:soy} soy sauce, {q:honey} honey and {q:sesameoil} sesame oil. Simmer 2–3 minutes.', kb) : '',
      bb ? (kb ? 'Wipe the pan. ' : '') + 'BBQ (' + b + ' ' + (b > 1 ? 'portions' : 'portion') + '): season with ' + fill('{q:garlicpowder} garlic powder, {q:onionpowder} onion powder, {q:smokedpaprika} smoked paprika, {q:salt} salt and pepper; stir in {q:bbq} BBQ sauce over medium heat for 2 minutes.', bb) : ''].filter(Boolean).join(' ') });
  if (x || m) T.push({ id:'sauces', title:'Mix the sauces', hands:2 + (x && m ? 3 : 0),
    text:[xb ? 'Salsa-yogurt: ' + fill('{q:yogurt} Greek yogurt with half the salsa ({q:salsa} total), the rest of the lime juice and a pinch of salt.', xb) : '',
      mb ? 'Garlic yogurt: ' + fill('{q:yogurt} Greek yogurt, {q:lemonSauce} lemon juice, {q:garlicSauce} grated garlic and a pinch of salt.', mb) : '',
      'Portion into small lidded cups — they stay out of the microwave.'].filter(Boolean).join(' ') });
  if (x || m) T.push({ id:'coldveg', title:'Prep the cold vegetables', hands:3 + x * 2 + m * 2,
    text:[xb ? fill('Mexican: rinse {q:blackbeans} black beans and measure {q:corn} corn — those go in the main container. Shred {q:lettuce} romaine and store it separately.', xb) : '',
      mb ? fill('Mediterranean: dice {q:cucumber} cucumber, halve {q:tomato} cherry tomatoes and portion {q:spinach} spinach, stored separately.', mb) : '',
      'Anything stored separately gets a paper towel in the container and never goes in the microwave.'].filter(Boolean).join(' ') });
  if (potato) T.push({ id:'potout', waitFor:'potatoes', title:'Potatoes out', hands:1,
    text:'Golden and fork-tender? Pull the pan and spread the potatoes out to cool. Not browned yet? 5 more minutes.' });
  if (chickenOz) T.push({ id:'checkchicken', waitFor:'roast', title:'Check the chicken', hands:2,
    text:'Check the thickest pieces: 165°F, no pink inside. Let the chicken rest on the pan for a few minutes before portioning.', safety:CHICKEN_SAFETY });
  T.push({ id:'cool', key:'cool', waitAll:true, title:'Cool it down fast', hands:2, passive:12,
    text:'Spread rice and proteins in shallow containers or on a sheet pan for 10–15 minutes, uncovered. Everything goes in the fridge within 2 hours of cooking — rice within 1 hour.',
    warn:'Don’t leave cooked rice out on the counter to cool slowly.' });
  T.push({ id:'portion', waitFor:'cool', title:'Portion ' + n + ' container' + (n > 1 ? 's' : ''), hands:Math.ceil(n * 1.5),
    text:'Follow the packing plan under Portion. Fresh toppings and cold sauces stay separate.' });
  T.push({ id:'label', after:'portion', title:'Label and store', hands:3,
    text:'Write the dish and today’s date on each lid.' + (n > FRIDGE_SLOTS ? ' Containers 1–' + FRIDGE_SLOTS + ' go in the fridge; ' + (FRIDGE_SLOTS + 1) + ' and up go in the freezer.' : ' All of them go in the fridge.') });
  return { tasks:T, sch:schedulePlan(T), agg, builds, n };
}

function packingPlan(split) {
  const order = [];
  const counts = Object.assign({}, split);
  const bbqPotato = getOpts(RECIPE.bbq).carb === 'potato';
  const seq = bbqPotato ? ['bbq','korean','mexican','med'] : ['korean','mexican','med','bbq'];
  let left = sum(Object.values(counts));
  while (left > 0) {
    seq.forEach(id => { if (counts[id] > 0) { order.push(id); counts[id]--; left--; } });
  }
  return order.map((rid, idx) => ({ n: idx + 1, rid, freeze: idx >= FRIDGE_SLOTS, potato: rid === 'bbq' && bbqPotato }));
}

// Component prep: plain proteins and rice, flavored at assembly.
function componentTasks() {
  const cp = S.prep.comp;
  const T = [];
  const rice = clamp(+cp.rice || 0, 0, 12), chicken = clamp(+cp.chicken || 0, 0, 10), beef = clamp(+cp.beef || 0, 0, 10), broc = clamp(+cp.broccoli || 0, 0, 20);
  if (rice) T.push({ id:'c-rice', key:'rice', title:'Cook the rice', hands:4, passive:25, text:'Rinse ' + fmtQ(rice, 'cup') + ' jasmine rice (makes about ' + fmtQ(rice * 3, 'cup') + ' cooked). Rice cooker, or ' + fmtQ(rice * 1.25, 'cup') + ' water in a pot: boil, cover, low 15 minutes, rest 10.' });
  if (chicken) T.push({ id:'c-oven', key:'oven', title:'Heat the oven to 425°F', hands:2, passive:12, text:'Line a sheet pan with parchment or foil.' });
  if (chicken) T.push({ id:'c-season', title:'Season the chicken simply', hands:3 + Math.ceil(chicken) * 2,
    text:'Cut ' + fmtNum(chicken) + ' lb chicken into 1-inch pieces. Per pound: 1 tsp olive oil, ¼ tsp salt, ¼ tsp garlic powder, pepper. Keep it plain so it works in any bowl — flavor goes on at assembly.' });
  if (chicken) T.push({ id:'c-roast', key:'chicken', waitFor:'oven', after:'c-season', title:'Roast the chicken', hands:2, passive:20, text:'Single layer, 18–22 minutes, to 165°F in the thickest pieces.', safety:CHICKEN_SAFETY });
  if (beef) T.push({ id:'c-beef', key:'beef', title:'Brown the beef', hands:2 * Math.ceil(beef / 2), passive:9 * Math.ceil(beef / 2), text:'Brown ' + fmtNum(beef) + ' lb beef with ¼ tsp salt per pound, 2 lb per batch, until no pink remains. Drain. Leave it unsauced.', safety:BEEF_SAFETY });
  if (broc) T.push({ id:'c-broc', key:'broc', title:'Steam the broccoli', hands:2, passive:Math.ceil(broc / 3) * 3, text:'Microwave ' + fmtQ(broc, 'cup') + ' florets covered with a splash of water, about 3 minutes per 3 cups, until crisp-tender.' });
  if (T.length) {
    T.push({ id:'c-cool', key:'cool', waitAll:true, title:'Cool it down fast', hands:2, passive:12, text:'Spread everything in shallow containers, uncovered, for 10–15 minutes. Into the fridge within 2 hours — rice within 1 hour.' });
    T.push({ id:'c-store', waitFor:'cool', title:'Store and label', hands:4, text:'Separate containers, dated. Fridge: 3–4 days. Anything you won’t eat by then goes in the freezer now, in flat bags (up to 3 months).' });
  }
  return { tasks:T, sch:schedulePlan(T) };
}

// Bake-day plan across several desserts.
function bakeTasks() {
  const sel = S.prep.bake.sel || {};
  const chosen = DESSERTS.filter(r => sel[r.id]);
  const T = [];
  const bakes = chosen.filter(r => r.bakes);
  if (chosen.some(r => r.id === 'icecream')) {
    const c = build(RECIPE.icecream, { yield: sel.icecream.yield });
    T.push({ id:'b-bananas', title:'Freeze bananas for ice cream', hands:4, text:'Peel ' + fmtQ(c.byKey.bananas.sq, 'banana') + ', slice into ½-inch coins and freeze flat on parchment. Blend a bowl any time after 6 hours.' });
  }
  if (bakes.length) T.push({ id:'b-oven', key:'oven', title:'Heat the oven to 350°F', hands:2, passive:12, text:'Everything here bakes at 350°F. Set two racks in the upper and lower thirds if you’re baking more than one pan at once.' });
  bakes.forEach(r => {
    const c = build(r, { yield: sel[r.id].yield });
    const steps = stepsFor(c);
    const bi = steps.findIndex(s => s.key === 'bake');
    const mixHands = sum(steps.slice(1, bi).map(s => (s.hands || 0) + (s.key === 'rest' ? s.passive || 0 : 0)));
    T.push({ id:'b-mix-' + r.id, title:'Mix the ' + r.short.toLowerCase(), hands:mixHands, text:'Follow ' + r.name + ' through “Fill the pan” (' + c.y.label.toLowerCase() + ', ' + c.y.pan + '). Open it for the step-by-step.', rid:r.id });
    T.push({ id:'b-bake-' + r.id, key:'bake-' + r.id, waitFor:'oven', after:'b-mix-' + r.id, title:'Bake the ' + r.short.toLowerCase(), hands:1, passive:bakeMin(c), text:'Bake ' + fill('{bake}', c) + '. Start checking at the low end.', warn:'Do not overbake.' });
  });
  bakes.forEach(r => {
    const c = build(r, { yield: sel[r.id].yield });
    const warmGlaze = r.id === 'donuts' && c.g && c.g.warm;
    const cool = r.id === 'donuts' ? 20 : r.id === 'brownies' ? 90 : 60;
    T.push({ id:'b-cool-' + r.id, key:'cool-' + r.id, waitFor:'bake-' + r.id, title:(r.id === 'brownies' ? 'Cool and chill the ' : 'Cool the ') + r.short.toLowerCase(), hands:2, passive:cool,
      text: r.id === 'donuts' ? 'Cool 5 minutes in the pan, loosen and turn out onto a rack.' + (warmGlaze ? ' While they’re still warm: ' + fill(c.g.make, c) + ' ' + c.g.apply + ' Then let them finish cooling.' : ' Cool 15 minutes before glazing.') : r.id === 'brownies' ? 'Cool 1 hour in the pan, then chill 30 minutes before cutting.' : 'Cool 15 minutes in the pan, then at least 45 minutes on a rack before slicing.',
      warn: r.id === 'donuts' ? (warmGlaze ? '' : 'Glaze on warm donuts melts and slides off.') : 'Let it cool before cutting.' });
    if (r.id === 'donuts' && c.g && c.g.id !== 'none' && !warmGlaze) T.push({ id:'b-glaze', waitFor:'cool-donuts', title:'Glaze the donuts', hands:6, text:c.g.label + ': ' + fill(c.g.make, c) + ' ' + c.g.apply });
  });
  if (chosen.length) T.push({ id:'b-store', waitAll:true, title:'Wrap and store', hands:5, text: chosen.map(r => r.storeShort).join(' ') });
  return { tasks:T, sch:schedulePlan(T), chosen };
}

/* ---------- Shopping ---------- */
function shoppingNeeds() {
  const builds = [];
  const week = weekCounts();
  const weekTotal = sum(Object.values(week));
  if (S.shopSources.week && weekTotal) {
    DINNERS.filter(r => week[r.id] > 0).forEach(r => builds.push({ c: build(r, { servings: week[r.id], tier: getOpts(r).tier }), raw:false }));
  } else if (S.shopSources.tonight) { const r = RECIPE[recommendTonight()]; builds.push({ c: build(r), raw:false }); }
  if (S.shopSources.prep) planBuilds(prepSplit()).forEach(c => builds.push({ c, raw:true }));
  if (S.shopSources.bake) DESSERTS.filter(r => S.prep.bake.sel[r.id]).forEach(r => builds.push({ c: build(r, { yield:S.prep.bake.sel[r.id].yield, tier:'base' }), raw:true }));
  const need = {};
  builds.forEach(({ c, raw }) => c.ings.forEach(i => {
    if (i.extra === 'Heat' && S.prefs.heat === 'mild') return;
    const a = avail(i, raw);
    const id = a.st !== 'out' ? a.via : altIds(i, raw)[0];
    const e = need[id] || (need[id] = { id, g:0, st:a.st, core:false });
    e.g += i.sg;
    if (i.core) e.core = true;
    if (RANK[a.st] > RANK[e.st]) e.st = a.st;
  }));
  return Object.values(need).filter(e => ITEM[e.id]);
}
function upsertShopping(id, g) {
  const ex = S.shopping.find(x => x.id === id);
  if (ex) { ex.g = Math.max(ex.g || 0, g || 0); }
  else S.shopping.push({ id, g: g || 0, checked:false });
}
function mergeNeeds(needs) {
  const m = {};
  needs.forEach(e => {
    const x = m[e.id] || (m[e.id] = { id:e.id, g:0, st:e.st });
    x.g += e.g || 0;
    if (RANK[e.st] > RANK[x.st]) x.st = e.st;
  });
  return Object.values(m);
}
function addMissingToList(needs) {
  let added = 0;
  mergeNeeds(needs).forEach(e => {
    if (e.st === 'in') return;
    if (!S.shopping.some(x => x.id === e.id)) added++;
    upsertShopping(e.id, e.g);
  });
  save();
  return added;
}
