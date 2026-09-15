'use strict';
/* =========================================================================
   Pantry — views
   ========================================================================= */

const ICON = {
  tonight:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/></svg>',
  meals:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z"/><path d="M9.5 8c0-1.3 1.2-1.4 1.2-2.8M14 8c0-1.3 1.2-1.4 1.2-2.8"/></svg>',
  sweet:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><path d="M4.8 10.2c1.8.8 2.6-.9 4.3 0M14.8 8.6c1.4.9 2.4-.6 4 .6"/></svg>',
  prep:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="9" width="16" height="10" rx="2"/><path d="M3 9h18M8.5 5.5h7M12 12.5v3"/></svg>',
  inventory:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6.5h10M10 12h10M10 17.5h10"/><path d="M3.8 6.4l1.3 1.3 2.2-2.4M3.8 11.9l1.3 1.3 2.2-2.4"/><circle cx="5.5" cy="17.5" r="1.2"/></svg>',
  gear:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>',
  back:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  star:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
  chev:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  close:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

const SHORT = { korean:'Korean', mexican:'Mexican', med:'Mediterranean', bbq:'BBQ', bread:'Banana bread', brownies:'Brownies', donuts:'Donuts', icecream:'Ice cream' };

/* ---------- Illustrations: bowls and dessert glyphs ---------- */
const FOODVAR = { rice:'--f-rice', beef:'--f-beef', chicken:'--f-chicken', broccoli:'--f-broc', lettuce:'--f-leaf', beans:'--f-bean', corn:'--f-corn', spinach:'--f-spinach', cucumber:'--f-cuc', tomato:'--f-tomato', potato:'--f-potato' };
function bowlSVG(r, size, carb) {
  const segs = r.bowl.map(([k, v]) => [k === 'rice' && carb === 'potato' ? 'potato' : k, v]);
  const cx = 50, cy = 50, R = 39;
  let a = -Math.PI / 2 - segs[0][1] * Math.PI;
  const paths = segs.map(([k, v]) => {
    const a2 = a + v * 2 * Math.PI;
    const x1 = cx + R * Math.cos(a), y1 = cy + R * Math.sin(a), x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);
    const d = `M${cx} ${cy}L${x1.toFixed(2)} ${y1.toFixed(2)}A${R} ${R} 0 ${v > 0.5 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}Z`;
    a = a2;
    return `<path d="${d}" fill="var(${FOODVAR[k]})" stroke="var(--bowl)" stroke-width="1.6"/>`;
  }).join('');
  const dots = [[44,44],[55,40],[50,55],[40,52],[58,50],[47,36],[62,43]];
  let garnish = '';
  if (r.garnish === 'greenonion') garnish = dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.1" fill="none" stroke="var(--f-scallion)" stroke-width="1.3"/>`).join('');
  if (r.garnish === 'salsa') garnish = dots.slice(0, 5).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="var(--f-tomato)"/>`).join('');
  if (r.garnish === 'yogurt') garnish = '<path d="M38 50c4-8 18-8 22 0s-10 10-14 4 4-9 8-5" fill="none" stroke="var(--f-yogurt)" stroke-width="3.2" stroke-linecap="round"/>';
  if (r.garnish === 'bbq') garnish = '<path d="M34 46l7 6 7-7 7 7 7-6 5 4" fill="none" stroke="var(--f-bbq)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';
  const label = r.name + ' illustration';
  return `<svg class="bowl" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="${esc(label)}"><circle cx="50" cy="50" r="48" fill="var(--bowl)" stroke="var(--line)" stroke-width="1"/>${paths}<circle cx="50" cy="50" r="${R}" fill="none" stroke="var(--bowl-rim)" stroke-width="1"/>${garnish}</svg>`;
}
function glyphSVG(r, size) {
  let body = '';
  if (r.glyph === 'loaf') body = '<path d="M16 46c0-14 16-20 34-20s34 6 34 20v26a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6z" fill="var(--f-bread)"/><path d="M22 44c6-9 50-9 56 0" fill="none" stroke="var(--f-crust)" stroke-width="3" stroke-linecap="round"/>' + [[34,56],[50,62],[64,52],[42,70],[70,66],[28,66],[56,44]].map(([x,y]) => `<rect x="${x}" y="${y}" width="5" height="5" rx="1.5" fill="var(--f-choc)"/>`).join('');
  if (r.glyph === 'brownie') body = '<rect x="18" y="18" width="64" height="64" rx="5" fill="var(--f-brownie)"/><path d="M39.3 18v64M60.7 18v64M18 39.3h64M18 60.7h64" stroke="var(--bowl)" stroke-width="2.2"/><path d="M24 26l6 3M46 24l5 4M67 27l6 2M26 48l5 3M50 46l4 4" stroke="var(--f-brownie-hi)" stroke-width="2" stroke-linecap="round"/>';
  if (r.glyph === 'donut') body = '<circle cx="50" cy="50" r="34" fill="var(--f-dough)"/><path d="M50 20c9 0 17 3 22 9 4 5 9 6 10 12 2 8-4 11-3 18-2 9-12 17-29 17s-27-8-29-17c1-7-5-10-3-18 1-6 6-7 10-12 5-6 13-9 22-9z" fill="var(--f-glaze)"/><circle cx="50" cy="50" r="11" fill="var(--bowl)" stroke="var(--f-dough)" stroke-width="3"/>' + [[34,34,20],[64,32,-30],[70,58,40],[32,62,-20],[52,72,10]].map(([x,y,t]) => `<rect x="${x}" y="${y}" width="7" height="2.4" rx="1.2" transform="rotate(${t} ${x} ${y})" fill="var(--bowl)" opacity=".8"/>`).join('');
  if (r.glyph === 'scoop') body = '<circle cx="38" cy="46" r="17" fill="var(--f-cream)"/><circle cx="60" cy="42" r="17" fill="var(--f-cream-2)"/><path d="M16 56h68l-7 20a6 6 0 0 1-5.6 4H28.6a6 6 0 0 1-5.6-4z" fill="var(--f-cup)"/>';
  return `<svg class="glyph" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="${esc(r.name)} illustration">${body}</svg>`;
}
function artFor(r, size, carb) { return r.type === 'dinner' ? bowlSVG(r, size, carb) : glyphSVG(r, size); }

/* ---------- Components ---------- */
function seg(label, options, value, act, extra = '') {
  return `<div class="seg" role="radiogroup" aria-label="${esc(label)}">${options.map(([v, t]) =>
    `<button type="button" role="radio" aria-checked="${String(v) === String(value)}" data-a="${act}" data-v="${esc(v)}" ${extra}>${t}</button>`).join('')}</div>`;
}
function stockBadge(st, via, primary) {
  if (!S.prefs.trackInventory) return '';
  const alt = via && primary && via !== primary ? ' · using ' + esc(lcName({ id: via })) : '';
  if (st === 'in') return `<span class="stock in"><i aria-hidden="true">●</i> In stock${alt}</span>`;
  if (st === 'low') return `<span class="stock low"><i aria-hidden="true">◐</i> Low${alt}</span>`;
  return `<span class="stock out"><i aria-hidden="true">○</i> Need to buy</span>`;
}
function favBtn(id, name) {
  const on = isFav(id);
  return `<button type="button" class="icon-btn fav${on ? ' on' : ''}" data-a="fav" data-id="${id}" aria-pressed="${on}" aria-label="${on ? 'Remove ' + esc(name) + ' from favorites' : 'Add ' + esc(name) + ' to favorites'}">${ICON.star}</button>`;
}
function backLink(href, label) { return `<a class="back" href="${href}">${ICON.back}<span>${label}</span></a>`; }
function section(title, body, opts = {}) {
  const id = opts.id ? ` id="${opts.id}"` : '';
  if (opts.collapsible) return `<details class="sec" data-d="${esc(opts.id || title)}"${id}${opts.open ? ' open' : ''}><summary><h2 class="h2">${title}</h2>${opts.aside ? `<span class="sum-aside">${opts.aside}</span>` : ''}</summary><div class="sec-body">${body}</div></details>`;
  return `<section class="sec"${id}><div class="sec-head"><h2 class="h2">${title}</h2>${opts.aside || ''}</div><div class="sec-body">${body}</div></section>`;
}
function emptyState(title, text, btn) {
  return `<div class="empty"><p class="empty-title">${title}</p>${text ? `<p class="muted">${text}</p>` : ''}${btn || ''}</div>`;
}

function statCells(cells) {
  return `<dl class="stats">${cells.map(([k, v, u]) => `<div><dt>${k}</dt><dd><span class="num">${v}</span>${u ? `<span class="unit">${u}</span>` : ''}</dd></div>`).join('')}</dl>`;
}
function dinnerStats(nu, tm, compact) {
  if (compact || !S.prefs.nutritionProminent) {
    return `<p class="stat-line mono">~${roundKcal(nu.kcal)} kcal · ${roundG(nu.protein)} g protein · prep ${tm.prep} · cook ${tm.cook} · ${tm.total} min total</p>`;
  }
  return statCells([
    ['Calories', '~' + roundKcal(nu.kcal), ''], ['Protein', roundG(nu.protein), 'g'], ['Carbs', roundG(nu.carbs), 'g'], ['Fat', roundG(nu.fat), 'g'],
    ['Fiber', roundG(nu.fiber), 'g'], ['Prep', tm.prep, 'min'], ['Cook', tm.cook, 'min'], ['Total', tm.total, 'min'],
  ]);
}
function microTable(nu) {
  const rows = [
    ['Sodium', Math.round(nu.sodium / 10) * 10, 'mg', 'sodium'], ['Potassium', Math.round(nu.potassium / 10) * 10, 'mg', 'potassium'],
    ['Calcium', Math.round(nu.calcium / 10) * 10, 'mg', 'calcium'], ['Iron', Math.round(nu.iron * 10) / 10, 'mg', 'iron'],
    ['Vitamin A', Math.round(nu.vitA / 10) * 10, 'mcg', 'vitA'], ['Vitamin C', Math.round(nu.vitC), 'mg', 'vitC'],
    ['Vitamin D', Math.round(nu.vitD * 10) / 10, 'mcg', 'vitD'], ['Magnesium', Math.round(nu.magnesium / 5) * 5, 'mg', 'magnesium'],
  ];
  return `<table class="micro"><thead><tr><th scope="col">Nutrient</th><th scope="col">Amount</th><th scope="col">% label DV</th></tr></thead><tbody>${rows.map(([n, v, u, k]) =>
    `<tr><th scope="row">${n}</th><td class="mono">~${v} ${u}</td><td class="mono">${Math.round(nu[k] / DV[k] * 100)}%</td></tr>`).join('')}</tbody></table>
    <p class="fine">Approximate, calculated from standard ingredient values. Brands vary. Daily Values are the standard label reference, shown for context only.</p>`;
}

function ingredientList(c, rid, prefix = '') {
  const checks = S.checks[rid] || {};
  const groups = [];
  const byGroup = {};
  c.ings.forEach(i => {
    const g = i.extra ? (i.extra === 'Heat' ? 'Heat' : i.extra === 'Glaze' ? 'Glaze' : i.extra === 'Better' || i.extra === 'Loaded' ? 'Make it better' : i.extra) : (i.group || 'Main');
    if (!byGroup[g]) { byGroup[g] = []; groups.push(g); }
    byGroup[g].push(i);
  });
  return groups.map(g => `<div class="ing-group">${g !== 'Main' ? `<h3 class="h3">${esc(g)}</h3>` : ''}<ul class="ings">${byGroup[g].map(i => {
    const a = avail(i);
    const id = `${prefix}chk-${rid}-${i.key}-${i.extra || 'b'}`.replace(/[^a-zA-Z0-9-]/g, '');
    const note = i.note ? fill(i.note, c) : '';
    const tag = i.extra && !['Heat','Glaze'].includes(i.extra) ? `<span class="tag">${esc(i.extra)}</span>` : '';
    return `<li class="ing"><input type="checkbox" id="${id}" data-a="check" data-rid="${rid}" data-key="${esc(i.key + (i.extra || ''))}" ${checks[i.key + (i.extra || '')] ? 'checked' : ''}>
      <label for="${id}"><span class="ing-name">${esc(i.name || itemName(i.id))}${tag}</span>${note ? `<span class="ing-note">${esc(note)}</span>` : ''}${stockBadge(a.st, a.via, (i.any || [i.id])[0])}</label>
      <span class="ing-amt mono">${esc(fmtQ(i.sq, i.u))}</span></li>`;
  }).join('')}</ul></div>`).join('');
}

function timelineList(sch, opts = {}) {
  return `<ol class="timeline">${sch.items.map(({ s, t }) => `<li><span class="t mono">${fmtClock(t)}</span><span class="tl-body"><span class="tl-title">${esc(s.title)}</span>${opts.detail && s.text ? `<span class="tl-text">${esc(s.text)}</span>` : ''}</span></li>`).join('')}</ol>`;
}

function bullets(list) { return `<ul class="bullets">${list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`; }

/* ---------- TONIGHT ---------- */
function viewTonight() {
  const rid = recommendTonight();
  const r = RECIPE[rid];
  const c = build(r);
  const nu = nutrition(c);
  const tm = times(c);
  const now = new Date();
  const main = c.ings.filter(i => !i.extra && ['protein','carb','veg'].includes(i.role)).slice(0, 4)
    .slice(0, 3).map(i => `${fmtQ(i.sq, i.u)} ${lcName({ id:i.id })}`);
  const good = S.containers.filter(ct => containerState(ct) === 'good');
  const frozen = S.containers.filter(ct => ct.frozen);
  let banners = '';
  if (S.cook && RECIPE[S.cook.rid]) {
    const cr = RECIPE[S.cook.rid];
    banners += `<button type="button" class="banner" data-a="resume"><span><strong>Resume ${esc(cr.short)}</strong><span class="muted"> · step ${S.cook.i || 1}</span></span>${ICON.chev}</button>`;
  }
  if (good.length) {
    const names = [...new Set(good.map(ct => RECIPE[ct.rid].short))].join(', ');
    banners += `<a class="banner ready" href="#/nocook"><span><strong>${good.length} prepped ${good.length > 1 ? 'dinners' : 'dinner'} ready</strong><span class="muted"> · ${esc(names)} · heat one in 3 min</span></span>${ICON.chev}</a>`;
  } else if (frozen.length) {
    banners += `<a class="banner" href="#/prep/portion"><span><strong>${frozen.length} in the freezer</strong><span class="muted"> · move one to the fridge tonight for tomorrow</span></span>${ICON.chev}</a>`;
  }
  const desserts = [...DESSERTS].sort((a, b) => (S.prefs.dessert === b.id) - (S.prefs.dessert === a.id) || isFav(b.id) - isFav(a.id));
  const sweet = desserts.map(d => {
    const dc = build(d, { tier:'base' });
    const dn = nutrition(dc);
    const dt = times(dc);
    return `<li class="drow"><a class="drow-main" href="#/sweet/${d.id}">${glyphSVG(d, 40)}<span><span class="drow-name">${esc(d.short)}</span><span class="meta mono">${roundKcal(dn.kcal)} kcal · ${roundG(dn.protein)} g protein · ${d.bakes ? fmtDur(dt.active + dt.bake) : fmtDur(dt.total)}</span></span></a><a class="btn small" href="#/sweet/${d.id}" aria-label="Make ${esc(d.short)}">Make it</a></li>`;
  }).join('');

  // Kitchen check: tonight's core ingredients plus the two dessert workhorses.
  const checkIds = [];
  const checkRows = [];
  c.ings.filter(i => !i.extra && (i.core || i.role === 'veg')).forEach(i => {
    const a = avail(i);
    if (checkIds.includes(a.via) || checkRows.length >= 5) return;
    checkIds.push(a.via);
    checkRows.push([niceName(a.via), a.st, ITEM[a.via] && ITEM[a.via].prepped]);
  });
  ['yogurt','bananas'].forEach(id => { if (!checkIds.includes(id) && checkRows.length < 7) { checkIds.push(id); checkRows.push([niceName(id), inv(id), false]); } });
  const words = { in:'stocked', low:'low', out:'missing' };
  const kitchen = S.prefs.trackInventory ? `<ul class="kcheck">${checkRows.map(([n, st, prepped]) =>
    `<li><span class="kc-name">${esc(n)}</span><span class="stock ${st}"><i aria-hidden="true">${st === 'in' ? '●' : st === 'low' ? '◐' : '○'}</i> ${prepped && st !== 'out' ? 'prepped' : words[st]}</span></li>`).join('')}</ul>
    <a class="link-row" href="#/inventory">Inventory ${ICON.chev}</a>` : `<p class="muted">Inventory tracking is off. Turn it on in <a href="#/settings">Settings</a>.</p>`;

  const wk = weekSummary();
  const weekRow = wk.home || wk.prepared || wk.desserts
    ? `<a class="link-row" href="#/week"><span><strong>This week</strong> <span class="muted">${wk.home} ${wk.home === 1 ? 'meal' : 'meals'} at home${wk.avgProtein ? ' · ' + wk.avgProtein + ' g avg protein' : ''}</span></span>${ICON.chev}</a>`
    : `<a class="link-row" href="#/week"><span><strong>This week</strong> <span class="muted">Nothing logged yet</span></span>${ICON.chev}</a>`;

  const rd = bestReadiness(r);
  const rl = readyLabel(rd);
  return `
  <header class="top">
    <p class="eyebrow">${now.toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' })}</p>
    <a class="icon-btn" href="#/settings" aria-label="Settings">${ICON.gear}</a>
  </header>
  ${banners ? `<div class="banners">${banners}</div>` : ''}
  <h1 class="display">What are we eating tonight?</h1>
  <article class="hero" aria-labelledby="hero-name">
    <div class="hero-top">
      ${bowlSVG(r, 92, c.carb)}
      <div class="hero-title">
        <p class="kicker">${esc(r.difficulty)} · ${esc(amountLabel(c))}${isFav(r.id) ? ' · <span class="fav-mark">Favorite</span>' : ''}</p>
        <h2 id="hero-name" class="hero-name"><a href="#/meal/${r.id}">${esc(r.name)}</a></h2>
        ${rl.text ? `<p class="ready-line ${rl.cls}">${esc(rl.text)}</p>` : ''}
      </div>
    </div>
    <p class="portion mono">${esc(main.join(' · '))}</p>
    ${dinnerStats(nu, tm)}
    <p class="fine">Approximate nutrition, per serving.</p>
    <div class="hero-actions">
      <button type="button" class="btn primary xl" data-a="start-cook" data-id="${r.id}">Start cooking</button>
      <div class="pair">
        <button type="button" class="btn" data-a="switch">Switch meal</button>
        <a class="btn" href="#/nocook">I don’t want to cook</a>
      </div>
      <button type="button" class="text-btn" data-a="surprise">Surprise me</button>
    </div>
  </article>

  ${section('Want something sweet?', `<ul class="drows">${sweet}</ul><button type="button" class="text-btn" data-a="surprise-dessert">Surprise dessert</button>`)}
  ${section('Kitchen check', kitchen)}
  <div class="sec">${weekRow}</div>`;
}

function sheetSwitch() {
  const cur = recommendTonight();
  return `<div class="sheet-inner">
    <div class="sheet-head"><h2 class="h2" id="sheet-title">Switch tonight’s dinner</h2><button type="button" class="icon-btn" data-a="close-sheet" aria-label="Close">${ICON.close}</button></div>
    <ul class="pick">${DINNERS.map(r => {
      const rd = bestReadiness(r);
      const rl = readyLabel(rd);
      const c = build(r);
      const nu = nutrition(c), tm = times(c);
      return `<li><button type="button" class="pick-row${r.id === cur ? ' current' : ''}" data-a="pick-meal" data-id="${r.id}" ${r.id === cur ? 'aria-current="true"' : ''}>
        ${bowlSVG(r, 52, c.carb)}<span class="pick-body"><span class="pick-name">${esc(r.name)}${isFav(r.id) ? ' <span class="fav-mark">★</span>' : ''}</span>
        <span class="meta mono">~${roundKcal(nu.kcal)} kcal · ${roundG(nu.protein)} g protein · ${tm.total} min</span>
        ${rl.text ? `<span class="ready-line ${rl.cls}">${esc(rl.text)}</span>` : ''}</span>
        ${r.id === cur ? '<span class="tag">Tonight</span>' : ''}</button></li>`;
    }).join('')}</ul>
    <button type="button" class="btn wide" data-a="surprise">Surprise me</button>
  </div>`;
}

/* ---------- Recipe page pieces ---------- */
function fmtHM(min) { return Math.floor(min / 60) + ':' + String(Math.round(min % 60)).padStart(2, '0'); }
function macroRow(nu, minutes) {
  const cells = [['Calories', '~' + roundKcal(nu.kcal), ''], ['Protein', roundG(nu.protein), 'g'], ['Carbs', roundG(nu.carbs), 'g'], ['Fat', roundG(nu.fat), 'g'],
    ['Time', minutes < 60 ? minutes : fmtHM(minutes), minutes < 60 ? 'min' : 'hr']];
  return `<dl class="macros">${cells.map(([k, v, u]) => `<div><dt>${k}</dt><dd><span class="num">${v}</span>${u ? `<span class="unit">${u}</span>` : ''}</dd></div>`).join('')}</dl>`;
}
function nutritionDetails(nu) {
  return `<details class="more" data-d="full-nutrition"><summary>Full nutrition</summary>
    <p class="detail-line">Fiber <span class="mono">~${roundG(nu.fiber)} g</span></p>${microTable(nu)}</details>`;
}
function recipeTab(rid, tabs) {
  const saved = (S.ui.rtabs || {})[rid];
  return tabs.some(([k]) => k === saved) ? saved : tabs[0][0];
}
function recipeTabs(rid, tabs, current) {
  return `<div class="rtabs" role="tablist" aria-label="Recipe sections">${tabs.map(([k, l]) =>
    `<button type="button" role="tab" id="rtab-${k}" aria-selected="${k === current}" aria-controls="rpanel" data-a="rtab" data-rid="${rid}" data-v="${k}">${l}</button>`).join('')}</div>`;
}
function tierBlock(r, o, id) {
  return `<h3 class="h3 first">Flavor level</h3>${seg('Flavor level', [['base','Base'],['better','Better'],['loaded','Loaded']], o.tier, 'opt', `data-rid="${id}" data-k="tier"`)}
    <dl class="tiers">${['base','better','loaded'].map(t => `<div class="${t === o.tier ? 'on' : ''}"><dt>${t[0].toUpperCase() + t.slice(1)}</dt><dd>${esc(r.tiers[t].text)}</dd></div>`).join('')}</dl>`;
}
function missingButtons(id) {
  const anyChecked = Object.values(S.checks[id] || {}).some(Boolean);
  return `<div class="btn-row">${S.prefs.trackInventory ? `<button type="button" class="btn small" data-a="recipe-missing" data-id="${id}">Add missing to shopping list</button>` : ''}${anyChecked ? `<button type="button" class="text-btn" data-a="clear-checks" data-id="${id}">Clear checks</button>` : ''}</div>`;
}

/* ---------- MEALS ---------- */
function viewMeals() {
  const rows = DINNERS.map(r => {
    const c = build(r);
    const nu = nutrition(c), tm = times(c);
    const rl = readyLabel(bestReadiness(r));
    return `<li class="mrow"><a class="mrow-main" href="#/meal/${r.id}">${bowlSVG(r, 56, c.carb)}<span class="mrow-body">
      <span class="mrow-name">${esc(r.name)}</span>
      <span class="meta">~${roundKcal(nu.kcal)} kcal · ${roundG(nu.protein)} g protein · ${tm.total} min</span>
      ${rl.text ? `<span class="ready-line ${rl.cls}">${esc(rl.text)}</span>` : ''}</span></a>${favBtn(r.id, r.name)}</li>`;
  }).join('');
  return `
  <header class="page-head"><h1 class="h1">Meals</h1><button type="button" class="btn small" data-a="surprise-go">Surprise me</button></header>
  <ul class="mrows">${rows}</ul>`;
}

function viewMeal(id) {
  const r = RECIPE[id];
  if (!r || r.type !== 'dinner') return emptyState('That meal isn’t here.', '', '<a class="btn" href="#/meals">See all meals</a>');
  const o = getOpts(r);
  const c = build(r);
  const nu = nutrition(c);
  const tm = times(c);
  const TABS = [['ingredients','Ingredients'],['steps','Steps'],['extras','Extras'],['leftovers','Leftovers']];
  const tab = recipeTab(id, TABS);

  const protName = r.protein === 'beef' ? 'ground beef' : o.cut === 'thigh' ? 'chicken thighs' : 'chicken breast';
  const dispAmt = o.amountUnit === 'lb' ? String(Math.round(o.amountOz / 16 * 100) / 100) : String(Math.round(o.amountOz * 10) / 10);
  const amountBox = o.mode !== 'amount' ? '' : `<div class="amount-box">
      <label class="opt-label" for="amount-${id}">How much ${protName} do you have?</label>
      <div class="amount-row"><input id="amount-${id}" class="amount-input mono" type="number" inputmode="decimal" min="0" step="any" value="${dispAmt}" data-a="amount-num" data-rid="${id}">
        ${seg('Unit', [['lb','lb'],['oz','oz']], o.amountUnit, 'opt', `data-rid="${id}" data-k="amountUnit"`)}</div>
      <div class="chips">${[[8,'½ lb'],[16,'1 lb'],[24,'1½ lb'],[32,'2 lb']].map(([oz, l]) => `<button type="button" class="chip" aria-pressed="${Math.abs(o.amountOz - oz) < 0.01}" data-a="amount-preset" data-rid="${id}" data-v="${oz}">${l}</button>`).join('')}</div>
      <span class="opt-label">Split into</span>
      ${seg('Plates', [[1,'1 plate'],[2,'2'],[3,'3'],[4,'4']], c.plates, 'opt', `data-rid="${id}" data-k="plates"`)}
      <p class="fine">About ${fmtNum(c.scaleN, [0, 0.25, 0.5, 0.75, 1])} standard ${c.scaleN > 1.12 ? 'servings' : 'serving'} of everything. Every ingredient below is scaled to your ${fmtQ(o.amountOz, 'oz')}.</p>
    </div>`;
  const visibleOpts = [
    `<div class="opt"><span class="opt-label">Servings</span>${seg('Servings', [[1,'1'],[2,'2'],[4,'4'],[6,'6'],['amount','I have…']], o.mode === 'amount' ? 'amount' : o.servings, 'opt', `data-rid="${id}" data-k="servings"`)}${amountBox}</div>`,
    r.hasCut ? `<div class="opt"><span class="opt-label">Chicken</span>${seg('Chicken', [['breast','Breast'],['thigh','Thighs']], o.cut, 'opt', `data-rid="${id}" data-k="cut"`)}</div>` : '',
    r.hasCarbChoice ? `<div class="opt"><span class="opt-label">Carb</span>${seg('Carb', [['rice','Rice'],['potato','Potatoes']], o.carb, 'opt', `data-rid="${id}" data-k="carb"`)}</div>` : '',
    r.hasSauceChoice ? `<div class="opt"><span class="opt-label">BBQ sauce</span>${seg('BBQ sauce', [['regular','Regular'],['smoky','Smoky'],['spicy','Spicy']], o.sauce, 'opt', `data-rid="${id}" data-k="sauce"`)}</div>` : '',
  ].join('');
  const moreOpts = `<details class="more more-opts" data-d="opts"><summary>More options</summary><div class="opts">
    ${o.carb === 'rice' ? `<div class="opt"><span class="opt-label">Rice</span>${seg('Rice', [['fresh','Cook fresh'],['ready','Already cooked']], o.rice, 'opt', `data-rid="${id}" data-k="rice"`)}</div>` : ''}
    <div class="opt"><span class="opt-label">Portion</span>${seg('Portion', [['standard','Standard · 8 oz'],['large','Hungry · 10 oz']], S.prefs.portion, 'pref', 'data-k="portion"')}</div>
  </div></details>`;

  let panel;
  if (tab === 'ingredients') {
    panel = ingredientList(c, id) + missingButtons(id);
  } else if (tab === 'steps') {
    panel = `<p class="summary">Prep ${tm.prep} min · Cook ${tm.cook} min · <strong>${tm.total} min total</strong></p>
      <details class="more" data-d="equipment"><summary>Equipment</summary>${bullets(r.equipment)}</details>
      <details class="more" data-d="getout"><summary>What to get out</summary>${bullets(r.mise)}</details>
      <h3 class="h3">Timeline</h3>${timelineList(tm.sch)}
      <h3 class="h3">Finish</h3><p class="body-text">${esc(r.finish)}</p>`;
  } else if (tab === 'extras') {
    panel = tierBlock(r, o, id) + `<h3 class="h3">Swaps</h3>${bullets(r.subs)}` + nutritionDetails(nu);
  } else {
    const lo = r.leftovers;
    panel = `<h3 class="h3 first">If you’re not finishing it</h3>${bullets(lo.separate)}
      <h3 class="h3">Storage</h3>${bullets(lo.storage)}
      <h3 class="h3">Reheating</h3>${bullets(lo.reheat)}
      <h3 class="h3">Make it taste fresh</h3>${bullets(lo.fresh)}`;
  }

  return `
  ${backLink('#/meals', 'Meals')}
  <header class="rhead">
    <div class="rhead-top">${bowlSVG(r, 72, c.carb)}<div class="rhead-title"><h1 class="h1">${esc(r.name)}</h1></div>${favBtn(r.id, r.name)}</div>
    ${macroRow(nu, tm.total)}
    <p class="fine">${o.mode === 'amount' ? 'Per plate (' + esc(amountLabel(c)) + ')' : 'Per serving'}, approximate${o.tier !== 'base' ? ', with ' + o.tier + ' toppings' : ''}.</p>
  </header>
  <div class="opts">${visibleOpts}</div>
  ${moreOpts}
  ${recipeTabs(id, TABS, tab)}
  <div class="rpanel" id="rpanel" role="tabpanel" aria-labelledby="rtab-${tab}">${panel}</div>
  <div class="cta-bar"><button type="button" class="btn primary xl" data-a="start-cook" data-id="${id}">Start cooking</button></div>`;
}

/* ---------- SWEET ---------- */
function viewSweet() {
  const rows = DESSERTS.map(r => {
    const c = build(r, { tier:'base' });
    const nu = nutrition(c), tm = times(c);
    const rl = readyLabel(bestReadiness(r));
    return `<li class="mrow"><a class="mrow-main" href="#/sweet/${r.id}">${glyphSVG(r, 52)}<span class="mrow-body">
      <span class="mrow-name">${esc(r.name)}</span>
      <span class="meta">~${roundKcal(nu.kcal)} kcal · ${roundG(nu.protein)} g protein · ${r.bakes ? fmtDur(tm.active + tm.bake) : fmtDur(tm.total)}</span>
      ${rl.text ? `<span class="ready-line ${rl.cls}">${esc(rl.text)}</span>` : ''}</span></a>${favBtn(r.id, r.name)}</li>`;
  }).join('');
  return `
  <header class="page-head"><h1 class="h1">Sweet</h1><button type="button" class="btn small" data-a="surprise-dessert">Surprise me</button></header>
  <ul class="mrows">${rows}</ul>`;
}

function viewDessert(id) {
  const r = RECIPE[id];
  if (!r || r.type !== 'dessert') return emptyState('That dessert isn’t here.', '', '<a class="btn" href="#/sweet">See desserts</a>');
  const o = getOpts(r);
  const c = build(r);
  const nu = nutrition(c);
  const tm = times(c);
  const TABS = [['ingredients','Ingredients'],['steps','Steps'],['extras','Extras'],['storage','Storage']];
  const tab = recipeTab(id, TABS);

  const optRows = [
    `<div class="opt"><span class="opt-label">Make</span>${seg('Batch size', r.yields.map(y => [y.id, y.label]), o.yield, 'opt', `data-rid="${id}" data-k="yield"`)}</div>`,
    r.variations ? `<div class="opt"><span class="opt-label">Version</span><div class="chips" role="radiogroup" aria-label="Version">${r.variations.map(v => `<button type="button" role="radio" class="chip" aria-checked="${v.id === o.variation}" data-a="opt" data-rid="${id}" data-k="variation" data-v="${v.id}">${esc(v.label)}</button>`).join('')}</div></div>` : '',
    r.glazes ? `<div class="opt"><span class="opt-label">Glaze</span><div class="chips" role="radiogroup" aria-label="Glaze">${r.glazes.map(g => `<button type="button" role="radio" class="chip" aria-checked="${g.id === o.glaze}" data-a="opt" data-rid="${id}" data-k="glaze" data-v="${g.id}">${esc(g.label)}</button>`).join('')}</div></div>` : '',
  ].join('');

  let panel;
  if (tab === 'ingredients') {
    panel = ingredientList(c, id) + missingButtons(id);
  } else if (tab === 'steps') {
    const pn = r.prepNotes;
    panel = `<h3 class="h3 first">Before you start</h3><dl class="kv">
        ${r.bakes ? `<div><dt>Oven</dt><dd>${esc(pn.temp)}</dd></div>` : ''}
        ${c.y.pan ? `<div><dt>Pan</dt><dd>${esc(c.y.pan)}</dd></div>` : ''}
        <div><dt>${r.bakes ? 'Parchment / spray' : 'To store'}</dt><dd>${esc(pn.lining)}</dd></div>
        <div><dt>Tools</dt><dd>${esc(pn.tools.join(', '))}</dd></div>
        ${r.ahead ? `<div><dt>Ahead</dt><dd>${esc(r.ahead)}</dd></div>` : ''}</dl>
      <h3 class="h3">Method</h3>
      <ol class="steps">${tm.steps.map(s => `<li><span class="st-title">${esc(s.title)}</span><span class="st-text">${esc(fill(s.text, c))}</span>${s.warn ? `<span class="callout warn"><strong>Heads up</strong> ${esc(s.warn)}</span>` : ''}</li>`).join('')}</ol>
      <p class="fine">${r.bakes ? `About ${tm.active} min hands-on and ${tm.bake} min in the oven; ${fmtDur(tm.total)} including cooling.` : `About ${tm.total} minutes, once the bananas are frozen.`}</p>
      ${r.trouble ? `<h3 class="h3">Texture troubleshooting</h3><dl class="kv">${r.trouble.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}`;
  } else if (tab === 'extras') {
    panel = tierBlock(r, o, id)
      + (r.variations ? `<h3 class="h3">Versions</h3><dl class="kv">${r.variations.map(v => `<div><dt>${esc(v.label)}</dt><dd>${esc(v.how)}</dd></div>`).join('')}</dl>` : '')
      + `<h3 class="h3">Swaps</h3>${bullets(r.subs)}` + nutritionDetails(nu);
  } else {
    const st = r.storage;
    panel = `<dl class="kv"><div><dt>Counter</dt><dd>${esc(st.room)}</dd></div><div><dt>Fridge</dt><dd>${esc(st.fridge)}</dd></div><div><dt>Freezer</dt><dd>${esc(st.freezer)}</dd></div><div><dt>${r.bakes ? 'Reheat' : 'Soften'}</dt><dd>${esc(st.reheat)}</dd></div></dl>`;
  }

  return `
  ${backLink('#/sweet', 'Sweet')}
  <header class="rhead">
    <div class="rhead-top">${glyphSVG(r, 64)}<div class="rhead-title"><h1 class="h1">${esc(r.name)}</h1></div>${favBtn(r.id, r.name)}</div>
    ${macroRow(nu, r.bakes ? tm.active + tm.bake : tm.total)}
    <p class="fine">Per ${c.y.unit}, approximate${r.glazes && c.g && c.g.id !== 'none' ? ', with glaze' : ''}${r.bakes ? '. Time is hands-on plus baking; cooling is extra' : ''}.</p>
  </header>
  <div class="opts">${optRows}</div>
  ${recipeTabs(id, TABS, tab)}
  <div class="rpanel" id="rpanel" role="tabpanel" aria-labelledby="rtab-${tab}">${panel}</div>
  <div class="cta-bar"><button type="button" class="btn primary xl" data-a="start-cook" data-id="${id}">Make it</button></div>`;
}

/* ---------- PREP ---------- */
function checkTask(t, time, doneMap, act) {
  const id = 'task-' + t.id;
  const done = !!doneMap[t.id];
  return `<li class="task${done ? ' done' : ''}"><input type="checkbox" id="${id}" data-a="${act}" data-id="${t.id}" ${done ? 'checked' : ''}>
    <label for="${id}"><span class="t mono">${fmtClock(time)}</span><span class="task-body"><span class="task-title">${esc(t.title)}</span><span class="task-text">${esc(t.text)}</span>${t.warn ? `<span class="callout warn"><strong>Heads up</strong> ${esc(t.warn)}</span>` : ''}${t.safety ? `<span class="callout safe"><strong>Food safety</strong> ${esc(t.safety)}</span>` : ''}</span><span class="done-word" aria-hidden="true">${done ? 'Done' : ''}</span></label>
    ${t.rid ? `<a class="text-btn task-link" href="#/sweet/${t.rid}">Open ${esc(RECIPE[t.rid].short)}</a>` : ''}</li>`;
}
function stepper(label, value, act, attrs, display) {
  return `<div class="stepper" role="group" aria-label="${esc(label)}"><button type="button" data-a="${act}" data-d="-1" ${attrs} aria-label="Less ${esc(label)}">−</button><output class="mono" aria-live="polite">${display != null ? display : value}</output><button type="button" data-a="${act}" data-d="1" ${attrs} aria-label="More ${esc(label)}">+</button></div>`;
}

function viewPrep(tab) {
  tab = ['dinners','ingredients','bake','portion'].includes(tab) ? tab : (S.ui.prepTab || 'dinners');
  S.ui.prepTab = tab;
  const tabs = [['dinners','Dinners'],['ingredients','Ingredients'],['bake','Bake'],['portion','Portion']];
  const nav = `<nav class="tabs" aria-label="Prep sections">${tabs.map(([k, l]) => `<a href="#/prep/${k}" ${k === tab ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;
  const body = tab === 'dinners' ? prepDinners() : tab === 'ingredients' ? prepComponents() : tab === 'bake' ? prepBake() : prepPortion();
  return `${backLink('#/settings', 'Settings')}<header class="page-head"><h1 class="h1">Meal prep</h1></header>${nav}${body}`;
}

function prepDinners() {
  const n = prepCount();
  const split = prepSplit();
  const plan = prepTasks(split);
  const d = S.prep.days;
  const days = seg('Prep for', [[2,'2 days'],[4,'4 days'],[7,'1 week'],['custom','Custom']], d, 'prep-days');
  const custom = d === 'custom' ? `<div class="opt"><span class="opt-label">Dinners</span>${stepper('dinners', n, 'prep-custom', '')}</div>` : '';
  const splitRows = DINNERS.map(r => `<li class="split-row">${bowlSVG(r, 36, getOpts(r).carb)}<span class="split-name">${esc(r.short)}</span>${stepper(r.short + ' portions', split[r.id], 'split', `data-id="${r.id}"`)}</li>`).join('');
  const hands = sum(plan.tasks.map(t => t.hands || 0));
  // Quantities grouped by role.
  const groups = [['protein','Protein'],['carb','Carbs'],['veg','Vegetables'],['flavor','Sauces & seasoning']];
  const roleGroup = e => ['protein','carb','veg'].includes(e.role) ? e.role : 'flavor';
  const entries = Object.values(plan.agg);
  const qty = groups.map(([g, label]) => {
    const rows = entries.filter(e => roleGroup(e) === g);
    if (!rows.length) return '';
    const open = g === 'flavor' ? `<details class="more qty-more" data-d="prep-flavor"><summary>${label} · ${rows.length} items${S.prefs.trackInventory && rows.some(e => e.st !== 'in') ? ', ' + rows.filter(e => e.st !== 'in').length + ' to buy' : ''}</summary>` : `<h3 class="h3">${label}</h3>`;
    return open + `<ul class="qty">${rows.map(e => {
      const it = ITEM[e.id];
      let use = fmtAggUse(e);
      if (e.id === 'rice') use = fmtQ(e.vol / 48 / 3, 'cup') + ' dry → ' + fmtQ(e.vol / 48, 'cup') + ' cooked';
      if (e.id === 'chicken' || e.id === 'beef') use = fmtQ(e.wt, 'oz') + ' raw';
      const buy = fmtBuy(e.id, e.g);
      return `<li><span class="q-name">${esc(it ? it.name : e.id)}</span><span class="q-use mono">${esc(use)}</span>${S.prefs.trackInventory ? stockBadge(e.st) : ''}${buy && e.st !== 'in' && buy !== use ? `<span class="q-buy">Buy ${esc(buy)}</span>` : ''}</li>`;
    }).join('')}</ul>` + (g === 'flavor' ? '</details>' : '');
  }).join('');
  const done = plan.tasks.filter(t => S.prep.done[t.id]).length;
  const tasks = `<p class="progress-line"><span class="mono">${done} of ${plan.tasks.length}</span> done${done ? ` · <button type="button" class="text-btn" data-a="prep-reset">Reset</button>` : ''}</p>
    <ol class="tasks">${plan.sch.items.map(({ s, t }) => checkTask(s, t, S.prep.done, 'prep-done')).join('')}</ol>`;
  return `
  ${section('What are you prepping for?', days + custom + `<p class="summary"><strong>${n} ${n > 1 ? 'dinners' : 'dinner'}</strong> · about ${fmtDur(plan.sch.total)} start to finish · ${hands} min hands-on</p>`)}
  ${section('Which dinners', `<ul class="split">${splitRows}</ul><p class="fine">Changing these updates every quantity below.</p>`)}
  ${section('What you need', qty + (S.prefs.trackInventory ? `<div class="btn-row"><button type="button" class="btn small" data-a="prep-missing">Add missing to shopping list</button></div>` : ''))}
  ${n > FRIDGE_SLOTS ? `<p class="callout safe"><strong>Food safety</strong> Cooked meals keep 3–4 days in the fridge. Containers ${FRIDGE_SLOTS + 1} and up go straight into the freezer; move one to the fridge the night before.</p>` : ''}
  ${section('Prep timeline', tasks)}
  <a class="btn wide" href="#/prep/portion">Portion your meals ${ICON.chev}</a>`;
}

function prepComponents() {
  const cp = S.prep.comp;
  const plan = componentTasks();
  const rows = [
    ['rice', 'Jasmine rice', cp.rice, fmtQ(cp.rice, 'cup') + ' dry'],
    ['chicken', 'Chicken', cp.chicken, fmtNum(cp.chicken) + ' lb'],
    ['beef', 'Ground beef', cp.beef, fmtNum(cp.beef) + ' lb'],
    ['broccoli', 'Broccoli', cp.broccoli, fmtQ(cp.broccoli, 'cup')],
  ].map(([k, label, v, disp]) => `<li class="split-row"><span class="split-name">${label}</span>${stepper(label, v, 'comp', `data-k="${k}"`, (v > 0 ? disp : 'none'))}</li>`).join('');
  const done = plan.tasks.filter(t => S.prep.compDone[t.id]).length;
  const prepped = ['p_rice','p_chicken','p_beef'].filter(id => inv(id) !== 'out' && S.prefs.trackInventory);
  const status = prepped.length ? `<ul class="kcheck">${prepped.map(id => {
    const t = S.invDates[id];
    const by = t ? startOfDay(t) + FRIDGE_DAYS * DAY : null;
    const past = by && Date.now() > by + DAY;
    return `<li><span class="kc-name">${esc(itemName(id))}</span><span class="stock ${past ? 'out' : 'in'}">${t ? (past ? 'past 4 days' : 'use by ' + fmtDay(by)) : 'in stock'}</span></li>`;
  }).join('')}</ul>` : '';
  return `
  <p class="lede">Cook the basics plain, flavor them at dinner. Plain rice, chicken and beef work in every bowl — and power <a href="#/nocook">5-minute mode</a>.</p>
  ${status ? section('Already cooked', status) : ''}
  ${section('How much', `<ul class="split">${rows}</ul><p class="fine">A dinner uses about ½ cup dry rice and ⅔ lb raw protein.</p>`)}
  ${plan.tasks.length ? section('Timeline', `<p class="summary">About ${fmtDur(plan.sch.total)} start to finish.</p><p class="progress-line"><span class="mono">${done} of ${plan.tasks.length}</span> done</p><ol class="tasks">${plan.sch.items.map(({ s, t }) => checkTask(s, t, S.prep.compDone, 'comp-done')).join('')}</ol>
    <button type="button" class="btn primary wide" data-a="comp-finish">Mark as cooked and stored</button>`) : emptyState('Nothing selected.', 'Add rice, chicken or beef above.')}`;
}

function prepBake() {
  const sel = S.prep.bake.sel;
  const rows = DESSERTS.map(r => {
    const on = !!sel[r.id];
    const y = on ? sel[r.id].yield : r.yields[0].id;
    return `<li class="bake-row"><input type="checkbox" id="bk-${r.id}" data-a="bake-sel" data-id="${r.id}" ${on ? 'checked' : ''}><label for="bk-${r.id}">${glyphSVG(r, 36)}<span>${esc(r.short)}</span></label>
      ${on ? seg(r.short + ' batch', r.yields.map(yy => [yy.id, yy.label]), y, 'bake-yield', `data-id="${r.id}"`) : ''}</li>`;
  }).join('');
  const plan = bakeTasks();
  if (!plan.chosen.length) {
    return section('What are you baking?', `<ul class="bake-rows">${rows}</ul>`) +
      emptyState('Nothing on the bake list yet.', 'Banana bread and brownies share an oven temperature. Bake both in about 2 hours, most of it hands-off.', '<button type="button" class="btn" data-a="bake-suggest">Plan bread + brownies</button>');
  }
  const pans = plan.chosen.map(r => { const c = build(r, { yield: sel[r.id].yield }); return c.y.pan ? r.short + ': ' + c.y.pan : null; }).filter(Boolean);
  const tools = [...new Set(plan.chosen.flatMap(r => r.prepNotes.tools))];
  const builds = plan.chosen.map(r => build(r, { yield: sel[r.id].yield, tier:'base' }));
  const agg = aggregate(builds);
  const ingRows = Object.values(agg).map(e => `<li><span class="q-name">${esc(itemName(e.id))}</span><span class="q-use mono">${esc(fmtAggUse(e))}</span>${S.prefs.trackInventory ? stockBadge(e.st) : ''}</li>`).join('');
  const done = plan.tasks.filter(t => S.prep.bake.done[t.id]).length;
  return `
  ${section('What are you baking?', `<ul class="bake-rows">${rows}</ul>`)}
  ${section('Before you start', `<dl class="kv">${plan.chosen.some(r => r.bakes) ? '<div><dt>Oven</dt><dd>350°F for everything</dd></div>' : ''}<div><dt>Pans</dt><dd>${esc(pans.join(' · ') || 'None')}</dd></div><div><dt>Tools</dt><dd>${esc(tools.join(', '))}</dd></div></dl>`)}
  ${section('Ingredients', `<ul class="qty">${ingRows}</ul>` + (S.prefs.trackInventory ? `<div class="btn-row"><button type="button" class="btn small" data-a="bake-missing">Add missing to shopping list</button></div>` : ''), { collapsible:true, open:false, aside:`<span class="muted">${Object.keys(agg).length} items</span>` })}
  ${section('Bake timeline', `<p class="summary">About ${fmtDur(plan.sch.total)} including cooling.</p><p class="progress-line"><span class="mono">${done} of ${plan.tasks.length}</span> done${done ? ` · <button type="button" class="text-btn" data-a="bake-reset">Reset</button>` : ''}</p><ol class="tasks">${plan.sch.items.map(({ s, t }) => checkTask(s, t, S.prep.bake.done, 'bake-done')).join('')}</ol>
    <button type="button" class="btn wide" data-a="bake-log">Log desserts as made</button>`)}`;
}

function prepPortion() {
  const split = prepSplit();
  const plan = packingPlan(split);
  const today = Date.now();
  const packable = plan.map(p => {
    const r = RECIPE[p.rid];
    const on = !!S.prep.packed[p.n];
    const where = p.freeze ? 'Freezer · move to the fridge the night before' + (p.potato ? '; re-crisp the potatoes in a hot skillet' : '') : 'Fridge · eat by ' + fmtDay(startOfDay(today) + FRIDGE_DAYS * DAY);
    return `<li class="task${on ? ' done' : ''}"><input type="checkbox" id="pk-${p.n}" data-a="pack" data-id="${p.n}" ${on ? 'checked' : ''}>
      <label for="pk-${p.n}"><span class="t mono">#${p.n}</span><span class="task-body"><span class="task-title">${esc(r.name)}</span><span class="task-text">${esc(containerContents(r))}</span><span class="task-text">Pack separately: ${esc(PACK_SEPARATE[r.id])}.</span><span class="where ${p.freeze ? 'freeze' : 'fridge'}">${esc(where)}</span></span></label></li>`;
  }).join('');
  const packedCount = plan.filter(p => S.prep.packed[p.n]).length;
  const sorted = [...S.containers].sort((a, b) => (a.frozen - b.frozen) || (a.packed - b.packed));
  const stored = sorted.length ? `<ul class="stored">${sorted.map(ct => {
    const r = RECIPE[ct.rid];
    const st = containerState(ct);
    const label = st === 'frozen' ? 'Freezer · packed ' + fmtDay(ct.packed, true) : st === 'expired' ? 'Past 4 days in the fridge — safest to discard' : 'Fridge · eat by ' + fmtDay(eatBy(ct));
    return `<li class="stored-row ${st}"><span class="stored-body"><span class="task-title">${esc(r.short)}</span><span class="where ${st === 'frozen' ? 'freeze' : st === 'expired' ? 'bad' : 'fridge'}">${esc(label)}</span></span>
      <span class="stored-actions">${st === 'frozen' ? `<button type="button" class="btn small" data-a="thaw" data-id="${ct.uid}">Thaw</button>` : st === 'good' ? `<button type="button" class="btn small" data-a="eat" data-id="${ct.uid}">Ate it</button>` : ''}<button type="button" class="text-btn" data-a="discard" data-id="${ct.uid}">Remove</button></span></li>`;
  }).join('')}</ul>` : emptyState('Nothing prepped yet.', `Prep four dinners in about ${fmtDur(prepTasks(autoSplit(4)).sch.total)}.`, '<button type="button" class="btn primary" data-a="start-prep">Start prep</button>');
  return `
  ${section('Portion your meals', `<p class="muted">${plan.length} containers from your prep plan, alternated so you don’t eat the same bowl twice in a row.</p><ol class="tasks">${packable}</ol>
    <button type="button" class="btn primary wide" data-a="pack-save" ${packedCount ? '' : 'disabled'}>${packedCount ? 'Save ' + packedCount + ' packed ' + (packedCount > 1 ? 'containers' : 'container') : 'Check off containers as you pack them'}</button>`)}
  ${section('In your fridge and freezer', stored)}`;
}

/* ---------- INVENTORY ---------- */
function viewInventory(tab) {
  tab = ['kitchen','shopping'].includes(tab) ? tab : (S.ui.invTab === 'shopping' ? 'shopping' : 'kitchen');
  S.ui.invTab = tab;
  const open = S.shopping.filter(x => !x.checked).length;
  const tabs = [['kitchen','Kitchen'],['shopping','Shopping' + (open ? ' · ' + open : '')]];
  const nav = `<nav class="tabs" aria-label="Inventory sections">${tabs.map(([k, l]) => `<a href="#/inventory/${k}" ${k === tab ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;
  let body;
  if (!S.prefs.trackInventory && tab === 'kitchen') body = emptyState('Inventory tracking is off.', 'Recipes won’t show stock status, and shopping lists won’t know what you have.', '<button type="button" class="btn" data-a="pref-toggle" data-k="trackInventory">Turn it on</button>');
  else body = tab === 'kitchen' ? invKitchen() : invShopping();
  return `<header class="page-head"><h1 class="h1">Inventory</h1></header>${nav}${body}`;
}

function invKitchen() {
  const counts = { in:0, low:0, out:0 };
  ITEMS.filter(i => !i.prepped).forEach(i => counts[inv(i.id)]++);
  const f = S.ui.invFilter;
  const isEmpty = counts.in + counts.low === 0;
  const empty = isEmpty ? emptyState('Your kitchen is empty.', 'Open a category and tap what you have, or start from tonight’s dinner.',
    '<div class="btn-row center"><button type="button" class="btn primary" data-a="build-list">Build shopping list</button><button type="button" class="btn" data-a="basics">I have the basics</button></div>') : '';
  const cats = CATS.map(cat => {
    const all = ITEMS.filter(i => i.cat === cat.id || i.alsoCat === cat.id);
    const list = f === 'all' ? all : all.filter(i => inv(i.id) === f);
    if (!list.length) return '';
    const low = all.filter(i => inv(i.id) === 'low').length, out = all.filter(i => inv(i.id) === 'out').length;
    const status = cat.id === 'prepped'
      ? (all.length - out ? (all.length - out) + ' ready' : 'none')
      : [low ? low + ' low' : '', out ? out + ' out' : ''].filter(Boolean).join(' · ') || 'all stocked';
    const rows = list.map(i => {
      const st = inv(i.id);
      const word = st === 'in' ? 'In stock' : st === 'low' ? 'Low' : 'Out';
      const date = i.prepped && st !== 'out' && S.invDates[i.id] ? `<span class="inv-used">Cooked ${fmtDay(S.invDates[i.id])}</span>` : '';
      return `<li><button type="button" class="inv-row" data-a="inv" data-id="${i.id}" aria-label="${esc(i.name)}: ${word}. Tap to change.">
        <span class="inv-body"><span class="inv-name">${esc(i.name)}</span>${date}</span>
        <span class="pill ${st}"><i aria-hidden="true">${st === 'in' ? '●' : st === 'low' ? '◐' : '○'}</i>${word}</span></button></li>`;
    }).join('');
    return `<details class="inv-cat" data-d="inv-${cat.id}"${f !== 'all' ? ' open' : ''}><summary><span class="inv-cat-name">${cat.name}</span><span class="inv-cat-status ${out ? 'out' : low ? 'low' : 'in'}">${status}</span></summary><ul class="inv">${rows}</ul></details>`;
  }).join('');
  return `
  <div class="inv-summary"><span><strong class="mono">${counts.in}</strong> in stock</span><span><strong class="mono">${counts.low}</strong> low</span><span><strong class="mono">${counts.out}</strong> out</span></div>
  ${seg('Show', [['all','All'],['low','Running low'],['out','Need to buy']], f, 'inv-filter')}
  <p class="fine">Tap an item to cycle: In stock → Low → Out.</p>
  ${empty}
  <div class="inv-cats">${cats || emptyState(f === 'low' ? 'Nothing is running low.' : 'Nothing is out.', '')}</div>
  <div class="danger-zone"><button type="button" class="text-btn" data-a="reset-inv">Reset inventory</button></div>`;
}

function invShopping() {
  const needs = mergeNeeds(shoppingNeeds());
  const onList = new Set(S.shopping.map(x => x.id));
  const toAdd = needs.filter(e => e.st !== 'in' && !onList.has(e.id)).length;
  const tonight = RECIPE[recommendTonight()];
  const bakeSel = DESSERTS.filter(r => S.prep.bake.sel[r.id]);
  const srcList = [
    ['tonight', 'Tonight’s dinner: ' + tonight.short],
    ['prep', 'Prep plan: ' + prepCount() + ' dinners'],
    ['bake', 'Bake plan: ' + (bakeSel.length ? bakeSel.map(r => r.short).join(', ') : 'nothing selected')],
  ];
  const basedOn = srcList.filter(([k]) => S.shopSources[k]).map(([, l]) => l.split(':')[0].toLowerCase()).join(', ') || 'nothing selected';
  const sources = `<details class="more" data-d="shop-sources"><summary>Based on ${esc(basedOn)}</summary><ul class="checks">${srcList.map(([k, l]) =>
    `<li><input type="checkbox" id="src-${k}" data-a="shop-src" data-k="${k}" ${S.shopSources[k] ? 'checked' : ''}><label for="src-${k}">${esc(l)}</label></li>`).join('')}</ul></details>`;
  const addBtn = !S.prefs.trackInventory ? '' : toAdd
    ? `<button type="button" class="btn primary wide" data-a="shop-addall">Add what I’m missing (${toAdd})</button>`
    : `<p class="muted add-note">${needs.some(e => e.st !== 'in') ? 'Everything you’re missing is on the list.' : 'You have everything for this.'}</p>`;
  const list = S.shopping;
  let listHTML;
  if (!list.length) {
    listHTML = emptyState('Your list is empty.', '');
  } else {
    const groups = {};
    list.forEach(x => { const aisle = ITEM[x.id] ? ITEM[x.id].aisle : 'Other'; (groups[aisle] = groups[aisle] || []).push(x); });
    listHTML = [...AISLES, 'Other'].filter(a => groups[a]).map(a => `<h3 class="label">${esc(a)}</h3><ul class="shop">${groups[a].map(x => {
      const name = ITEM[x.id] ? ITEM[x.id].name : x.name;
      const qty = ITEM[x.id] ? fmtBuy(x.id, x.g) : '';
      const id = 'sh-' + x.id.replace(/[^a-zA-Z0-9-]/g, '');
      return `<li class="${x.checked ? 'done' : ''}"><input type="checkbox" id="${id}" data-a="shop-check" data-id="${esc(x.id)}" ${x.checked ? 'checked' : ''}><label for="${id}"><span class="shop-name">${esc(name)}</span>${qty ? `<span class="shop-qty mono">${esc(qty)}</span>` : ''}</label></li>`;
    }).join('')}</ul>`).join('');
    const checked = list.filter(x => x.checked).length;
    listHTML += `<div class="btn-row">${checked ? `<button type="button" class="btn small primary" data-a="shop-putaway">Put away ${checked} (mark in stock)</button>` : ''}<button type="button" class="text-btn" data-a="shop-clear">Clear list</button></div>`;
  }
  return `
  <div class="shop-top">${addBtn}${sources}</div>
  ${listHTML}
  <form class="add-item" data-a="shop-add"><label for="add-item" class="visually-hidden">Add an item</label><input id="add-item" name="item" type="text" placeholder="Add something else" autocomplete="off" maxlength="60"><button type="submit" class="btn small">Add</button></form>`;
}

function quickReadiness(q) {
  const req = q.ing.filter(i => !i.opt);
  const missing = req.filter(i => avail(i).st === 'out');
  return { level: missing.length ? (missing.some(i => i.core) ? 'no' : 'almost') : 'ready', missing };
}

/* ---------- I DON'T WANT TO COOK ---------- */
function viewNoCook() {
  const good = S.containers.filter(ct => containerState(ct) === 'good').sort((a, b) => a.packed - b.packed);
  const frozen = S.containers.filter(ct => ct.frozen);
  const groups = [];
  good.forEach(ct => { const g = groups.find(x => x.rid === ct.rid); if (g) g.items.push(ct); else groups.push({ rid: ct.rid, items: [ct] }); });
  const readyHTML = groups.length ? `<ul class="heat">${groups.map(g => {
    const r = RECIPE[g.rid];
    const first = g.items[0];
    return `<li><details class="heat-item" data-d="heat-${g.rid}"><summary>${bowlSVG(r, 44)}<span class="heat-body"><span class="task-title">${esc(r.name)}${g.items.length > 1 ? ` <span class="mono muted">×${g.items.length}</span>` : ''}</span><span class="meta">3–4 min · eat ${g.items.length > 1 ? 'the first ' : ''}by ${fmtDay(eatBy(first))}</span></span><span class="tag">Heat</span></summary>
      <div class="heat-detail"><h3 class="h3">Reheat</h3>${bullets(r.leftovers.reheat.slice(0, 3))}<h3 class="h3">Make it taste fresh</h3>${bullets(r.leftovers.fresh)}
      <button type="button" class="btn primary wide" data-a="eat" data-id="${first.uid}">Ate one</button></div></details></li>`;
  }).join('')}</ul>` : '';
  const all = QUICK.map(q => ({ q, rd: quickReadiness(q) }));
  const ready = all.filter(x => x.rd.level === 'ready').sort((a, b) => a.q.time - b.q.time);
  const showAll = !ready.length;
  const list = showAll ? all.sort((a, b) => ({ ready:0, almost:1, no:2 }[a.rd.level] - { ready:0, almost:1, no:2 }[b.rd.level]) || a.q.time - b.q.time) : ready;
  const quickHTML = `<ul class="heat">${list.map(({ q, rd }) => {
    const c = { ings: q.ing.filter(i => !i.opt || avail(i).st !== 'out').map(i => Object.assign({}, i, { sq:i.q, sg:i.g })), pieces:1 };
    const nu = nutrition(c);
    const status = showAll && S.prefs.trackInventory ? `<span class="ready-line ${rd.level === 'almost' ? 'warn' : 'bad'}">Need ${esc(rd.missing.map(lcName).join(', '))}</span>` : '';
    return `<li><details class="heat-item" data-d="quick-${q.id}"><summary><span class="make-time mono">${q.time}m</span><span class="heat-body"><span class="task-title">${esc(q.name)}</span><span class="meta">~${roundKcal(nu.kcal)} kcal · ${roundG(nu.protein)} g protein</span>${status}</span>${ICON.chev}</summary>
      <div class="heat-detail">${q.note ? `<p class="muted">${esc(q.note)}</p>` : ''}
        <ul class="ings plain">${q.ing.map(i => { const a = avail(i); return `<li class="ing"><span></span><span class="ing-label"><span class="ing-name">${esc(i.name || itemName(i.id))}${i.opt ? ' <span class="tag">optional</span>' : ''}</span>${stockBadge(a.st, a.via, (i.any || [i.id])[0])}</span><span class="ing-amt mono">${esc(fmtQ(i.q, i.u))}</span></li>`; }).join('')}</ul>
        <h3 class="h3">Assembly</h3><ol class="bullets num">${q.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
        <button type="button" class="btn primary wide" data-a="quick-log" data-id="${q.id}">I made this</button></div></details></li>`;
  }).join('')}</ul>`;
  return `
  ${backLink('#/tonight', 'Tonight')}
  <header class="page-head"><h1 class="h1">Five-minute mode</h1></header>
  ${good.length ? section('Ready to heat', readyHTML) : ''}
  ${frozen.length ? `<p class="callout"><strong>${frozen.length} in the freezer.</strong> Move one to the fridge tonight for tomorrow. <a href="#/prep/portion">Manage</a></p>` : ''}
  ${section(showAll ? 'Closest options' : 'You can make these now', (showAll ? '<p class="muted">Nothing is fully ready with what’s marked in your kitchen. These need the fewest things.</p>' : '') + quickHTML)}`;
}

/* ---------- WEEK ---------- */
function viewWeek() {
  const w = weekSummary();
  const since = Date.now() - 7 * DAY;
  const recent = S.history.filter(h => h.t >= since).slice().reverse();
  const kindName = { dinner:'Cooked', leftover:'Leftover', quick:'5-minute', prep:'Packed', dessert:'Made', components:'Cooked basics' };
  const rows = recent.length ? `<ul class="log">${recent.map(h => {
    const name = h.name || (RECIPE[h.rid] ? RECIPE[h.rid].short : (QUICK.find(q => q.id === h.rid) || {}).name || '');
    return `<li><span class="mono log-day">${fmtDay(h.t)}</span><span>${esc(kindName[h.kind] || h.kind)} · ${esc(name)}${h.n > 1 ? ' ×' + h.n : ''}</span>${h.protein ? `<span class="mono muted">${Math.round(h.protein)} g</span>` : '<span></span>'}</li>`;
  }).join('')}</ul>` : emptyState('Nothing logged yet.', 'Finishing cooking mode, eating a prepped container, or logging a 5-minute meal adds it here.');
  return `
  ${backLink('#/tonight', 'Tonight')}
  <header class="page-head"><h1 class="h1">This week</h1></header>
  <p class="lede">The last 7 days. For awareness, not scorekeeping.</p>
  ${statCells([['Cooked at home', w.cooked, ''], ['Meals prepared', w.prepared, ''], ['Protein-heavy', w.proteinHeavy, '40 g+'], ['Veg servings', w.veg, 'cups'], ['Desserts made', w.desserts, ''], ['Avg protein', w.avgProtein || '—', w.avgProtein ? 'g / dinner' : '']])}
  <p class="fine">${w.home} ${w.home === 1 ? 'meal' : 'meals'} eaten at home, counting leftovers and 5-minute meals. Protein is approximate.</p>
  ${section('Log', rows)}`;
}

/* ---------- SETTINGS ---------- */
function viewSettings() {
  const p = S.prefs;
  const toggle = (k, label, hint) => `<div class="set-row"><span><span class="set-label" id="lbl-${k}">${label}</span>${hint ? `<span class="set-hint">${hint}</span>` : ''}</span><button type="button" role="switch" class="switch" aria-checked="${!!p[k]}" aria-labelledby="lbl-${k}" data-a="pref-toggle" data-k="${k}"><span></span></button></div>`;
  const row = (label, control) => `<div class="set-row stack"><span class="set-label">${label}</span>${control}</div>`;
  return `
  ${backLink('#/tonight', 'Tonight')}
  <header class="page-head"><h1 class="h1">Settings</h1></header>
  ${!Store.ok ? '<p class="callout warn"><strong>Storage unavailable</strong> This browser isn’t allowing saved data, so changes last until you close the page.</p>' : ''}
  <div class="set-group">
    ${row('Portion size', seg('Portion size', [['standard','Standard · 8 oz protein'],['large','Hungry · 10 oz']], p.portion, 'pref', 'data-k="portion"'))}
    ${row('Preferred protein', seg('Preferred protein', [['any','Either'],['chicken','Chicken'],['beef','Beef']], p.protein, 'pref', 'data-k="protein"'))}
    ${row('Heat', seg('Heat', [['mild','Mild'],['medium','Medium'],['hot','Hot']], p.heat, 'pref', 'data-k="heat"'))}
    ${row('Appearance', seg('Appearance', [['system','System'],['light','Light'],['dark','Dark']], p.theme, 'pref', 'data-k="theme"'))}
  </div>
  <details class="sec more-settings" data-d="more-settings"><summary><h2 class="h2">More settings</h2></summary><div class="sec-body">
    ${row('Preferred carb', seg('Preferred carb', [['rice','Rice'],['potato','Potatoes']], p.carb, 'pref', 'data-k="carb"'))}
    ${row('Dessert listed first on Tonight', seg('Dessert preference', [['any','Any']].concat(DESSERTS.map(d => [d.id, d.short.replace('Protein ', '')])), p.dessert, 'pref', 'data-k="dessert"'))}
    ${row('Default dinner', seg('Default dinner', DINNERS.map(d => [d.id, d.short.split(' ')[0]]), p.defaultMeal, 'pref', 'data-k="defaultMeal"'))}
    ${toggle('autoRecommend', 'Recommend tonight’s dinner', 'Off: Tonight shows your default dinner.')}
    ${toggle('nutritionProminent', 'Full nutrition grid on Tonight', 'Off: one compact line.')}
    ${toggle('trackInventory', 'Track inventory', 'Stock status and shopping lists.')}
    <a class="link-row" href="#/prep/dinners"><span><strong>Meal prep planner</strong> <span class="muted">batch plans, packing, containers</span></span>${ICON.chev}</a>
    <a class="link-row" href="#/week"><span><strong>This week</strong> <span class="muted">what you’ve cooked and eaten</span></span>${ICON.chev}</a>
    <div class="btn-row"><button type="button" class="btn small" data-a="rerun-setup">Run setup again</button><button type="button" class="btn small" data-a="reset-inv">Reset inventory</button><button type="button" class="btn small danger" data-a="reset-app">Reset everything</button></div>
  </div></details>
  <p class="fine">Everything stays on this device. No account, nothing sent anywhere.${offlineLine()}</p>`;
}
function offlineLine() {
  if (!window.__OFFLINE__) return '';
  const ready = 'serviceWorker' in navigator && navigator.serviceWorker.controller;
  return ready ? ' Saved for offline use: opens and saves without a connection.' : ' Getting ready for offline use — open the app once more while online.';
}
