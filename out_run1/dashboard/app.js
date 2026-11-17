// Token Radar's plain dashboard. Reads window.RADAR (written beside dashboard/ by main.ts) and
// renders the ranked board, search + category + chain filters, sortable columns, and a per-protocol
// detail view with the model's own inputs and the protocol's farm plan. No network: every byte shown
// is in data.js. Every row's farm steps come straight from board.json (main.ts wrote them), so the
// page and the board carry the same plan.

(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;

  var boardEl = document.getElementById('board');
  var rowsEl = document.getElementById('rows');
  var countEl = document.getElementById('count');
  var qEl = document.getElementById('q');
  var catEl = document.getElementById('cat');
  var chainEl = document.getElementById('chain');
  var resetEl = document.getElementById('reset');
  var detailEl = document.getElementById('detail');
  var dName = document.getElementById('d-name');
  var dMeta = document.getElementById('d-meta');
  var dModel = document.getElementById('d-model');
  var dList = document.getElementById('d-list');
  var dBack = document.getElementById('d-back');

  var state = { q: '', category: 'all', chain: 'all', sort: 'implied', dir: -1, selected: null };
  (function () {
    var params = new URLSearchParams(window.location.search);
    if (params.get('q')) state.q = params.get('q');
    if (params.get('category')) state.category = params.get('category');
    if (params.get('chain')) state.chain = params.get('chain');
    if (params.get('detail')) state.selected = params.get('detail');
  })();

  var usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd.format(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + ' y';
    return Math.max(0, Math.round(days)) + ' d';
  }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function el(tag, attrs) {
    var node = document.createElement(tag);
    var children = [];
    for (var i = 2; i < arguments.length; i++) children.push(arguments[i]);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    children.forEach(function (c) {
      if (c == null) return;
      if (Array.isArray(c)) { c.forEach(function (x) { if (x != null) node.appendChild(typeof x === 'string' ? document.createTextNode(x) : x); }); return; }
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function buildFilters() {
    var categories = [];
    var chains = [];
    DATA.rows.forEach(function (r) {
      if (r.category && categories.indexOf(r.category) < 0) categories.push(r.category);
      (r.chains || []).forEach(function (c) { if (chains.indexOf(c) < 0) chains.push(c); });
    });
    categories.sort(); chains.sort();
    catEl.innerHTML = '';
    chainEl.innerHTML = '';
    catEl.appendChild(el('option', { value: 'all', text: 'semua kategori' }));
    categories.forEach(function (c) { catEl.appendChild(el('option', { value: c, text: c, selected: c === state.category ? 'selected' : null })); });
    chainEl.appendChild(el('option', { value: 'all', text: 'semua rantai' }));
    chains.forEach(function (c) { chainEl.appendChild(el('option', { value: c, text: c, selected: c === state.chain ? 'selected' : null })); });
  }
  qEl.value = state.q;

  function filtered() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (state.category !== 'all' && r.category !== state.category) return false;
      if (state.chain !== 'all' && (r.chains || []).indexOf(state.chain) < 0) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  function sorted(list) {
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (state.sort === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (state.sort === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (state.sort === 'change') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (state.sort === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
      else { av = a.implied_value_usd; bv = b.implied_value_usd; }
      if (av < bv) return -state.dir;
      if (av > bv) return state.dir;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }

  function renderBoard() {
    var list = sorted(filtered());
    countEl.textContent = '(' + list.length + ' baris)';
    rowsEl.innerHTML = '';
    var max = list.length ? list[0].implied_value_usd : 1;
    list.forEach(function (r) {
      var growth = r.change_7d === null ? 'n/a' : fmtPct(r.change_7d);
      var gClass = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
      var tr = el('tr',
        { 'data-selected': state.selected === r.slug ? 'true' : 'false', tabindex: '0', class: state.selected === r.slug ? 'selected' : '' },
        el('td', { class: 'num', text: String(r.rank) }),
        el('td', null,
          el('b', { text: esc(r.name) }),
          el('br'),
          el('span', { class: 'sub', text: (r.category || 'Lain') + ' &bull; ' + ((r.chains && r.chains.length) ? r.chains.slice(0, 2).join(', ') : 'rantai tak bernama') })
        ),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + gClass, text: growth }),
        el('td', { class: 'num', text: fmtUsd(r.implied_value_usd) }),
        el('td', { class: 'num', text: fmtAge(r.age_days) }),
        el('td', { text: esc(r.category || 'Lain') }),
        el('td', { text: (r.chains || []).join(', ') || '&mdash;' }),
        el('td', null, el('button', { type: 'button', class: 'open', text: 'detail' }))
      );
      tr.querySelector('.open').addEventListener('click', function () { openDetail(r.slug); });
      tr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(r.slug); } });
      rowsEl.appendChild(tr);
    });
  }

  var sortable = document.querySelectorAll('thead th[data-sort]');
  sortable.forEach(function (th) {
    var btn = el('button', { type: 'button' }, [th.textContent]);
    th.textContent = '';
    th.appendChild(btn);
    btn.addEventListener('click', function () {
      if (state.sort === th.dataset.sort) state.dir = -state.dir;
      else { state.sort = th.dataset.sort; state.dir = -1; }
      renderBoard();
      updateSortMarks();
    });
  });
  function updateSortMarks() {
    sortable.forEach(function (th) { th.classList.toggle('sorted', th.dataset.sort === state.sort); th.classList.toggle('desc', th.dataset.sort === state.sort && state.dir < 0); });
  }
  updateSortMarks();

  qEl.addEventListener('input', function () { state.q = qEl.value; renderBoard(); });
  catEl.addEventListener('change', function () { state.category = catEl.value; renderBoard(); });
  chainEl.addEventListener('change', function () { state.chain = chainEl.value; renderBoard(); });
  resetEl.addEventListener('click', function () {
    state.q = ''; state.category = 'all'; state.chain = 'all';
    qEl.value = ''; catEl.value = 'all'; chainEl.value = 'all';
    renderBoard();
  });

  function metaRow(label, valueHtml) {
    return el('div', null, el('b', { text: label }), el('span', { html: valueHtml }));
  }

  function openDetail(slug) {
    var row = DATA.rows.filter(function (r) { return r.slug === slug; })[0];
    if (!row) return;
    state.selected = slug;
    boardEl.classList.add('hidden');
    detailEl.classList.remove('hidden');
    dName.textContent = esc(row.name) + ' (#' + row.rank + ' of ' + DATA.board_size + ')';
    dMeta.innerHTML = '';
    dMeta.appendChild(metaRow('Kategori', esc(row.category || 'Lain')));
    dMeta.appendChild(metaRow('Rantai', (row.chains && row.chains.length) ? esc(row.chains.join(', ')) : '&mdash;'));
    dMeta.appendChild(metaRow('TVL', fmtUsd(row.tvl_usd)));
    dMeta.appendChild(metaRow('Perubahan 7 hari', '<span class="' + (row.change_7d === null ? '' : row.change_7d >= 0 ? 'pos' : 'neg') + '">' + fmtPct(row.change_7d) + '</span>'));
    dMeta.appendChild(metaRow('Terdaftar sejak', row.listed_at || '&mdash;'));
    dMeta.appendChild(metaRow('Umur tanpa token', fmtAge(row.age_days)));
    dMeta.appendChild(metaRow('Terdapat di watchlist', 'ya'));
    dModel.innerHTML = '';
    dModel.appendChild(el('h3', { text: 'Model nilai implied (data-driven)' }));
    dModel.appendChild(el('p', { class: 'sub', text: 'Nilai implied dihitung hanya dari angka snapshot itu sendiri — tidak ada nama protokol yang difavoriskan secara manual.' }));
    var eq = el('div', { class: 'equation' });
    eq.appendChild(el('div', null, el('span', { text: 'TVL &times; kategori perbandingan' }), el('b', { text: fmtUsd(row.tvl_usd) + ' &times; ' + esc(row.category_multiple) })));
    eq.appendChild(el('div', null, el('span', { text: 'Protokol token perbandingan di kategori yang sama' }), el('b', { text: esc(row.comparables == null ? '-' : row.comparables) })));
    eq.appendChild(el('div', null, el('span', { text: 'Pengali pertumbuhan (7 hari)' }), el('b', { text: esc(row.growth_multiplier) })));
    eq.appendChild(el('div', null, el('span', { text: 'Pengali umur tanpa token' }), el('b', { text: esc(row.age_multiplier) })));
    eq.appendChild(el('div', null, el('span', { text: 'Nilai implied' }), el('b', { class: 'num', text: fmtUsd(row.implied_value_usd) })));
    dModel.appendChild(eq);
    dModel.appendChild(el('p', { class: 'sub', text: 'Rumus: implied = round( tvl &times; kategori_multiple &times; (1 + clamp(pertumbuhan7d, -50, 100) / 200) &times; (0.5 + min(umur, 730) / 730 &times; 0.5) ). Ini adalah estimasi, bukan harga.' }));
    dList.innerHTML = '';
    (row.farm_steps || []).forEach(function (s) { dList.appendChild(el('li', { text: s })); });
  }
  dBack.addEventListener('click', function () { state.selected = null; detailEl.classList.add('hidden'); boardEl.classList.remove('hidden'); });

  renderBoard();
  buildFilters();
  if (state.selected) openDetail(state.selected);
})();
