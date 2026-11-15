/* Переключение языка RU / КЫ.
   Русский текст остаётся «источником правды» в коде. Для кыргызского языка (i18n-ky.js) движок
   подменяет готовые строки в DOM по словарю и по небольшим правилам для строк с числами. */
(function () {
  'use strict';
  var KY = window.KY_DICT || {};
  var ATTRS = ['aria-label', 'placeholder', 'title', 'alt'];
  var lang = 'ru';
  try { lang = JSON.parse(localStorage.getItem('ob_lang')) || 'ru'; } catch (e) { }
  var textMap = new WeakMap(), attrMap = new WeakMap();

  var has = function (k) { return Object.prototype.hasOwnProperty.call(KY, k); };
  function lookup(t) {
    if (has(t)) return KY[t];
    for (var i = 0; i < RULES.length; i++) {
      var m = t.match(RULES[i][0]);
      if (m) { var r = RULES[i][1](m); if (r != null) return r; }
    }
    if (t.indexOf(' · ') > 0) {
      var hit = false, out = t.split(' · ').map(function (p) { var r = lookup(p); if (r != null) { hit = true; return r; } return p; });
      if (hit) return out.join(' · ');
    }
    return null;
  }
  var tx = function (s) { var r = lookup(s); return r == null ? s : r; };

  var RULES = [
    [/^Найдено (\d+)\/(\d+)$/, function (m) { return 'Табылды ' + m[1] + '/' + m[2]; }],
    [/^Серия ×(\d+)$/, function (m) { return 'Серия ×' + m[1]; }],
    [/^Верно \+(\d+)$/, function (m) { return 'Туура +' + m[1]; }],
    [/^(\d+) б\.$/, function (m) { return m[1] + ' упай'; }],
    [/^−(\d+)% иммунитета$/, function (m) { return '−' + m[1] + '% иммунитет'; }],
    [/^Подсказка \((\d+)\)$/, function (m) { return 'Кеңеш (' + m[1] + ')'; }],
    [/^Твой иммунитет: (\d+)%$/, function (m) { return 'Сенин иммунитетиң: ' + m[1] + '%'; }],
    [/^(.+) · глава (\d+)\/(\d+)$/, function (m) { return tx(m[1]) + ' · ' + m[2] + '/' + m[3] + '-бөлүм'; }],
    [/^Глава (\d+) из (\d+)$/, function (m) { return m[1] + '-бөлүм, ' + m[2] + ' ичинен'; }],
    [/^Путь пройден · (\d+) городов$/, function (m) { return 'Жол өттү · ' + m[1] + ' шаар'; }],
    [/^нажимай на фразы, в которых слышно давление или обман\. Всего красных флагов: (\d+)\.$/, function (m) { return 'басым же алдамчылык угулган сөз айкаштарын бас. Кызыл желектердин жалпы саны: ' + m[1] + '.'; }],
    [/^найдено (\d+) из (\d+)(?:, ложных тревог: (\d+))?\.$/, function (m) { return m[2] + ' ичинен ' + m[1] + ' табылды' + (m[3] ? ', жалган дабыл: ' + m[3] : '') + '.'; }],
    [/^твой лучший результат · (\d+) баллов$/, function (m) { return 'сенин мыкты жыйынтыгың · ' + m[1] + ' упай'; }],
    [/^(\d+) из (\d+) верно · (\d+) баллов\. (.+)$/, function (m) { return m[2] + 'дон ' + m[1] + ' туура · ' + m[3] + ' упай. ' + tx(m[4]); }],
    [/^(.+\.) Ты выбрал: (.+\.)$/, function (m) { return tx(m[1]) + ' Сен тандадың: ' + tx(m[2]); }],
    [/^(.+\.) Время вышло\.$/, function (m) { return tx(m[1]) + ' Убакыт бүттү.'; }],
    [/^Я прошёл игру «Путь пяти городов» в «Ойгон»\. Мой иммунитет: (\d+)%\. А твой\?$/, function (m) { return '«Ойгондогу» «Беш шаардын жолу» оюнун өттүм. Менин иммунитетим: ' + m[1] + '%. Сеничи?'; }],
    [/^Мой цифровой иммунитет в «Ойгон»: (\d+)%\. А твой\?$/, function (m) { return '«Ойгондогу» санариптик иммунитетим: ' + m[1] + '%. Сеничи?'; }],
    [/^«(.+)»$/, function (m) { var r = lookup(m[1]); return r == null ? null : '«' + r + '»'; }]
  ];

  /* дополнительные правила из i18n-ky2.js: [регулярка, function(match, tx)] */
  RULES = RULES.concat((window.KY_RULES || []).map(function (r) { return [r[0], function (m) { return r[1](m, tx); }]; }));

  /* Перевод строки (для кода, который сам формирует текст) */
  function tr(s) {
    if (lang !== 'ky' || typeof s !== 'string') return s;
    var t = s.trim(); if (!t) return s;
    var r = lookup(t); if (r == null) return s;
    var i = s.indexOf(t); return s.slice(0, i) + r + s.slice(i + t.length);
  }

  var SKIP = 'SCRIPT,STYLE,TEXTAREA,NOSCRIPT';
  function skipEl(el) { return !el || (el.closest && el.closest('script,style,textarea,noscript,[data-no-i18n]')); }

  function doText(n) {
    var rec = textMap.get(n);
    if (rec && rec.ky === n.nodeValue) return;
    var v = n.nodeValue; if (!v || !/[А-Яа-яЁё]/.test(v)) return;
    var r = tr(v); if (r === v) return;
    textMap.set(n, { ru: v, ky: r }); n.nodeValue = r;
  }
  function doAttrs(el) {
    if (el.closest && el.closest('script,style,[data-no-i18n]')) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i], v = el.getAttribute && el.getAttribute(a);
      if (!v || !/[А-Яа-яЁё]/.test(v)) continue;
      var rec = attrMap.get(el) || {}; if (rec[a] && rec[a].ky === v) continue;
      var r = tr(v); if (r === v) continue;
      rec[a] = { ru: v, ky: r }; attrMap.set(el, rec); el.setAttribute(a, r);
    }
  }
  function walk(root, fn) {
    if (root.nodeType === 3) { if (!skipEl(root.parentElement)) fn.text(root); return; }
    if (root.nodeType !== 1) return;
    if (skipEl(root)) return;
    fn.attr(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) { if (!skipEl(n.parentElement)) fn.text(n); } else fn.attr(n);
    }
  }
  var apply = { text: doText, attr: doAttrs };
  var restore = {
    text: function (n) { var r = textMap.get(n); if (r && r.ky === n.nodeValue) { n.nodeValue = r.ru; textMap.delete(n); } },
    attr: function (el) {
      var rec = attrMap.get(el); if (!rec) return;
      Object.keys(rec).forEach(function (a) { if (el.getAttribute(a) === rec[a].ky) el.setAttribute(a, rec[a].ru); });
      attrMap.delete(el);
    }
  };

  var ruTitle = document.title, metaD = document.querySelector('meta[name="description"]'), ruDesc = metaD ? metaD.content : '';
  function setHead() {
    if (lang === 'ky') { document.title = tr(ruTitle); if (metaD) metaD.content = tr(ruDesc); }
    else { document.title = ruTitle; if (metaD) metaD.content = ruDesc; }
  }

  function set(l) {
    lang = l === 'ky' ? 'ky' : 'ru';
    if (lang === 'ky') walk(document.body, apply); else walk(document.body, restore);
    setHead();
  }

  var mo = new MutationObserver(function (muts) {
    if (lang !== 'ky') return;
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.type === 'characterData') { if (!skipEl(m.target.parentElement)) doText(m.target); }
      else if (m.type === 'attributes') doAttrs(m.target);
      else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j], apply);
    }
  });
  mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });

  window.I18N = { tr: tr, set: set, get lang() { return lang; }, lookup: lookup };
  if (lang === 'ky') set('ky');
})();
