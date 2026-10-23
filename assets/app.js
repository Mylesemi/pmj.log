(() => {
  'use strict';

  // 페이지마다 <body data-src="..." data-view="cards|shelf">로 데이터 파일과 보기 방식을 지정한다
  const DATA_SRC = document.body.dataset.src || 'projects.json';
  const VIEW = document.body.dataset.view === 'shelf' ? 'shelf' : 'cards';
  const GROUP = document.body.dataset.group === 'category' ? 'category' : 'year';
  const DEFAULT_CATEGORIES = [
    { key: 'tool', label: 'Tool', badge: 'TOOL', unit: '개' },
    { key: 'material', label: '자료', badge: 'NOTE', unit: '개' },
  ];
  let CATEGORIES = [];
  let CATEGORY_LABEL = {};
  function setCategories(list) {
    CATEGORIES = [{ key: 'all', label: '전체' }, ...list];
    CATEGORY_LABEL = Object.fromEntries(list.map((c) => [c.key, c.badge || c.label]));
  }

  const ICONS = {
    arrow: '<svg viewBox="0 0 24 24"><path d="M7 17 17 7M8 7h9v9"/></svg>',
    code: '<svg viewBox="0 0 24 24"><path d="m8 7-5 5 5 5M16 7l5 5-5 5"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  };
  const CATEGORY_ICONS = {
    tool: '<svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3.5 17.5a2.1 2.1 0 0 0 3 3l5.8-5.8a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.5-.5-.5-2.5z"/></svg>',
    material: '<svg viewBox="0 0 24 24"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>',
    movie: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 7.5h4M3 16.5h4M17 7.5h4M17 16.5h4M3 12h18"/></svg>',
  };
  // projects.json 항목의 "icon" 값으로 고르는 아이콘
  const ITEM_ICONS = {
    calculator: '<svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h4"/></svg>',
    'file-code': '<svg viewBox="0 0 24 24"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M10 12l-2 2 2 2M14 12l2 2-2 2"/></svg>',
    'book-open': '<svg viewBox="0 0 24 24"><path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/></svg>',
    chart: '<svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-6"/><path d="M16 8h4v4"/></svg>',
    pencil: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    map: '<svg viewBox="0 0 24 24"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
    images: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/><circle cx="8" cy="12" r="1.5"/><path d="m17 17-4-4-7 7"/></svg>',
    palette: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/></svg>',
    library: '<svg viewBox="0 0 24 24"><path d="M4 4v16M8 4v16M12 6l4-1.5 4 15-4 1.5z"/><path d="M3 20h18"/></svg>',
  };
  // 표지 색상: id 해시로 고정 배정해 새로고침해도 같은 색이 나온다
  const COVER_COLORS = ['#4c46d6', '#13845b', '#d5501c', '#cf3271', '#0e7383', '#1f5fd1', '#9d2bb0', '#b7791f', '#0f766e', '#c2410c', '#5b3fc4', '#be2d4a'];

  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isExternal = (url) => /^https?:\/\//i.test(url || '');
  const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

  const state = { cat: 'all', tag: '', q: '', sort: 'date' };
  let items = [];

  /* ---------- URL hash <-> state ---------- */
  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    state.cat = CATEGORIES.some((c) => c.key === p.get('cat')) ? p.get('cat') : 'all';
    state.tag = p.get('tag') || '';
    state.q = p.get('q') || '';
    state.sort = p.get('sort') === 'title' ? 'title' : 'date';
  }
  function writeHash() {
    const p = new URLSearchParams();
    if (state.cat !== 'all') p.set('cat', state.cat);
    if (state.tag) p.set('tag', state.tag);
    if (state.q) p.set('q', state.q);
    if (state.sort !== 'date') p.set('sort', state.sort);
    const h = p.toString();
    history.replaceState(null, '', h ? '#' + h : location.pathname + location.search);
  }

  /* ---------- Hero ---------- */
  function renderProfile(profile = {}) {
    if (profile.name) document.title = profile.name === 'pmj.log' ? 'pmj.log' : `${profile.name} · pmj.log`;
    $('#hero-eyebrow').textContent = profile.eyebrow || '';
    const lines = profile.headline || [profile.name || ''];
    $('#hero-title').innerHTML = lines.map((l, i) => `<span${i ? ' class="accent"' : ''}>${esc(l)}</span>`).join('');
    $('#hero-tagline').textContent = profile.tagline || '';
    const links = [];
    if (profile.github) links.push(`<a href="${esc(profile.github)}" target="_blank" rel="noopener">GitHub${ICONS.arrow}</a>`);
    if (profile.email) links.push(`<a href="mailto:${esc(profile.email)}">${esc(profile.email)}${ICONS.arrow}</a>`);
    (profile.links || []).forEach((l) => links.push(`<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}${ICONS.arrow}</a>`));
    $('#profile-links').innerHTML = links.join('');
  }

  function renderStats() {
    const n = (cat) => items.filter((i) => i.category === cat).length;
    $('#stats').innerHTML = CATEGORIES.filter((c) => c.key !== 'all' && n(c.key) > 0)
      .map((c) => `<span>${esc(c.label)} <b>${n(c.key)}</b>${esc(c.unit || '개')}</span>`).join('<i aria-hidden="true">·</i>');
  }

  /* ---------- Toolbar ---------- */
  function renderTabs() {
    $('#category-tabs').innerHTML = CATEGORIES.map((c) => {
      const count = c.key === 'all' ? items.length : items.filter((i) => i.category === c.key).length;
      if (!count && c.key !== 'all') return ''; // 비어 있는 카테고리는 탭을 숨긴다
      return `<button class="tab" role="tab" type="button" data-cat="${c.key}" aria-selected="${state.cat === c.key}">${esc(c.label)}<span class="count">${count}</span></button>`;
    }).join('');
  }

  function renderChips() {
    const pool = state.cat === 'all' ? items : items.filter((i) => i.category === state.cat);
    const counts = new Map();
    pool.forEach((i) => (i.tags || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
    const tags = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b, 'ko'));
    if (state.tag && !counts.has(state.tag)) state.tag = '';
    $('#tag-chips').innerHTML = tags.length
      ? `<button class="chip" type="button" data-tag="" aria-pressed="${!state.tag}">전체 태그</button>` +
        tags.map((t) => `<button class="chip" type="button" data-tag="${esc(t)}" aria-pressed="${state.tag === t}">#${esc(t)}</button>`).join('')
      : '';
  }

  /* ---------- Items ---------- */
  const linkAttrs = (url) => (isExternal(url) ? ' target="_blank" rel="noopener"' : ' target="_blank"');
  const shortDate = (d) => (d ? d.slice(0, 7).replace('-', '.') : '');

  // 블로그 제목 "작품 - 부제" 형태를 표지의 큰 제목과 작은 부제로 나눈다
  function splitTitle(title) {
    const m = String(title).match(/^(.{2,}?)\s*(?:\s-\s|\s—\s|-|:|\|)\s*(.{2,})$/);
    return m ? [m[1].trim(), m[2].trim()] : [String(title).trim(), ''];
  }

  function coverHTML(item) {
    const [main, sub] = splitTitle(item.title);
    const color = COVER_COLORS[hash(item.id || item.title) % COVER_COLORS.length];
    const kind = CATEGORY_LABEL[item.category] || item.category;
    return `
      <div class="slot">
        <a class="cover" data-cat="${esc(item.category)}" style="--cv:${color}" href="${esc(item.url)}"${linkAttrs(item.url)}>
          <span class="cover-face">
            <span class="cover-kicker">${esc(kind)} · ${esc(shortDate(item.date))}</span>
            <strong class="cover-title">${esc(main)}</strong>
            <span class="cover-art" aria-hidden="true">${CATEGORY_ICONS[item.category] || CATEGORY_ICONS.book}</span>
            <span class="cover-sub">${esc(sub || kind)}</span>
          </span>
          <span class="cover-back" aria-hidden="true">
            <span class="cover-back-title">${esc(item.title)}</span>
            ${item.description ? `<span class="cover-back-desc">${esc(item.description)}</span>` : ''}
            <span class="cover-back-cta">읽기${ICONS.arrow}</span>
          </span>
        </a>
      </div>`;
  }

  function cardHTML(item) {
    const kind = CATEGORY_LABEL[item.category] || item.category;
    const icon = ITEM_ICONS[item.icon] || CATEGORY_ICONS[item.category] || CATEGORY_ICONS.tool;
    // 항목별 color가 있으면 그 색으로, 없으면 카테고리 색으로 카드를 칠한다
    const color = /^#[0-9a-f]{3,8}$/i.test(item.color || '') ? ` style="--c:${item.color}"` : '';
    const tags = (item.tags || []).map((t) => `<span>#${esc(t)}</span>`).join('');
    const repo = item.repo ? `<a class="card-link sub" href="${esc(item.repo)}" target="_blank" rel="noopener">${ICONS.code}소스코드</a>` : '';
    return `
      <article class="card" data-cat="${esc(item.category)}"${color}>
        <div class="card-head">
          <span class="card-tile" aria-hidden="true">${icon}</span>
          <span class="card-head-text">
            <span class="card-kicker">${esc(kind)}${item.kind ? `<i>·</i>${esc(item.kind)}` : ''}</span>
            <time class="card-date" datetime="${esc(item.date || '')}">${esc((item.date || '').replaceAll('-', '.'))}</time>
          </span>
        </div>
        <h3 class="card-title"><a href="${esc(item.url)}"${linkAttrs(item.url)}>${esc(item.title)}</a></h3>
        ${item.description ? `<p class="card-desc">${esc(item.description)}</p>` : ''}
        ${tags ? `<div class="card-tags">${tags}</div>` : ''}
        <div class="card-foot">
          <span class="card-link">열기${ICONS.arrow}</span>
          ${repo}
        </div>
      </article>`;
  }

  const itemHTML = (i) => (VIEW === 'shelf' ? coverHTML(i) : cardHTML(i));
  const listClass = VIEW === 'shelf' ? 'shelf' : 'grid';
  const unitOf = (list) => {
    const units = new Set(list.map((i) => (CATEGORIES.find((c) => c.key === i.category) || {}).unit || '개'));
    if (units.size === 1) return [...units][0];
    return VIEW === 'shelf' ? '편' : '개';
  };

  function filtered() {
    const q = state.q.trim().toLowerCase();
    return items
      .filter((i) => state.cat === 'all' || i.category === state.cat)
      .filter((i) => !state.tag || (i.tags || []).includes(state.tag))
      .filter((i) => !q || [i.title, i.description, ...(i.tags || [])].join(' ').toLowerCase().includes(q))
      .sort((a, b) => state.sort === 'title'
        ? (a.title || '').localeCompare(b.title || '', 'ko')
        : (b.date || '').localeCompare(a.date || ''));
  }

  // data-group="category"면 카테고리 순서대로, 아니면 최신순일 때 연도별로 묶는다
  function groupItems(list) {
    if (GROUP === 'category') {
      return CATEGORIES.filter((c) => c.key !== 'all')
        .map((c) => [c, list.filter((i) => i.category === c.key)])
        .filter(([, group]) => group.length);
    }
    if (state.sort !== 'date') return [[null, list]];
    const groups = new Map();
    list.forEach((i) => {
      const year = (i.date || '').slice(0, 4) || '날짜 없음';
      if (!groups.has(year)) groups.set(year, []);
      groups.get(year).push(i);
    });
    return [...groups];
  }

  function renderGrid() {
    const list = filtered();
    const groups = groupItems(list);
    const showHeads = GROUP === 'category' || groups.length > 1; // 카테고리 설명은 하나만 있어도 보여준다
    const head = (key, group) => (typeof key === 'object' && key
      ? `<h2 class="group-head is-category"><span>${esc(key.label)}</span><small>${group.length}${esc(key.unit || '개')}</small>${key.description ? `<em>${esc(key.description)}</em>` : ''}</h2>`
      : `<h2 class="group-head"><span>${esc(key)}</span><small>${group.length}${esc(unitOf(group))}</small></h2>`);
    $('#grid').innerHTML = groups.map(([key, group]) => `
      <section class="group">
        ${showHeads ? head(key, group) : ''}
        <div class="${listClass}">${group.map(itemHTML).join('')}</div>
      </section>`).join('');
    $('#empty').hidden = list.length > 0;
    $('#result-count').textContent = `${list.length}${unitOf(list)}`;
  }

  function renderFeatured() {
    const list = items.filter((i) => i.featured);
    $('#featured-section').hidden = list.length === 0;
    $('#featured').className = listClass;
    $('#featured').innerHTML = list.map(itemHTML).join('');
  }

  function update() {
    renderTabs();
    renderChips();
    renderGrid();
    $('#search').value = state.q;
    $('#sort').value = state.sort;
    writeHash();
  }

  /* ---------- Events ---------- */
  function bindEvents() {
    $('#category-tabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (b) { state.cat = b.dataset.cat; update(); }
    });
    $('#tag-chips').addEventListener('click', (e) => {
      const b = e.target.closest('[data-tag]');
      if (b) { state.tag = b.dataset.tag === state.tag ? '' : b.dataset.tag; update(); }
    });
    let t;
    $('#search').addEventListener('input', (e) => {
      clearTimeout(t);
      t = setTimeout(() => { state.q = e.target.value; update(); }, 120);
    });
    $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; update(); });
    $('#reset').addEventListener('click', () => {
      Object.assign(state, { cat: 'all', tag: '', q: '', sort: 'date' });
      update();
    });
    window.addEventListener('hashchange', () => { readHash(); update(); });

    $('#theme-toggle').addEventListener('click', () => {
      const root = document.documentElement;
      const current = root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const next = current === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
    });

    // 툴바가 상단에 붙으면 경계선 표시
    const toolbar = $('.toolbar');
    const sentinel = document.createElement('div');
    toolbar.before(sentinel);
    new IntersectionObserver(([en]) => toolbar.classList.toggle('is-stuck', !en.isIntersecting)).observe(sentinel);
  }

  /* ---------- Init ---------- */
  async function init() {
    bindEvents();
    try {
      const res = await fetch(DATA_SRC, { cache: 'no-cache' });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      setCategories(Array.isArray(data.categories) && data.categories.length ? data.categories : DEFAULT_CATEGORIES);
      items = (data.items || []).filter((i) => i && i.title && i.url);
      renderProfile(data.profile);
      const updated = items.map((i) => i.date || '').sort().pop();
      if (updated) $('#updated').textContent = `마지막 업데이트 ${updated.replaceAll('-', '.')}`;
    } catch (err) {
      $('#grid').innerHTML = `<p class="empty">${esc(DATA_SRC)}을 불러오지 못했어요. 로컬에서는 <code>python -m http.server</code>로 서버를 띄워 열어주세요.</p>`;
      console.error(err);
      return;
    }
    readHash();
    renderStats();
    renderFeatured();
    update();
  }

  init();
})();
