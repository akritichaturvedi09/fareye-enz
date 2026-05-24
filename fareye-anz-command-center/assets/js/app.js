
(function(){
  const data = window.FarEyeData || {};
  const $ = (sel, scope=document) => scope.querySelector(sel);
  const $$ = (sel, scope=document) => Array.from(scope.querySelectorAll(sel));
  const norm = v => String(v || '').toLowerCase();
  const typeClass = type => String(type || '').replace(' Opportunity','').replace(' Customer / Reference','').replace(/\s+/g,'-').replace('&','and');

  document.addEventListener('DOMContentLoaded', () => {
    setActiveNav();
    initMenu();
    initReveal();
    initCounters();
    initCharts();
    initAccordions();
    renderMarketGroups();
    renderAccountCards();
    renderMap();
    renderDatabase();
    renderPriority();
    initContactForm();
    initModal();
    initHeroTilt();
  });

  function setActiveNav(){
    const page = location.pathname.split('/').pop() || 'index.html';
    $$('.nav-pill a').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (href === page || (page === '' && href === 'index.html')) a.classList.add('active');
    });
  }
  function initMenu(){
    const btn = $('.menu-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => document.body.classList.toggle('menu-open'));
    $$('.nav-pill a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('menu-open')));
  }
  function initReveal(){
    const els = $$('.reveal, .card, .kpi-card, .metric-card, .account-card, .chart-card');
    if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('in')); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting){ entry.target.classList.add('in'); io.unobserve(entry.target); }
      });
    }, {threshold:.12});
    els.forEach(el => { el.classList.add('reveal'); io.observe(el); });
  }
  function initCounters(){
    const counters = $$('[data-count]');
    const animate = el => {
      const raw = el.dataset.count || '0';
      const target = Number(raw.replace(/[^0-9.]/g,''));
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
      if (!target) return;
      let start = null;
      const duration = 1100;
      const step = ts => {
        if (!start) start = ts;
        const p = Math.min((ts - start)/duration,1);
        const eased = 1 - Math.pow(1-p,3);
        const val = target * eased;
        el.textContent = prefix + (target % 1 ? val.toFixed(1) : Math.round(val).toLocaleString()) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!('IntersectionObserver' in window)) { counters.forEach(animate); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting){ animate(e.target); io.unobserve(e.target); } });
    }, {threshold:.3});
    counters.forEach(c => io.observe(c));
  }
  function initCharts(){
    const fill = () => $$('.chart-fill').forEach(el => el.style.width = (el.dataset.width || 70) + '%');
    if (!('IntersectionObserver' in window)) return fill();
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting){ e.target.style.width = (e.target.dataset.width || 70) + '%'; io.unobserve(e.target); }});
    }, {threshold:.25});
    $$('.chart-fill').forEach(el => io.observe(el));
  }
  function initAccordions(){
    $$('.accordion').forEach(acc => {
      const items = $$('.accordion-item', acc);
      items.forEach((item, idx) => {
        const btn = $('.accordion-button', item);
        if (idx === 0) item.classList.add('open');
        btn && btn.addEventListener('click', () => {
          items.forEach(i => { if (i !== item) i.classList.remove('open'); });
          item.classList.toggle('open');
        });
      });
    });
  }
  function marketCard(m){
    return `<article class="card chart-card">
      <span class="growth-badge">${m.cagr}</span>
      <h3>${m.title}</h3>
      <div class="chart-meta"><span>${m.start}</span><span>${m.period}</span></div>
      <div class="chart-line"><div class="chart-fill" data-width="${m.width}"></div></div>
      <div class="market-end">${m.end}</div>
      <p>${m.note}</p>
    </article>`;
  }
  function renderMarketGroups(){
    $$('[data-market-group]').forEach(el => {
      const group = el.dataset.marketGroup;
      const items = (data.marketGroups && data.marketGroups[group]) || [];
      el.innerHTML = items.map(marketCard).join('');
    });
    setTimeout(initCharts, 50);
  }
  function complexitySpan(c){
    const cls = String(c || '').replace('Very High','Very High').replace('Medium-High','Medium-High');
    return `<span class="complexity ${cls}">${c}</span>`;
  }
  function typeBadge(type){
    let cls = 'strategic';
    if (/Quick/i.test(type)) cls = 'quick';
    if (/Existing/i.test(type)) cls = 'core';
    if (/Long/i.test(type)) cls = 'long';
    return `<span class="badge ${cls}">${type}</span>`;
  }
  function accountCard(a){
    return `<article class="card account-card" data-company="${escapeHtml(a.company)}">
      <div class="account-top">
        <div><p class="country">${a.country} · ${a.segment}</p><h3 class="account-name">${a.company}</h3></div>
        <div class="score-ring" style="--score:${a.score}"><strong>${a.score}/10</strong></div>
      </div>
      <div class="meta">${complexitySpan(a.complexity)}${typeBadge(a.type)}</div>
      <div class="fitbar" style="--score:${a.score}"><i></i></div>
      <p class="small"><strong>Why high potential:</strong> ${a.why}</p>
      <p class="small"><strong>Signals:</strong> ${a.signals}</p>
      <div class="account-actions"><span class="pill">${a.fleet}</span><button class="text-link" data-open-account="${escapeHtml(a.company)}">Open intelligence</button></div>
    </article>`;
  }
  function renderAccountCards(){
    $$('[data-render="accounts"]').forEach(el => {
      let list = (data.accounts || []).slice();
      const segment = el.dataset.segment;
      const include = el.dataset.include ? el.dataset.include.split('|').map(s => s.trim()) : null;
      const limit = Number(el.dataset.limit || 0);
      if (segment) list = list.filter(a => a.segment === segment);
      if (include) list = include.map(name => list.find(a => a.company === name) || (data.accounts || []).find(a => a.company === name)).filter(Boolean);
      if (limit) list = list.slice(0, limit);
      el.innerHTML = list.map(accountCard).join('');
    });
  }
  function renderMap(){
    const app = $('#map-app');
    if (!app) return;
    const pins = data.mapPins || [];
    app.innerHTML = `
      <div class="map-layout">
        <div class="map-panel">
          <div class="map-controls">
            ${select('map-country','Country',['All','AU','NZ','AU/NZ','NZ/AU'])}
            ${select('map-segment','Segment',['All','Manufacturing D2C','Distribution','Freight & 3PL','Retail'])}
            ${select('map-type','Opportunity Type',['All','Existing Customer / Reference','Strategic Enterprise Target','Quick-Win Opportunity','Long-Term Transformational Opportunity'])}
            ${select('map-complexity','Complexity',['All','Very High','High','Medium-High','Medium'])}
            <button class="map-zoom" data-zoom="in">Zoom +</button><button data-zoom="out">Zoom -</button>
          </div>
          <div class="anz-map-wrap" id="anz-map-wrap">
            ${anzSvg()}
            ${pins.map(p => `<button class="map-pin ${typeClass(p.type)}" title="${escapeHtml(p.company)}" data-company="${escapeHtml(p.company)}" data-country="${p.country}" data-segment="${p.segment}" data-type="${p.type}" data-complexity="${p.complexity}" style="left:${p.x}%;top:${p.y}%"></button>`).join('')}
          </div>
          <div class="map-legend">
            <span class="legend-item"><i class="legend-dot" style="background:#7db4ff"></i> Existing Customer / Reference</span>
            <span class="legend-item"><i class="legend-dot" style="background:#eaff65"></i> Strategic Enterprise Target</span>
            <span class="legend-item"><i class="legend-dot" style="background:#72ead3"></i> Quick-Win Opportunity</span>
            <span class="legend-item"><i class="legend-dot" style="background:#ffe8a5"></i> Long-Term Transformational</span>
          </div>
        </div>
        <aside class="detail-panel" id="map-detail">
          <p class="section-label">Pin intelligence</p>
          <h3>Click an account pin</h3>
          <p class="empty">Filter by geography, segment, opportunity type and complexity. Then open a pin to view fit, logistics signals and recommended motion.</p>
          <div class="pin-list">${pins.map(p => `<button data-company="${escapeHtml(p.company)}"><strong>${p.company}</strong><span>${p.segment} · ${p.type}</span></button>`).join('')}</div>
        </aside>
      </div>`;
    const refresh = () => {
      const c = $('#map-country').value, s = $('#map-segment').value, t = $('#map-type').value, cx = $('#map-complexity').value;
      $$('.map-pin').forEach(pin => {
        const ok = (c==='All' || pin.dataset.country === c || pin.dataset.country.includes(c)) && (s==='All' || pin.dataset.segment===s) && (t==='All' || pin.dataset.type===t) && (cx==='All' || pin.dataset.complexity===cx);
        pin.classList.toggle('hidden', !ok);
      });
    };
    $$('.map-controls select').forEach(sel => sel.addEventListener('change', refresh));
    $$('.map-pin, .pin-list button').forEach(btn => btn.addEventListener('click', () => showPin(btn.dataset.company)));
    let zoom = 1;
    $$('[data-zoom]').forEach(btn => btn.addEventListener('click', () => { zoom += btn.dataset.zoom === 'in' ? .12 : -.12; zoom = Math.max(1, Math.min(1.55, zoom)); $('#anz-map-wrap').style.transform = `scale(${zoom})`; }));
    function showPin(company){
      const pin = pins.find(p => p.company === company);
      const acct = (data.accounts || []).find(a => a.company === company || a.company.startsWith(company));
      if (!pin) return;
      $('#map-detail').innerHTML = `<p class="section-label">${pin.segment}</p><h3>${pin.company}</h3>
        <div class="meta">${complexitySpan(pin.complexity)}${typeBadge(pin.type)}<span class="pill">Fit ${pin.score}/10</span></div>
        <p>${acct ? acct.why : 'High-potential account with logistics orchestration relevance.'}</p>
        <div class="fitbar" style="--score:${pin.score}"><i></i></div>
        <p class="muted"><strong>Operational signals:</strong> ${acct ? acct.signals : 'Multi-location logistics, delivery visibility, route orchestration.'}</p>
        <div class="spacer"></div><a class="btn primary" href="target-accounts.html?account=${encodeURIComponent(pin.company)}">Open full account view</a>`;
    }
  }
  function select(id,label,opts){ return `<select id="${id}" aria-label="${label}">${opts.map(o => `<option value="${o}">${o}</option>`).join('')}</select>`; }
  function anzSvg(){
    return `<svg class="anz-svg" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="land" x1="0" x2="1"><stop stop-color="#255a68"/><stop offset="1" stop-color="#0e3a4c"/></linearGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <path d="M225 148 L330 88 L462 94 L585 160 L645 270 L604 420 L484 496 L332 462 L205 390 L145 266 Z" fill="url(#land)" opacity=".9" stroke="rgba(255,255,255,.25)" stroke-width="2"/>
      <path d="M735 250 L785 208 L825 268 L805 358 L758 347 Z" fill="url(#land)" opacity=".9" stroke="rgba(255,255,255,.25)" stroke-width="2"/>
      <path d="M800 390 L850 356 L885 425 L852 505 L805 462 Z" fill="url(#land)" opacity=".9" stroke="rgba(255,255,255,.25)" stroke-width="2"/>
      <path class="route-line" d="M560 335 C640 250 694 255 762 306" fill="none" stroke="#72ead3" stroke-width="3" opacity=".68" filter="url(#glow)"/>
      <path class="route-line" d="M420 315 C496 210 570 192 678 227" fill="none" stroke="#eaff65" stroke-width="3" opacity=".58" filter="url(#glow)"/>
      <path class="route-line" d="M280 350 C400 456 590 456 828 438" fill="none" stroke="#7db4ff" stroke-width="3" opacity=".52" filter="url(#glow)"/>
      <text x="242" y="138" fill="rgba(255,255,255,.48)" font-size="18" font-weight="800">Australia</text>
      <text x="780" y="225" fill="rgba(255,255,255,.48)" font-size="18" font-weight="800">NZ</text>
    </svg>`;
  }
  function renderDatabase(){
    const app = $('#account-database');
    if (!app) return;
    const segments = unique(data.accounts.map(a => a.segment));
    const countries = unique(data.accounts.map(a => a.country));
    const types = unique(data.accounts.map(a => a.type));
    const complexities = unique(data.accounts.map(a => a.complexity));
    app.innerHTML = `<div class="database-card">
      <div class="database-controls">
        <input id="db-search" type="search" placeholder="Search company, signals, account fit..." aria-label="Search target accounts">
        ${dbSelect('db-country','Country',countries)}${dbSelect('db-segment','Segment',segments)}${dbSelect('db-type','Opportunity Type',types)}${dbSelect('db-complexity','Complexity',complexities)}${dbSelect('db-score','Fit Score',['9+','8+','7+','All'])}
        <span class="result-count" id="db-count"></span>
      </div>
      <div class="table-wrap"><table class="account-table"><thead><tr>
        <th><button class="sort-button" data-sort="company">Company</button></th><th>Country</th><th>Segment</th><th>Fleet Model</th><th>Complexity</th><th><button class="sort-button" data-sort="score">Fit Score</button></th><th>Opportunity</th><th>Why High Potential</th><th>Operational Signals</th>
      </tr></thead><tbody id="db-body"></tbody></table></div>
    </div>`;
    const qs = new URLSearchParams(location.search);
    if (qs.get('account')) $('#db-search').value = qs.get('account');
    if (qs.get('segment') && $('#db-segment')) $('#db-segment').value = qs.get('segment');
    if (app.dataset.defaultSegment && $('#db-segment')) $('#db-segment').value = app.dataset.defaultSegment;
    let sort = 'score', sortDir = -1;
    const render = () => {
      const q = norm($('#db-search').value), c = $('#db-country').value, s = $('#db-segment').value, t = $('#db-type').value, cx = $('#db-complexity').value, sc = $('#db-score').value;
      let rows = data.accounts.filter(a => {
        const hay = norm([a.company,a.country,a.segment,a.fleet,a.complexity,a.type,a.why,a.signals].join(' '));
        return (!q || hay.includes(q)) && (c==='All' || a.country===c) && (s==='All'||a.segment===s) && (t==='All'||a.type===t) && (cx==='All'||a.complexity===cx) && (sc==='All' || a.score >= Number(sc.replace('+','')));
      });
      rows.sort((a,b) => sort === 'score' ? (a.score-b.score)*sortDir : a.company.localeCompare(b.company)*sortDir);
      $('#db-count').textContent = `${rows.length} accounts`;
      $('#db-body').innerHTML = rows.map(a => `<tr>
        <td class="table-company"><strong>${a.company}</strong><span>${a.type}</span></td><td>${a.country}</td><td>${a.segment}</td><td>${a.fleet}</td><td>${complexitySpan(a.complexity)}</td><td><span class="score-pill">${a.score}/10</span></td><td>${typeBadge(a.type)}</td><td>${a.why}</td><td>${a.signals}</td>
      </tr>`).join('');
    };
    $$('.database-controls input, .database-controls select').forEach(el => el.addEventListener('input', render));
    $$('.sort-button').forEach(btn => btn.addEventListener('click', () => { const srt = btn.dataset.sort; sortDir = sort === srt ? sortDir * -1 : (srt === 'score' ? -1 : 1); sort = srt; render(); }));
    render();
  }
  function dbSelect(id,label,opts){ return `<select id="${id}" aria-label="${label}"><option value="All">${label}</option>${opts.map(o => `<option value="${o}">${o}</option>`).join('')}</select>`; }
  function unique(arr){ return Array.from(new Set(arr.filter(Boolean))).sort(); }
  function renderPriority(){
    const app = $('#priority-app');
    if (!app) return;
    const byName = name => (data.accounts || []).find(a => a.company === name || a.company.startsWith(name));
    const section = (title, names, cls='') => `<div class="matrix-col"><h3>${title}</h3>${names.map(n => { const a = byName(n); return `<span class="pill">${a ? a.company : n}</span>`; }).join('')}</div>`;
    app.innerHTML = `<div class="priority-list rank-grid">${data.topTen.map(n => { const a = byName(n); return `<article class="card rank-card"><p class="country">${a ? a.country : 'ANZ'} · ${a ? a.segment : 'Priority Account'}</p><h3>${a ? a.company : n}</h3><p>${a ? a.why : 'Strategic enterprise opportunity.'}</p><div class="meta">${a ? complexitySpan(a.complexity) + typeBadge(a.type) : ''}</div></article>`; }).join('')}</div>
      <div class="spacer"></div><div class="matrix">${section('Quick-win opportunities', data.quickWins)}${section('Strategic enterprise targets', data.enterpriseTargets)}${section('Long-term transformational targets', data.transformational)}${section('Core GTM segments', ['Retail','Manufacturing D2C','Freight & 3PL','Distribution'])}</div>`;
  }
  function initContactForm(){
    const form = $('.contact-form');
    if (!form) return;
    form.addEventListener('submit', e => { e.preventDefault(); $('.form-note', form).textContent = 'Thanks. This static demo captured the action state; connect the form to CRM or email in production.'; form.reset(); });
  }
  function initModal(){
    document.body.insertAdjacentHTML('beforeend', `<div class="modal" id="account-modal" role="dialog" aria-modal="true"><div class="modal-dialog"><button class="modal-close" aria-label="Close">×</button><div id="modal-content"></div></div></div>`);
    const modal = $('#account-modal');
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-open-account]');
      if (btn) { const a = (data.accounts || []).find(x => x.company === btn.dataset.openAccount); if (a) openModal(a); }
      if (e.target.matches('.modal-close') || e.target === modal) modal.classList.remove('open');
    });
    function openModal(a){
      $('#modal-content').innerHTML = `<p class="section-label">Account intelligence</p><h3>${a.company}</h3><div class="meta">${complexitySpan(a.complexity)}${typeBadge(a.type)}<span class="pill">${a.segment}</span></div><p>${a.why}</p><div class="modal-grid"><div class="modal-metric"><span>Country</span><strong>${a.country}</strong></div><div class="modal-metric"><span>Fit score</span><strong>${a.score}/10</strong></div><div class="modal-metric"><span>Fleet model</span><strong>${a.fleet}</strong></div><div class="modal-metric"><span>Signals</span><strong>${a.signals}</strong></div></div>`;
      modal.classList.add('open');
    }
  }
  function initHeroTilt(){
    const hero = $('.hero-visual');
    if (!hero || matchMedia('(max-width: 900px)').matches) return;
    hero.addEventListener('mousemove', e => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      hero.style.transform = `rotateX(${y*-4}deg) rotateY(${x*4}deg)`;
    });
    hero.addEventListener('mouseleave', () => hero.style.transform = 'rotateX(0) rotateY(0)');
  }
  function escapeHtml(str){ return String(str).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c])); }
})();
