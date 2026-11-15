(function () {
  'use strict';
  const D = window.DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* приватный режим */ } }
  };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ---------- i18n (интерфейс; контент пока на русском) ---------- */
  const T = {
    ru: { about: 'О проекте', rules: 'Правила', partners: 'Партнёры', help: 'Помощь', home: 'Главная', events: 'Афиша', quest: 'Квест', trainer: 'Тренажёр', check: 'Проверка', support: 'Поддержка', report: 'Сообщить', tagline: 'Цифровой иммунитет молодёжи', news: 'Новости' },
    ky: { about: 'Долбоор жөнүндө', rules: 'Эрежелер', partners: 'Өнөктөштөр', help: 'Жардам', home: 'Башкы', events: 'Афиша', quest: 'Квест', trainer: 'Машыгуу', check: 'Текшерүү', support: 'Колдоо', report: 'Кабарлоо', tagline: 'Жаштардын санариптик иммунитети', news: 'Жаңылыктар' }
  };
  let lang = LS.get('ob_lang', 'ru');
  const t = k => (T[lang] && T[lang][k]) || T.ru[k] || k;
  function applyLang() {
    document.documentElement.lang = lang === 'ky' ? 'ky' : 'ru';
    $$('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
    $$('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  }

  /* ---------- иконки и вкладки ---------- */
  const IC = {
    home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    events: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
    quest: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z',
    trainer: 'M13 3L5 14h6l-1 7 8-11h-6z',
    check: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
    support: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
    report: 'M5 21V4M5 4h11l-2 4 2 4H5',
    news: 'M4 5h13v14H6a2 2 0 0 1-2-2V5zM17 8h3v9a2 2 0 0 1-2 2M7 9h7M7 12h7M7 15h4'
  };
  const TABS = ['home', 'events', 'quest', 'trainer', 'check', 'support', 'report'];
  function buildDock() {
    // «Афиша» стоит по центру и выделена крупной тёмной кнопкой
    const DOCK = ['home', 'quest', 'news', 'events', 'check', 'support', 'report'];
    $('#dock').innerHTML = DOCK.map(id =>
      `<a href="#/${id}" data-tab="${id}" ${id === 'events' ? 'class="center"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${IC[id]}"/></svg><span>${t(id)}</span></a>`).join('');
  }

  /* ---------- хранилище демо-данных ---------- */
  const STATUSES = ['Новое', 'В работе', 'Передано', 'Закрыто'];
  const CATS = ['Подозрительная работа', 'Закрытый чат / вербовка', 'Угрозы и шантаж', 'Мошенничество', 'Другое'];
  function reports() {
    let r = LS.get('ob_reports', null);
    if (!r) {
      r = [
        { id: 101, cat: 'Подозрительная работа', text: '(демо) Предложили «подработку» за 150 000 сомов, просят паспорт.', link: '', status: 'Новое', at: Date.now() - 3600e3 * 5, demo: true },
        { id: 102, cat: 'Закрытый чат / вербовка', text: '(демо) Незнакомец зовёт в закрытый чат и просит никому не говорить.', link: '', status: 'В работе', at: Date.now() - 3600e3 * 26, demo: true },
        { id: 103, cat: 'Мошенничество', text: '(демо) Просят код из СМС «для подтверждения участия в конкурсе».', link: '', status: 'Передано', at: Date.now() - 3600e3 * 50, demo: true }
      ];
      LS.set('ob_reports', r);
    }
    return r;
  }
  const userNews = () => LS.get('ob_news', []);
  const userEvents = () => LS.get('ob_events', []);
  const reacted = () => LS.get('ob_react', {});

  /* ---------- состояние ---------- */
  let Q = null, TR = null, timerId = null, checkTab = 'real', evCat = 'Все', adminOK = false, adminTab = 'reports', supportSent = false, reportSent = null;
  const QUEST_MAX = D.quest.scenes.length;

  /* ---------- вьюхи ---------- */
  const V = {};

  /* изображения для карточек (по id демо-публикаций) */
  const NIMG = { n1: 'assets/t-karakol.jpg', n2: 'assets/t-osh.jpg', n3: 'assets/t-talas.jpg', n4: 'assets/t-akbuura.jpg', n5: 'assets/t-bishkek.jpg' };
  const EIMG = ['assets/t-bishkek.jpg', 'assets/t-osh.jpg', 'assets/t-karakol.jpg', 'assets/t-talas.jpg', 'assets/t-akbuura.jpg', 'assets/t-osh.jpg'];
  const ARROW = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const allPosts = () => [...userNews(), ...D.news];
  const allEvents = () => [...userEvents(), ...D.events];
  const ncard = (p, i) => `<article class="ncard" data-act="post" data-id="${esc(p.id)}" role="button" tabindex="0"><div class="n-img ${NIMG[p.id] ? '' : 'ph'}" ${NIMG[p.id] ? `style="background-image:url(${NIMG[p.id]})"` : ''}></div><span class="n-tag t${i % 4}">${esc(p.tag)}</span><h3>${esc(p.title)}</h3><span class="n-meta">${esc(p.date)}</span></article>`;

  // Главная: герой, плитки, «Главное», лента новостей, афиша
  V.home = () => {
    const best = LS.get('ob_best', null), quest = LS.get('ob_quest', null), game = LS.get('ob_game', null);
    const posts = allPosts(), evs = allEvents();
    const imm = best ? best.pct : 0;
    const tiles = [
      ['#/quest', 'assets/t-osh.jpg', 'Путь пяти городов'],
      ['#/dozor', 'assets/t-karakol.jpg', 'Дозор'],
      ['#/check', 'assets/t-talas.jpg', 'Реальные истории']
    ].map(([h, img, t]) => `<a class="tile" href="${h}"><div class="tile-img" style="background-image:url(${img})"></div><div class="tile-t"><span>${t}</span>${ARROW}</div></a>`).join('');
    const ev = evs.slice(0, 5).map((e, i) => `<a class="ecard ${i === 0 ? 'big' : ''}" href="#/events" style="background-image:url(${EIMG[i % EIMG.length]})"><span class="e-cat">${esc(e.cat)}</span><h3>${esc(e.title)}</h3>${i === 0 ? `<p>${esc(e.desc)}</p>` : ''}<span class="e-date">${esc(e.date)} · ${esc(e.place)}</span></a>`).join('');
    return `<div class="home-wrap">
      <section class="hero2">
        <div class="hero2-text">
          <span class="eyebrow">Цифровой иммунитет молодёжи</span>
          <h1>Знающий человек <em>сам останавливает</em> манипулятора</h1>
          <p>Квест, тренажёр и разборы реальных историй. Без регистрации, без сбора данных.</p>
          <div class="row"><button class="btn xl" data-act="home-chat">Начать «Закрытый чат» <span aria-hidden="true">→</span></button><a class="btn ghost" href="#/trainer">Тренажёр</a></div>
          <span class="hero-note">4 минуты · без регистрации · разбор в конце</span>
          <div class="hero2-stats">
            <div class="stat"><b>${best ? imm + '%' : '—'}</b><span>твой иммунитет (лучший раунд)</span><div class="meter" style="margin-top:8px"><i style="width:${imm}%"></i></div></div>
            <div class="stat"><b>${game ? game.immun + '%' : quest ? quest.good + '/' + QUEST_MAX : '—'}</b><span>${game ? 'иммунитет в игре «Путь пяти городов»' : 'верных решений в квесте'}</span></div>
          </div>
        </div>
        <div class="hero2-img" style="background-image:url(assets/t-akbuura.jpg)" role="img" aria-label=""></div>
      </section>
      <section class="mission" aria-label="Главные идеи">
        <article class="card"><span class="m-ic m1" aria-hidden="true">🛡</span><h3>Защищаем молодёжь от плохого</h3><p>Учим узнавать вербовку, манипуляцию и мошенничество на играх, квестах и разборах реальных историй.</p></article>
        <article class="card"><span class="m-ic m2" aria-hidden="true">✦</span><h3>Даём путь к хорошему</h3><p>Афиша учёбы, конкурсов и хакатонов, новости, поддержка психологов и полезные игры.</p></article>
        <article class="card"><span class="m-ic m3" aria-hidden="true">⚑</span><h3>Боремся с мошенниками, которые спонсируют экстремизм</h3><p>Проверка сообщений и ссылок, цифры и источники, понятные советы, что делать.</p></article>
      </section>
      <section class="af-promo"><div class="af-shield" aria-hidden="true"><svg viewBox="0 0 24 24" width="40" height="40"><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.6 12.2l2.4 2.4 4.6-4.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <div class="af-promo-t"><h2>Борьба с мошенниками, которые спонсируют экстремизм</h2><p>Проверь подозрительное сообщение или ссылку за 10 секунд.</p></div>
        <a class="btn xl" href="#/antifraud">Проверить сообщение <span aria-hidden="true">→</span></a></section>
      <div class="orn-divider" aria-hidden="true"><svg viewBox="0 0 64 32"><use href="#horn"/></svg></div>
      <section class="trio" aria-label="Игры и истории">${tiles}</section>
      <section class="sections" aria-label="Разделы платформы">
        <h2 class="sec hd">Что есть на платформе</h2>
        <div class="sgrid">${[['#/news', 'Новости', 'Предупреждения о схемах, разборы и советы.'], ['#/quest', 'Квесты и игры', 'Закрытый чат, Путь пяти городов, Дозор, тренажёр.'], ['#/antifraud', 'Проверка мошенников', 'Проверь сообщение или ссылку за 10 секунд.'], ['#/events', 'Афиша', 'Учёба, конкурсы, хакатоны и события.'], ['#/psychologists', 'Психологи', 'Начинающие психологи под наставничеством.'], ['#/facts', 'Цифры и замеры', 'Масштаб проблемы и результаты проекта.']].map(([h, t, d]) => `<a class="stile" href="${h}"><b>${t}</b><span>${d}</span></a>`).join('')}</div>
      </section>
      ${factsStrip()}
      <div class="cols">
        <section>
          <h2 class="sec hd">Главное<a href="#/news">Все новости <span aria-hidden="true">→</span></a></h2>
          <div class="ngrid">${posts.slice(0, 6).map(ncard).join('')}</div>
        </section>
        <aside class="lent">
          <h2 class="sec hd">Лента новостей</h2>
          <ul>${posts.slice(0, 7).map(p => `<li data-act="post" data-id="${esc(p.id)}" role="button" tabindex="0"><time>${esc(p.date)}</time><b>${esc(p.title)}</b></li>`).join('')}</ul>
          <a class="more" href="#/news">Все новости <span aria-hidden="true">→</span></a>
        </aside>
      </div>
      <section class="dark-sec" aria-label="Афиша">
        <div class="dark-head"><div><h2>Призываем к хорошему</h2><p>Учёба, конкурсы, хакатоны и события, которые стоит посетить. Выбери, чем занять энергию.</p></div><a class="btn" href="#/events">Вся афиша</a></div>
        <div class="egrid">${ev}</div>
      </section>
      <p class="notice">Публикации — демонстрационные. В рабочей версии их размещают уполномоченные операторы через админ-панель. Комментариев нет: только реакции.</p>
    </div>`;
  };

  V.news = () => `<div class="page wide">
    <div class="page-head"><h1>Новости</h1><p>Предупреждения о новых схемах, разборы и советы. Публикуют уполномоченные операторы.</p></div>
    <div class="ngrid">${allPosts().map(ncard).join('')}</div>
  </div>`;

  V.dozor = () => `<div class="page wide">
    <div class="row"><a class="btn ghost sm" href="#/quest">← Квесты</a></div>
    <iframe class="dozor-frame" src="games/dozor.html?v=13" title="Дозор" allow="fullscreen"></iframe>
  </div>`;

  // Поиск по материалам
  V.search = () => {
    const qs = new URLSearchParams((location.hash.split('?')[1] || '')); const q = (qs.get('q') || '').trim().toLowerCase();
    const tr = s => (window.I18N ? I18N.tr(s) : s);
    const hit = (...f) => { const h = f.map(x => String(x || '')).join(' ').toLowerCase() + ' ' + f.map(x => tr(String(x || ''))).join(' ').toLowerCase(); return q && h.includes(q); };
    const res = [];
    allPosts().forEach(p => { if (hit(p.title, p.text, p.tag)) res.push(['Новость', p.title, p.text, `data-act="post" data-id="${esc(p.id)}"`]); });
    allEvents().forEach(e => { if (hit(e.title, e.desc, e.cat, e.place)) res.push(['Событие', e.title, e.desc, 'data-href="#/events"']); });
    (D.realStories || []).forEach(s => { if (hit(s.title, s.text.join(' '), s.note)) res.push(['Реальная история', s.title, s.text[0], 'data-href="#/check"']); });
    D.stories.forEach(s => { if (hit(s.title, s.contact, s.hook, s.tag)) res.push(['Учебная история', s.title, s.contact, 'data-href="#/check"']); });
    D.checklist.forEach(c => { if (hit(c.q, c.a)) res.push(['Медиаграмотность', c.q, c.a, 'data-href="#/check"']); });
    D.facts.key.forEach(f => { if (hit(f.label, f.note, f.period, f.n)) res.push(['Цифры', f.n + ' ' + tr(f.unit) + ' ' + tr(f.label), tr(f.period) + '. ' + tr(f.note), 'data-href="#/facts"']); });
    return `<div class="page"><div class="page-head"><h1>Результаты поиска</h1><p>${q ? '«' + esc(qs.get('q')) + '»' : 'Введи запрос в строке поиска.'}</p></div>
      ${q ? `<p class="notice" style="text-align:left">Найдено: ${res.length}</p>` : ''}
      <div class="ev-list">${res.map(([k, t, d, at]) => `<article class="card post" ${at} role="button" tabindex="0" style="cursor:pointer"><span class="eyebrow">${k}</span><h3>${esc(tr(t))}</h3><p>${esc(tr(d).slice(0, 180))}…</p></article>`).join('')}</div>
      ${q && !res.length ? '<div class="empty">Ничего не найдено. Попробуй другое слово.</div>' : ''}</div>`;
  };

  function openPost(id) {
    const p = allPosts().find(x => String(x.id) === String(id)); if (!p) return;
    const on = reacted()[p.id], n = p.likes + (on ? 1 : 0);
    $('#modal-body').innerHTML = `<div class="post-modal" style="display:grid;gap:12px">
      <div class="pm-img" style="${NIMG[p.id] ? `background-image:url(${NIMG[p.id]})` : 'background:var(--soft)'}"></div>
      <span class="eyebrow">${esc(p.tag)} · ${esc(p.date)}</span><h2>${esc(p.title)}</h2><p>${esc(p.text)}</p>
      <div class="react"><button data-act="react-m" data-id="${esc(p.id)}" aria-pressed="${!!on}">Полезно · ${n}</button><button data-act="share" data-id="${esc(p.id)}">Поделиться</button></div></div>`;
    const d = $('#modal'); if (!d.open) d.showModal();
  }

  // Афиша
  V.events = () => {
    const evs = [...userEvents(), ...D.events];
    const cats = ['Все', ...new Set(evs.map(e => e.cat))];
    if (!cats.includes(evCat)) evCat = 'Все';
    const list = evs.filter(e => evCat === 'Все' || e.cat === evCat);
    return `<div class="page">
      <div class="page-head"><h1>Афиша</h1><p>Учёба, конкурсы, хакатоны и события, которые стоит посетить. Выбери, чем занять энергию.</p></div>
      <div class="chips">${cats.map(c => `<button class="chip" data-act="evcat" data-c="${esc(c)}" aria-pressed="${c === evCat}">${esc(c)}</button>`).join('')}</div>
      <div class="ev-list">${list.map(e => `<article class="card post rim"><div class="row"><span class="badge">${esc(e.cat)}</span><span class="sp"></span><span class="date">${esc(e.date)}</span></div><h3>${esc(e.title)}</h3><p>${esc(e.desc)}</p><span class="eyebrow">${esc(e.place)}</span></article>`).join('')}</div>
      <p class="notice">События-примеры. Реальные объявления добавляют операторы через админ-панель.</p>
    </div>`;
  };

  // Квест
  V.quest = () => {
    if (window.GAME && GAME.active()) return GAME.view();
    // ссылка для презентации: #/quest?start=chat сразу запускает «Закрытый чат»
    if (!Q && new URLSearchParams(location.hash.split('?')[1] || '').get('start') === 'chat') Q = { i: 0, good: 0, picked: null, picks: [], lead: '', done: false };
    if (!Q) {
      const g = LS.get('ob_game', null);
      return `<div class="page">
      <div class="page-head"><span class="eyebrow">Квесты</span><h1>Выбери приключение</h1><p>Проживи опасные ситуации в безопасной игре. Результат хранится только у тебя в браузере.</p></div>
      <article class="card rim game-card"><div class="gc-img" style="background-image:url(assets/t-bishkek.jpg)"><span class="badge">Новая игра</span></div>
        <div class="post"><h3>Путь пяти городов</h3><p>Бишкек, Ош, Каракол, Талас и Ак-Буура. В каждом городе ты получишь подозрительное сообщение: найди красные флаги и выбери, как ответить. Тебе помогут Актан, Акылай, Байболот, Аруузат и Талгат.</p>
        <div class="row"><button class="btn" data-act="g-start">${g ? 'Пройти заново' : 'Играть'}</button>${g ? `<span class="badge ok">Твой иммунитет: ${g.immun}%</span>` : '<span class="badge">5 глав · около 10 минут</span>'}</div></div></article>
      <article class="card rim game-card"><div class="gc-img" style="background-image:url(assets/t-karakol.jpg)"><span class="badge">Новая игра</span></div>
        <div class="post"><h3>Дозор</h3><p>Изометрическая игра: помоги школьникам остановить вербовку и проверить слухи. 9 уровней.</p>
        <div class="row"><a class="btn" href="#/dozor">Играть</a><span class="badge">9 уровней</span></div></div></article>
      <article class="card post"><h3>Тренажёр эмоционального иммунитета</h3><p>Быстрая игра: отметь приём давления в сообщении и набери баллы.</p><div class="row"><a class="btn ghost" href="#/trainer">Открыть</a></div></article>
      <article class="card post"><h3>Пробное занятие</h3><p>Одно похожее задание до квеста и одно после: так видно, стал ли ты лучше замечать давление.</p><div class="row"><a class="btn ghost" href="#/pilot">Открыть</a></div></article>
      <article class="card post"><h3>Быстрый квест «${esc(D.quest.title)}»</h3><p>6 ситуаций в одной переписке. Около 4 минут.</p>
        <div class="row"><button class="btn ghost" data-act="q-start">Начать</button></div></article>
    </div>`;
    }
    if (Q.done) return questEnd();
    const sc = D.quest.scenes[Q.i];
    const prog = `<div class="progress">${D.quest.scenes.map((_, k) => `<i class="${k < Q.i || (k === Q.i && Q.picked != null) ? 'on' : ''}"></i>`).join('')}</div>`;
    const ch = sc.choices.map((c, k) => {
      let cls = '';
      if (Q.picked != null) cls = k === Q.picked ? (c.good ? 'ok' : 'bad') : '';
      return `<button class="choice ${cls}" data-act="q-pick" data-k="${k}" ${Q.picked != null ? 'disabled' : ''}>${esc(c.t)}</button>`;
    }).join('');
    let fb = '';
    if (Q.picked != null) {
      const c = sc.choices[Q.picked];
      fb = `<div class="card fb"><div class="row"><span class="badge ${c.good ? 'ok' : 'bad'}">${c.good ? 'Верно' : 'Тут ловушка'}</span></div>
        <p style="color:var(--ink)">${esc(c.why)}</p>
        ${sc.tricks.length ? `<div><div class="eyebrow" style="margin-bottom:6px">Приёмы в этой ситуации</div><div class="tricks">${sc.tricks.map(k => `<span class="badge warn">${esc(D.tech[k].n)}</span>`).join('')}</div></div>` : ''}
        <div class="safe"><b>Безопасный шаг:</b> ${esc(sc.safe)}</div>
        <div class="row"><button class="btn" data-act="q-next">${Q.i === QUEST_MAX - 1 ? 'Показать итог' : 'Дальше'}</button></div></div>`;
    }
    return `<div class="page quest-page">
      <div class="scene-top"><span class="badge">${Q.i + 1}/${QUEST_MAX}</span>${prog}<button class="btn ghost sm" data-act="q-quit">Выйти</button></div>
      ${phone(sc)}
      <div class="choices"><div class="eyebrow">Что ответишь?</div>${ch}</div>${fb}
    </div>`;
  };
  V.quest.mount = () => { if (window.GAME && GAME.active()) return GAME.mount(); const c = $('#chat'); if (c) c.scrollTop = c.scrollHeight; };

  // Телефон с перепиской (рамка из assets/phone.jpg, экран просвечивает через mix-blend-mode)
  function phone(cur) {
    let h = '';
    const scenes = D.quest.scenes;
    for (let k = 0; k <= Q.i; k++) {
      const s = scenes[k];
      h += `<div class="stamp">${esc(s.where)}</div>`;
      h += s.who === 'Ты' ? `<div class="sysmsg">${esc(s.text)}</div>` : `<div class="b in">${esc(s.text)}</div>`;
      const pk = k < Q.i ? Q.picks[k] : Q.picked;
      if (pk != null) {
        h += `<div class="b out">${esc(s.choices[pk].t)}</div>`;
        if (k < Q.i && s.choices[pk].lead) h += `<div class="sysmsg">${esc(s.choices[pk].lead)}</div>`;
      }
    }
    const name = cur.who === 'Ты' ? 'Выход' : cur.who;
    return `<div class="phone" aria-label="Переписка">
      <div class="screen">
        <div class="status"><span>9:41</span><span class="sbar"><i></i><i></i><i></i></span></div>
        <div class="chat-head"><span class="back">‹</span><span class="ava">${esc(name[0])}</span><span class="nm">${esc(name)}</span></div>
        <div class="chat-body" id="chat">${h}</div>
        <div class="chat-input"><span>iMessage</span></div>
      </div>
      <img src="assets/phone.jpg" alt="" aria-hidden="true">
    </div>`;
  }
  function questEnd() {
    const e = D.quest.endings.find(x => Q.good >= x.min);
    const used = [...new Set(D.quest.scenes.flatMap(s => s.tricks))];
    return `<div class="page">
      <div class="card rim hero"><span class="eyebrow">Итог квеста</span><div class="big-score">${Q.good}/${QUEST_MAX}</div><h2>${esc(e.title)}</h2><p>${esc(e.text)}</p></div>
      <div class="card post"><h3>Красные флаги из этой истории</h3><ul class="clean">${used.map(k => `<li><b>${esc(D.tech[k].n)}.</b> ${esc(D.tech[k].d)}</li>`).join('')}</ul></div>
      <div class="row"><button class="btn" data-act="q-start">Пройти ещё раз</button><a class="btn ghost" href="#/trainer">В тренажёр</a><a class="btn ghost" href="#/report">Сообщить о случае</a></div>
    </div>`;
  }

  // Тренажёр
  const OPT_ORDER = ['us_them', 'easy_glory', 'threats', 'secrecy', 'isolation', 'urgency', 'guilt'];
  const TIME = 12000;
  V.trainer = () => {
    if (!TR) {
      const best = LS.get('ob_best', null);
      return `<div class="page">
        <div class="page-head"><span class="eyebrow">Тренажёр</span><h1>Эмоциональный иммунитет</h1><p>Читай сообщение и быстро отмечай, какой приём давления в нём использован. Чем быстрее и точнее, тем больше баллов.</p></div>
        <div class="card rim post"><h3>Выбери уровень</h3><p>10 сообщений, по 12 секунд на каждое. Бывают и безопасные сообщения.</p>
          <div class="row"><button class="btn" data-act="t-start" data-l="1">Лёгкий: явные приёмы</button><button class="btn ghost" data-act="t-start" data-l="2">Сложный: замаскированные</button></div>
          ${best ? `<div class="stat"><b>${best.pct}%</b><span>твой лучший результат · ${best.score} баллов</span></div>` : ''}</div>
        <div class="card post"><h3>7 приёмов, которые мы тренируем</h3><ul class="clean">${OPT_ORDER.map(k => `<li><b>${esc(D.tech[k].n)}.</b> ${esc(D.tech[k].d)}</li>`).join('')}</ul></div>
      </div>`;
    }
    if (TR.done) return trResult();
    const m = TR.items[TR.i], a = TR.last;
    const opts = [...OPT_ORDER, 'safe'].map(k => {
      let cls = '';
      if (a) { if (k === m.tech) cls = 'ok'; else if (k === a.key) cls = 'bad'; }
      return `<button class="${k === 'safe' ? 'full ' : ''}${cls}" data-act="t-pick" data-k="${k}" ${a ? 'disabled' : ''}>${esc(D.tech[k].n)}</button>`;
    }).join('');
    const mult = TR.streak >= 2 ? `<span class="badge warn">Серия ×${TR.streak}</span>` : '';
    return `<div class="page">
      <div class="scene-top"><span class="badge">${TR.i + 1}/${TR.items.length}</span><div class="progress">${TR.items.map((_, k) => `<i class="${k < TR.i || (k === TR.i && a) ? 'on' : ''}"></i>`).join('')}</div><span class="badge">${TR.score} б.</span>${mult}</div>
      <div class="card rim post"><div class="timer" aria-hidden="true"><i id="tbar"></i></div><div class="msg">«${esc(m.t)}»</div><p>Какой приём здесь использован?</p></div>
      <div class="opts">${opts}</div>
      ${a ? `<div class="card fb"><div class="row"><span class="badge ${a.correct ? 'ok' : 'bad'}">${a.timeout ? 'Время вышло' : a.correct ? 'Верно +' + a.pts : 'Не совсем'}</span></div>
        <p style="color:var(--ink)"><b>${esc(D.tech[m.tech].n)}.</b> ${esc(D.tech[m.tech].d)}</p>
        <div class="row"><button class="btn" data-act="t-next">${TR.i === TR.items.length - 1 ? 'Показать итог' : 'Дальше'}</button></div></div>` : ''}
    </div>`;
  };
  V.trainer.mount = () => {
    if (!TR || TR.done || TR.last) return;
    const bar = $('#tbar'); if (!bar) return;
    TR.t0 = performance.now();
    timerId = setInterval(() => {
      const left = Math.max(0, TIME - (performance.now() - TR.t0));
      bar.style.transform = `scaleX(${left / TIME})`;
      if (left <= 0) { clearInterval(timerId); trAnswer(null); }
    }, 80);
  };
  function trAnswer(key) {
    if (!TR || TR.last) return;
    clearInterval(timerId);
    const m = TR.items[TR.i], correct = key === m.tech, timeout = key === null;
    let pts = 0;
    if (correct) {
      TR.streak++; TR.ok++;
      const left = Math.max(0, TIME - (performance.now() - TR.t0));
      pts = Math.round((100 + 50 * left / TIME) * (1 + 0.25 * Math.min(TR.streak - 1, 4)));
      TR.score += pts;
    } else { TR.streak = 0; TR.miss.push({ m, key }); }
    TR.last = { key, correct, timeout, pts };
    render(true);
  }
  function trResult() {
    const pct = Math.round(TR.ok / TR.items.length * 100);
    const tier = pct >= 85 ? 'Железный иммунитет' : pct >= 60 ? 'Крепкий иммунитет' : 'Есть что потренировать';
    const tip = pct >= 85 ? 'Попробуй сложный уровень.' : 'Пройди квест: там те же приёмы, но в живых ситуациях.';
    return `<div class="page">
      <div class="card rim hero"><span class="eyebrow">Твой иммунитет</span><div class="big-score">${pct}%</div><h2>${tier}</h2><p>${TR.ok} из ${TR.items.length} верно · ${TR.score} баллов. ${tip}</p><div class="meter"><i style="width:${pct}%"></i></div></div>
      ${TR.miss.length ? `<div class="card post"><h3>Разбор ошибок</h3>${TR.miss.map(x => `<div class="miss"><q>${esc(x.m.t)}</q><span><b>Это:</b> ${esc(D.tech[x.m.tech].n)}. ${x.key ? 'Ты выбрал: ' + esc(D.tech[x.key].n) + '.' : 'Время вышло.'}</span></div>`).join('')}</div>` : '<div class="card post"><h3>Без ошибок!</h3><p>Ты узнал все приёмы. Расскажи друзьям.</p></div>'}
      <div class="row"><button class="btn" data-act="t-start" data-l="${TR.level}">Ещё раунд</button><button class="btn ghost" data-act="t-share">Поделиться</button><a class="btn ghost" href="#/quest">Квест</a></div>
    </div>`;
  }

  // Проверка
  V.check = () => {
    const tabs = [['real', 'Реальные истории'], ['stories', 'Учебные истории'], ['media', 'Медиаграмотность'], ['verify', 'Проверка контента']];
    let body = '';
    if (checkTab === 'real') body = `<div class="real-hero"><h2>Реальные истории</h2><p>${esc(D.realIntro)}</p></div><div class="real">${D.realStories.map(s => `<article class="card"><div class="date">${esc(s.meta)}</div><h2>${esc(s.title)}</h2>${s.text.map(x => `<p>${esc(x)}</p>`).join('')}<p class="point"><strong>${esc(s.noteLabel)}</strong> ${esc(s.note)}</p><p class="source"><a target="_blank" rel="noopener" href="${esc(s.url)}">${esc(s.source)}</a></p></article>`).join('')}</div>`;
    if (checkTab === 'stories') body = D.stories.map(s => `<article class="card story"><details><summary><div><span class="badge">${esc(s.tag)}</span><h3 style="margin-top:6px">${esc(s.title)}</h3></div></summary>
      <div class="steps">
        <div class="step"><span class="dot"></span><div><b>Контакт</b><p>${esc(s.contact)}</p></div></div>
        <div class="step"><span class="dot"></span><div><b>Крючок</b><p>${esc(s.hook)}</p></div></div>
        <div class="step"><span class="dot"></span><div><b>Красные флаги</b><div class="tricks" style="margin-top:6px">${s.flags.map(f => `<span class="badge warn">${esc(f)}</span>`).join('')}</div></div></div>
        <div class="step"><span class="dot"></span><div><b>Где можно было остановиться</b><p>${esc(s.stop)}</p></div></div>
        <div class="step"><span class="dot"></span><div><b>Как вышли</b><p>${esc(s.exit)}</p></div></div>
      </div></details></article>`).join('') + '<p class="notice">Истории собирательные, основаны на типовых схемах, без имён и деталей, которые можно использовать как инструкцию.</p>';
    if (checkTab === 'media') body = `<div class="card post"><h3>Чек-лист: 6 вопросов перед репостом</h3><div class="check">${D.checklist.map((c, k) => `<label><input type="checkbox"><div><b>${esc(c.q)}</b><span>${esc(c.a)}</span></div></label>`).join('')}</div></div>`;
    if (checkTab === 'verify') body = `<div class="card post"><h3>Как проверить фото или видео</h3><div class="steps">${D.verifySteps.map(s => `<div class="step"><span class="avatar" style="width:28px;height:28px;font-size:12px">${s.n}</span><div><b>${esc(s.t)}</b><p>${esc(s.d)}</p></div></div>`).join('')}</div>
      <div class="row"><a class="btn ghost sm" target="_blank" rel="noopener" href="https://lens.google.com/">Google Lens</a><a class="btn ghost sm" target="_blank" rel="noopener" href="https://tineye.com/">TinEye</a><a class="btn ghost sm" target="_blank" rel="noopener" href="https://yandex.com/images/">Яндекс Картинки</a></div>
      <div class="alert">Детекторы ИИ-контента ненадёжны. Мы учим метод проверки, а не выдаём вердикт «настоящее / поддельное».</div></div>`;
    return `<div class="page"><div class="page-head"><span class="eyebrow">Проверка</span><h1>Проверь, прежде чем верить</h1><p>Разборы историй, медиаграмотность и помощь в проверке фото и видео.</p></div>
      <div class="seg" role="tablist">${tabs.map(([k, n]) => `<button data-act="chk" data-k="${k}" aria-pressed="${k === checkTab}">${n}</button>`).join('')}</div>${body}</div>`;
  };

  // Поддержка
  V.support = () => `<div class="page">
    <div class="page-head"><span class="eyebrow">Поддержка</span><h1>Ты не один</h1><p>Если тебе тревожно, страшно или ты не знаешь, что делать, можно поговорить.</p></div>
    <div class="card rim post"><h3>Если опасно прямо сейчас</h3>
      <div class="hot"><b>112</b><span>Единый номер экстренных служб</span></div>
      <div class="hot"><b>111</b><span>Телефон доверия для детей и подростков · круглосуточно, бесплатно</span></div>
      <p class="notice" style="text-align:left;padding:0">Проверено по открытым источникам: <a target="_blank" rel="noopener" href="https://kaktus.media/doc/440383_naydite_psihologa_vzlomali_akkaynt._komy_pomogli_sotrydniki_telefona_doveriia_111.html">Kaktus.media</a>, <a target="_blank" rel="noopener" href="https://kyrgyzstan.un.org/en/35934-112-service-operator-%E2%80%9C-my-first-work-day-i-felt-uncertainty-fear-and-worry-about-my-family">ООН в Кыргызстане</a>. Перед запуском номера подтверждают партнёры.</p></div>
    <div class="card post"><h3>Психологи-новички</h3>
      <p>Скоро здесь появятся выпускники вузов, которые набираются опыта под наставничеством. Сейчас в разделе демонстрационный список, а чата и ответов на сообщения пока нет.</p>
      <div class="row"><a class="btn" href="#/psychologists">Открыть список психологов</a></div></div>
    <div class="card post"><h3>Когда нужно сразу обратиться за помощью</h3><ul class="clean"><li>Есть угроза жизни или здоровью: себе или другим.</li><li>Человека шантажируют или принуждают.</li><li>Есть признаки насилия или вовлечения в незаконное.</li><li>Человек просит о срочной помощи.</li></ul></div>
  </div>`;

  // Сообщить (демо: запись остаётся в браузере и оператору не уходит)
  V.report = () => reportSent ? `<div class="page"><div class="card rim hero"><span class="eyebrow">Сохранено в демо</span><h1>Спасибо, что попробовал</h1><p>Номер демо-записи: <b>#${reportSent}</b>. Запись осталась только в этом браузере, оператору она не передана. Мы не собираем данные о тебе.</p><div class="row"><button class="btn" data-act="r-again">Ещё одно</button><a class="btn ghost" href="#/support">Нужна поддержка?</a></div></div></div>` : `<div class="page">
    <div class="demo-box" role="note"><b>Это демонстрация</b><p>Форма показана на вымышленном примере. Ничего не отправляется: запись сохранится только в этом браузере, и оператор её не увидит. В рабочей версии обращение будет уходить оператору, только если ты сам нажмёшь «Отправить».</p></div>
    <div class="page-head"><span class="eyebrow">Сообщить</span><h1>Расскажи, что произошло</h1><p>Так будет выглядеть обращение. Данные никому не передаются. Это добровольно, без слежки, и мы не оцениваем тебя.</p></div>
    <form class="card post" data-form="report">
      <div class="row"><button class="btn ghost sm" type="button" data-act="r-example">Заполнить вымышленным примером</button></div>
      <div class="field"><label for="rc">Что случилось?</label><select id="rc" required>${CATS.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select></div>
      <div class="field"><label for="rt">Опиши ситуацию</label><textarea id="rt" required minlength="10" maxlength="1500" placeholder="Что написали, как познакомились, что просят"></textarea></div>
      <div class="field"><label for="rl">Ссылка на профиль или сообщение (по желанию)</label><input id="rl" type="url" placeholder="https://"></div>
      <div class="alert">Не указывай свой пароль, номера карт и коды из СМС.</div>
      <div class="row"><button class="btn" type="submit">Сохранить в демо</button></div>
    </form></div>`;

  /* ---------- Проверка мошенников (порт ANTI-FRAUD KG, работает в браузере) ---------- */
  let AF = { input: '' , done: false };
  const AF_SEV = { ru: { high: 'сильный сигнал', medium: 'средний', low: 'слабый', info: 'справка', good: 'хорошо' }, ky: { high: 'күчтүү белги', medium: 'орто', low: 'начар', info: 'маалымат', good: 'жакшы' } };
  const AF_EX = { card: 'Карта заблокирована', prize: 'Вы выиграли', relative: 'Родственник в беде', fake: 'Фальшивая ссылка банка', real: 'Настоящий сайт банка' };
  const afResult = () => {
    if (!AF.done || !window.ANTIFRAUD) return '';
    const lg = lang === 'ky' ? 'ky' : 'ru', r = ANTIFRAUD.analyze(AF.input, lg);
    if (r.error === 'empty') return '<div class="alert">Введи текст или ссылку.</div>';
    if (r.error) return '<div class="alert">Не удалось разобрать ссылку. Проверь адрес.</div>';
    const sc = r.scheme && r.scheme.description[lg];
    return `<div class="card af-res st-${r.status}" id="af-res">
      <div class="af-top"><div class="af-score"><b>${r.score}</b><span>из 100</span></div>
        <div><span class="eyebrow">Оценка риска</span><h2>${esc(r.label)}</h2><div class="meter af-meter"><i style="width:${Math.max(4, r.score)}%"></i></div></div></div>
      <p class="af-adv">${esc(r.advice)}</p>
      ${r.signals.length ? `<h3>Почему так</h3><ul class="af-sig">${r.signals.map(s => `<li class="sv-${s.severity}"><span class="af-chip">${AF_SEV[lg][s.severity] || ''}</span><span>${esc(s.title)}${s.evidence ? ` <code>${esc(s.evidence)}</code>` : ''}</span></li>`).join('')}</ul>` : ''}
      ${r.tips.length ? `<h3>Что делать</h3><ul class="clean">${r.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      ${sc ? `<div class="af-scheme"><span class="eyebrow">Похоже на схему</span><h3>${esc(lg === 'ky' ? r.scheme.title_ky : r.scheme.title_ru)}</h3><p>${esc(sc.looks_like)}</p><b>На что смотреть</b><ul class="clean">${sc.watch.map(x => `<li>${esc(x)}</li>`).join('')}</ul><b>Что делать</b><ul class="clean">${sc.do.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      <div class="row"><button class="btn ghost" data-act="af-clear">Проверить другое</button><a class="btn" href="#/report">Сообщить о случае (демо)</a></div></div>`;
  };
  V.antifraud = () => {
    const lg = lang === 'ky' ? 'ky' : 'ru', ex = window.ANTIFRAUD ? ANTIFRAUD.examples(lg) : [];
    // ссылка для презентации: #/antifraud?ex=card|prize|relative|fake|real запускает пример
    const exId = new URLSearchParams(location.hash.split('?')[1] || '').get('ex');
    if (exId && !AF.done) { const e = ex.find(x => x.id === exId); if (e) AF = { input: e.text, done: true }; }
    return `<div class="page wide af">
      <section class="af-hero"><div class="af-shield" aria-hidden="true"><svg viewBox="0 0 24 24" width="44" height="44"><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.6 12.2l2.4 2.4 4.6-4.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <div><span class="eyebrow">Проверка мошенников</span><h1>Борьба с мошенниками, которые спонсируют экстремизм</h1>
        <p>Деньги, коды и данные, которые мошенники выманивают у людей, могут идти на другие преступления, в том числе на вербовку и финансирование экстремизма. Не отдавай их: проверь сообщение или ссылку здесь.</p></div></section>
      <div class="af-steps">
        <article class="card"><span class="af-n">1</span><h3>Мошенники давят и торопят</h3><p>Срочность, угрозы, «выигрыш», просьба кода из СМС или перевода денег.</p></article>
        <article class="card"><span class="af-n">2</span><h3>Деньги и данные уходят дальше</h3><p>Выманенные суммы и документы могут использоваться для других преступлений, в том числе для вербовки и финансирования экстремистов.</p></article>
        <article class="card"><span class="af-n">3</span><h3>Ты можешь остановить цепочку</h3><p>Не переводи деньги и не сообщай коды, проверь сообщение, расскажи взрослому и сообщи о случае.</p></article>
      </div>
      <section class="card rim af-box"><h2>Проверь сообщение или ссылку</h2>
        <form data-form="af"><div class="field"><label for="af-input">Вставь подозрительное сообщение или ссылку</label>
          <textarea id="af-input" maxlength="2000" placeholder="Например: Ваша карта заблокирована, перейдите по ссылке…">${esc(AF.input)}</textarea></div>
          <div class="row"><button class="btn xl" type="submit">Проверить</button><button class="btn ghost" type="button" data-act="af-clear">Очистить</button></div></form>
        <div class="af-ex"><span class="eyebrow">Примеры (вымышленные):</span><div class="chips">${ex.map(e => `<button class="chip" type="button" data-act="af-ex" data-t="${esc(e.text)}">${AF_EX[e.id]}</button>`).join('')}</div></div>
        <p class="notice" style="text-align:left;padding:0">Проверка идёт в твоём браузере: текст никуда не отправляется. Это помощник, а не вердикт: он не открывает сайт и не знает базу жалоб.</p></section>
      ${afResult()}
      <section class="card af-facts"><h3>Мошенничество в Кыргызстане в цифрах</h3><p>В 2025 году у граждан интернет-мошенники украли 826 млн сомов.</p><div class="row"><a class="btn ghost sm" href="#/facts">Открыть цифры и замеры</a></div>
        <p class="f-src">Основано на открытом проекте ANTI-FRAUD KG: те же правила и веса, работают без сервера.</p></section>
    </div>`;
  };
  V.antifraud.mount = () => { if (AF.done) setTimeout(() => { const r = $('#af-res'); if (r) { const y = r.getBoundingClientRect().top + scrollY - 70; scrollTo({ top: y, behavior: 'auto' }); } }, 250); };

  /* ---------- Цифры и замеры ---------- */
  const fmt = n => Number(n).toLocaleString('ru-RU');
  const srcLine = (s, d) => `<span class="f-src">${esc(s)} · ${esc(d)}</span>`;
  const bar = (l, v, max, cls) => `<div class="brow"><span class="bl">${esc(l)}</span><div class="btrack"><i class="${cls}" style="width:${Math.max(3, v / max * 100)}%"></i></div><b>${fmt(v)}</b></div>`;
  const statTile = (f, link) => `<${link ? 'a href="#/facts"' : 'article'} class="fstat"><b class="fn">${esc(f.n)}${f.unit ? ` <small>${esc(f.unit)}</small>` : ''}</b><span class="fl">${esc(f.label)}</span><span class="fp">${esc(f.period)}</span></${link ? 'a' : 'article'}>`;
  V.facts = () => {
    const F = D.facts, best = LS.get('ob_best', null), game = LS.get('ob_game', null), P = LS.get('ob_pilot', {});
    const pv = r => r ? `<span>Признаков найдено: ${r.hits} из 4</span> · <span>${r.safe ? 'Безопасный ответ: да' : 'Безопасный ответ: нет'}</span>` : '—';
    const nav = [['f-scale', 'Масштаб проблемы'], ['f-years', 'Шкала по годам'], ['f-help', 'Помощь и обращения'], ['f-result', 'Результаты проекта']];
    return `<div class="page wide facts">
      <div class="page-head"><span class="eyebrow">Цифры и замеры</span><h1>Масштаб проблемы и результаты проекта</h1><p>Что известно о мошенничестве и обращениях за помощью в Кыргызстане и как мы будем измерять результат. У каждой цифры есть период, источник и дата.</p></div>
      <div class="chips f-nav">${nav.map(([id, n]) => `<button class="chip" data-act="scrollto" data-t="${id}">${n}</button>`).join('')}</div>

      <section id="f-scale"><h2 class="sec hd">Масштаб проблемы</h2>
        <div class="fgrid">${F.key.map(f => `<article class="card fcard">${statTile(f, false)}<p class="fnote">${esc(f.note)}</p>${srcLine(f.src, f.date)}<a class="flink" target="_blank" rel="noopener" href="${esc(f.url)}">Открыть источник <span aria-hidden="true">↗</span></a></article>`).join('')}</div>
      </section>

      <section id="f-years"><h2 class="sec hd">Шкала по годам</h2>
        <div class="fcmp">${F.compare.map(c => { const m = Math.max(c.a.v, c.b.v); return `<article class="card"><h3>${esc(c.title)}</h3><div class="bars">${bar(c.a.l, c.a.v, m, 'b1')}${bar(c.b.l, c.b.v, m, 'b2')}</div><p class="fnote"><b>${esc(c.note)}</b></p>${srcLine(c.src, c.date)}</article>`; }).join('')}</div>
        <ol class="tline">${F.timeline.map(t => `<li><span class="ty">${t.year}</span><div class="card"><p>${esc(t.text)}</p>${srcLine(t.src, t.date)}</div></li>`).join('')}</ol>
      </section>

      <section id="f-help"><h2 class="sec hd">Помощь и обращения</h2>
        <div class="card"><h3>Телефон доверия 111: январь–август 2026</h3><div class="fhelp">${F.help.map(h => `<div class="fh"><b>${esc(h.v)}</b><span>${esc(h.l)}</span></div>`).join('')}</div>
        <p class="fnote">${esc(F.helpNote)}</p>${srcLine('Минсоцтруда КР, economist.kg', '10 сентября 2026')}</div>
      </section>

      <section id="f-result"><h2 class="sec hd">Результаты проекта</h2>
        <div class="fgrid2">
          <div class="card"><h3>Что мы измеряем</h3><ul class="clean">${F.metrics.map(m => `<li><b>${esc(m.t)}.</b> ${esc(m.d)}</li>`).join('')}</ul>
            <p class="fnote">План замера: «Задание до квеста», квест «Закрытый чат», «Задание после квеста», сравнение результатов группы без имён.</p></div>
          <div class="card rim"><h3>Результаты пилота</h3>
            <div class="bars"><div class="brow"><span class="bl">До квеста</span><div class="btrack"></div><b>—</b></div><div class="brow"><span class="bl">После квеста</span><div class="btrack"></div><b>—</b></div></div>
            <div class="alert">${esc(F.pilotStatus)}</div>
            <a class="btn ghost sm" href="#/pilot">Пробное занятие</a></div>
        </div>
        <div class="card"><h3>Твои замеры на этом устройстве</h3>
          <div class="fhelp">
            <div class="fh"><b>${best ? best.pct + '%' : '—'}</b><span>Лучший раунд тренажёра</span></div>
            <div class="fh"><b>${game ? game.immun + '%' : '—'}</b><span>Иммунитет в игре «Путь пяти городов»</span></div>
            <div class="fh"><b class="fsm">${pv(P.pre)}</b><span>Задание до квеста</span></div>
            <div class="fh"><b class="fsm">${pv(P.post)}</b><span>Задание после квеста</span></div>
          </div><p class="fnote">Результаты хранятся только на этом устройстве и никуда не передаются.</p></div>
      </section>

      <section><h2 class="sec hd">Чего мы не нашли</h2>
        <div class="card"><ul class="clean">${F.gaps.map(g => `<li>${esc(g)}</li>`).join('')}</ul><p class="fnote">${esc(F.howTo)}</p></div>
      </section>
    </div>`;
  };
  const factsStrip = () => `<section class="facts-strip" aria-label="Цифры и замеры">
    <h2 class="sec hd">Цифры и замеры<a href="#/facts">Все цифры <span aria-hidden="true">→</span></a></h2>
    <div class="fstrip">${D.facts.key.map(f => statTile(f, true)).join('')}</div></section>`;

  /* ---------- Психологи-новички (демо-список) ---------- */
  let psyTopic = 'Все';
  const PSY_TOPICS = ['Все', 'Учёба и стресс', 'Давление в сети', 'Общение и одиночество', 'Семья'];
  const psyCard = p => `<article class="card psy" data-act="psy" data-id="${p.id}" role="button" tabindex="0">
    <div class="psy-top"><span class="psy-av" style="--h:${p.hue}">${esc(p.name[0])}</span><div><h3>${esc(p.name)}</h3><span class="psy-role">${esc(p.role)}</span></div><span class="badge warn">Демо-профиль</span></div>
    <p>${esc(p.about)}</p>
    <div class="tricks">${p.topics.map(t => `<span class="badge">${esc(t)}</span>`).join('')}</div>
    <div class="psy-meta"><span>${esc(p.lang)}</span><span>Под наставничеством опытного психолога</span></div>
    <span class="psy-more">Подробнее ${ARROW}</span></article>`;
  V.psychologists = () => {
    const list = D.psychs.filter(p => psyTopic === 'Все' || p.topics.includes(psyTopic));
    return `<div class="page wide">
      <div class="page-head"><span class="eyebrow">Психологи</span><h1>Психологи-новички</h1><p>Недавние выпускники вузов, которые хотят набраться опыта. Работают под наставничеством и не ведут кризисные случаи.</p></div>
      <div class="demo-box" role="note"><b>Демо-список</b><p>Профили вымышленные, записи и чата пока нет. Так будет выглядеть раздел, когда мы договоримся с партнёрами. Если тебе тяжело сейчас, позвони на 111 или поговори со взрослым, которому доверяешь.</p></div>
      <div class="chips">${PSY_TOPICS.map(c => `<button class="chip" data-act="psytopic" data-c="${esc(c)}" aria-pressed="${c === psyTopic}">${esc(c)}</button>`).join('')}</div>
      <div class="psy-grid">${list.map(psyCard).join('')}</div>
      <div class="card rim post"><h3>Ты психолог-новичок?</h3><p>Хочешь набраться опыта под наставничеством? Мы ищем выпускников психологии и студентов старших курсов для пилота.</p><div class="row"><button class="btn" data-act="psyjoin">Узнать условия</button></div></div>
    </div>`;
  };
  function openPsy(id) {
    const p = D.psychs.find(x => x.id === id); if (!p) return;
    $('#modal-body').innerHTML = `<div class="psy-modal" style="display:grid;gap:12px">
      <div class="psy-top"><span class="psy-av big" style="--h:${p.hue}">${esc(p.name[0])}</span><div><h2>${esc(p.name)}</h2><span class="psy-role">${esc(p.role)}</span></div></div>
      <span class="badge warn" style="justify-self:start">Демо-профиль</span>
      <p>${esc(p.about)}</p>
      <div class="tricks">${p.topics.map(t => `<span class="badge">${esc(t)}</span>`).join('')}</div>
      <ul class="clean"><li>Языки: ${esc(p.lang)}</li><li>Формат: онлайн-встреча (в планах)</li><li>Под наставничеством опытного психолога</li></ul>
      <div class="alert">Записи пока нет: профиль демонстрационный. Новички не ведут кризисные случаи: при угрозе жизни звони на 112 или 111.</div></div>`;
    const d = $('#modal'); if (!d.open) d.showModal();
  }
  function openPsyJoin() {
    $('#modal-body').innerHTML = `<h2>Условия пилота для психологов</h2><ul class="clean"><li>Диплом или справка о прохождении практики.</li><li>Наставник: опытный психолог, который проверяет работу.</li><li>Новички не ведут кризисные случаи: при угрозе передают на 111 и дипломированным специалистам.</li><li>Никаких личных данных подростков в открытых чатах.</li></ul><p>Заявки пока не принимаются: контакты команды появятся перед пилотом.</p>`;
    const d = $('#modal'); if (!d.open) d.showModal();
  }

  /* ---------- Пробное занятие: задание до и после квеста ---------- */
  const PILOT = {
    techs: ['flattery', 'us_them', 'threats', 'secrecy', 'isolation', 'urgency', 'guilt', 'docs', 'easy_glory'],
    pre: { msg: 'Ты не такой, как остальные, я сразу это понял. Давай перейдём в закрытый чат, туда пускают только «своих». Никому не говори и реши сейчас, пока есть место.', right: ['flattery', 'us_them', 'secrecy', 'urgency'],
      replies: [['Хорошо, скинь ссылку, я зайду', false], ['Спасибо, но в закрытые чаты к незнакомым не вхожу. Покажу переписку взрослому', true], ['Зайду, только пообещай, что это безопасно', false]] },
    post: { msg: 'Ты один из немногих, кто всё понимает, не то что остальные. Группа открыта только до вечера. Родители тебя не поймут, им лучше не показывать.', right: ['flattery', 'us_them', 'urgency', 'isolation'],
      replies: [['Ладно, зайду, пока не закрыли', false], ['Не буду. Покажу сообщение маме или учителю и заблокирую контакт', true], ['Скажу, что подумаю до вечера, и зайду посмотреть', false]] }
  };
  let PL = { sel: new Set(), reply: null, after: false };
  const pScore = r => Math.max(0, r.hits - r.extra);
  const pTask = key => {
    const t = PILOT[key];
    return `<div class="card post"><span class="eyebrow">${key === 'pre' ? 'Задание до квеста' : 'Задание после квеста'}</span>
      <div class="chat"><div class="bubble">«${esc(t.msg)}»</div></div>
      <h3>1. Какие приёмы давления ты видишь?</h3>
      <div class="chips">${PILOT.techs.map(k => `<button class="chip" data-act="p-tech" data-k="${k}" aria-pressed="${PL.sel.has(k)}">${esc(D.tech[k].n)}</button>`).join('')}</div>
      <h3>2. Как ответишь?</h3>
      <div class="choices">${t.replies.map((r, i) => `<button class="choice ${PL.reply === i ? 'ok' : ''}" data-act="p-reply" data-k="${i}" aria-pressed="${PL.reply === i}">${esc(r[0])}</button>`).join('')}</div>
      <div class="row"><button class="btn" data-act="p-submit" ${PL.reply == null ? 'disabled' : ''}>Сохранить ответ</button></div></div>`;
  };
  V.pilot = () => {
    const P = LS.get('ob_pilot', {});
    let body;
    if (!P.pre) body = pTask('pre');
    else if (!P.post && !PL.after) body = `<div class="card rim post"><h2>Задание до квеста сохранено</h2><p>Теперь пройди «Закрытый чат», а потом вернись за вторым заданием.</p><div class="row"><button class="btn" data-act="home-chat">Начать «Закрытый чат»</button><button class="btn ghost" data-act="p-after">Перейти к заданию после квеста</button></div></div>`;
    else if (!P.post) body = pTask('post');
    else {
      const col = (title, r) => `<div class="card post"><h3>${title}</h3><div class="stat"><b>${r.hits}/4</b><span>Признаков найдено: ${r.hits} из 4</span></div><p>Лишних отметок: ${r.extra}</p><p>${r.safe ? 'Безопасный ответ: да' : 'Безопасный ответ: нет'}</p></div>`;
      const d = (pScore(P.post) + (P.post.safe ? 1 : 0)) - (pScore(P.pre) + (P.pre.safe ? 1 : 0));
      body = `<h2>Сравнение до и после</h2><div class="trio2">${col('До квеста', P.pre)}${col('После квеста', P.post)}</div>
        <div class="card rim post"><p style="color:var(--ink)"><b>${d > 0 ? 'Ты стал лучше замечать признаки давления.' : d === 0 ? 'Результат не изменился. Пройди «Закрытый чат» ещё раз и сравни.' : 'Результат стал ниже. Перечитай разбор в квесте и попробуй снова.'}</b></p>
        <div class="row"><button class="btn" data-act="home-chat">Начать «Закрытый чат»</button><button class="btn ghost" data-act="p-reset">Пройти заново</button></div></div>`;
    }
    return `<div class="page"><div class="page-head"><span class="eyebrow">Пилот</span><h1>Пробное занятие</h1><p>Одно и то же умение проверяем дважды: до квеста и после. Сообщения вымышленные.</p></div>${body}
      <p class="notice" style="text-align:left">Результаты хранятся только на этом устройстве и никуда не передаются. На занятии учитель может собрать их без имён.</p></div>`;
  };

  // Админ-панель
  V.admin = () => {
    if (!adminOK) return `<div class="page"><div class="page-head"><span class="eyebrow">Админ-панель</span><h1>Вход для операторов</h1><p>Демо-версия. Код доступа для показа жюри: <b>1234</b>. В рабочей версии будет полноценная авторизация и роли.</p></div>
      <form class="card post" data-form="login"><div class="field"><label for="ac">Код доступа</label><input id="ac" type="password" inputmode="numeric" autocomplete="off"></div><div class="row"><button class="btn" type="submit">Войти</button></div><p class="notice" id="aerr" style="text-align:left;padding:0"></p></form></div>`;
    const tabs = [['reports', 'Обращения'], ['publish', 'Публикации'], ['stats', 'Статистика']];
    let body = '';
    if (adminTab === 'reports') {
      const r = reports().slice().sort((a, b) => b.at - a.at);
      body = `<div class="table">${r.map(x => `<div class="rep"><div class="rep-top"><span class="badge">#${x.id}</span><span class="badge warn">${esc(x.cat)}</span><span class="sp"></span><select data-act="r-status" data-id="${x.id}" aria-label="Статус">${STATUSES.map(s => `<option ${s === x.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div><div style="font-size:14px">${esc(x.text)}</div>${x.link ? `<div style="font-size:13px;color:var(--mute)">Ссылка: ${esc(x.link)}</div>` : ''}<div style="font-size:12px;color:var(--mute)">${new Date(x.at).toLocaleString('ru-RU')}${x.demo ? ' · демо' : ''}</div></div>`).join('')}</div>`;
    }
    if (adminTab === 'publish') body = `<form class="card post" data-form="publish">
      <div class="field"><label for="pk">Тип</label><select id="pk"><option value="news">Новость в ленту</option><option value="event">Событие в афишу</option></select></div>
      <div class="field"><label for="pt">Заголовок</label><input id="pt" required maxlength="120"></div>
      <div class="field"><label for="px">Текст</label><textarea id="px" required maxlength="900"></textarea></div>
      <div class="field"><label for="pm">Рубрика / категория (напр. Предупреждение, Хакатон, Учёба)</label><input id="pm" required maxlength="30"></div>
      <div class="field"><label for="pd">Дата (для афиши) и место</label><input id="pd" placeholder="25 ноября · Ош"></div>
      <div class="alert">Правила: фактический тон, без религиозной и политической агитации, без персональных данных и жестоких подробностей.</div>
      <div class="row"><button class="btn" type="submit">Опубликовать</button><span id="pok" class="badge ok" hidden>Опубликовано. Смотри на главной.</span></div></form>`;
    if (adminTab === 'stats') {
      const r = reports(); const max = Math.max(1, ...CATS.map(c => r.filter(x => x.cat === c).length));
      body = `<div class="card post"><h3>Обращения по категориям</h3>${CATS.map(c => { const n = r.filter(x => x.cat === c).length; return `<div class="bar"><span>${esc(c)}</span><i style="width:${n / max * 100}%"></i><b>${n}</b></div>`; }).join('')}</div>
        <div class="card post"><h3>По статусам</h3><div class="stats">${STATUSES.map(s => `<div class="stat"><b>${r.filter(x => x.status === s).length}</b><span>${s}</span></div>`).join('')}</div><p class="notice" style="text-align:left;padding:0">Только агрегированная анонимная аналитика, без слежки за пользователями.</p></div>`;
    }
    return `<div class="page"><div class="page-head"><span class="eyebrow">Админ-панель</span><h1>Рабочее место оператора</h1></div>
      <div class="seg">${tabs.map(([k, n]) => `<button data-act="atab" data-k="${k}" aria-pressed="${k === adminTab}">${n}</button>`).join('')}</div>${body}
      <div class="row"><button class="btn ghost sm" data-act="a-reset">Сбросить демо-данные</button><button class="btn ghost sm" data-act="a-out">Выйти</button></div></div>`;
  };

  /* ---------- инфо-окна ---------- */
  const INFO = {
    about: ['О проекте', '<p>«Ойгон» помогает школьникам и студентам распознавать манипуляцию и вербовку в сети. Мы не блокируем и не запрещаем, а вырабатываем иммунитет: учим узнавать приёмы давления на историях, в квесте и тренажёре.</p><p>Платформа объединяет новости, квесты и игры, проверку мошенников и афишу. Главные идеи: защищать молодёжь от плохого, давать путь к хорошему и бороться с мошенниками, которые спонсируют экстремизм.</p><p>Проект создан на хакатоне Digital Hackathon Osh. Название «Ойгон» — «пробудись, будь внимателен».</p>'],
    rules: ['Правила платформы', '<ul class="clean"><li>Нейтральность: оцениваем приёмы манипуляции, а не убеждения и группы людей.</li><li>Приватность: без регистрации, без баз персональных данных.</li><li>Без комментариев и открытых дискуссий: только реакции.</li><li>В рабочей версии обращение уходит оператору только если пользователь сам нажал «Отправить». Сейчас форма работает в демо-режиме.</li><li>Публикуют только уполномоченные операторы, с модерацией.</li></ul>'],
    partners: ['Партнёры', '<p>Школы и вузы региона, правоохранительные органы, психологи и факультеты психологии. Здесь появятся логотипы партнёров пилота.</p>'],
    teachers: ['Классный час «Цифровой иммунитет»', '<p>Приглашаем учителей и кураторов провести урок на 30–40 минут: класс проходит игру «Путь пяти городов», тренажёр и обсуждает разбор. Вход по QR-коду, регистрация и сбор данных не нужны.</p><ul class="clean"><li>Материалы для учителя: план урока и вопросы для обсуждения (скоро).</li><li>Подходит для 8–11 классов и студентов колледжей.</li><li>Хотите пилот в вашей школе? Свяжитесь с командой проекта.</li></ul><p><a href="#/pilot" data-act="close">Пробное занятие с заданиями до и после</a></p>'],
    help: ['Помощь и контакты', '<p>Нужна поддержка — загляни во вкладку «Поддержка». Хочешь попробовать форму обращения — вкладка «Сообщить» (демо). Для школ и учителей: материалы для классного часа будут на сайте.</p><p><a href="#/admin" data-act="close">Вход для операторов</a></p>']
  };
  function openInfo(k) {
    if (k === 'menu') {
      const sec = [['#/news', 'Новости'], ['#/quest', 'Квесты и игры'], ['#/antifraud', 'Проверка мошенников'], ['#/events', 'Афиша'], ['#/check', 'Проверка'], ['#/psychologists', 'Психологи'], ['#/facts', 'Цифры и замеры'], ['#/trainer', 'Тренажёр']];
      $('#modal-body').innerHTML = `<h2>Меню</h2><div class="modal-links">${sec.map(([h, n]) => `<a class="mlink" href="${h}" data-act="close">${n}</a>`).join('')}</div><div class="modal-links" style="margin-top:6px">${['about', 'rules', 'partners', 'help'].map(x => `<button data-act="info" data-k="${x}">${t(x)}</button>`).join('')}</div>`;
    } else {
      $('#modal-body').innerHTML = `<h2>${INFO[k][0]}</h2>${INFO[k][1]}`;
    }
    const d = $('#modal'); if (!d.open) d.showModal();
  }

  /* ---------- рендер ---------- */
  function route() { return (location.hash.replace(/^#\//, '') || 'home').split('?')[0]; }
  function render(keepScroll) {
    clearInterval(timerId);
    let r = route(); if (!V[r]) r = 'home';
    $('#view').innerHTML = V[r]();
    document.body.classList.toggle('no-bot', r === 'dozor' || r === 'psychologists' || r === 'antifraud');
    const tab = ({ dozor: 'quest', pilot: 'quest', trainer: 'quest', psychologists: 'support', antifraud: 'support', facts: 'home', search: '' })[r] ?? r;
    $$('#dock a, #mainnav a').forEach(x => { if (x.dataset.tab === tab) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current'); });
    if (V[r].mount) V[r].mount();
    if (!keepScroll) window.scrollTo({ top: 0 });
  }
  window.addEventListener('hashchange', () => { render(); $('#view').focus({ preventScroll: true }); });

  /* ---------- действия ---------- */
  document.addEventListener('click', e => {
    const lb = e.target.closest('[data-lang]'); if (lb) { lang = lb.dataset.lang; LS.set('ob_lang', lang); if (window.I18N) I18N.set(lang); applyLang(); buildDock(); setToday(); render(true); syncFrame(); return; }
    if (e.target.closest('#theme')) { const dark = document.documentElement.getAttribute('data-theme') !== 'dark'; if (dark) document.documentElement.setAttribute('data-theme', 'dark'); else document.documentElement.removeAttribute('data-theme'); LS.set('ob_theme', dark ? 'dark' : 'light'); syncFrame(); return; }
    const hr = e.target.closest('[data-href]'); if (hr) { location.hash = hr.dataset.href; return; }
    const el = e.target.closest('[data-act]'); if (!el) return;
    const a = el.dataset.act, k = el.dataset.k;
    switch (a) {
      case 'info': case 'menu': openInfo(a === 'menu' ? 'menu' : k); break;
      case 'close': $('#modal').close(); break;
      case 'react': { const r = reacted(); r[el.dataset.id] = !r[el.dataset.id]; LS.set('ob_react', r); render(true); break; }
      case 'share': { const u = location.href.split('#')[0]; if (navigator.share) navigator.share({ title: 'Ойгон', url: u }).catch(() => {}); else navigator.clipboard && navigator.clipboard.writeText(u).then(() => { el.textContent = 'Ссылка скопирована'; }); break; }
      case 'evcat': evCat = el.dataset.c; render(true); break;
      case 'post': openPost(el.dataset.id); break;
      case 'af-ex': AF = { input: el.dataset.t, done: true }; render(true); break;
      case 'af-clear': AF = { input: '', done: false }; render(true); break;
      case 'psy': openPsy(el.dataset.id); break;
      case 'scrollto': { const t = document.getElementById(el.dataset.t); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); break; }
      case 'psyjoin': openPsyJoin(); break;
      case 'psytopic': psyTopic = el.dataset.c; render(true); break;
      case 'react-m': { const r = reacted(); r[el.dataset.id] = !r[el.dataset.id]; LS.set('ob_react', r); openPost(el.dataset.id); break; }
      case 'chk': checkTab = k; render(true); break;
      // квест
      case 'q-start': Q = { i: 0, good: 0, picked: null, picks: [], lead: '', done: false }; render(); break;
      case 'q-quit': Q = null; render(); break;
      case 'q-pick': { const c = D.quest.scenes[Q.i].choices[+k]; Q.picked = +k; Q.picks[Q.i] = +k; if (c.good) Q.good++; render(true); break; }
      case 'q-next': {
        const c = D.quest.scenes[Q.i].choices[Q.picked];
        if (Q.i === QUEST_MAX - 1) { Q.done = true; LS.set('ob_quest', { good: Q.good }); } else { Q.i++; Q.picked = null; }
        render(); break; }
      // тренажёр
      case 't-start': { const lvl = +el.dataset.l; TR = { level: lvl, items: shuffle(D.msgs.filter(m => m.lvl === lvl)).slice(0, 10), i: 0, score: 0, streak: 0, ok: 0, miss: [], last: null, done: false }; render(); break; }
      case 't-pick': trAnswer(k); break;
      case 't-next': if (TR.i === TR.items.length - 1) { TR.done = true; const pct = Math.round(TR.ok / TR.items.length * 100), b = LS.get('ob_best', null); if (!b || pct > b.pct || (pct === b.pct && TR.score > b.score)) LS.set('ob_best', { pct, score: TR.score }); } else { TR.i++; TR.last = null; } render(); break;
      case 't-share': { const pct = Math.round(TR.ok / TR.items.length * 100), txt = (window.I18N ? I18N.tr : String)(`Мой цифровой иммунитет в «Ойгон»: ${pct}%. А твой?`); if (navigator.share) navigator.share({ text: txt }).catch(() => {}); else navigator.clipboard && navigator.clipboard.writeText(txt).then(() => { el.textContent = 'Скопировано'; }); break; }
      case 'r-again': reportSent = null; render(); break;
      case 'r-example': { const T2 = window.I18N ? I18N.tr : (x => x); $('#rc').value = 'Закрытый чат / вербовка'; $('#rt').value = T2('Пример (вымышленный): незнакомый человек написал мне в личку, хвалит и зовёт в закрытый чат, просит никому не говорить и ответить до вечера.'); break; }
      case 'home-chat': { if (window.GAME && GAME.active()) GAME.handle('g-quit', null, () => {}); Q = { i: 0, good: 0, picked: null, picks: [], lead: '', done: false }; if (route() === 'quest') render(); else location.hash = '#/quest'; break; }
      case 'p-tech': if (PL.sel.has(k)) PL.sel.delete(k); else PL.sel.add(k); render(true); break;
      case 'p-reply': PL.reply = +k; render(true); break;
      case 'p-after': PL = { sel: new Set(), reply: null, after: true }; render(); break;
      case 'p-reset': try { localStorage.removeItem('ob_pilot'); } catch { } PL = { sel: new Set(), reply: null, after: false }; render(); break;
      case 'p-submit': {
        const P = LS.get('ob_pilot', {}), key = P.pre ? 'post' : 'pre', t = PILOT[key];
        const hits = [...PL.sel].filter(x => t.right.includes(x)).length, extra = PL.sel.size - hits;
        P[key] = { hits, extra, safe: !!t.replies[PL.reply][1] }; LS.set('ob_pilot', P);
        PL = { sel: new Set(), reply: null, after: false }; render(); break; }
      // админка
      case 'atab': adminTab = k; render(true); break;
      case 'a-out': adminOK = false; render(); break;
      case 'a-reset': try { ['ob_reports', 'ob_news', 'ob_events'].forEach(x => localStorage.removeItem(x)); } catch { } render(true); break;
      default: if (a.startsWith('g-') && window.GAME) GAME.handle(a, el, render);
    }
  });
  document.addEventListener('change', e => {
    const el = e.target.closest('[data-act="r-status"]'); if (!el) return;
    const r = reports(); const x = r.find(y => y.id === +el.dataset.id); if (x) { x.status = el.value; LS.set('ob_reports', r); }
  });
  document.addEventListener('submit', e => {
    const f = e.target.closest('[data-form]'); if (!f) return; e.preventDefault();
    const kind = f.dataset.form;
    if (kind === 'report') {
      const r = reports(); const id = 200 + r.length + 1;
      r.push({ id, cat: $('#rc').value, text: $('#rt').value.trim(), link: $('#rl').value.trim(), status: 'Новое', at: Date.now() });
      LS.set('ob_reports', r); reportSent = id; render();
    }
    if (kind === 'af') { AF = { input: $('#af-input').value, done: true }; render(true); return; }
    if (kind === 'login') { if ($('#ac').value === '1234') { adminOK = true; render(); } else $('#aerr').textContent = 'Неверный код.'; }
    if (kind === 'publish') {
      const type = $('#pk').value, title = $('#pt').value.trim(), text = $('#px').value.trim(), tag = $('#pm').value.trim(), extra = $('#pd').value.trim();
      const now = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
      if (type === 'news') { const n = userNews(); n.unshift({ id: 'u' + Date.now(), author: 'Оператор платформы', role: '', date: now, tag, title, text, likes: 0 }); LS.set('ob_news', n); }
      else { const [date, place] = extra.split('·').map(s => s.trim()); const n = userEvents(); n.unshift({ id: 'ue' + Date.now(), cat: tag, title, date: date || now, place: place || '—', desc: text }); LS.set('ob_events', n); }
      f.reset(); $('#pok').hidden = false;
    }
  });
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') e.target.close(); });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role=button][data-act],[role=button][data-href]')) { e.preventDefault(); e.target.click(); } });
  $('#search').addEventListener('submit', e => { e.preventDefault(); const v = $('#q').value.trim(); if (v) location.hash = '#/search?q=' + encodeURIComponent(v); });

  function setToday() {
    const el = $('#today'); if (!el) return;
    try {
      const n = new Date();
      if (lang === 'ky') {
        const W = ['Жекшемби', 'Дүйшөмбү', 'Шейшемби', 'Шаршемби', 'Бейшемби', 'Жума', 'Ишемби'];
        const M = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
        el.textContent = `${W[n.getDay()]}, ${n.getDate()}-${M[n.getMonth()]} ${n.getFullYear()}-ж.`;
      } else {
        const d = n.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); el.textContent = d.charAt(0).toUpperCase() + d.slice(1);
      }
    } catch { el.textContent = new Date().toLocaleDateString(); }
  }
  function syncFrame() {
    const fr = $('.dozor-frame'); if (!fr) return;
    try {
      const w = fr.contentWindow; if (w.I18N) w.I18N.set(lang);
      if (document.documentElement.getAttribute('data-theme') === 'dark') w.document.documentElement.setAttribute('data-theme', 'dark'); else w.document.documentElement.removeAttribute('data-theme');
    } catch { }
  }

  /* два плавающих помощника («Проверка мошенников» и «Психологи») падают сверху; пузырь выезжает позже */
  (function initBot() {
    const box = $('#bot'), bubble = $('#bot-bubble'); if (!box || !bubble) return;
    let closed = false; try { closed = sessionStorage.getItem('ob_bot') === '1'; } catch { }
    const hide = () => { bubble.classList.remove('show'); try { sessionStorage.setItem('ob_bot', '1'); } catch { } };
    setTimeout(() => { if (!closed) bubble.classList.add('show'); }, 3600);
    $('#bot-x').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); hide(); });
    bubble.addEventListener('click', e => { if (e.target.closest('.bot-cta')) hide(); });
    $('#bot-btn').addEventListener('click', hide); $('#af-btn').addEventListener('click', hide);
  })();

  applyLang(); buildDock(); setToday(); render();
})();
