(function () {
  'use strict';
  var ORG = (window.UVL && window.UVL.org) || 'Universal-Variability-Language';
  var API = 'https://api.github.com';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- UVL syntax highlighting ---------- */
  var KEYWORDS = /^(features|constraints|constraint|include|imports|namespace|as|mandatory|optional|or|alternative|cardinality|String|Integer|Real|Boolean|true|false)$/;
  var FUNCS = /^(sum|avg|len|floor|ceil)$/;
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function highlightLine(line) {
    var out = '', i = 0, m;
    var cm = line.indexOf('//');
    var body = cm >= 0 ? line.slice(0, cm) : line;
    var re = /(\[[0-9.*]+\])|(\d+(?:\.\d+)?)|([A-Za-z_][\w-]*(?:\.[\w-]+)*)|(=>|<=>|<=|>=|!=|==|[<>=!&|+\-*/{}(),])/g;
    while ((m = re.exec(body))) {
      out += esc(body.slice(i, m.index));
      var t = m[0];
      if (m[1] || m[2]) out += '<span class="num">' + esc(t) + '</span>';
      else if (m[3] && KEYWORDS.test(t)) out += '<span class="kw">' + t + '</span>';
      else if (m[3] && FUNCS.test(t)) out += '<span class="fn">' + t + '</span>';
      else if (m[3] && /^(Boolean|Arithmetic|Type)\./.test(t)) out += '<span class="attr">' + t + '</span>';
      else if (m[4]) out += '<span class="op">' + esc(t) + '</span>';
      else out += esc(t);
      i = re.lastIndex;
    }
    out += esc(body.slice(i));
    if (cm >= 0) out += '<span class="cm">' + esc(line.slice(cm)) + '</span>';
    return out;
  }
  $$('code.uvl').forEach(function (el) {
    var src = el.textContent.replace(/\n+$/, '');
    el.innerHTML = src.split('\n').map(highlightLine).join('\n');
  });

  /* ---------- Copy buttons ---------- */
  $$('.copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var code = btn.closest('.code-card').querySelector('code');
      var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy'; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(code.textContent).then(done, function () {});
    });
  });

  /* ---------- Tabs (ARIA) ---------- */
  function initTabs(list) {
    var tabs = $$('[role="tab"]', list);
    function select(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        var n = tabs[(i + d + tabs.length) % tabs.length];
        n.focus(); select(n);
      });
    });
  }
  $$('[data-tabs]').forEach(function (el) { initTabs(el.matches('[role="tablist"]') ? el : $('[role="tablist"]', el)); });

  /* ---------- Filter chips ---------- */
  var filterTargets = { tools: '#eco-tools .card', pubs: '.pubs li' };
  $$('[data-filter]').forEach(function (group) {
    var items = $$(filterTargets[group.dataset.filter]);
    $$('.chip', group).forEach(function (chip) {
      chip.addEventListener('click', function () {
        $$('.chip', group).forEach(function (c) { c.setAttribute('aria-pressed', c === chip); });
        var v = chip.dataset.value;
        items.forEach(function (it) { it.hidden = v !== 'all' && it.dataset.cat !== v; });
      });
    });
  });

  /* ---------- Theme & menu ---------- */
  var root = document.documentElement;
  $('#theme-toggle').addEventListener('click', function () {
    var dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('uvl-theme', root.dataset.theme); } catch (e) {}
  });
  var nav = $('#nav'), menuBtn = $('#menu-toggle');
  menuBtn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
  });
  $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', false); }); });

  /* Highlight the section in view */
  if ('IntersectionObserver' in window) {
    var links = {};
    $$('a', nav).forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && links[e.target.id]) {
          $$('a', nav).forEach(function (a) { a.classList.remove('active'); });
          links[e.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- Live GitHub data (cached 1h to stay under the rate limit) ---------- */
  function cached(key, url) {
    try {
      var c = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (c && Date.now() - c.t < 3600e3) return Promise.resolve(c.d);
    } catch (e) {}
    return fetch(url, { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d: d })); } catch (e) {} return d; });
  }
  function ago(iso) {
    var days = Math.round((Date.now() - new Date(iso)) / 864e5);
    if (days < 1) return 'today';
    if (days < 31) return days + ' d ago';
    if (days < 365) return Math.round(days / 30) + ' mo ago';
    var y = Math.round(days / 365 * 10) / 10;
    return y + ' yr ago';
  }

  cached('uvl-repos', API + '/orgs/' + ORG + '/repos?per_page=100').then(function (repos) {
    var by = {};
    repos.forEach(function (r) { by[r.name] = r; });
    $$('[data-repo]').forEach(function (el) {
      var r = by[el.dataset.repo];
      if (!r) return;
      var s = $('.live-stars', el), p = $('.live-push', el);
      if (s) { s.textContent = (el.tagName === 'TR' ? '' : '★ ') + r.stargazers_count; s.hidden = false; }
      if (p) { p.textContent = (el.tagName === 'TR' ? '' : 'updated ') + ago(r.pushed_at); p.title = r.pushed_at.slice(0, 10); p.hidden = false; }
    });
    var count = repos.filter(function (r) { return !r.private && r.name !== '.github'; }).length;
    if (count) $('#stat-repos').textContent = count;
  }).catch(function () { /* keep static fallback */ });

  cached('uvl-release', API + '/repos/' + ORG + '/uvl-parser/releases/latest').then(function (r) {
    if (r && r.tag_name) $('#stat-release').textContent = r.tag_name.replace(/^v/, '');
  }).catch(function () {});

  /* UVLEPs: merged proposals + open pull requests */
  var list = $('#uvlep-list');
  Promise.all([
    cached('uvl-uvleps', API + '/repos/' + ORG + '/UVLEP/contents/uvleps').catch(function () { return null; }),
    cached('uvl-uvlep-prs', API + '/repos/' + ORG + '/UVLEP/pulls?state=open').catch(function () { return null; })
  ]).then(function (res) {
    var files = (res[0] || []).filter(function (f) { return /^ep-\d{4}/.test(f.name) && !/^ep-0000/.test(f.name); });
    var prs = res[1] || [];
    if (!res[0] && !res[1]) {
      list.innerHTML = '<li class="muted">Could not load proposals right now.</li>';
      return;
    }
    var items = files.map(function (f) {
      var title = f.name.replace(/\.md$/, '').replace(/^ep-(\d{4})-/, 'UVLEP-$1 ').replace(/-/g, ' ');
      return '<li><span class="tag">filed</span><a href="' + f.html_url + '">' + esc(title) + '</a></li>';
    }).concat(prs.map(function (p) {
      return '<li><span class="tag">in review</span><a href="' + p.html_url + '">' + esc(p.title) + '</a></li>';
    }));
    list.innerHTML = items.length ? items.join('')
      : '<li class="muted">No proposals filed yet. <a href="https://github.com/' + ORG + '/UVLEP/discussions">Start the first one</a>.</li>';
  });

  /* ---------- Contact form ---------- */
  var form = $('#contact-form');
  if (form) {
    var status = $('#form-status');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form._gotcha.value) return;
      var endpoint = form.dataset.endpoint, fallback = form.dataset.fallback;
      var data = new FormData(form);
      if (!endpoint) {
        if (!fallback) {
          status.className = 'form-status err';
          status.textContent = 'The contact form is not configured yet. Please use GitHub Discussions in the meantime.';
          return;
        }
        var body = data.get('message') + '\n\n— ' + data.get('name') + (data.get('affiliation') ? ', ' + data.get('affiliation') : '') + ' <' + data.get('email') + '>';
        location.href = 'mailto:' + fallback + '?subject=' + encodeURIComponent('[UVL] ' + data.get('topic')) + '&body=' + encodeURIComponent(body);
        return;
      }
      var btn = $('button[type="submit"]', form);
      btn.disabled = true;
      status.className = 'form-status';
      status.textContent = 'Sending…';
      fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (r) {
          if (!r.ok) throw new Error(r.status);
          form.reset();
          status.className = 'form-status ok';
          status.textContent = 'Thanks! Your message has been sent. We will get back to you soon.';
        })
        .catch(function () {
          status.className = 'form-status err';
          status.textContent = 'Something went wrong. Please try again or reach us on GitHub Discussions.';
        })
        .then(function () { btn.disabled = false; });
    });
  }
})();
