/* ==========================================================================
   唐诗三百首 · 交互逻辑（原生 JS，无框架）
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 1. 建立索引 ---------- */
  var FLAT = [];                       // 扁平列表，按序号定位
  var BY_ID = {};                      // id -> {poem, chapter, index}

  CHAPTERS.forEach(function (ch) {
    ch.poems.forEach(function (p, i) {
      var id = ch.id + '-' + String(i + 1).padStart(2, '0');
      var item = { id: id, poem: p, chapter: ch, num: i + 1 };
      FLAT.push(item);
      BY_ID[id] = item;
    });
  });

  var TOTAL = FLAT.length;

  /* 供搜索用的纯文本 */
  FLAT.forEach(function (it) {
    it.text = (it.poem.t + ' ' + it.poem.a + ' ' + it.chapter.name + ' ' +
               it.poem.c.join('')).replace(/\s+/g, '');
  });

  /* ---------- 2. DOM ---------- */
  var $ = function (s) { return document.querySelector(s); };

  var el = {
    toc:        $('#toc'),
    filterRow:  $('#filterRow'),
    statCount:  $('#statCount'),
    totalCount: $('#totalCount'),
    chapterCards: $('#chapterCards'),
    home:       $('#home'),
    poem:       $('#poem'),
    results:    $('#results'),
    resultsHead: $('#resultsHead'),
    resultsList: $('#resultsList'),
    title:      $('#poemTitle'),
    author:     $('#poemAuthor'),
    chapter:    $('#poemChapter'),
    body:       $('#poemBody'),
    trans:      $('#poemTrans'),
    notes:      $('#poemNotes'),
    apprec:     $('#poemApprec'),
    blockTr:    $('#blockTr'),
    blockNt:    $('#blockNt'),
    blockAp:    $('#blockAp'),
    prevBtn:    $('#prevBtn'),
    nextBtn:    $('#nextBtn'),
    randBtn:    $('#randBtn'),
    search:     $('#searchInput'),
    searchClear: $('#searchClear'),
    orientBtn:  $('#orientBtn'),
    menuBtn:    $('#menuBtn'),
    sidebar:    $('#sidebar'),
    scrim:      $('#scrim'),
    content:    $('#content')
  };

  /* ---------- 3. 工具 ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function highlight(text, kw) {
    if (!kw) return esc(text);
    var i = text.toLowerCase().indexOf(kw.toLowerCase());
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) +
           '<mark>' + esc(text.slice(i, i + kw.length)) + '</mark>' +
           esc(text.slice(i + kw.length));
  }

  function toParas(s) {
    return esc(s).split(/\n+/).map(function (p) {
      return p.trim() ? '<p>' + p + '</p>' : '';
    }).join('');
  }

  /* ---------- 4. 渲染卷首卡片 ---------- */
  el.chapterCards.innerHTML = CHAPTERS.map(function (ch) {
    return '<div class="chapter-card" data-chapter="' + ch.id + '" data-num="' + ch.num + '">' +
             '<h4>' + esc(ch.name) + '</h4>' +
             '<p>' + esc(ch.desc) + '</p>' +
             '<span class="n">共 ' + ch.poems.length + ' 首 · 展卷 →</span>' +
           '</div>';
  }).join('');

  el.totalCount.textContent = TOTAL;
  el.statCount.textContent = TOTAL + ' 首';

  /* ---------- 5. 渲染目录 ---------- */
  var collapsed = {};   // 章节折叠状态
  var filter = 'all';   // 当前筛选的卷

  el.filterRow.innerHTML = '<button class="chip is-active" data-chapter="all">全部</button>' +
    CHAPTERS.map(function (ch) {
      return '<button class="chip" data-chapter="' + ch.id + '">' + esc(ch.short || shortName(ch.name)) + '</button>';
    }).join('');

  function shortName(n) { return n.split('·')[1] ? n.split('·')[1].trim() : n; }

  function renderToc() {
    var html = CHAPTERS.filter(function (ch) {
      return filter === 'all' || ch.id === filter;
    }).map(function (ch) {
      var items = ch.poems.map(function (p, i) {
        var id = ch.id + '-' + String(i + 1).padStart(2, '0');
        return '<a class="toc-item" data-id="' + id + '" href="#/' + id + '">' +
                 '<span class="t">' + esc(p.t) + '</span>' +
                 '<span class="a">' + esc(p.a) + '</span>' +
               '</a>';
      }).join('');

      return '<div class="toc-chapter' + (collapsed[ch.id] ? ' is-collapsed' : '') + '" data-chapter="' + ch.id + '">' +
               '<button class="toc-chapter-head">' +
                 '<span>' + esc(ch.name) + '</span>' +
                 '<span class="cnt">' + ch.poems.length + '</span>' +
                 '<span class="chev">▾</span>' +
               '</button>' +
               '<div class="toc-list">' + items + '</div>' +
             '</div>';
    }).join('');

    el.toc.innerHTML = html || '<div class="empty"><span>空</span>此卷暂无篇目</div>';
    markActive();
  }

  function markActive() {
    var cur = currentId;
    el.toc.querySelectorAll('.toc-item').forEach(function (a) {
      a.classList.toggle('is-active', a.dataset.id === cur);
    });
  }

  renderToc();

  /* ---------- 6. 视图切换 ---------- */
  function show(name) {
    el.home.hidden    = name !== 'home';
    el.poem.hidden    = name !== 'poem';
    el.results.hidden = name !== 'results';
  }

  /* ---------- 7. 渲染诗篇 ---------- */
  var currentId = null;
  var vertical = localStorage.getItem('ts-vertical') === '1';

  function renderPoem(id) {
    var it = BY_ID[id];
    if (!it) { location.hash = '#/'; return; }

    var p = it.poem;
    currentId = id;

    el.title.textContent  = p.t;
    el.author.textContent = '〔唐〕' + p.a;
    el.chapter.textContent = it.chapter.name + ' · 第 ' + it.num + ' 首';

    /* 原文 */
    el.body.innerHTML = p.c.map(function (line, i) {
      return '<span class="ln" style="animation-delay:' + Math.min(i * 45, 900) + 'ms">' +
               esc(line) + '</span>';
    }).join('');

    /* 译文 */
    el.trans.innerHTML = toParas(p.tr || '');
    el.blockTr.hidden = !p.tr;

    /* 注释 */
    el.notes.innerHTML = (p.nt || []).map(function (n) {
      return '<div class="note"><dt>' + esc(n[0]) + '</dt><dd>' + esc(n[1]) + '</dd></div>';
    }).join('');
    el.blockNt.hidden = !p.nt || !p.nt.length;

    /* 赏析 */
    el.apprec.innerHTML = toParas(p.ap || '');
    el.blockAp.hidden = !p.ap;

    /* 上下首 */
    var i = FLAT.indexOf(it);
    bindNav(el.prevBtn, i - 1, '←', '上一首', false);
    bindNav(el.nextBtn, i + 1, '→', '下一首', true);

    /* 竖排 */
    el.body.classList.toggle('vertical', vertical);
    el.orientBtn.classList.toggle('is-on', vertical);
    el.orientBtn.querySelector('.btn-label').textContent = vertical ? '横排' : '竖排';

    show('poem');
    markActive();
    document.title = p.t + ' · ' + p.a + '｜唐诗三百首';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    /* 移动端收起目录 */
    closeDrawer();
  }

  function bindNav(btn, idx, arrow, label, isNext) {
    var it = FLAT[idx];
    btn.disabled = !it;
    btn.onclick = null;

    if (!it) {
      btn.innerHTML = isNext
        ? ('<em>' + label + '</em><span>' + arrow + '</span>')
        : ('<span>' + arrow + '</span><em>' + label + '</em>');
      return;
    }

    var core = '<strong>' + esc(it.poem.t) + '</strong><em>' + esc(it.poem.a) + '</em>';
    btn.innerHTML = isNext ? (core + '<span>' + arrow + '</span>')
                           : ('<span>' + arrow + '</span>' + core);
    btn.onclick = function () { location.hash = '#/' + it.id; };
  }

  /* ---------- 8. 搜索 ---------- */
  function doSearch(kw) {
    kw = kw.trim();
    el.searchClear.hidden = !kw;

    if (!kw) {
      if (!currentId) show('home');
      return;
    }

    var low = kw.toLowerCase().replace(/\s+/g, '');
    var hits = FLAT.filter(function (it) { return it.text.indexOf(low) > -1; });

    el.resultsHead.innerHTML = '搜索「<b>' + esc(kw) + '</b>」· 命中 ' + hits.length + ' 首';

    if (!hits.length) {
      el.resultsList.innerHTML = '<div class="empty"><span>寻</span>未找到相关篇目，换个词试试</div>';
    } else {
      el.resultsList.innerHTML = hits.map(function (it) {
        var line = it.poem.c.join(' ').replace(/[，。；？！、]/g, '');
        var pos  = line.toLowerCase().indexOf(low);
        var snip = pos > -1 ? line.slice(Math.max(0, pos - 12), Math.max(0, pos - 12) + 44) : line.slice(0, 44);
        return '<div class="result-item" data-id="' + it.id + '">' +
                 '<h4>' + highlight(it.poem.t, kw) +
                   '<small>〔唐〕' + highlight(it.poem.a, kw) + ' · ' + esc(it.chapter.name) + '</small></h4>' +
                 '<p>' + (pos > -1 && pos > 12 ? '…' : '') + highlight(snip, kw) + '…</p>' +
               '</div>';
      }).join('');
    }

    show('results');
  }

  /* ---------- 9. 路由 ---------- */
  function route() {
    var raw = location.hash;

    /* 可分享的搜索链接：#?q=关键词 */
    if (raw.indexOf('#?q=') === 0) {
      var kw = decodeURIComponent(raw.slice(4));
      el.search.value = kw;
      doSearch(kw);
      document.title = '搜索「' + kw + '」｜唐诗三百首';
      return;
    }

    var h = raw.replace(/^#\/?/, '').trim();
    if (!h) {
      currentId = null;
      show('home');
      document.title = '唐诗三百首 · 水墨笺注';
      markActive();
      return;
    }
    renderPoem(h);
  }

  window.addEventListener('hashchange', route);

  /* ---------- 10. 事件绑定 ---------- */

  /* 目录点击 */
  el.toc.addEventListener('click', function (e) {
    var head = e.target.closest('.toc-chapter-head');
    if (head) {
      var id = head.parentElement.dataset.chapter;
      collapsed[id] = !collapsed[id];
      renderToc();
      return;
    }
    var item = e.target.closest('.toc-item');
    if (item) {
      e.preventDefault();
      location.hash = '#/' + item.dataset.id;
    }
  });

  /* 卷筛选 */
  el.filterRow.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    filter = chip.dataset.chapter;
    el.filterRow.querySelectorAll('.chip').forEach(function (c) {
      c.classList.toggle('is-active', c === chip);
    });
    renderToc();
  });

  /* 卷首卡片 → 筛选该卷并滚动到目录 */
  el.chapterCards.addEventListener('click', function (e) {
    var card = e.target.closest('.chapter-card');
    if (!card) return;
    filter = card.dataset.chapter;
    Object.keys(collapsed).forEach(function (k) { collapsed[k] = false; });
    collapsed[filter] = false;
    el.filterRow.querySelectorAll('.chip').forEach(function (c) {
      c.classList.toggle('is-active', c.dataset.chapter === filter);
    });
    renderToc();
    openDrawer();
    el.toc.scrollTop = 0;
  });

  /* 搜索结果点击 */
  el.resultsList.addEventListener('click', function (e) {
    var item = e.target.closest('.result-item');
    if (item) location.hash = '#/' + item.dataset.id;
  });

  /* 搜索输入 */
  var timer;
  el.search.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(function () {
      var kw = el.search.value.trim();
      if (kw) history.replaceState(null, '', '#?q=' + encodeURIComponent(kw));
      doSearch(kw);
    }, 160);
  });
  el.search.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { el.search.value = ''; doSearch(''); el.search.blur(); }
    if (e.key === 'Enter') { clearTimeout(timer); doSearch(el.search.value); }
  });
  el.searchClear.addEventListener('click', function () {
    el.search.value = '';
    doSearch('');
    el.search.focus();
  });

  /* 竖排切换 */
  el.orientBtn.addEventListener('click', function () {
    vertical = !vertical;
    localStorage.setItem('ts-vertical', vertical ? '1' : '0');
    el.body.classList.toggle('vertical', vertical);
    el.orientBtn.classList.toggle('is-on', vertical);
    el.orientBtn.querySelector('.btn-label').textContent = vertical ? '横排' : '竖排';
  });

  /* 随机 */
  el.randBtn.addEventListener('click', function () {
    var next;
    do { next = Math.floor(Math.random() * TOTAL); } while (TOTAL > 1 && FLAT[next].id === currentId);
    location.hash = '#/' + FLAT[next].id;
  });

  /* 移动端抽屉 */
  function openDrawer()  { el.sidebar.classList.add('is-open'); el.scrim.classList.add('is-on'); }
  function closeDrawer() { el.sidebar.classList.remove('is-open'); el.scrim.classList.remove('is-on'); }
  el.menuBtn.addEventListener('click', function () {
    el.sidebar.classList.contains('is-open') ? closeDrawer() : openDrawer();
  });
  el.scrim.addEventListener('click', closeDrawer);

  /* 回首页 */
  $('#brandLink').addEventListener('click', function () {
    currentId = null;
    markActive();
    document.title = '唐诗三百首 · 水墨笺注';
  });

  /* 键盘：← → 翻页，/ 聚焦搜索 */
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    if (e.key === '/') { e.preventDefault(); el.search.focus(); return; }
    if (!currentId) return;

    if (e.key === 'ArrowLeft')  { e.preventDefault(); el.prevBtn.click(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); el.nextBtn.click(); }
  });

  /* ---------- 11. 启动 ---------- */
  route();

  /* 展开当前诗所属卷（若被折叠） */
  if (currentId) collapsed[BY_ID[currentId].chapter.id] = false;

})();
