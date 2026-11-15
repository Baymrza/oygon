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
    ru: { about: 'О проекте', rules: 'Правила', partners: 'Партнёры', help: 'Помощь', home: 'Главная', events: 'Афиша', quest: 'Квест', trainer: 'Тренажёр', check: 'Проверка', support: 'Поддержка', report: 'Сообщить' },
    ky: { about: 'Долбоор жөнүндө', rules: 'Эрежелер', partners: 'Өнөктөштөр', help: 'Жардам', home: 'Башкы', events: 'Афиша', quest: 'Квест', trainer: 'Машыгуу', check: 'Текшерүү', support: 'Колдоо', report: 'Кабарлоо' }
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
    report: 'M5 21V4M5 4h11l-2 4 2 4H5'
  };
  const TABS = ['home', 'events', 'quest', 'trainer', 'check', 'support', 'report'];
  function buildDock() {
    $('#dock').innerHTML = TABS.map(id =>
      `<a href="#/${id}" data-tab="${id}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${IC[id]}"/></svg><span>${t(id)}</span></a>`).join('');
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
  let Q = null, TR = null, timerId = null, checkTab = 'stories', evCat = 'Все', adminOK = false, adminTab = 'reports', supportSent = false, reportSent = null;
  const QUEST_MAX = D.quest.scenes.length;

  /* ---------- вьюхи ---------- */
  const V = {};

  // Главная: лента + афиша
  V.home = () => {
    const best = LS.get('ob_best', null), quest = LS.get('ob_quest', null), game = LS.get('ob_game', null);
    const posts = [...userNews(), ...D.news];
    const evs = [...userEvents(), ...D.events];
    const react = reacted();
    const postHtml = p => {
      const on = react[p.id], n = p.likes + (on ? 1 : 0);
      return `<article class="card post">
        <div class="post-meta"><span class="avatar">${esc(p.author[0])}</span><span>${esc(p.author)} · ${esc(p.date)}</span><span class="sp"></span><span class="badge">${esc(p.tag)}</span></div>
        <h3>${esc(p.title)}</h3><p>${esc(p.text)}</p>
        <div class="react"><button data-act="react" data-id="${p.id}" aria-pressed="${!!on}">Полезно · ${n}</button><button data-act="share" data-id="${p.id}">Поделиться</button></div>
      </article>`;
    };
    const afisha = `<section aria-label="Афиша">
      <div class="afisha-head"><h2>Призываем к хорошему</h2><span class="sp"></span><a class="btn ghost sm" href="#/events">Вся афиша</a></div>
      <div class="hscroll">${evs.slice(0, 6).map(e => `<article class="card ev rim"><span class="badge">${esc(e.cat)}</span><h3>${esc(e.title)}</h3><span class="date">${esc(e.date)} · ${esc(e.place)}</span><p>${esc(e.desc)}</p></article>`).join('')}</div>
    </section>`;
    const imm = best ? best.pct : 0;
    return `<div class="page">
      <section class="card rim hero">
        <span class="eyebrow">Цифровой иммунитет молодёжи</span>
        <h1>Знающий человек <em>сам останавливает</em> манипулятора</h1>
        <p>Квест, тренажёр и разборы реальных историй. Без регистрации, без сбора данных.</p>
        <div class="row"><a class="btn" href="#/quest">Пройти квест</a><a class="btn ghost" href="#/trainer">Тренажёр</a></div>
        <div class="stats">
          <div class="stat"><b>${best ? imm + '%' : '—'}</b><span>твой иммунитет (лучший раунд)</span><div class="meter" style="margin-top:8px"><i style="width:${imm}%"></i></div></div>
          <div class="stat"><b>${game ? game.immun + '%' : quest ? quest.good + '/' + QUEST_MAX : '—'}</b><span>${game ? 'иммунитет в игре «Путь пяти городов»' : 'верных решений в квесте'}</span></div>
        </div>
      </section>
      ${postHtml(posts[0])}${posts[1] ? postHtml(posts[1]) : ''}
      ${afisha}
      ${posts.slice(2).map(postHtml).join('')}
      <p class="notice">Публикации — демонстрационные. В рабочей версии их размещают уполномоченные операторы через админ-панель. Комментариев нет: только реакции.</p>
    </div>`;
  };

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
    if (!Q) {
      const g = LS.get('ob_game', null);
      return `<div class="page">
      <div class="page-head"><span class="eyebrow">Квесты</span><h1>Выбери приключение</h1><p>Проживи опасные ситуации в безопасной игре. Результат хранится только у тебя в браузере.</p></div>
      <article class="card rim game-card"><div class="gc-img" style="background-image:url(assets/bg-bishkek.png)"><span class="badge">Новая игра</span></div>
        <div class="post"><h3>Путь пяти городов</h3><p>Бишкек, Ош, Каракол, Талас и Ак-Буура. В каждом городе ты получишь подозрительное сообщение: найди красные флаги и выбери, как ответить. Тебе помогут Актан, Акылай, Байболот, Аруузат и Талгат.</p>
        <div class="row"><button class="btn" data-act="g-start">${g ? 'Пройти заново' : 'Играть'}</button>${g ? `<span class="badge ok">Твой иммунитет: ${g.immun}%</span>` : '<span class="badge">5 глав · около 10 минут</span>'}</div></div></article>
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
    const tabs = [['stories', 'Истории'], ['media', 'Медиаграмотность'], ['verify', 'Проверка контента']];
    let body = '';
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
      <div class="hot"><b>111</b><span>Телефон доверия для детей и подростков</span></div>
      <p class="notice" style="text-align:left;padding:0">Номера и режим работы перед запуском проверяет команда и партнёры.</p></div>
    <div class="card post"><h3>Написать психологу-наставнику</h3>
      <p>Раздел в пилоте: отвечают начинающие психологи под наставничеством. Кризисные случаи передаются дипломированным специалистам и на горячую линию.</p>
      ${supportSent ? '<div class="safe">Сообщение сохранено в демо. В рабочей версии оно уйдёт психологу.</div>' : `<form data-form="support"><div class="field"><label for="st">О чём хочешь поговорить?</label><textarea id="st" required maxlength="800" placeholder="Можно без имён и подробностей"></textarea></div><div class="row"><button class="btn" type="submit">Отправить</button></div></form>`}</div>
    <div class="card post"><h3>Когда мы сразу передаём дальше</h3><ul class="clean"><li>Есть угроза жизни или здоровью: себе или другим.</li><li>Человека шантажируют или принуждают.</li><li>Есть признаки насилия или вовлечения в незаконное.</li><li>Человек просит о срочной помощи.</li></ul></div>
  </div>`;

  // Сообщить
  V.report = () => reportSent ? `<div class="page"><div class="card rim hero"><span class="eyebrow">Обращение отправлено</span><h1>Спасибо, что рассказал</h1><p>Номер обращения: <b>#${reportSent}</b>. Его увидит оператор. Мы не требуем имени и не собираем данные о тебе.</p><div class="row"><button class="btn" data-act="r-again">Ещё одно</button><a class="btn ghost" href="#/support">Нужна поддержка?</a></div></div></div>` : `<div class="page">
    <div class="page-head"><span class="eyebrow">Сообщить</span><h1>Расскажи, что произошло</h1><p>Обращение уходит только если ты сам нажмёшь «Отправить». Это добровольно, без слежки. Мы не оцениваем тебя.</p></div>
    <form class="card post" data-form="report">
      <div class="field"><label for="rc">Что случилось?</label><select id="rc" required>${CATS.map(c => `<option>${esc(c)}</option>`).join('')}</select></div>
      <div class="field"><label for="rt">Опиши ситуацию</label><textarea id="rt" required minlength="10" maxlength="1500" placeholder="Что написали, как познакомились, что просят"></textarea></div>
      <div class="field"><label for="rl">Ссылка на профиль или сообщение (по желанию)</label><input id="rl" type="url" placeholder="https://"></div>
      <div class="alert">Не указывай свой пароль, номера карт и коды из СМС.</div>
      <div class="row"><button class="btn" type="submit">Отправить</button></div>
    </form></div>`;

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
    about: ['О проекте', '<p>«Ойгон» помогает школьникам и студентам распознавать манипуляцию и вербовку в сети. Мы не блокируем и не запрещаем, а вырабатываем иммунитет: учим узнавать приёмы давления на историях, в квесте и тренажёре.</p><p>Проект создан на хакатоне Digital Hackathon Osh. Название «Ойгон» — «пробудись, будь внимателен».</p>'],
    rules: ['Правила платформы', '<ul class="clean"><li>Нейтральность: оцениваем приёмы манипуляции, а не убеждения и группы людей.</li><li>Приватность: без регистрации, без баз персональных данных.</li><li>Без комментариев и открытых дискуссий: только реакции.</li><li>Обращения уходят только если пользователь сам нажал «Отправить».</li><li>Публикуют только уполномоченные операторы, с модерацией.</li></ul>'],
    partners: ['Партнёры', '<p>Школы и вузы региона, правоохранительные органы, психологи и факультеты психологии. Здесь появятся логотипы партнёров пилота.</p>'],
    teachers: ['Классный час «Цифровой иммунитет»', '<p>Приглашаем учителей и кураторов провести урок на 30–40 минут: класс проходит игру «Путь пяти городов», тренажёр и обсуждает разбор. Вход по QR-коду, регистрация и сбор данных не нужны.</p><ul class="clean"><li>Материалы для учителя: план урока и вопросы для обсуждения (скоро).</li><li>Подходит для 8–11 классов и студентов колледжей.</li><li>Хотите пилот в вашей школе? Напишите через вкладку «Сообщить» или оператору платформы.</li></ul><p><a href="#/quest" data-act="close">Открыть игру</a></p>'],
    help: ['Помощь и контакты', '<p>Нужна поддержка — загляни во вкладку «Поддержка». Хочешь сообщить о случае — вкладка «Сообщить». Для школ и учителей: материалы для классного часа будут на сайте.</p><p><a href="#/admin" data-act="close">Вход для операторов</a></p>']
  };
  function openInfo(k) {
    if (k === 'menu') {
      $('#modal-body').innerHTML = `<h2>Меню</h2><div class="modal-links">${['about', 'rules', 'partners', 'help'].map(x => `<button data-act="info" data-k="${x}">${t(x)}</button>`).join('')}</div>`;
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
    $$('#dock a').forEach(a => a.toggleAttribute('aria-current', a.dataset.tab === r));
    $$('#dock a[aria-current]').forEach(a => a.setAttribute('aria-current', 'page'));
    if (V[r].mount) V[r].mount();
    if (!keepScroll) window.scrollTo({ top: 0 });
  }
  window.addEventListener('hashchange', () => { render(); $('#view').focus({ preventScroll: true }); });

  /* ---------- действия ---------- */
  document.addEventListener('click', e => {
    const lb = e.target.closest('[data-lang]'); if (lb) { lang = lb.dataset.lang; LS.set('ob_lang', lang); applyLang(); buildDock(); render(true); return; }
    const el = e.target.closest('[data-act]'); if (!el) return;
    const a = el.dataset.act, k = el.dataset.k;
    switch (a) {
      case 'info': case 'menu': openInfo(a === 'menu' ? 'menu' : k); break;
      case 'close': $('#modal').close(); break;
      case 'react': { const r = reacted(); r[el.dataset.id] = !r[el.dataset.id]; LS.set('ob_react', r); render(true); break; }
      case 'share': { const u = location.href.split('#')[0]; if (navigator.share) navigator.share({ title: 'Ойгон', url: u }).catch(() => {}); else navigator.clipboard && navigator.clipboard.writeText(u).then(() => { el.textContent = 'Ссылка скопирована'; }); break; }
      case 'evcat': evCat = el.dataset.c; render(true); break;
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
      case 't-share': { const pct = Math.round(TR.ok / TR.items.length * 100), txt = `Мой цифровой иммунитет в «Ойгон»: ${pct}%. А твой?`; if (navigator.share) navigator.share({ text: txt }).catch(() => {}); else navigator.clipboard && navigator.clipboard.writeText(txt).then(() => { el.textContent = 'Скопировано'; }); break; }
      case 'r-again': reportSent = null; render(); break;
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
    if (kind === 'support') { supportSent = true; render(true); }
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

  applyLang(); buildDock(); render();
})();
