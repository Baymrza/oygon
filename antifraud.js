/* Проверка мошенничества в браузере: порт офлайн-движка ANTI-FRAUD KG (правила текста ru/ky/транслит,
   анализ ссылок без сети, те же веса и пороги). Данные берутся из antifraud-data.js.
   Не открывает сайты, не знает базу жалоб и ничего никуда не отправляет. */
(function () {
  'use strict';
  var D = window.AF_DATA; if (!D) return;

  var L = '[\\p{L}\\p{N}_]';
  var WB = '(?:(?<=' + L + ')(?!' + L + ')|(?<!' + L + ')(?=' + L + '))';
  var fixPat = function (p) { return p.replace(/\\b/g, WB).replace(/\\w/g, L); };
  var failed = 0;
  var compile = function (p, flags) { try { return new RegExp(fixPat(p), flags); } catch (e) { failed++; return null; } };

  var RULES = D.rules.map(function (r) {
    return { code: r.code, pats: r.p.map(function (p) { return compile(p, 'gu'); }).filter(Boolean), negs: r.n.map(function (p) { return compile(p, 'u'); }).filter(Boolean) };
  });

  /* ---------- нормализация текста ---------- */
  var ZW = /[​-‏⁠﻿]/g;
  function fixMixed(w) {
    var cyr = false, lat = false;
    for (var i = 0; i < w.length; i++) { var c = w[i]; if (c >= 'Ѐ' && c <= 'ӿ') cyr = true; if (c >= 'a' && c <= 'z') lat = true; }
    if (!(cyr && lat)) return w;
    return Array.from(w).map(function (c) { return D.lat2cyr[c] || c; }).join('');
  }
  function normalize(t) {
    t = t.normalize('NFKC').toLowerCase().replace(/ё/g, 'е').replace(ZW, '');
    t = t.replace(/[\p{L}\p{N}_]+/gu, fixMixed);
    return t.replace(/\s+/g, ' ');
  }
  var TR_MAP = {}; D.translit.forEach(function (x) { TR_MAP[x[0]] = x[1]; });
  var TR_RE = new RegExp(D.translit.map(function (x) { return x[0]; }).join('|'), 'g');
  function variants(text) {
    var n = normalize(text), letters = 0, latin = 0;
    for (var i = 0; i < n.length; i++) { var ch = n[i]; if (/\p{L}/u.test(ch)) { letters++; if (ch >= 'a' && ch <= 'z') latin++; } }
    var out = [n];
    if (letters && latin / letters > 0.3) out.push(n.replace(TR_RE, function (m) { return TR_MAP[m]; }).replace(/ё/g, 'е'));
    return out;
  }
  var mask = function (s) { return s.replace(/\d{4,}/g, function (m) { return m.slice(0, 2) + '•'.repeat(m.length - 2); }); };

  function analyzeTextRules(text) {
    var found = {};
    variants(text).forEach(function (v) {
      RULES.forEach(function (r) {
        if (found[r.code]) return;
        var hits = [];
        r.pats.forEach(function (re) {
          re.lastIndex = 0; var m;
          while ((m = re.exec(v))) {
            if (m[0] === '') { re.lastIndex++; continue; }
            var before = v.slice(Math.max(0, m.index - 30), m.index);
            if (r.negs.length && r.negs.some(function (n) { return n.test(before); })) continue;
            hits.push(m[0]); break;
          }
        });
        if (hits.length) found[r.code] = { code: r.code, evidence: mask(hits[0]).slice(0, 80), strength: Math.min(1, 0.8 + 0.2 * (hits.length - 1)) };
      });
    });
    return Object.keys(found).map(function (k) { return found[k]; });
  }

  /* ---------- ссылки ---------- */
  var BRANDS = D.brands, OFFICIAL = {};
  BRANDS.forEach(function (b) { b.domains.forEach(function (d) { OFFICIAL[d] = b; }); });
  var SHORT = new Set(D.shorteners), TLDS = new Set(D.tlds), BAIT = D.bait;
  var BOUNDARY_ONLY = new Set(['optima', 'demir', 'bakai', 'ozon', 'kaspi', 'beeline']);
  var MULTI = new Set(['co.uk', 'com.kg', 'org.kg', 'net.kg', 'gov.kg', 'edu.kg', 'mil.kg', 'com.ru', 'org.ru', 'com.kz', 'org.kz', 'com.tr', 'com.ua', 'co.in', 'com.au', 'co.jp', 'com.cn']);
  var HOMO = { 'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x', 'к': 'k', 'м': 'm', 'т': 't', 'в': 'b', 'н': 'h', 'і': 'i', 'ј': 'j', 'ԁ': 'd', 'ӏ': 'l', 'ѕ': 's', 'ԛ': 'q', 'ԝ': 'w', 'ү': 'y', 'ө': 'o', '0': 'o', '1': 'l', '3': 'e', '5': 's', '4': 'a', '7': 't' };
  function skeleton(s) { return Array.from(s.normalize('NFKC').toLowerCase()).map(function (c) { return HOMO[c] || c; }).join('').replace(/rn/g, 'm').replace(/vv/g, 'w'); }
  function lev(a, b, limit) {
    if (Math.abs(a.length - b.length) > limit) return limit + 1;
    var prev = []; for (var j = 0; j <= b.length; j++) prev.push(j);
    for (var i = 1; i <= a.length; i++) {
      var cur = [i];
      for (var k = 1; k <= b.length; k++) cur.push(Math.min(prev[k] + 1, cur[k - 1] + 1, prev[k - 1] + (a[i - 1] !== b[k - 1] ? 1 : 0)));
      prev = cur;
    }
    return prev[prev.length - 1];
  }
  /* punycode (RFC 3492) — чтобы увидеть «настоящие» буквы домена */
  function adapt(delta, num, first) { delta = first ? Math.floor(delta / 700) : delta >> 1; delta += Math.floor(delta / num); var k = 0; while (delta > 455) { delta = Math.floor(delta / 35); k += 36; } return Math.floor(k + 36 * delta / (delta + 38)); }
  function puny(input) {
    try {
      var n = 128, i = 0, bias = 72, out = [], b = input.lastIndexOf('-'); if (b < 0) b = 0;
      for (var j = 0; j < b; j++) out.push(input.charCodeAt(j));
      for (var idx = b > 0 ? b + 1 : 0; idx < input.length;) {
        var oldi = i, w = 1;
        for (var k = 36; ; k += 36) {
          var cp = input.charCodeAt(idx++), digit = cp - 48 < 10 ? cp - 22 : cp - 65 < 26 ? cp - 65 : cp - 97 < 26 ? cp - 97 : 36;
          i += digit * w; var t = k <= bias ? 1 : k >= bias + 26 ? 26 : k - bias; if (digit < t) break; w *= 36 - t;
        }
        var len = out.length + 1; bias = adapt(i - oldi, len, oldi === 0); n += Math.floor(i / len); i %= len; out.splice(i++, 0, n);
      }
      return String.fromCodePoint.apply(null, out);
    } catch (e) { return input; }
  }
  var unicodeHost = function (h) { return h.split('.').map(function (l) { return l.indexOf('xn--') === 0 ? puny(l.slice(4)) : l; }).join('.'); };

  function parseUrl(raw) {
    var u = raw.trim().replace(/^[<>"']+|[<>"']+$/g, '');
    if (/^(javascript|data|file|vbscript|blob):/i.test(u)) return null;
    if (!/^[a-z][a-z0-9+.\-]*:\/\//i.test(u)) u = 'http://' + u;
    var url; try { url = new URL(u); } catch (e) { return null; }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    var host = url.hostname.replace(/\.$/, '').toLowerCase();
    if (!host || host.length > 253) return null;
    var isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.charAt(0) === '[';
    var registrable, suffix, label;
    if (isIp) { registrable = host; suffix = ''; label = host; }
    else {
      var parts = host.split('.'); if (parts.length < 2) return null;
      var last2 = parts.slice(-2).join('.');
      if (MULTI.has(last2) && parts.length >= 3) { suffix = last2; registrable = parts.slice(-3).join('.'); label = parts[parts.length - 3]; }
      else { suffix = parts[parts.length - 1]; registrable = last2; label = parts[parts.length - 2]; }
    }
    var authority = u.split('://')[1].split('/')[0];
    return { url: u, scheme: url.protocol.slice(0, -1), host: host, uhost: unicodeHost(host), port: url.port ? +url.port : null, registrable: registrable, suffix: suffix, label: label, isIp: isIp, userinfo: authority.indexOf('@') >= 0, official: OFFICIAL[registrable] || null };
  }
  function mixedScripts(l) { var lat = /[a-z]/.test(l), other = Array.from(l).some(function (c) { return c.charCodeAt(0) > 127 && /\p{L}/u.test(c); }); return lat && other; }
  function findImpersonated(info) {
    if (info.isIp || info.official) return null;
    var regLabel = info.label, uni = regLabel.indexOf('xn--') === 0 ? puny(regLabel.slice(4)) : regLabel;
    var tokens = info.host.split(/[.\-_]/).filter(Boolean), skHost = skeleton(info.uhost);
    for (var bi = 0; bi < BRANDS.length; bi++) {
      var brand = BRANDS[bi];
      for (var di = 0; di < brand.domains.length; di++) {
        var offLabel = brand.domains[di].split('.')[0];
        if (uni !== regLabel && skeleton(uni) === skeleton(offLabel)) return [brand, 'homoglyph'];
        if (offLabel.length >= 4 && regLabel !== offLabel) {
          var limit = offLabel.length <= 6 ? 1 : 2;
          if (lev(skeleton(regLabel), skeleton(offLabel), limit) <= limit) return [brand, 'typo'];
        }
      }
      for (var ti = 0; ti < brand.tokens.length; ti++) {
        var tok = brand.tokens[ti];
        if (tok.length >= 5 && !BOUNDARY_ONLY.has(tok) && skHost.indexOf(tok) >= 0) return [brand, 'token'];
        if (tokens.indexOf(tok) >= 0) return [brand, 'token'];
      }
    }
    return null;
  }
  function analyzeUrlStatic(info) {
    var sig = [];
    if (info.official) { sig.push({ code: 'url_known_good', evidence: info.registrable, strength: 1 }); if (info.scheme === 'http') sig.push({ code: 'url_no_https', strength: 0.5 }); return sig; }
    if (info.isIp) sig.push({ code: 'url_ip_host', evidence: info.host, strength: 1 });
    if (info.userinfo) sig.push({ code: 'url_userinfo', strength: 1 });
    var hit = findImpersonated(info);
    if (hit) sig.push({ code: { token: 'url_brand_impersonation', typo: 'url_typosquat', homoglyph: 'url_homoglyph' }[hit[1]], evidence: info.uhost + ' ≠ ' + hit[0].domains[0], strength: 1, brand: hit[0].id });
    else if (info.uhost.split('.').some(mixedScripts)) sig.push({ code: 'url_homoglyph', evidence: info.uhost, strength: 1 });
    if (info.host.indexOf('xn--') >= 0) sig.push({ code: 'url_punycode', evidence: info.host, strength: 1 });
    var tld = info.suffix ? info.suffix.split('.').pop() : '';
    if (TLDS.has(tld)) sig.push({ code: 'url_suspicious_tld', evidence: '.' + tld, strength: 1 });
    if (!info.isIp && ((info.host.match(/\./g) || []).length >= 4 || info.host.length > 45)) sig.push({ code: 'url_many_subdomains', strength: 1 });
    if (SHORT.has(info.registrable)) sig.push({ code: 'url_shortener', evidence: info.registrable, strength: 1 });
    if (info.scheme === 'http') sig.push({ code: 'url_no_https', strength: 1 });
    if (info.port && info.port !== 80 && info.port !== 443) sig.push({ code: 'url_nonstandard_port', evidence: String(info.port), strength: 1 });
    var low = info.url.toLowerCase(), words = BAIT.filter(function (w) { return low.indexOf(w) >= 0; });
    if (words.length) sig.push({ code: 'url_bait_words', evidence: words.slice(0, 3).join(', '), strength: Math.min(1, 0.6 + 0.2 * words.length) });
    return sig;
  }
  var URL_RE = /((?:https?:\/\/|www\.)[^\s<>"']+|[a-z0-9][a-z0-9\-]{0,62}(?:\.[a-z0-9\-]{1,63})*\.(?:kg|ru|kz|com|net|org|info|top|xyz|online|site|shop|click|link|live|icu|me|io|cc|ly|gd|su|uz|tj|store|vip|win|fun|space|pw|tk|ml|ga|cf|gq|sbs|cfd|bond|lat)(?:\/[^\s<>"']*)?)/gi;
  function extractUrls(text, limit) {
    var out = [], m; URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(text))) {
      var u = m[1].replace(/[.,;:!?)»]+$/, '');
      if (u.indexOf('@') >= 0 && u.indexOf('://') < 0) continue;
      if (out.indexOf(u) < 0) out.push(u);
      if (out.length >= (limit || 3)) break;
    }
    return out;
  }
  function mentionedBrands(text) {
    var n = ' ' + normalize(text) + ' ';
    return BRANDS.filter(function (b) { return b.kw.some(function (k) { return n.indexOf(k) >= 0; }); }).map(function (b) { return b.id; });
  }

  /* ---------- сборка результата ---------- */
  function merge(into, list) { list.forEach(function (s) { var c = into[s.code]; if (!c || s.strength > c.strength) into[s.code] = s; }); }
  var statusFor = function (score) { return score <= 29 ? 'safe' : score <= 69 ? 'suspicious' : 'dangerous'; };

  function analyze(value, lang) {
    value = (value || '').trim(); if (!value) return { error: 'empty' };
    lang = lang === 'ky' ? 'ky' : 'ru';
    var kind = /^\S+$/.test(value) && value.indexOf('@') < 0 && (/^[a-z][a-z0-9+.\-]*:\/\//i.test(value) || /^[^\s\/]+\.[^\s\/.]{2,}(\/\S*)?$/.test(value)) ? 'url' : 'text';
    var signals = {}, insufficient = false, urlInfos = [];
    if (kind === 'url') {
      var info = parseUrl(value); if (!info) return { error: 'badurl', kind: kind };
      merge(signals, analyzeUrlStatic(info));
      insufficient = !signals.url_known_good;
    } else {
      merge(signals, analyzeTextRules(value));
      extractUrls(value, 3).forEach(function (u) {
        var inf = parseUrl(u); if (!inf) return; urlInfos.push(inf);
        merge(signals, analyzeUrlStatic(inf).filter(function (s) { return s.code !== 'url_known_good'; }));
      });
      if (urlInfos.length) {
        merge(signals, [{ code: 'text_has_link', strength: 1 }]);
        var mentioned = mentionedBrands(value);
        for (var i = 0; i < BRANDS.length; i++) {
          var b = BRANDS[i];
          if (mentioned.indexOf(b.id) >= 0 && urlInfos.some(function (ui) { return b.domains.indexOf(ui.registrable) < 0 && !ui.official; })) { merge(signals, [{ code: 'text_brand_link_mismatch', evidence: b.name, strength: 1 }]); break; }
        }
      }
      insufficient = !Object.keys(signals).length && normalize(value).split(' ').length < 4;
    }
    var list = Object.keys(signals).map(function (k) { return signals[k]; }).filter(function (s) { return D.signals[s.code]; });
    list.sort(function (a, b) { return D.signals[b.code].w * b.strength - D.signals[a.code].w * a.strength; });
    var total = 0; list.forEach(function (s) { total += D.signals[s.code].w * s.strength; });
    var score = Math.round(Math.max(0, Math.min(100, total))), status = statusFor(score);
    if (status === 'safe' && insufficient) status = 'unknown';
    var tips = [], schemeW = {};
    var rendered = list.map(function (s) {
      var d = D.signals[s.code], adv = lang === 'ky' ? d.aky : d.aru;
      if (adv && tips.indexOf(adv) < 0) tips.push(adv);
      if (d.scheme) schemeW[d.scheme] = (schemeW[d.scheme] || 0) + Math.max(0, d.w * s.strength);
      return { code: s.code, title: lang === 'ky' ? d.ky : d.ru, severity: d.s, evidence: s.evidence || '' };
    });
    var best = Object.keys(schemeW).sort(function (a, b) { return schemeW[b] - schemeW[a]; })[0];
    var scheme = best && (status === 'suspicious' || status === 'dangerous') ? D.schemes.filter(function (x) { return x.id === best; })[0] : null;
    return { kind: kind, score: score, status: status, label: D.statusLabel[lang][status], advice: D.statusAdvice[lang][status], tips: tips.slice(0, 3), signals: rendered, scheme: scheme, lang: lang };
  }

  function examples(lang) {
    lang = lang === 'ky' ? 'ky' : 'ru';
    var byId = {}; D.schemes.forEach(function (s) { byId[s.id] = s; });
    var pick = function (id) { return byId[id] && byId[id].examples[lang][0]; };
    return [
      { id: 'card', text: pick('card_blocked') }, { id: 'prize', text: pick('prize') }, { id: 'relative', text: pick('relative') },
      { id: 'fake', text: 'mbank-kg-bonus.top/login' }, { id: 'real', text: 'https://mbank.kg' }
    ].filter(function (e) { return e.text; });
  }
  window.ANTIFRAUD = { analyze: analyze, examples: examples, schemeOf: function (id) { return D.schemes.filter(function (x) { return x.id === id; })[0]; }, failedPatterns: failed };
})();
