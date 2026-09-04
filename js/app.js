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
    shareBtn:   $('#shareBtn'),
    toast:      $('#toast'),
    shareModal: $('#shareModal'),
    shareImg:   $('#shareImg'),
    copyBtn:    $('#copyBtn'),
    dlBtn:      $('#dlBtn'),
    closeBtn:   $('#closeBtn'),
    shareBackdrop: $('#shareBackdrop'),
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
  var currentItem = null;
  var vertical = localStorage.getItem('ts-vertical') === '1';

  function renderPoem(id) {
    var it = BY_ID[id];
    if (!it) { location.hash = '#/'; return; }

    var p = it.poem;
    currentId = id;
    currentItem = it;

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

  /* 7.1 图片分享：把诗绘成水墨卡片 */
  var KAI = '"STKaiti","KaiTi","Kaiti SC","Noto Serif SC",serif';
  var toastTimer;

  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.hidden = false;
    requestAnimationFrame(function () { el.toast.classList.add('is-show'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.toast.classList.remove('is-show');
      setTimeout(function () { el.toast.hidden = true; }, 300);
    }, 2200);
  }

  function wrapByChar(ctx, text, maxWidth) {
    var chars = String(text).split('');
    var lines = [], cur = '';
    for (var i = 0; i < chars.length; i++) {
      var test = cur + chars[i];
      if (ctx.measureText(test).width > maxWidth && cur) {
        lines.push(cur);
        cur = chars[i];
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function buildShareCanvas(item) {
    var p = item.poem;
    var W = 1080, pad = 86, innerW = W - pad * 2;
    var measure = document.createElement('canvas').getContext('2d');
    var F = { title: 78, author: 32, orig: 52, tr: 32, foot: 26 };

    /* 译文按段换行 */
    var trParas = (p.tr || '').split(/\n+/).filter(function (s) { return s.trim(); });
    measure.font = 'normal ' + F.tr + 'px ' + KAI;
    var trLines = [];
    trParas.forEach(function (par) {
      wrapByChar(measure, par.trim(), innerW).forEach(function (l) { trLines.push(l); });
    });

    /* 原文逐行，过长折行 */
    measure.font = 'normal ' + F.orig + 'px ' + KAI;
    var origLines = [];
    p.c.forEach(function (line) {
      if (measure.measureText(line).width > innerW) {
        wrapByChar(measure, line, innerW).forEach(function (l) { origLines.push(l); });
      } else {
        origLines.push(line);
      }
    });

    /* 估算高度 */
    var y = 120 + F.title + 18 + F.author + 54
          + F.orig + (origLines.length - 1) * (F.orig + 28);
    if (trLines.length) y += 56 + F.tr + (trLines.length - 1) * (F.tr + 16);
    y += 64 + F.foot + 96;
    var H = Math.max(y, 760);

    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    var c = canvas.getContext('2d');
    c.textBaseline = 'alphabetic';
    var cx = W / 2;

    /* 宣纸底 */
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#fbf7ee');
    g.addColorStop(1, '#f1e8d6');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);

    /* 晕染墨团（淡） */
    function blob(cx2, cy2, r, a) {
      var rg = c.createRadialGradient(cx2, cy2, 0, cx2, cy2, r);
      rg.addColorStop(0, 'rgba(40,55,65,' + a + ')');
      rg.addColorStop(1, 'rgba(40,55,65,0)');
      c.fillStyle = rg;
      c.beginPath(); c.arc(cx2, cy2, r, 0, Math.PI * 2); c.fill();
    }
    blob(150, H - 120, 260, 0.05);
    blob(W - 120, 140, 220, 0.04);

    /* 远山（淡墨） */
    c.save();
    c.globalAlpha = 0.10;
    c.fillStyle = '#2b3a44';
    c.beginPath();
    c.moveTo(0, H - 150);
    for (var x = 0; x <= W; x += 60) {
      c.lineTo(x, H - 150 - Math.sin(x / 130) * 30 - Math.sin(x / 47) * 14);
    }
    c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
    c.restore();

    /* 边框 */
    c.strokeStyle = 'rgba(120,90,60,0.32)';
    c.lineWidth = 2;
    c.strokeRect(pad * 0.55, pad * 0.55, W - pad * 1.1, H - pad * 1.1);

    /* 题名 + 作者 */
    c.textAlign = 'center';
    var ty = 120 + F.title;
    c.fillStyle = '#1b1a17';
    c.font = 'bold ' + F.title + 'px ' + KAI;
    c.fillText(p.t, cx, ty);

    c.fillStyle = '#6b5a45';
    c.font = 'normal ' + F.author + 'px ' + KAI;
    c.fillText('〔唐〕' + p.a, cx, ty + 18 + F.author);

    /* 分隔线 + 中印 */
    var dy = ty + 18 + F.author + 30;
    c.strokeStyle = 'rgba(120,90,60,0.30)';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(cx - 150, dy); c.lineTo(cx - 22, dy);
    c.moveTo(cx + 22, dy); c.lineTo(cx + 150, dy);
    c.stroke();
    c.fillStyle = '#b23b2e';
    c.fillRect(cx - 16, dy - 16, 32, 32);
    c.fillStyle = '#fbf7ee';
    c.font = 'normal 22px ' + KAI;
    c.fillText('诗', cx, dy + 8);

    /* 原文 */
    c.fillStyle = '#2a2320';
    c.font = 'normal ' + F.orig + 'px ' + KAI;
    var oy = dy + 52;
    origLines.forEach(function (line, i) {
      c.fillText(line, cx, oy + i * (F.orig + 28));
    });

    /* 译文 */
    var ny = oy + origLines.length * (F.orig + 28) + 40;
    if (trLines.length) {
      c.fillStyle = '#7a6a54';
      c.font = 'normal ' + F.tr + 'px ' + KAI;
      trLines.forEach(function (line, i) {
        c.fillText(line, cx, ny + i * (F.tr + 16));
      });
      ny += trLines.length * (F.tr + 16);
    }

    /* 页脚 */
    c.fillStyle = '#9a8a72';
    c.font = 'normal ' + F.foot + 'px ' + KAI;
    c.fillText('唐诗三百首 · 水墨笺注', cx, H - pad - 50);

    /* 右下角印章 */
    c.fillStyle = '#b23b2e';
    c.fillRect(W - pad * 0.55 - 54, H - pad * 0.55 - 54, 46, 46);
    c.fillStyle = '#fbf7ee';
    c.font = 'normal 28px ' + KAI;
    c.fillText('唐', W - pad * 0.55 - 31, H - pad * 0.55 - 22);

    return canvas;
  }

  function fallbackDownload(blobOrCanvas, fileName) {
    if (blobOrCanvas instanceof HTMLCanvasElement) {
      var a1 = document.createElement('a');
      a1.href = blobOrCanvas.toDataURL('image/png');
      a1.download = fileName;
      document.body.appendChild(a1); a1.click(); a1.remove();
      return;
    }
    var url = URL.createObjectURL(blobOrCanvas);
    var a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  /* 7.2 预览弹层：复制 / 下载 / 关闭 */
  var shareState = { blob: null, url: null };

  function dataURLToBlob(d) {
    var arr = d.split(','), mime = arr[0].match(/:(.*?);/)[1];
    var b = atob(arr[1]), n = b.length, u8 = new Uint8Array(n);
    while (n--) u8[n] = b.charCodeAt(n);
    return new Blob([u8], { type: mime });
  }
  function canvasToBlob(canvas, cb) {
    if (canvas.toBlob) { canvas.toBlob(cb, 'image/png'); return; }
    try { cb(dataURLToBlob(canvas.toDataURL('image/png'))); }
    catch (e) { cb(null); }
  }

  function openShareModal() {
    el.shareModal.hidden = false;
    requestAnimationFrame(function () { el.shareModal.classList.add('is-open'); });
    document.body.classList.add('no-scroll');
  }
  function closeShareModal() {
    el.shareModal.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    setTimeout(function () {
      el.shareModal.hidden = true;
      if (shareState.url) { URL.revokeObjectURL(shareState.url); shareState.url = null; }
      el.shareImg.removeAttribute('src');
      shareState.blob = null;
    }, 220);
  }

  function copyImage() {
    if (!shareState.blob) return;
    var nav = navigator;
    if (nav.clipboard && nav.clipboard.write && typeof ClipboardItem !== 'undefined') {
      nav.clipboard.write([new ClipboardItem({ 'image/png': shareState.blob })])
        .then(function () { toast('图片已复制到剪贴板'); })
        .catch(function () { toast('复制失败，请改用下载'); });
    } else {
      toast('当前环境不支持复制，请下载图片');
    }
  }

  function shareImage() {
    if (!currentItem || el.shareBtn.disabled) return;
    var p = currentItem.poem;
    var prevHTML = el.shareBtn.innerHTML;
    el.shareBtn.disabled = true;
    el.shareBtn.classList.add('is-loading');
    el.shareBtn.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
      '<path d="M12 3v12M7 10l5 5 5-5M5 21h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '<span>生成中</span>';

    setTimeout(function () {
      function finish() {
        el.shareBtn.disabled = false;
        el.shareBtn.classList.remove('is-loading');
        el.shareBtn.innerHTML = prevHTML;
      }
      try {
        var canvas = buildShareCanvas(currentItem);
        canvasToBlob(canvas, function (blob) {
          if (!blob) { toast('生成失败，请重试'); finish(); return; }
          shareState.blob = blob;
          shareState.url  = URL.createObjectURL(blob);
          el.shareImg.src = shareState.url;
          el.shareImg.alt = p.t + ' · ' + p.a;
          openShareModal();
          finish();
        });
      } catch (e) {
        toast('生成失败，请重试');
        finish();
      }
    }, 30);
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

  /* 图片分享 */
  el.shareBtn.addEventListener('click', shareImage);
  el.copyBtn.addEventListener('click', copyImage);
  el.dlBtn.addEventListener('click', function () {
    if (!shareState.blob) return;
    fallbackDownload(shareState.blob, (currentItem.poem.t || 'tangshi') + '.png');
    toast('已开始下载');
  });
  el.closeBtn.addEventListener('click', closeShareModal);
  el.shareBackdrop.addEventListener('click', closeShareModal);

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
    if (e.key === 'Escape' && !el.shareModal.hidden) { closeShareModal(); return; }
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
