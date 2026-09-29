'use strict';
/* =========================================================================
   Default Dinner — views: Meals, Ingredients, Shopping
   ========================================================================= */

const ICON = {
  meals:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z"/><path d="M9.5 8c0-1.3 1.2-1.4 1.2-2.8M14 8c0-1.3 1.2-1.4 1.2-2.8"/></svg>',
  fridge:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M5 10h14M8 6.4v1.6M8 13v2"/></svg>',
  cart:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2.2l2.3 10.5a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6.2"/><circle cx="10" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/></svg>',
  gear:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>',
  back:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  chev:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  close:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

/* ---------- Illustrations ---------- */
const FOODVAR = { rice:'--f-rice', beef:'--f-beef', chicken:'--f-chicken', broccoli:'--f-broc', lettuce:'--f-leaf', beans:'--f-bean', corn:'--f-corn',
  spinach:'--f-spinach', cucumber:'--f-cuc', tomato:'--f-tomato', potato:'--f-potato', pasta:'--f-pasta', sauce:'--f-sauce', sausage:'--f-sausage',
  egg:'--f-egg', hash:'--f-hash', chili:'--f-chili', peppers:'--f-peppers' };
const CARB_LABEL = { rice:'Rice', potato:'Potatoes', hash:'Hash browns', none:'On its own' };

function bowlSVG(r, size, carb) {
  const segs = r.bowl.map(([k, v]) => [k === 'rice' && (carb === 'potato' || carb === 'hash') ? (carb === 'hash' ? 'hash' : 'potato') : k, v]);
  const cx = 50, cy = 50, R = 39;
  let a = -Math.PI / 2 - segs[0][1] * Math.PI;
  const paths = segs.map(([k, v]) => {
    const a2 = a + v * 2 * Math.PI;
    const x1 = cx + R * Math.cos(a), y1 = cy + R * Math.sin(a), x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);
    const d = `M${cx} ${cy}L${x1.toFixed(2)} ${y1.toFixed(2)}A${R} ${R} 0 ${v > 0.5 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}Z`;
    a = a2;
    return `<path d="${d}" fill="var(${FOODVAR[k] || '--f-rice'})" stroke="var(--bowl)" stroke-width="1.6"/>`;
  }).join('');
  const dots = [[44,44],[55,40],[50,55],[40,52],[58,50],[47,36],[62,43]];
  let garnish = '';
  if (r.garnish === 'greenonion') garnish = dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.1" fill="none" stroke="var(--f-scallion)" stroke-width="1.3"/>`).join('');
  if (r.garnish === 'salsa') garnish = dots.slice(0, 5).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="var(--f-tomato)"/>`).join('');
  if (r.garnish === 'yogurt') garnish = '<path d="M38 50c4-8 18-8 22 0s-10 10-14 4 4-9 8-5" fill="none" stroke="var(--f-yogurt)" stroke-width="3.2" stroke-linecap="round"/>';
  if (r.garnish === 'bbq') garnish = '<path d="M34 46l7 6 7-7 7 7 7-6 5 4" fill="none" stroke="var(--f-bbq)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';
  if (r.garnish === 'sesame') garnish = dots.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2" ry="1.3" fill="var(--f-sesame)"/>`).join('');
  if (r.garnish === 'parmesan') garnish = dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.7" fill="var(--f-parm)"/>`).join('');
  return `<svg class="bowl" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="${esc(r.name)}"><circle cx="50" cy="50" r="48" fill="var(--bowl)" stroke="var(--line)" stroke-width="1"/>${paths}<circle cx="50" cy="50" r="${R}" fill="none" stroke="var(--bowl-rim)" stroke-width="1"/>${garnish}</svg>`;
}
function glyphSVG(r, size) {
  let body = '';
  if (r.glyph === 'loaf') body = '<path d="M16 46c0-14 16-20 34-20s34 6 34 20v26a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6z" fill="var(--f-bread)"/><path d="M22 44c6-9 50-9 56 0" fill="none" stroke="var(--f-crust)" stroke-width="3" stroke-linecap="round"/>' + [[34,56],[50,62],[64,52],[42,70],[70,66],[28,66],[56,44]].map(([x,y]) => `<rect x="${x}" y="${y}" width="5" height="5" rx="1.5" fill="var(--f-choc)"/>`).join('');
  if (r.glyph === 'brownie') body = '<rect x="18" y="18" width="64" height="64" rx="5" fill="var(--f-brownie)"/><path d="M39.3 18v64M60.7 18v64M18 39.3h64M18 60.7h64" stroke="var(--bowl)" stroke-width="2.2"/><path d="M24 26l6 3M46 24l5 4M67 27l6 2M26 48l5 3M50 46l4 4" stroke="var(--f-brownie-hi)" stroke-width="2" stroke-linecap="round"/>';
  return `<svg class="glyph" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="${esc(r.name)}">${body}</svg>`;
}
function artFor(r, size, carb) { return r.type === 'dinner' ? bowlSVG(r, size, carb) : glyphSVG(r, size); }

/* ---------- Components ---------- */
function seg(label, options, value, act, extra = '') {
  const any = options.some(([v]) => String(v) === String(value));
  return `<div class="seg" role="radiogroup" aria-label="${esc(label)}">${options.map(([v, t], i) => {
    const on = String(v) === String(value);
    return `<button type="button" role="radio" aria-checked="${on}" tabindex="${on || (!any && i === 0) ? 0 : -1}" data-a="${act}" data-v="${esc(v)}" ${extra}>${t}</button>`;
  }).join('')}</div>`;
}
function chipGroup(label, options, value, rid, k) {
  return `<div class="chips" role="radiogroup" aria-label="${esc(label)}">${options.map(([v, t]) =>
    `<button type="button" role="radio" class="chip" aria-checked="${v === value}" tabindex="${v === value ? 0 : -1}" data-a="opt" data-rid="${rid}" data-k="${k}" data-v="${esc(v)}">${esc(t)}</button>`).join('')}</div>`;
}
function stepper(label, value, act, attrs, display) {
  return `<div class="stepper" role="group" aria-label="${esc(label)}"><button type="button" data-a="${act}" data-d="-1" ${attrs} aria-label="Fewer ${esc(label)}">−</button><output class="mono" aria-live="polite">${display != null ? display : value}</output><button type="button" data-a="${act}" data-d="1" ${attrs} aria-label="More ${esc(label)}">+</button></div>`;
}
function backLink(href, label) { return `<a class="back" href="${href}">${ICON.back}<span>${label}</span></a>`; }
function section(title, body, opts = {}) {
  if (opts.collapsible) return `<details class="sec" data-d="${esc(opts.id || title)}"${opts.open ? ' open' : ''}><summary><h2 class="h2">${title}</h2>${opts.aside ? `<span class="sum-aside">${opts.aside}</span>` : ''}</summary><div class="sec-body">${body}</div></details>`;
  return `<section class="sec"><div class="sec-head"><h2 class="h2">${title}</h2>${opts.aside || ''}</div><div class="sec-body">${body}</div></section>`;
}
function emptyState(title, text, btn) {
  return `<div class="empty"><p class="empty-title">${title}</p>${text ? `<p class="muted">${text}</p>` : ''}${btn || ''}</div>`;
}
function bullets(list) { return `<ul class="bullets">${list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`; }
function fmtHM(min) { return Math.floor(min / 60) + ':' + String(Math.round(min % 60)).padStart(2, '0'); }
function macroRow(nu, minutes, activeOnly) {
  const cells = [['Calories', '~' + roundKcal(nu.kcal), ''], ['Protein', roundG(nu.protein), 'g'], ['Carbs', roundG(nu.carbs), 'g'], ['Fat', roundG(nu.fat), 'g'],
    [activeOnly ? 'Hands-on' : 'Time', minutes < 60 ? minutes : fmtHM(minutes), minutes < 60 ? 'min' : 'hr']];
  return `<dl class="macros">${cells.map(([k, v, u]) => `<div><dt>${k}</dt><dd><span class="num">${v}</span>${u ? `<span class="unit">${u}</span>` : ''}</dd></div>`).join('')}</dl>`;
}
function microTable(nu) {
  const rows = [['Sodium', Math.round(nu.sodium / 10) * 10, 'mg', 'sodium'], ['Potassium', Math.round(nu.potassium / 10) * 10, 'mg', 'potassium'],
    ['Calcium', Math.round(nu.calcium / 10) * 10, 'mg', 'calcium'], ['Iron', Math.round(nu.iron * 10) / 10, 'mg', 'iron'],
    ['Vitamin A', Math.round(nu.vitA / 10) * 10, 'mcg', 'vitA'], ['Vitamin C', Math.round(nu.vitC), 'mg', 'vitC'],
    ['Vitamin D', Math.round(nu.vitD * 10) / 10, 'mcg', 'vitD'], ['Magnesium', Math.round(nu.magnesium / 5) * 5, 'mg', 'magnesium']];
  return `<table class="micro"><thead><tr><th scope="col">Nutrient</th><th scope="col">Amount</th><th scope="col">% label DV</th></tr></thead><tbody>${rows.map(([n, v, u, k]) =>
    `<tr><th scope="row">${n}</th><td class="mono">~${v} ${u}</td><td class="mono">${Math.round(nu[k] / DV[k] * 100)}%</td></tr>`).join('')}</tbody></table>
    <p class="fine">Approximate, from standard ingredient values. Brands vary.</p>`;
}
function nutritionDetails(nu) {
  return `<details class="more" data-d="full-nutrition"><summary>Full nutrition</summary><p class="detail-line">Fiber <span class="mono">~${roundG(nu.fiber)} g</span></p>${microTable(nu)}</details>`;
}
function noteCallout(rid) {
  const n = (S.notes[rid] || '').trim();
  return n ? `<div class="callout note"><strong>Your note</strong> <span class="note-text">${esc(n)}</span></div>` : '';
}

function ingredientList(c, rid, prefix = '') {
  const checks = S.checks[rid] || {};
  const groups = [];
  const byGroup = {};
  c.ings.forEach(i => {
    const g = i.extra ? (i.extra === 'Heat' ? 'Heat' : 'Make it better') : (i.group || 'Main');
    if (!byGroup[g]) { byGroup[g] = []; groups.push(g); }
    byGroup[g].push(i);
  });
  return groups.map(g => `<div class="ing-group">${g !== 'Main' ? `<h3 class="h3">${esc(g)}</h3>` : ''}<ul class="ings">${byGroup[g].map(i => {
    const a = avail(i);
    const id = `${prefix}chk-${rid}-${i.key}-${i.extra || 'b'}`.replace(/[^a-zA-Z0-9-]/g, '');
    const note = i.note ? fill(i.note, c) : '';
    const tag = i.extra && i.extra !== 'Heat' ? `<span class="tag">${esc(i.extra)}</span>` : '';
    const missing = a.st === 'out';
    return `<li class="ing${missing ? ' missing' : ''}"><input type="checkbox" id="${id}" data-a="check" data-rid="${rid}" data-key="${esc(i.key + (i.extra || ''))}" ${checks[i.key + (i.extra || '')] ? 'checked' : ''}>
      <label for="${id}"><span class="ing-name">${esc(i.name || itemName(i.id))}${tag}</span>${note ? `<span class="ing-note">${esc(note)}</span>` : ''}</label>
      <span class="ing-amt mono">${esc(fmtQ(i.sq, i.u))}</span>
      ${missing ? `<details class="swap" data-d="swap-${rid}-${i.key}"><summary><span class="need-badge">Need to buy${i.sub ? ' · swap' : ''}</span></summary><p class="swap-text">${esc(i.sub || 'No swap for this one — it goes on the list.')}</p></details>` : ''}</li>`;
  }).join('')}</ul></div>`).join('');
}
function timelineList(sch) {
  return `<ol class="timeline">${sch.items.map(({ s, t }) => `<li><span class="t mono">${fmtClock(t)}</span><span class="tl-body"><span class="tl-title">${esc(s.title)}</span></span></li>`).join('')}</ol>`;
}

/* ---------- MEALS ---------- */
function mealRow(r) {
  const c = build(r);
  const nu = nutrition(c), tm = times(c);
  const rd = bestReadiness(r);
  const time = r.crockpot ? tm.active + ' min hands-on' : r.type === 'dinner' ? tm.total + ' min' : fmtDur(tm.active + tm.bake);
  const missing = rd.missingCore.concat(rd.missing);
  const status = rd.level === 'ready'
    ? '<span class="ready-line ok">Ready to make</span>'
    : `<span class="ready-line warn">Missing ${missing.length <= 2 ? esc(missing.map(lcName).join(' and ')) : missing.length + ' things'}</span>`;
  return `<li class="mrow"><a class="mrow-main" href="#/meal/${r.id}">${artFor(r, 54, getOpts(r).carb)}<span class="mrow-body">
    <span class="mrow-name">${esc(r.name)}${r.crockpot ? ' <span class="tag">crock pot</span>' : ''}</span>
    <span class="meta">~${roundKcal(nu.kcal)} kcal · ${roundG(nu.protein)} g protein · ${time}</span>
    ${status}</span></a></li>`;
}
function viewMeals(filter) {
  filter = ['all','dinners','prep','sweet'].includes(filter) ? filter : (S.ui.mealFilter || 'all');
  S.ui.mealFilter = filter;
  let list = RECIPES;
  if (filter === 'dinners') list = DINNERS.filter(r => !r.crockpot);
  if (filter === 'prep') list = DINNERS.filter(r => r.crockpot || r.prepable);
  if (filter === 'sweet') list = DESSERTS;
  const withRd = list.map(r => ({ r, rd: bestReadiness(r) }));
  const ready = withRd.filter(x => x.rd.level === 'ready');
  const nearly = withRd.filter(x => x.rd.level !== 'ready')
    .sort((a, b) => (a.rd.missingCore.length + a.rd.missing.length) - (b.rd.missingCore.length + b.rd.missing.length));
  const need = S.shopping.filter(x => !x.checked).length;
  return `
  <header class="page-head"><h1 class="h1">Meals</h1>${need ? `<a class="btn small" href="#/shopping">Buy ${need}</a>` : `<a class="icon-btn" href="#/settings" aria-label="Settings">${ICON.gear}</a>`}</header>
  ${seg('Show', [['all','All'],['dinners','Quick'],['prep','Crock pot'],['sweet','Sweet']], filter, 'meal-filter')}
  ${ready.length
    ? section('Ready to make', `<ul class="mrows">${ready.map(x => mealRow(x.r)).join('')}</ul>`, { aside:`<span class="muted mono">${ready.length}</span>` })
    : section('Ready to make', emptyState('Nothing is fully covered.', 'Open anything below and add what it needs to the list.'))}
  ${nearly.length ? section('Need a few things', `<ul class="mrows">${nearly.map(x => mealRow(x.r)).join('')}</ul>`) : ''}`;
}

/* ---------- RECIPE ---------- */
function recipeTab(rid, tabs) {
  const saved = (S.ui.rtabs || {})[rid];
  return tabs.some(([k]) => k === saved) ? saved : tabs[0][0];
}
function recipeTabs(rid, tabs, current) {
  return `<div class="rtabs" role="tablist" aria-label="Recipe sections">${tabs.map(([k, l]) =>
    `<button type="button" role="tab" id="rtab-${k}" aria-selected="${k === current}" tabindex="${k === current ? 0 : -1}" aria-controls="rpanel" data-a="rtab" data-rid="${rid}" data-v="${k}">${l}</button>`).join('')}</div>`;
}
function tierBlock(r, o, id) {
  return `<h3 class="h3">Make it better</h3>${seg('Flavor level', [['base','Base'],['better','Better'],['loaded','Loaded']], o.tier, 'opt', `data-rid="${id}" data-k="tier"`)}
    <dl class="tiers">${['base','better','loaded'].map(t => `<div class="${t === o.tier ? 'on' : ''}"><dt>${t[0].toUpperCase() + t.slice(1)}</dt><dd>${esc(r.tiers[t].text)}</dd></div>`).join('')}</dl>`;
}
function amountBox(r, o, c, id) {
  if (o.mode !== 'amount') return '';
  const protName = r.protein === 'beef' ? (r.id === 'stew' ? 'chuck roast' : 'ground beef') : r.protein === 'sausage' ? 'sausage' : o.cut === 'thigh' ? 'chicken thighs' : 'chicken';
  const disp = o.amountUnit === 'lb' ? String(Math.round(o.amountOz / 16 * 100) / 100) : String(Math.round(o.amountOz * 10) / 10);
  return `<div class="amount-box">
    <label class="opt-label" for="amount-${id}">How much ${protName} do you have?</label>
    <div class="amount-row"><input id="amount-${id}" class="amount-input mono" type="text" inputmode="decimal" autocomplete="off" value="${disp}" data-a="amount-num" data-rid="${id}">
      ${seg('Unit', [['lb','lb'],['oz','oz']], o.amountUnit, 'opt', `data-rid="${id}" data-k="amountUnit"`)}</div>
    <div class="chips">${[[8,'½ lb'],[16,'1 lb'],[24,'1½ lb'],[32,'2 lb'],[48,'3 lb']].map(([oz, l]) => `<button type="button" class="chip" aria-pressed="${Math.abs(o.amountOz - oz) < 0.01}" data-a="amount-preset" data-rid="${id}" data-v="${oz}">${l}</button>`).join('')}</div>
    <span class="opt-label">Split into</span>
    ${seg('Portions', [[1,'1'],[2,'2'],[3,'3'],[4,'4'],[5,'5'],[6,'6']], c.plates, 'opt', `data-rid="${id}" data-k="plates"`)}
    <p class="fine">Everything below is scaled to your ${esc(fmtQ(o.amountOz, 'oz'))}.</p>
  </div>`;
}

function viewRecipe(id) {
  const r = RECIPE[id];
  if (!r) return emptyState('That recipe isn’t here.', '', '<a class="btn" href="#/meals">See meals</a>');
  const o = getOpts(r);
  const c = build(r);
  const nu = nutrition(c);
  const tm = times(c);
  const isDinner = r.type === 'dinner';
  const rd = bestReadiness(r);
  const missing = rd.missingCore.concat(rd.missing);
  const TABS = [['ingredients','Ingredients'],['steps','Steps'],['dial','Dial it in'],['storage','Storage']];
  const tab = recipeTab(id, TABS);

  const modeRow = isDinner
    ? `<div class="opt"><span class="opt-label">Cooking for</span>${seg('Cooking for', SERVING_PRESETS(r).concat([['amount','I have…']]), o.mode === 'amount' ? 'amount' : o.servings, 'opt', `data-rid="${id}" data-k="servings"`)}${amountBox(r, o, c, id)}</div>`
    : `<div class="opt"><span class="opt-label">Make</span>${seg('Batch size', r.yields.map(y => [y.id, y.label]).concat(r.have ? [['have','I have…']] : []), o.mode === 'amount' ? 'have' : o.yield, 'opt', `data-rid="${id}" data-k="yield"`)}
       ${o.mode === 'amount' && r.have ? `<div class="amount-box"><span class="opt-label">${esc(r.have.question)}</span>
         <div class="amount-row">${stepper('bananas', o.haveCount, 'have-step', `data-rid="${id}"`, o.haveCount + (o.haveCount === 1 ? ' banana' : ' bananas'))}</div>
         <p class="fine">Makes ${esc((c.y.label.split('→ ')[1] || c.y.label))}${c.y.pan ? ' · ' + esc(c.y.pan) : ''}.</p></div>` : ''}</div>`;
  const extraOpts = [
    isDinner && r.carbs && r.carbs.length > 1 ? `<div class="opt"><span class="opt-label">${['chili','whitechili','pulled'].includes(r.id) ? 'Serve it' : 'Carb'}</span>${seg('Carb', r.carbs.map(k => [k, CARB_LABEL[k]]), o.carb, 'opt', `data-rid="${id}" data-k="carb"`)}</div>` : '',
    r.hasCut ? `<div class="opt"><span class="opt-label">Chicken</span>${seg('Chicken', [['breast','Breast'],['thigh','Thighs']], o.cut, 'opt', `data-rid="${id}" data-k="cut"`)}</div>` : '',
    r.hasSauceChoice ? `<div class="opt"><span class="opt-label">BBQ sauce</span>${seg('BBQ sauce', [['regular','Regular'],['smoky','Smoky'],['spicy','Spicy']], o.sauce, 'opt', `data-rid="${id}" data-k="sauce"`)}</div>` : '',
    !isDinner && r.variations ? `<div class="opt"><span class="opt-label">Version</span>${chipGroup('Version', r.variations.map(v => [v.id, v.label]), o.variation, id, 'variation')}</div>` : '',
  ].filter(Boolean).join('');

  let panel;
  if (tab === 'ingredients') {
    const shopBtn = missing.length
      ? `<button type="button" class="btn primary wide" data-a="recipe-missing" data-id="${id}">Add ${missing.length} missing ${missing.length > 1 ? 'things' : 'thing'} to the list</button>`
      : '<p class="muted center">You have everything for this.</p>';
    panel = noteCallout(id) + ingredientList(c, id) + `<div class="btn-row stack">${shopBtn}</div>`;
  } else if (tab === 'steps') {
    const pn = r.prepNotes;
    panel = (isDinner
      ? `<p class="summary">${r.crockpot ? `${tm.active} min hands-on, then ${fmtDur(tm.total - tm.active)} in the slow cooker` : `Prep ${tm.prep} min · Cook ${tm.cook} min · <strong>${tm.total} min total</strong>`}</p>
         <details class="more" data-d="equipment"><summary>Equipment</summary>${bullets(r.equipment)}</details>
         <details class="more" data-d="getout"><summary>What to get out</summary>${bullets(r.mise)}</details>`
      : `<h3 class="h3 first">Before you start</h3><dl class="kv">
          <div><dt>Oven</dt><dd>${esc(pn.temp)}</dd></div>
          ${c.y.pan ? `<div><dt>Pan</dt><dd>${esc(c.y.pan)}</dd></div>` : ''}
          <div><dt>Parchment</dt><dd>${esc(pn.lining)}</dd></div>
          <div><dt>Tools</dt><dd>${esc(pn.tools.join(', '))}</dd></div></dl>`)
      + `<h3 class="h3">Method</h3><ol class="steps">${tm.steps.map(s => `<li><span class="st-title">${esc(s.title)}</span><span class="st-text">${esc(fill(s.text, c))}</span>${s.warn ? `<span class="callout warn"><strong>Heads up</strong> ${esc(s.warn)}</span>` : ''}</li>`).join('')}</ol>`
      + (isDinner && !r.crockpot ? `<h3 class="h3">Timeline</h3>${timelineList(tm.sch)}` : '')
      + (isDinner ? `<h3 class="h3">Finish</h3><p class="body-text">${esc(r.finish)}</p>` : '');
  } else if (tab === 'dial') {
    panel = `<p class="muted">What goes wrong, and what fixes it.</p>
      ${r.dial ? `<dl class="kv dial">${r.dial.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
      ${tierBlock(r, o, id)}
      <h3 class="h3">Swaps</h3>${bullets(r.subs)}
      <h3 class="h3"><label for="note-${id}">Your notes</label></h3>
      <textarea id="note-${id}" class="note-input" rows="3" maxlength="1000" placeholder="What you'd change next time" data-a="note" data-rid="${id}">${esc(S.notes[id] || '')}</textarea>
      <p class="fine">Saved as you type, and shown when you cook.</p>
      ${nutritionDetails(nu)}`;
  } else {
    const st = r.storage;
    panel = isDinner
      ? `${c.n > 1 ? `<p class="callout safe"><strong>Cooking ${c.n} portions</strong> Pack them while hot, then into the fridge once the steam stops. Days 1–4 in the fridge; freeze anything past that now rather than later.</p>` : ''}
         <h3 class="h3">If you’re not finishing it</h3>${bullets(r.leftovers.separate)}
         <h3 class="h3">Storage</h3>${bullets(r.leftovers.storage)}
         <h3 class="h3">Reheating</h3>${bullets(r.leftovers.reheat)}
         <h3 class="h3">Make it taste fresh</h3>${bullets(r.leftovers.fresh)}`
      : `<dl class="kv"><div><dt>Counter</dt><dd>${esc(st.room)}</dd></div><div><dt>Fridge</dt><dd>${esc(st.fridge)}</dd></div><div><dt>Freezer</dt><dd>${esc(st.freezer)}</dd></div><div><dt>Reheat</dt><dd>${esc(st.reheat)}</dd></div></dl>`;
  }

  return `
  ${backLink('#/meals', 'Meals')}
  <header class="rhead">
    <div class="rhead-top">${artFor(r, 72, c.carb)}<div class="rhead-title"><h1 class="h1">${esc(r.name)}</h1>
      <p class="kicker">${r.crockpot ? 'Crock pot · ' : ''}${esc(isDinner ? amountLabel(c) : c.y.label)}</p></div></div>
    <p class="lede">${esc(r.flavor)}</p>
    ${macroRow(nu, r.crockpot ? tm.active : isDinner ? tm.total : tm.active + tm.bake, !!r.crockpot)}
    <p class="fine">Per ${isDinner ? (c.mode === 'amount' ? 'portion' : 'serving') : c.y.unit}, approximate.${missing.length ? ` Missing ${esc(missing.map(lcName).join(', '))}.` : ''}</p>
  </header>
  <div class="opts">${modeRow}${extraOpts}</div>
  ${recipeTabs(id, TABS, tab)}
  <div class="rpanel" id="rpanel" role="tabpanel" aria-labelledby="rtab-${tab}">${panel}</div>
  <div class="cta-bar"><button type="button" class="btn primary xl" data-a="start-cook" data-id="${id}">${r.crockpot ? 'Start it' : isDinner ? 'Start cooking' : 'Bake it'}</button></div>`;
}

/* ---------- INGREDIENTS ---------- */
function invRow(i) {
  const out = inv(i.id) === 'out';
  return `<li><button type="button" class="inv-row" data-a="inv" data-id="${i.id}" aria-label="${esc(i.name)}: ${out ? 'on the shopping list' : 'have it'}. Tap to change.">
    <span class="inv-body"><span class="inv-name">${esc(i.name)}</span></span>
    <span class="pill ${out ? 'out' : 'in'}">${out ? 'Need' : 'Have'}</span></button></li>`;
}
function viewIngredients() {
  const term = (S.ui.invSearch || '').trim().toLowerCase();
  const out = ITEMS.filter(i => inv(i.id) === 'out');
  const search = `<form class="search" onsubmit="return false"><label for="inv-search" class="visually-hidden">Search ingredients</label>
    <input id="inv-search" type="search" inputmode="search" placeholder="Search ingredients" autocomplete="off" value="${esc(term)}" data-a="inv-search">
    ${term ? '<button type="button" class="text-btn" data-a="inv-search-clear">Clear</button>' : ''}</form>`;
  if (term) {
    const hits = ITEMS.filter(i => i.name.toLowerCase().includes(term));
    return `<header class="page-head"><h1 class="h1">Ingredients</h1></header>${search}
      ${hits.length ? `<ul class="inv">${hits.map(invRow).join('')}</ul>`
        : emptyState('Nothing matches “' + esc(term) + '”.', '', `<button type="button" class="btn" data-a="add-custom" data-name="${esc(term)}">Put “${esc(term)}” on the list</button>`)}`;
  }
  const cats = CATS.map(cat => {
    const list = ITEMS.filter(i => (i.cat === cat.id || i.alsoCat === cat.id) && inv(i.id) !== 'out');
    if (!list.length) return '';
    return `<details class="inv-cat" data-d="cat-${cat.id}"><summary><span class="inv-cat-name">${cat.name}</span><span class="inv-cat-status">${list.length}</span></summary><ul class="inv">${list.map(invRow).join('')}</ul></details>`;
  }).join('');
  return `
  <header class="page-head"><h1 class="h1">Ingredients</h1>${out.length ? `<a class="btn small" href="#/shopping">List · ${out.length}</a>` : ''}</header>
  <p class="lede">Everything counts as on hand. Tap what you’ve run out of and it moves to the shopping list.</p>
  ${search}
  ${out.length ? section('Out — on the list', `<ul class="inv">${out.map(invRow).join('')}</ul>`) : ''}
  ${section('What I have', cats)}
  <div class="danger-zone"><button type="button" class="text-btn" data-a="reset-inv">Mark everything as on hand</button></div>`;
}

/* ---------- SHOPPING ---------- */
function viewShopping() {
  const list = S.shopping;
  let body;
  if (!list.length) {
    body = emptyState('Nothing to buy.', 'Tap what you’re out of in Ingredients, or open a meal and add what it needs.',
      '<div class="btn-row center"><a class="btn" href="#/ingredients">Ingredients</a><a class="btn" href="#/meals">Meals</a></div>');
  } else {
    const groups = {};
    list.forEach(x => { const aisle = ITEM[x.id] ? ITEM[x.id].aisle : 'Other'; (groups[aisle] = groups[aisle] || []).push(x); });
    body = [...AISLES, 'Other'].filter(a => groups[a]).map(a => `<h3 class="label">${esc(a)}</h3><ul class="shop">${groups[a].map(x => {
      const name = ITEM[x.id] ? ITEM[x.id].name : x.name;
      const qty = ITEM[x.id] && x.g ? fmtBuy(x.id, x.g) : '';
      const why = x.why ? `for ${esc(x.why)}` : '';
      const id = 'sh-' + x.id.replace(/[^a-zA-Z0-9-]/g, '');
      return `<li class="${x.checked ? 'done' : ''}"><input type="checkbox" id="${id}" data-a="shop-check" data-id="${esc(x.id)}" ${x.checked ? 'checked' : ''}><label for="${id}"><span class="shop-name">${esc(name)}</span>${qty || why ? `<span class="shop-qty mono">${esc(qty)}${qty && why ? ' · ' : ''}${why}</span>` : ''}</label></li>`;
    }).join('')}</ul>`).join('');
    const checked = list.filter(x => x.checked).length;
    body += `<div class="btn-row">${checked ? `<button type="button" class="btn small primary" data-a="shop-bought">Bought ${checked}</button>` : ''}<button type="button" class="btn small" data-a="shop-copy">Copy list</button><button type="button" class="text-btn" data-a="shop-clear">Clear</button></div>`;
  }
  return `
  <header class="page-head"><h1 class="h1">Shopping</h1><span class="muted mono">${list.filter(x => !x.checked).length}</span></header>
  ${body}
  <form class="add-item" data-a="shop-add"><label for="add-item" class="visually-hidden">Add an item</label><input id="add-item" name="item" type="text" placeholder="Add something" autocomplete="off" maxlength="60"><button type="submit" class="btn small">Add</button></form>
  ${list.length ? '<p class="fine">Checking something off puts it back in Ingredients as on hand.</p>' : ''}`;
}

/* ---------- SETTINGS ---------- */
function viewSettings() {
  const p = S.prefs;
  const row = (label, control) => `<div class="set-row stack"><span class="set-label">${label}</span>${control}</div>`;
  return `
  ${backLink('#/meals', 'Meals')}
  <header class="page-head"><h1 class="h1">Settings</h1></header>
  ${!Store.ok ? '<p class="callout warn"><strong>Storage unavailable</strong> This browser isn’t saving data, so changes last until you close the page.</p>' : ''}
  <div class="set-group">
    ${row('Portion size', seg('Portion size', [['standard','Standard · 8 oz protein'],['large','Hungry · 10 oz']], p.portion, 'pref', 'data-k="portion"'))}
    ${row('Chicken', seg('Chicken', [['breast','Breast'],['thigh','Thighs']], chickenCut(), 'pref', 'data-k="chickenCut"'))}
    ${row('Heat', seg('Heat', [['mild','Mild'],['medium','Medium'],['hot','Hot']], p.heat, 'pref', 'data-k="heat"'))}
    ${row('Appearance', seg('Appearance', [['system','System'],['light','Light'],['dark','Dark']], p.theme, 'pref', 'data-k="theme"'))}
  </div>
  <section class="sec backup">
    <div class="sec-head"><h2 class="h2">Backup</h2><span class="muted">${S.lastBackup ? 'Last saved ' + fmtDay(S.lastBackup, true) : 'Never backed up'}</span></div>
    <p class="muted">Your lists live only on this phone. Save a backup to Files or send it to yourself.</p>
    <div class="btn-row"><button type="button" class="btn small primary" data-a="backup-save">Save backup</button>
      <label class="btn small" for="restore-file">Restore from file</label><input type="file" id="restore-file" class="visually-hidden" accept=".json,application/json,text/plain" data-a="restore-file">
      <button type="button" class="text-btn" data-a="restore-paste">Paste backup text</button></div>
  </section>
  <section class="sec"><div class="btn-row"><button type="button" class="btn small danger" data-a="reset-app">Reset everything</button></div></section>
  <p class="fine">No account, nothing sent anywhere.${offlineLine()}</p>`;
}
function offlineLine() {
  if (!window.__OFFLINE__) return '';
  const ready = 'serviceWorker' in navigator && navigator.serviceWorker.controller;
  return ready ? ' Saved for offline use: opens and works without a connection.' : ' Getting ready for offline use — open it once more while online.';
}
