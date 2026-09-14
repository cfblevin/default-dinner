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
        <p class="kicker">${esc(r.difficulty)} · ${c.n} ${c.n > 1 ? 'servings' : 'serving'}${isFav(r.id) ? ' · <span class="fav-mark">Favorite</span>' : ''}</p>
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

/* ---------- MEALS ---------- */
function viewMeals() {
  const rows = DINNERS.map(r => {
    const c = build(r);
    const nu = nutrition(c), tm = times(c);
    const rl = readyLabel(bestReadiness(r));
    return `<li class="mrow"><a class="mrow-main" href="#/meal/${r.id}">${bowlSVG(r, 64, c.carb)}<span class="mrow-body">
      <span class="mrow-name">${esc(r.name)}</span><span class="mrow-flavor">${esc(r.flavor)}</span>
      <span class="meta mono">~${roundKcal(nu.kcal)} kcal · ${roundG(nu.protein)} g protein · ${tm.total} min</span>
      ${rl.text ? `<span class="ready-line ${rl.cls}">${esc(rl.text)}</span>` : ''}</span></a>${favBtn(r.id, r.name)}</li>`;
  }).join('');
  const shared = Object.entries(USED_IN).filter(([id, rs]) => rs.length >= 3 && ITEM[id] && !['salt','vanilla','pepper'].includes(id))
    .sort((a, b) => b[1].length - a[1].length).slice(0, 8);
  const sharedHTML = `<p class="muted">The grocery list stays short on purpose. These show up again and again:</p>
    <ul class="shared">${shared.map(([id, rs]) => `<li><span class="sh-name">${esc(itemName(id))}</span><span class="sh-count mono">${rs.length}</span><span class="sh-list">${rs.map(x => SHORT[x]).join(' · ')}</span></li>`).join('')}</ul>`;
  return `
  <header class="page-head"><h1 class="h1">Meals</h1><button type="button" class="btn small" data-a="surprise-go">Surprise me</button></header>
  <p class="lede">Four dinners built on the same ingredients. Rotate them; don’t decide from scratch.</p>
  <ul class="mrows">${rows}</ul>
  ${section('Shared ingredients', sharedHTML)}`;
}

function viewMeal(id) {
  const r = RECIPE[id];
  if (!r || r.type !== 'dinner') return emptyState('That meal isn’t here.', '', '<a class="btn" href="#/meals">See all meals</a>');
  const o = getOpts(r);
  const c = build(r);
  const nu = nutrition(c);
  const tm = times(c);
  const servingDef = build(r, { servings:1, tier:'base' }).ings.filter(i => ['protein','carb','veg','sauce'].includes(i.role) && i.core)
    .map(i => fmtQ(i.sq, i.u) + ' ' + lcName(i)).join(', ');
  const opts = [
    `<div class="opt"><span class="opt-label" id="lbl-serv">Servings</span>${seg('Servings', [[1,'1'],[2,'2'],[4,'4'],[6,'Batch · 6']], o.servings, 'opt', `data-rid="${id}" data-k="servings"`)}</div>`,
    r.hasCarbChoice ? `<div class="opt"><span class="opt-label">Carb</span>${seg('Carb', [['rice','Rice'],['potato','Potatoes']], o.carb, 'opt', `data-rid="${id}" data-k="carb"`)}</div>` : '',
    r.hasSauceChoice ? `<div class="opt"><span class="opt-label">BBQ sauce</span>${seg('BBQ sauce', [['regular','Regular'],['smoky','Smoky'],['spicy','Spicy']], o.sauce, 'opt', `data-rid="${id}" data-k="sauce"`)}</div>` : '',
    o.carb === 'rice' ? `<div class="opt"><span class="opt-label">Rice</span>${seg('Rice', [['fresh','Cook fresh'],['ready','Already cooked']], o.rice, 'opt', `data-rid="${id}" data-k="rice"`)}</div>` : '',
    `<div class="opt"><span class="opt-label">Portion</span>${seg('Portion', [['standard','Standard'],['large','Hungry']], S.prefs.portion, 'pref', 'data-k="portion"')}</div>`,
  ].join('');
  const tierSeg = seg('Flavor level', [['base','Base'],['better','Better'],['loaded','Loaded']], o.tier, 'opt', `data-rid="${id}" data-k="tier"`);
  const tierList = `<dl class="tiers">${['base','better','loaded'].map(t => `<div class="${t === o.tier ? 'on' : ''}"><dt>${t[0].toUpperCase() + t.slice(1)}</dt><dd>${esc(r.tiers[t].text)}</dd></div>`).join('')}</dl>`;
  const lo = r.leftovers;
  const leftovers = `
    <h3 class="h3">If you’re not finishing it</h3>${bullets(lo.separate)}
    <h3 class="h3">Storage</h3>${bullets(lo.storage)}
    <h3 class="h3">Reheating</h3>${bullets(lo.reheat)}
    <h3 class="h3">Make it taste fresh</h3>${bullets(lo.fresh)}
    <p class="fine">Timings follow standard USDA leftover guidance. When in doubt — it smells off, or sat out more than 2 hours — throw it out.</p>`;
  const anyChecked = Object.values(S.checks[id] || {}).some(Boolean);
  return `
  ${backLink('#/meals', 'Meals')}
  <header class="rhead">
    <div class="rhead-top">${bowlSVG(r, 84, c.carb)}${favBtn(r.id, r.name)}</div>
    <h1 class="h1">${esc(r.name)}</h1>
    <p class="lede">${esc(r.flavor)}</p>
    <p class="kicker">${esc(r.difficulty)} · ${r.tags.map(esc).join(' · ')}${S.prefs.heat !== 'mild' && r.heatText ? ' · heat: ' + S.prefs.heat : ''}</p>
  </header>
  <div class="opts">${opts}</div>
  ${section('Per serving', `${dinnerStats(nu, tm, false)}
    <p class="fine">Approximate nutrition. One serving: ${esc(servingDef)}${S.prefs.portion === 'large' ? ' (Hungry portion)' : ''}${o.tier !== 'base' ? ', plus ' + o.tier + ' additions' : ''}.</p>
    <details class="more" data-d="more-nutrition"><summary>More nutrition</summary>${microTable(nu)}</details>`)}
  ${section('Make it taste better', tierSeg + tierList)}
  ${section('Ingredients', ingredientList(c, id) + `<div class="btn-row">${S.prefs.trackInventory ? `<button type="button" class="btn small" data-a="recipe-missing" data-id="${id}">Add missing to shopping list</button>` : ''}${anyChecked ? `<button type="button" class="text-btn" data-a="clear-checks" data-id="${id}">Clear checks</button>` : ''}</div>`, { aside:`<span class="muted mono">${c.n} ${c.n > 1 ? 'servings' : 'serving'}</span>` })}
  ${section('Equipment', bullets(r.equipment), { collapsible:true })}
  ${section('What to get out before you start', bullets(r.mise), { collapsible:true })}
  ${section('Cooking timeline', timelineList(tm.sch) + `<p class="fine">Total ${tm.total} min. Tasks overlap: the next job starts while something simmers.</p>`)}
  ${section('Finish', `<p>${esc(r.finish)}</p>`)}
  ${section('Swaps', bullets(r.subs), { collapsible:true })}
  ${section('Leftovers', leftovers)}
  <div class="cta-bar"><button type="button" class="btn primary xl" data-a="start-cook" data-id="${id}">Start cooking</button></div>`;
}

/* ---------- SWEET ---------- */
function dessertMeta(r) {
  const c = build(r, { tier:'base' });
  const nu = nutrition(c), tm = times(c);
  return { c, nu, tm };
}
function viewSweet() {
  const metas = Object.fromEntries(DESSERTS.map(r => [r.id, dessertMeta(r)]));
  const fastest = [...DESSERTS].sort((a, b) => metas[a.id].tm.total - metas[b.id].tm.total)[0];
  const protein = [...DESSERTS].sort((a, b) => metas[b.id].nu.protein - metas[a.id].nu.protein)[0];
  const order = ['donuts','brownies','bread','icecream'];
  const wants = order.map(id => RECIPE[id]).map(r => `<a class="want" href="#/sweet/${r.id}">${glyphSVG(r, 48)}<span>${esc(r.want)}</span></a>`).join('');
  const glance = `<dl class="glance">
    <div><dt>Fastest</dt><dd><a href="#/sweet/${fastest.id}">${esc(fastest.short)}</a> <span class="muted mono">${metas[fastest.id].tm.total} min</span></dd></div>
    <div><dt>Highest protein</dt><dd><a href="#/sweet/${protein.id}">${esc(protein.short)}</a> <span class="muted mono">${roundG(metas[protein.id].nu.protein)} g per ${metas[protein.id].c.y.unit}</span></dd></div>
    <div><dt>Best for batch prep</dt><dd><a href="#/sweet/brownies">Brownies</a> <span class="muted">cut, wrap, freeze up to 3 months</span></dd></div>
    <div><dt>Requires baking</dt><dd>${DESSERTS.filter(r => r.bakes).map(r => `<a href="#/sweet/${r.id}">${esc(r.short)}</a>`).join(', ')}</dd></div>
    <div><dt>No-bake</dt><dd>${DESSERTS.filter(r => !r.bakes).map(r => `<a href="#/sweet/${r.id}">${esc(r.short)}</a>`).join(', ')}</dd></div>
  </dl>`;
  const rows = DESSERTS.map(r => {
    const m = metas[r.id];
    return `<li class="mrow"><a class="mrow-main" href="#/sweet/${r.id}">${glyphSVG(r, 60)}<span class="mrow-body">
      <span class="mrow-name">${esc(r.name)}</span><span class="mrow-flavor">${esc(r.flavor)}</span>
      <span class="meta mono">${roundKcal(m.nu.kcal)} kcal · ${roundG(m.nu.protein)} g protein per ${m.c.y.unit} · ${r.bakes ? fmtDur(m.tm.active) + ' active' : fmtDur(m.tm.total)}</span></span></a>${favBtn(r.id, r.name)}</li>`;
  }).join('');
  return `
  <header class="page-head"><h1 class="h1">Sweet</h1><button type="button" class="btn small" data-a="surprise-dessert">Surprise dessert</button></header>
  <p class="lede">Dessert is part of the plan. Pick the one you actually want.</p>
  ${section('What sounds good?', `<div class="wants">${wants}</div>`)}
  ${section('At a glance', glance)}
  ${section('All four', `<ul class="mrows">${rows}</ul>`)}`;
}

function viewDessert(id) {
  const r = RECIPE[id];
  if (!r || r.type !== 'dessert') return emptyState('That dessert isn’t here.', '', '<a class="btn" href="#/sweet">See desserts</a>');
  const o = getOpts(r);
  const c = build(r);
  const nu = nutrition(c);
  const tm = times(c);
  const stats = S.prefs.nutritionProminent ? statCells([
    ['Calories', '~' + roundKcal(nu.kcal), ''], ['Protein', roundG(nu.protein), 'g'], ['Carbs', roundG(nu.carbs), 'g'], ['Fat', roundG(nu.fat), 'g'],
    ['Fiber', roundG(nu.fiber), 'g'], ['Active', tm.active, 'min'], r.bakes ? ['Bake', tm.bake, 'min'] : ['Freeze', '6', 'hr ahead'], tm.total < 60 ? ['Total', tm.total, 'min'] : ['Total', Math.floor(tm.total / 60) + ':' + String(tm.total % 60).padStart(2, '0'), 'hr'],
  ]) : `<p class="stat-line mono">~${roundKcal(nu.kcal)} kcal · ${roundG(nu.protein)} g protein · ${fmtDur(tm.total)}</p>`;
  const optRows = [
    `<div class="opt"><span class="opt-label">Make</span>${seg('Batch size', r.yields.map(y => [y.id, y.label]), o.yield, 'opt', `data-rid="${id}" data-k="yield"`)}</div>`,
    r.variations ? `<div class="opt"><span class="opt-label">Version</span><div class="chips" role="radiogroup" aria-label="Version">${r.variations.map(v => `<button type="button" role="radio" class="chip" aria-checked="${v.id === o.variation}" data-a="opt" data-rid="${id}" data-k="variation" data-v="${v.id}">${esc(v.label)}</button>`).join('')}</div></div>` : '',
    r.glazes ? `<div class="opt"><span class="opt-label">Glaze</span><div class="chips" role="radiogroup" aria-label="Glaze">${r.glazes.map(g => `<button type="button" role="radio" class="chip" aria-checked="${g.id === o.glaze}" data-a="opt" data-rid="${id}" data-k="glaze" data-v="${g.id}">${esc(g.label)}</button>`).join('')}</div></div>` : '',
  ].join('');
  const pn = r.prepNotes;
  const before = `<dl class="kv">
    <div><dt>Oven</dt><dd>${esc(pn.temp)}</dd></div>
    ${c.y.pan ? `<div><dt>Pan</dt><dd>${esc(c.y.pan)}</dd></div>` : ''}
    <div><dt>${r.bakes ? 'Parchment / spray' : 'To store'}</dt><dd>${esc(pn.lining)}</dd></div>
    <div><dt>Tools</dt><dd>${esc(pn.tools.join(', '))}</dd></div>
    ${r.ahead ? `<div><dt>Ahead</dt><dd>${esc(r.ahead)}</dd></div>` : ''}
  </dl>`;
  const steps = `<ol class="steps">${tm.steps.map(s => `<li><span class="st-title">${esc(s.title)}</span><span class="st-text">${esc(fill(s.text, c))}</span>${s.warn ? `<span class="callout warn"><strong>Heads up</strong> ${esc(s.warn)}</span>` : ''}</li>`).join('')}</ol>`;
  const st = r.storage;
  const storage = `<dl class="kv"><div><dt>Counter</dt><dd>${esc(st.room)}</dd></div><div><dt>Fridge</dt><dd>${esc(st.fridge)}</dd></div><div><dt>Freezer</dt><dd>${esc(st.freezer)}</dd></div><div><dt>${r.bakes ? 'Reheat' : 'Soften'}</dt><dd>${esc(st.reheat)}</dd></div></dl>`;
  const tierSeg = seg('Flavor level', [['base','Base'],['better','Better'],['loaded','Loaded']], o.tier, 'opt', `data-rid="${id}" data-k="tier"`);
  const tierList = `<dl class="tiers">${['base','better','loaded'].map(t => `<div class="${t === o.tier ? 'on' : ''}"><dt>${t[0].toUpperCase() + t.slice(1)}</dt><dd>${esc(r.tiers[t].text)}</dd></div>`).join('')}</dl>`;
  const variations = r.variations ? `<dl class="kv">${r.variations.map(v => `<div><dt>${esc(v.label)}</dt><dd>${esc(v.how)}</dd></div>`).join('')}</dl>` : '';
  return `
  ${backLink('#/sweet', 'Sweet')}
  <header class="rhead">
    <div class="rhead-top">${glyphSVG(r, 80)}${favBtn(r.id, r.name)}</div>
    <h1 class="h1">${esc(r.name)}</h1>
    <p class="lede">${esc(r.flavor)}</p>
    <p class="kicker">${esc(r.difficulty)} · ${r.bakes ? 'Bakes at ' + r.oven : 'No-bake'} · makes ${c.y.pieces} ${c.y.pieces > 1 ? c.y.unit + 's' : c.y.unit}</p>
  </header>
  <div class="opts">${optRows}</div>
  ${section('Per ' + c.y.unit, stats + `<p class="fine">Approximate nutrition for one ${c.y.unit}${r.glazes ? ', including glaze' : ''}${o.tier !== 'base' ? ' and ' + o.tier + ' toppings' : ''}.</p><details class="more" data-d="more-nutrition"><summary>More nutrition</summary>${microTable(nu)}</details>`)}
  ${section('Before you start', before)}
  ${section('Ingredients', ingredientList(c, id) + `<div class="btn-row">${S.prefs.trackInventory ? `<button type="button" class="btn small" data-a="recipe-missing" data-id="${id}">Add missing to shopping list</button>` : ''}</div>`, { aside:`<span class="muted mono">${esc(c.y.label)}</span>` })}
  ${section('Method', steps + `<p class="fine">${r.bakes ? `About ${tm.active} min hands-on, ${tm.bake} min in the oven, ${fmtDur(tm.total)} including cooling.` : `About ${tm.total} minutes, once the bananas are frozen.`}</p>`)}
  ${r.trouble ? section('Texture troubleshooting', `<dl class="kv">${r.trouble.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`) : ''}
  ${section('Make it better', tierSeg + tierList)}
  ${r.variations ? section('Versions', variations, { collapsible:true }) : ''}
  ${section('Storage', storage)}
  ${section('Swaps', bullets(r.subs), { collapsible:true })}
  <div class="cta-bar"><button type="button" class="btn primary xl" data-a="start-cook" data-id="${id}">${r.bakes ? 'Make it · Bake mode' : 'Make it'}</button></div>`;
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
  return `<header class="page-head"><h1 class="h1">Prep</h1></header>${nav}${body}`;
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
  tab = ['kitchen','shopping','make'].includes(tab) ? tab : (S.ui.invTab || 'kitchen');
  S.ui.invTab = tab;
  const tabs = [['kitchen','Kitchen'],['shopping','Shopping' + (S.shopping.filter(x => !x.checked).length ? ' · ' + S.shopping.filter(x => !x.checked).length : '')],['make','What can I make?']];
  const nav = `<nav class="tabs" aria-label="Inventory sections">${tabs.map(([k, l]) => `<a href="#/inventory/${k}" ${k === tab ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;
  let body;
  if (!S.prefs.trackInventory && tab !== 'shopping') body = emptyState('Inventory tracking is off.', 'Recipes won’t show stock status, and shopping lists won’t know what you have.', '<button type="button" class="btn" data-a="pref-toggle" data-k="trackInventory">Turn it on</button>');
  else body = tab === 'kitchen' ? invKitchen() : tab === 'shopping' ? invShopping() : invMake();
  return `<header class="page-head"><h1 class="h1">Inventory</h1></header>${nav}${body}`;
}

function invKitchen() {
  const items = ITEMS.filter(i => !i.prepped);
  const counts = { in:0, low:0, out:0 };
  items.forEach(i => counts[inv(i.id)]++);
  const f = S.ui.invFilter;
  const isEmpty = counts.in + counts.low === 0;
  const empty = isEmpty ? emptyState('Your kitchen is empty.', 'Tap items below as you find them, or start from what tonight and your prep plan need.',
    '<div class="btn-row center"><button type="button" class="btn primary" data-a="build-list">Build shopping list</button><button type="button" class="btn" data-a="basics">I have the basics</button></div>') : '';
  const cats = CATS.map(cat => {
    let list = ITEMS.filter(i => i.cat === cat.id || i.alsoCat === cat.id);
    if (f !== 'all') list = list.filter(i => inv(i.id) === f);
    if (!list.length) return '';
    return `<section class="inv-cat"><h2 class="label">${cat.name}</h2><ul class="inv">${list.map(i => {
      const st = inv(i.id);
      const used = (USED_IN[i.id] || []);
      const usedText = used.length ? 'Used in ' + (used.length > 3 ? used.slice(0, 3).map(x => SHORT[x]).join(', ') + ' +' + (used.length - 3) : used.map(x => SHORT[x]).join(', ')) : (i.prepped ? 'From prep' : 'Not in the core recipes');
      const date = i.prepped && st !== 'out' && S.invDates[i.id] ? ' · cooked ' + fmtDay(S.invDates[i.id]) : '';
      const word = st === 'in' ? 'In stock' : st === 'low' ? 'Low' : 'Out';
      return `<li><button type="button" class="inv-row" data-a="inv" data-id="${i.id}" aria-label="${esc(i.name)}: ${word}. Tap to change.">
        <span class="inv-body"><span class="inv-name">${esc(i.name)}</span><span class="inv-used">${esc(usedText + date)}</span></span>
        <span class="pill ${st}"><i aria-hidden="true">${st === 'in' ? '●' : st === 'low' ? '◐' : '○'}</i>${word}</span></button></li>`;
    }).join('')}</ul></section>`;
  }).join('');
  return `
  <div class="inv-summary"><span><strong class="mono">${counts.in}</strong> in stock</span><span><strong class="mono">${counts.low}</strong> low</span><span><strong class="mono">${counts.out}</strong> out</span></div>
  ${seg('Show', [['all','All'],['low','Running low'],['out','Need to buy']], f, 'inv-filter')}
  <p class="fine">Tap an item to cycle: In stock → Low → Out.</p>
  ${empty}
  ${cats || emptyState(f === 'low' ? 'Nothing is running low.' : 'Nothing is out.', '')}
  <div class="danger-zone"><button type="button" class="text-btn" data-a="reset-inv">Reset inventory</button></div>`;
}

function invShopping() {
  const needs = shoppingNeeds();
  const missing = needs.filter(e => e.st === 'out');
  const low = needs.filter(e => e.st === 'low');
  const have = needs.filter(e => e.st === 'in' && e.core);
  const tonight = RECIPE[recommendTonight()];
  const bakeSel = DESSERTS.filter(r => S.prep.bake.sel[r.id]);
  const src = [
    ['tonight', 'Tonight: ' + tonight.short],
    ['prep', 'Prep plan: ' + prepCount() + ' dinners'],
    ['bake', 'Bake plan: ' + (bakeSel.length ? bakeSel.map(r => r.short).join(', ') : 'nothing selected')],
  ].map(([k, l]) => `<li><input type="checkbox" id="src-${k}" data-a="shop-src" data-k="${k}" ${S.shopSources[k] ? 'checked' : ''}><label for="src-${k}">${esc(l)}</label></li>`).join('');
  const names = arr => { const n = arr.slice(0, 4).map(e => lcName({ id:e.id })); return arr.length > 4 ? n.join(', ') + ' and ' + (arr.length - 4) + ' more' : n.length > 1 ? n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1] : n.join(''); };
  const sentences = S.prefs.trackInventory ? [
    have.length ? `You have ${names(have)}.` : '',
    missing.length ? `You’re missing ${names(missing)}.` : '',
    low.length ? `You’re low on ${names(low)}.` : '',
  ].filter(Boolean) : ['Inventory tracking is off, so everything counts as in stock.'];
  const onList = new Set(S.shopping.map(x => x.id));
  const toAdd = missing.concat(low).filter(e => !onList.has(e.id)).length;
  const list = S.shopping;
  let listHTML;
  if (!list.length) {
    listHTML = emptyState('Your list is empty.', toAdd ? 'Add what you’re missing with one tap.' : 'Nothing missing for the plans you picked.');
  } else {
    const groups = {};
    list.forEach((x, idx) => { const aisle = ITEM[x.id] ? ITEM[x.id].aisle : 'Other'; (groups[aisle] = groups[aisle] || []).push([x, idx]); });
    const order = [...AISLES, 'Other'].filter(a => groups[a]);
    listHTML = order.map(a => `<h3 class="label">${esc(a)}</h3><ul class="shop">${groups[a].map(([x]) => {
      const name = ITEM[x.id] ? ITEM[x.id].name : x.name;
      const qty = ITEM[x.id] ? fmtBuy(x.id, x.g) : '';
      const hint = ITEM[x.id] && ITEM[x.id].shop.hint ? ITEM[x.id].shop.hint : '';
      const id = 'sh-' + x.id.replace(/[^a-zA-Z0-9-]/g, '');
      return `<li class="${x.checked ? 'done' : ''}"><input type="checkbox" id="${id}" data-a="shop-check" data-id="${esc(x.id)}" ${x.checked ? 'checked' : ''}><label for="${id}"><span class="shop-name">${esc(name)}</span>${qty || hint ? `<span class="shop-qty mono">${esc(qty)}${hint ? `<span class="muted"> · ${esc(hint)}</span>` : ''}</span>` : ''}</label></li>`;
    }).join('')}</ul>`).join('');
    const checked = list.filter(x => x.checked).length;
    listHTML += `<div class="btn-row">${checked ? `<button type="button" class="btn small primary" data-a="shop-putaway">Put away ${checked} (mark in stock)</button>` : ''}<button type="button" class="text-btn" data-a="shop-clear">Clear list</button></div>`;
  }
  return `
  ${section('Build from', `<ul class="checks">${src}</ul>`)}
  ${section('Where you stand', `<div class="stand">${sentences.map(s => `<p>${esc(s)}</p>`).join('') || '<p>Pick a plan above.</p>'}</div>
    ${toAdd ? `<button type="button" class="btn primary wide" data-a="shop-addall">Add all missing (${toAdd})</button>` : (missing.length + low.length ? '<p class="muted">Everything missing is already on your list.</p>' : '')}`)}
  ${section('Shopping list', listHTML + `<form class="add-item" data-a="shop-add"><label for="add-item" class="visually-hidden">Add an item</label><input id="add-item" name="item" type="text" placeholder="Add something else" autocomplete="off" maxlength="60"><button type="submit" class="btn small">Add</button></form>`, { aside:'<span class="muted">by store section</span>' })}`;
}

function quickReadiness(q) {
  const req = q.ing.filter(i => !i.opt);
  const missing = req.filter(i => avail(i).st === 'out');
  return { level: missing.length ? (missing.some(i => i.core) ? 'no' : 'almost') : 'ready', missing };
}

function invMake() {
  const all = RECIPES.map(r => ({ r, rd: bestReadiness(r) }));
  const rank = { ready:0, almost:1, no:2 };
  all.sort((a, b) => rank[a.rd.level] - rank[b.rd.level] || a.rd.missing.length - b.rd.missing.length);
  const can = all.filter(x => x.rd.level !== 'no');
  const cannot = all.filter(x => x.rd.level === 'no');
  const subFor = i => i.sub ? ` (swap: ${lcFirst(i.sub.replace(/\.$/, ''))})` : '';
  const canHTML = can.length ? `<ol class="make">${can.map(({ r, rd }) => {
    const href = r.type === 'dinner' ? '#/meal/' + r.id : '#/sweet/' + r.id;
    const note = rd.level === 'ready'
      ? (r.hasCarbChoice && rd.carb === 'potato' ? 'Ready — with potatoes.' : 'Everything’s here.') + (rd.low.length ? ' Running low on ' + rd.low.map(lcName).join(', ') + '.' : '')
      : 'If you have ' + rd.missing.map(i => lcName(i) + subFor(i)).join(', ') + '.';
    return `<li><a href="${href}" class="make-row">${artFor(r, 40, rd.carb)}<span><span class="make-name">${esc(r.name)}</span><span class="make-note ${rd.level === 'ready' ? 'ok' : 'warn'}">${esc(note)}</span></span></a></li>`;
  }).join('')}</ol>` : emptyState('Nothing is fully makeable yet.', 'Mark what you have in Kitchen, or build a shopping list.', '<a class="btn" href="#/inventory/kitchen">Update kitchen</a>');
  const quick = QUICK.map(q => ({ q, rd: quickReadiness(q) })).filter(x => x.rd.level !== 'no');
  const quickHTML = quick.length ? `<ul class="make">${quick.map(({ q, rd }) => `<li><a href="#/nocook" class="make-row"><span class="mono make-time">${q.time}m</span><span><span class="make-name">${esc(q.name)}</span><span class="make-note ${rd.level === 'ready' ? 'ok' : 'warn'}">${rd.level === 'ready' ? 'Ready' : 'Missing ' + rd.missing.map(lcName).join(', ')}</span></span></a></li>`).join('')}</ul>`
    : `<p class="muted">Needs something already cooked. <a href="#/prep/ingredients">Cook the basics</a> once and these unlock.</p>`;
  const noHTML = cannot.length ? `<ul class="make">${cannot.map(({ r, rd }) => `<li class="make-row not"><span class="make-art">${artFor(r, 32)}</span><span><span class="make-name">${esc(r.short)}</span><span class="make-note">Need ${esc(rd.missingCore.concat(rd.missing).map(lcName).join(', '))}</span></span><button type="button" class="btn small" data-a="recipe-missing" data-id="${r.id}">Add to list</button></li>`).join('')}</ul>` : '';
  return `
  ${section('You can make', canHTML)}
  ${section('Five-minute options', quickHTML)}
  ${cannot.length ? section('Not yet', noHTML, { collapsible:true, aside:`<span class="muted">${cannot.length}</span>` }) : ''}`;
}

/* ---------- I DON'T WANT TO COOK ---------- */
function viewNoCook() {
  const good = S.containers.filter(ct => containerState(ct) === 'good').sort((a, b) => a.packed - b.packed);
  const frozen = S.containers.filter(ct => ct.frozen);
  const readyHTML = good.length ? `<ul class="heat">${good.map(ct => {
    const r = RECIPE[ct.rid];
    return `<li><details class="heat-item" data-d="heat-${ct.uid}"><summary>${bowlSVG(r, 44)}<span class="heat-body"><span class="task-title">${esc(r.name)}</span><span class="meta mono">3–4 min · eat by ${fmtDay(eatBy(ct))}</span></span><span class="tag">Heat</span></summary>
      <div class="heat-detail"><h3 class="h3">Reheat</h3>${bullets(r.leftovers.reheat.slice(0, 3))}<h3 class="h3">Make it taste fresh</h3>${bullets(r.leftovers.fresh)}
      <button type="button" class="btn primary wide" data-a="eat" data-id="${ct.uid}">Ate it</button></div></details></li>`;
  }).join('')}</ul>` : '';
  const quick = QUICK.map(q => ({ q, rd: quickReadiness(q) }));
  const rank = { ready:0, almost:1, no:2 };
  quick.sort((a, b) => rank[a.rd.level] - rank[b.rd.level] || a.q.time - b.q.time);
  const quickHTML = `<ul class="heat">${quick.map(({ q, rd }) => {
    const c = { ings: q.ing.filter(i => !i.opt || avail(i).st !== 'out').map(i => Object.assign({}, i, { sq:i.q, sg:i.g })), pieces:1 };
    const nu = nutrition(c);
    const status = !S.prefs.trackInventory ? '' : rd.level === 'ready' ? '<span class="ready-line ok">Ready</span>' : `<span class="ready-line ${rd.level === 'almost' ? 'warn' : 'bad'}">Need ${esc(rd.missing.map(lcName).join(', '))}</span>`;
    return `<li><details class="heat-item${rd.level === 'no' ? ' dim' : ''}" data-d="quick-${q.id}"><summary><span class="make-time mono">${q.time}m</span><span class="heat-body"><span class="task-title">${esc(q.name)}</span><span class="meta mono">~${roundKcal(nu.kcal)} kcal · ${roundG(nu.protein)} g protein</span>${status}</span>${ICON.chev}</summary>
      <div class="heat-detail">${q.note ? `<p class="muted">${esc(q.note)}</p>` : ''}
        <ul class="ings plain">${q.ing.map(i => { const a = avail(i); return `<li class="ing"><span></span><span class="ing-label"><span class="ing-name">${esc(i.name || itemName(i.id))}${i.opt ? ' <span class="tag">optional</span>' : ''}</span>${stockBadge(a.st, a.via, (i.any || [i.id])[0])}</span><span class="ing-amt mono">${esc(fmtQ(i.q, i.u))}</span></li>`; }).join('')}</ul>
        <h3 class="h3">Assembly</h3><ol class="bullets num">${q.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
        <button type="button" class="btn primary wide" data-a="quick-log" data-id="${q.id}">I made this</button></div></details></li>`;
  }).join('')}</ul>`;
  const nothing = !good.length && !quick.some(x => x.rd.level === 'ready');
  return `
  ${backLink('#/tonight', 'Tonight')}
  <header class="page-head"><h1 class="h1">Five-minute mode</h1></header>
  <p class="lede">Already-cooked food, assembled. No real cooking, fewer steps than ordering.</p>
  ${good.length ? section('Ready to heat', readyHTML) : ''}
  ${frozen.length ? `<p class="callout"><strong>${frozen.length} in the freezer.</strong> Move one to the fridge tonight and it’s ready tomorrow. <a href="#/prep/portion">Manage</a></p>` : ''}
  ${nothing ? emptyState('Nothing prepped yet.', `Prep four dinners in about ${fmtDur(prepTasks(autoSplit(4)).sch.total)} and this screen fills up.`, '<button type="button" class="btn primary" data-a="start-prep">Start prep</button>') : ''}
  ${section('Assemble from what you have', quickHTML)}`;
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
  ${section('Food', [
    row('Default portion', seg('Default portion', [['standard','Standard · 8 oz protein, 1½ cups carb'],['large','Hungry · 10 oz, 2 cups']], p.portion, 'pref', 'data-k="portion"')),
    row('Preferred protein', seg('Preferred protein', [['any','No preference'],['chicken','Chicken'],['beef','Beef']], p.protein, 'pref', 'data-k="protein"')),
    row('Preferred carb', seg('Preferred carb', [['rice','Rice'],['potato','Potatoes']], p.carb, 'pref', 'data-k="carb"')),
    row('Heat', seg('Heat', [['mild','Mild'],['medium','Medium'],['hot','Hot']], p.heat, 'pref', 'data-k="heat"')),
    row('Dessert first on Tonight', seg('Dessert preference', [['any','Any']].concat(DESSERTS.map(d => [d.id, d.short.replace('Protein ', '')])), p.dessert, 'pref', 'data-k="dessert"')),
    row('Default dinner', seg('Default dinner', DINNERS.map(d => [d.id, d.short.split(' ')[0]]), p.defaultMeal, 'pref', 'data-k="defaultMeal"')),
  ].join(''))}
  ${section('App', [
    toggle('autoRecommend', 'Recommend tonight’s dinner', 'Picks based on favorites, what’s in stock, and what you had recently. Off: shows your last or default dinner.'),
    toggle('nutritionProminent', 'Show nutrition prominently', 'Off: one compact line instead of the full grid.'),
    toggle('trackInventory', 'Track inventory', 'Stock status, shopping lists and “What can I make?”'),
    row('Appearance', seg('Appearance', [['system','System'],['light','Light'],['dark','Dark']], p.theme, 'pref', 'data-k="theme"')),
  ].join(''))}
  ${section('Reset', `<div class="btn-row"><button type="button" class="btn small" data-a="rerun-setup">Run setup again</button><button type="button" class="btn small" data-a="reset-inv">Reset inventory</button><button type="button" class="btn small danger" data-a="reset-app">Reset everything</button></div>`)}
  <p class="fine">Everything stays on this device. No account, nothing sent anywhere.</p>`;
}
