(() => {
  'use strict';

  const CATEGORIES = [
    { key: 'all', label: '전체' },
    { key: 'tool', label: 'Tool' },
    { key: 'material', label: '자료' },
  ];
  const CATEGORY_LABEL = { tool: 'TOOL', material: '자료' };

  const ICONS = {
    open: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    ext: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    code: '<svg viewBox="0 0 24 24"><path d="m8 7-5 5 5 5M16 7l5 5-5 5"/></svg>',
    github: '<svg viewBox="0 0 24 24"><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
  };

  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isExternal = (url) => /^https?:\/\//i.test(url || '');

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

  /* ---------- Rendering ---------- */
  function renderProfile(profile = {}) {
    if (profile.name) {
      $('#profile-name').textContent = profile.name;
      document.title = profile.name;
    }
    $('#profile-tagline').textContent = profile.tagline || '';
    const links = [];
    if (profile.github) links.push(`<a href="${esc(profile.github)}" target="_blank" rel="noopener">${ICONS.github}GitHub</a>`);
    if (profile.email) links.push(`<a href="mailto:${esc(profile.email)}">${ICONS.mail}${esc(profile.email)}</a>`);
    (profile.links || []).forEach((l) => links.push(`<a href="${esc(l.url)}" target="_blank" rel="noopener">${ICONS.link}${esc(l.label)}</a>`));
    $('#profile-links').innerHTML = links.join('');
  }

  function renderStats() {
    const n = (cat) => items.filter((i) => i.category === cat).length;
    $('#stats').innerHTML =
      `<div class="stat"><b>${n('tool')}</b><span>Tool</span></div>` +
      `<div class="stat"><b>${n('material')}</b><span>자료</span></div>`;
  }

  function renderTabs() {
    $('#category-tabs').innerHTML = CATEGORIES.map((c) => {
      const count = c.key === 'all' ? items.length : items.filter((i) => i.category === c.key).length;
      return `<button class="tab" role="tab" type="button" data-cat="${c.key}" aria-selected="${state.cat === c.key}">${c.label}<span class="count">${count}</span></button>`;
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

  function cardHTML(item, featured = false) {
    const ext = isExternal(item.url);
    const target = ext ? ' target="_blank" rel="noopener"' : ' target="_blank"';
    const initial = esc((item.title || '?').trim().charAt(0).toUpperCase());
    // placeholder를 항상 깔고, 썸네일이 있으면 위에 얹는다 (로드 실패 시 이미지만 제거)
    const thumb = `<div class="thumb-placeholder" aria-hidden="true">${initial}</div>` +
      (item.thumbnail ? `<img src="${esc(item.thumbnail)}" alt="" loading="lazy" onerror="this.remove()">` : '');
    const date = item.date ? `<time datetime="${esc(item.date)}">${esc(item.date.replaceAll('-', '.'))}</time>` : '';
    const extMark = ext ? `<span class="ext" title="외부 링크">${ICONS.ext}외부</span>` : '';
    const tags = (item.tags || []).map((t) => `<span>${esc(t)}</span>`).join('');
    const repo = item.repo ? `<a class="btn" href="${esc(item.repo)}" target="_blank" rel="noopener">${ICONS.code}소스코드</a>` : '';

    return `
      <article class="card${featured ? ' is-featured' : ''}" data-cat="${esc(item.category)}">
        <div class="thumb">${thumb}</div>
        <div class="card-body">
          <div class="card-meta"><span class="badge">${CATEGORY_LABEL[item.category] || esc(item.category)}</span>${date}${extMark}</div>
          <h3 class="card-title"><a href="${esc(item.url)}"${target}>${esc(item.title)}</a></h3>
          ${item.description ? `<p class="card-desc">${esc(item.description)}</p>` : ''}
          ${tags ? `<div class="card-tags">${tags}</div>` : ''}
          ${repo ? `<div class="card-actions">${repo}</div>` : ''}
        </div>
      </article>`;
  }

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

  function renderGrid() {
    const list = filtered();
    $('#grid').innerHTML = list.map((i) => cardHTML(i)).join('');
    $('#empty').hidden = list.length > 0;
    $('#result-count').textContent = `${list.length}개 항목`;
  }

  function renderFeatured() {
    const list = items.filter((i) => i.featured);
    $('#featured-section').hidden = list.length === 0;
    $('#featured').innerHTML = list.map((i) => cardHTML(i, true)).join('');
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
      const res = await fetch('projects.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      items = (data.items || []).filter((i) => i && i.title && i.url);
      renderProfile(data.profile);
      const updated = items.map((i) => i.date || '').sort().pop();
      if (updated) $('#updated').textContent = `마지막 업데이트 ${updated.replaceAll('-', '.')}`;
    } catch (err) {
      $('#grid').innerHTML = `<p class="empty">projects.json을 불러오지 못했어요. 로컬에서는 <code>python -m http.server</code>로 서버를 띄워 열어주세요.</p>`;
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
