/* Игра «Путь пяти городов» — визуальная новелла + поиск «красных флагов» в переписке.
   Подключается до app.js, отдаёт window.GAME. Все сюжеты вымышленные и учебные. */
(function () {
  'use strict';
  const D = window.DATA;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } }
  };

  const BAD = 30, MISS = 5, FALSE = 3;   // штрафы к «иммунитету»

  const WHO = {
    'Рассказчик': { cls: 'av-nar', ch: '✦' }, 'Ты': { cls: 'av-you', ch: 'Я' },
    'Актан': { cls: 'av-aktan' }, 'Акылай': { cls: 'av-akylai' },
    'Байболот': { cls: 'av-bai' }, 'Аруузат': { cls: 'av-aru' }, 'Талгат': { cls: 'av-tal' }
  };

  /* Во фразах [[приём|текст]] — красные флаги (целое предложение). Остальные предложения безопасны. */
  const ord = (a, idx) => idx.map(i => a[i]);
  const CH = [
    { city: 'Бишкек', theme: 'Сообщение от «организатора»', bg: 'assets/t-bishkek.jpg', actors: [],
      dialog: [
        { who: 'Рассказчик', text: 'Бишкек, утро. Школьная поездка «Пять городов» стартует через час. Ты идёшь на сбор вместе с друзьями — Актаном и Акылай.' },
        { who: 'Актан', text: 'Нас всех добавили в общий чат поездки. Там уже больше двухсот человек!' },
        { who: 'Акылай', text: 'Эй, тебе кто-то пишет в личку с незнакомого номера. Посмотри, пока мы не дошли.' },
        { who: 'Ты', text: 'Открываю...' }
      ],
      phone: { name: 'Организатор Эрлан', stamp: 'Сегодня, 09:12', msgs: [
        'Привет! Я Эрлан из оргкомитета поездки. [[urgency|Решай сейчас: через 10 минут твоё место отдадим другому!]] Нужно подтвердить участие.',
        '[[docs|Пришли фото паспорта и код из СМС, который сейчас придёт.]] Это займёт минуту.',
        '[[secrecy|Классному руководителю пока не пиши, это внутренний список.]] Жду ответа!'
      ] },
      choices: [
        { t: 'Отправлю паспорт и код, не хочу потерять место', good: false, why: 'Паспорт и код из СМС нельзя передавать никому. По ним оформляют кредиты и входят в твои аккаунты. Срочность нужна, чтобы ты не успел подумать.' },
        { t: 'Спрошу у классного руководителя, пишет ли нам такой организатор', good: true, why: 'Верно. Проверка у знающего человека ломает схему: настоящему организатору скрывать нечего.' },
        { t: 'Ничего не отправлю, заблокирую номер и сохраню скриншот', good: true, why: 'Отлично. Блок и скриншот защищают тебя и помогут, если придётся обратиться за помощью.' }
      ],
      helper: { who: 'Актан', text: 'Настоящий организатор не просит коды из СМС и не запрещает говорить с учителем.' },
      safe: 'Никогда не отправляй коды из СМС и документы по первому запросу. Проверяй через учителя или официальный номер.' },

    { city: 'Ош', theme: 'Закрытый круг «для избранных»', bg: 'assets/t-osh.jpg', actors: [{ src: 'assets/baibolot.jpg', name: 'Байболот', side: 'right', flip: true }],
      dialog: [
        { who: 'Рассказчик', text: 'Автобус привёз вас в Ош. У подножия горы вас встречает местный школьник Байболот.' },
        { who: 'Байболот', text: 'Добро пожаловать! Покажу вам город. Только не удивляйтесь: в нашем классе одного парня недавно втянули в «закрытый круг».' },
        { who: 'Актан', text: 'Как это случилось?' },
        { who: 'Байболот', text: 'Сначала хвалили, потом попросили молчать. Мне вчера тоже написали. Смотрите.' }
      ],
      phone: { name: 'Знающий_брат', stamp: 'Вчера, 22:40', msgs: [
        'Привет! Видел твои комментарии под видео. [[flattery|Ты реально умный, не то что остальные в твоём классе.]]',
        '[[us_them|Мы — настоящие, а они все против нас.]] У нас небольшой круг, вход по приглашению.',
        '[[isolation|Родители и учителя тебя не поймут, у тебя есть только мы.]] Заходи сегодня вечером. [[secrecy|Никому не рассказывай и не делай скриншоты.]]'
      ] },
      choices: [
        { t: 'Хочу в круг, скинь ссылку', good: false, why: 'Лесть, «мы против них», изоляция и секретность — полный набор вербовщика. «Особенный круг» нужен, чтобы оторвать тебя от тех, кто мог бы сказать «стоп».' },
        { t: 'Не зайду. Покажу переписку учителю или старшему, которому доверяю', good: true, why: 'Лучший ход. Взгляд со стороны быстро показывает манипуляцию.' },
        { t: 'Спрошу: «Почему нельзя никому рассказывать?» и посмотрю на ответ', good: true, why: 'Хороший вопрос: манипулятор уйдёт от ответа. Но долго спорить не стоит: если уходит от темы — заканчивай разговор.' }
      ],
      helper: { who: 'Байболот', text: 'Если сначала хвалят, а потом просят молчать — это стоп-сигнал.' },
      safe: 'Не заходи в закрытые чаты к малознакомым людям. Если просят молчать — расскажи близкому человеку.' },

    { city: 'Каракол', theme: 'Лёгкая подработка', bg: 'assets/t-karakol.jpg', actors: [{ src: 'assets/aruuzat.jpg', name: 'Аруузат', side: 'left' }],
      dialog: [
        { who: 'Рассказчик', text: 'Каракол: деревянные дома, старый собор и снежные вершины на горизонте. Здесь вас ждёт Аруузат, волонтёр кружка медиаграмотности.' },
        { who: 'Аруузат', text: 'Привет! Я каждую неделю вижу объявления про «лёгкую подработку». Сегодня такое прислали мне.' },
        { who: 'Акылай', text: 'Деньги ведь всем нужны...' },
        { who: 'Аруузат', text: 'Вот на этом и ловят. Прочитай, а потом решай.' }
      ],
      phone: { name: 'Подработка_Online', stamp: 'Сегодня, 14:05', msgs: [
        'Здравствуй! Нужен курьер на один день. [[easy_glory|Оплата 100 000 сомов, опыт не нужен.]]',
        'Нужно просто забрать пакет и передать дальше. [[docs|Пришли фото паспорта для оформления, договор потом.]]',
        '[[secrecy|Что внутри пакета, не спрашивай, и родителям не говори.]] Работа лёгкая.'
      ] },
      choices: ord([
        { t: 'Соглашусь, мне нужны деньги', good: false, why: 'Огромные деньги за простое задание, паспорт заранее и «не спрашивай, что внутри» — признаки вовлечения в незаконные схемы. Можно остаться и без документов, и с проблемами с законом.' },
        { t: 'Попрошу название компании и договор. Без них откажусь', good: true, why: 'Верно. Конкретные вопросы вскрывают обман: у законной работы есть название, договор и открытые условия.' },
        { t: 'Откажусь, расскажу взрослому и сообщу через «Сообщить»', good: true, why: 'Отлично. Так ты защитил себя и помог остановить схему для других ребят.' }
      ], [1, 0, 2]),
      helper: { who: 'Аруузат', text: 'Большие деньги за простое задание и паспорт заранее — классика обмана.' },
      safe: 'Проверь компанию, попроси договор, обсуди с близкими. Никаких документов до договора.' },

    { city: 'Талас', theme: 'Слух и «срочная новость»', bg: 'assets/t-talas.jpg', actors: [{ src: 'assets/talgat.jpg', name: 'Талгат', side: 'right' }],
      dialog: [
        { who: 'Рассказчик', text: 'Талас: тихая зелёная улица и горы вдалеке. Здесь вас встречает Талгат, школьный репортёр.' },
        { who: 'Талгат', text: 'Привет! Вчера в городе пошёл слух, который чуть не вызвал панику. Я поймал его в чате.' },
        { who: 'Акылай', text: 'А как понять, что это неправда?' },
        { who: 'Талгат', text: 'Проверить источник. Вот само сообщение, попробуй разобраться сам.' }
      ],
      phone: { name: 'Канал_Правда24', stamp: 'Сегодня, 17:20', msgs: [
        'Срочное видео! [[nosrc|Один знакомый из города говорит, что завтра всё закроют, но источник назвать не может.]] Все уже в курсе.',
        '[[us_them|Официальные каналы молчат, правду говорим только мы. Проверять нечего, и так всё ясно.]]',
        '[[urgency|Перешли всем в школьные чаты в течение 10 минут!]] [[guilt|Кто не перешлёт, тому на всех наплевать.]]'
      ] },
      choices: ord([
        { t: 'Перешлю во все чаты, вдруг это правда', good: false, why: 'Слух без автора и доказательств, плюс давление «перешли срочно» — классика дезинформации. Репост превращает тебя в её распространителя.' },
        { t: 'Проверю автора и найду подтверждение в других источниках. Пересылать не буду', good: true, why: 'Верно. Источник, дата и второй независимый источник — три вопроса, которые ломают большинство фейков.' },
        { t: 'Спрошу в чате: «Кто знает источник?» и покажу сообщение Талгату или учителю', good: true, why: 'Отлично. Вопрос об источнике и совет со знающим человеком останавливают цепочку.' }
      ], [2, 0, 1]),
      helper: { who: 'Талгат', text: 'Нет автора, нет подтверждения, а просят сразу переслать? Остановись и проверь.' },
      safe: 'Перед репостом проверь автора, дату и второй независимый источник. Не пересылай то, что давит на эмоции.' },

    { city: 'Ак-Буура', theme: 'Давление и угрозы', bg: 'assets/t-akbuura.jpg',
      actors: [{ src: 'assets/aruuzat.jpg', name: 'Аруузат', side: 'left' }, { src: 'assets/talgat.jpg', name: 'Талгат', side: 'center' }, { src: 'assets/baibolot.jpg', name: 'Байболот', side: 'right', flip: true }],
      dialog: [
        { who: 'Рассказчик', text: 'Последняя остановка: берег горной реки, мост и тёплый вечер. Байболот и Аруузат пришли проводить вас.' },
        { who: 'Байболот', text: 'Тот человек из чата написал снова после моего отказа. Теперь он пишет и тебе.' },
        { who: 'Аруузат', text: 'Давай посмотрим вместе. Мы рядом, ты не один.' },
        { who: 'Талгат', text: 'Я тоже проверил: это та же схема, что и раньше. Покажем её взрослым вместе.' }
      ],
      phone: { name: 'Знающий_брат', stamp: 'Сегодня, 19:30', msgs: [
        'Мы тебя ждали. [[guilt|Ты нас подвёл, мы на тебя рассчитывали.]]',
        '[[threats|Если не вернёшься, пожалеешь: мы знаем, где ты учишься.]]',
        '[[isolation|Друзья тебя не защитят, у тебя есть только мы.]] [[urgency|Ответь в течение часа.]]'
      ] },
      choices: ord([
        { t: 'Отвечу и стану оправдываться', good: false, why: 'Оправдываться бесполезно: манипулятор ищет повод продолжить давление. Лучше прекратить контакт.' },
        { t: 'Не отвечу, сохраню скриншоты, расскажу взрослому и нажму «Сообщить»', good: true, why: 'Именно так. Угрозы — признак слабости. Доказательства и поддержка взрослых — твоя защита.' },
        { t: 'Позову друзей, и мы вместе пойдём к учителю', good: true, why: 'Отличное решение. Вместе проще, а рядом оказываются люди, которым можно доверять.' }
      ], [2, 1, 0]),
      helper: { who: 'Аруузат', text: 'Угрозы — признак слабости. Не отвечай и сохрани доказательства.' },
      safe: 'Не удаляй переписку: она нужна как доказательство. Скриншоты, блок, разговор со взрослым, обращение в службу помощи.' }
  ];

  /* ---------- состояние ---------- */
  let G = null;
  const active = () => !!G;
  const total = () => CH.length;
  const chap = () => CH[G.ch];
  const reportOf = c => (c.phone.msgs.join(' ').match(/\[\[/g) || []).length;

  function start() {
    G = { ch: 0, step: 'dialog', line: 0, found: new Set(), neutral: new Set(), immun: 100, shownImm: 100, seenPhone: -1, stageSeen: -1, fx: '', hints: 3, hintOpen: false, picked: null, flagsFound: 0, flagsTotal: 0, falseTaps: 0, log: [] };
    CH.forEach(c => c.actors.forEach(a => cut(a.src).catch(() => { })));
  }

  /* ---------- вырезание белого фона у персонажей ---------- */
  const cache = {};
  function cut(src, seed) {
    const key = src + (seed ? '#c' : '');
    return cache[key] || (cache[key] = new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => {
        try {
          const w = im.naturalWidth, h = im.naturalHeight, c = document.createElement('canvas');
          c.width = w; c.height = h;
          const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
          const d = x.getImageData(0, 0, w, h), p = d.data;
          const white = k => p[k * 4] > 228 && p[k * 4 + 1] > 228 && p[k * 4 + 2] > 228;
          const seen = new Uint8Array(w * h), st = [];
          const push = (X, Y) => { if (X < 0 || Y < 0 || X >= w || Y >= h) return; const k = Y * w + X; if (seen[k] || !white(k)) return; seen[k] = 1; st.push(k); };
          for (let X = 0; X < w; X++) { push(X, 0); push(X, h - 1); }
          for (let Y = 0; Y < h; Y++) { push(0, Y); push(w - 1, Y); }
          if (seed) push(w >> 1, h >> 1);
          while (st.length) { const k = st.pop(), X = k % w, Y = (k / w) | 0; p[k * 4 + 3] = 0; push(X + 1, Y); push(X - 1, Y); push(X, Y + 1); push(X, Y - 1); }
          // смягчаем светлую кромку
          for (let Y = 1; Y < h - 1; Y++) for (let X = 1; X < w - 1; X++) {
            const k = Y * w + X; if (seen[k]) continue;
            if (seen[k - 1] || seen[k + 1] || seen[k - w] || seen[k + w]) { const b = (p[k * 4] + p[k * 4 + 1] + p[k * 4 + 2]) / 3; if (b > 170) p[k * 4 + 3] = 90; }
          }
          x.putImageData(d, 0, 0); res(c.toDataURL('image/png'));
        } catch (e) { rej(e); }
      };
      im.onerror = rej; im.src = src;
    }));
  }

  /* ---------- разметка ---------- */
  function sentences(s) { return s.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) || [s]; }
  function fmt(msg, st) {
    let out = '';
    msg.split(/(\[\[\w+\|.+?\]\])/).forEach(part => {
      const m = part.match(/^\[\[(\w+)\|(.+?)\]\]$/);
      if (m) { out += frag(st, m[1], m[2]); }
      else if (part.trim()) sentences(part).forEach(s => { out += frag(st, '', s); });
    });
    return out;
  }
  function frag(st, tech, text) {
    const i = st.i++;
    let cls = 'frag';
    if (tech) { if (G.found.has(i)) cls += ' found'; else if (G.step === 'fb') cls += ' missed'; }
    else if (G.neutral.has(i)) cls += ' ok';
    return `<button class="${cls}" data-act="g-frag" data-i="${i}" data-t="${tech}" ${G.step === 'fb' ? 'disabled' : ''}>${esc(text)}</button>`;
  }
  function phoneHtml(c) {
    const st = { i: 0 };
    let h = `<div class="stamp">${esc(c.phone.stamp)}</div>` + c.phone.msgs.map(m => `<div class="b in">${fmt(m, st)}</div>`).join('');
    if (G.picked != null) h += `<div class="b out">${esc(c.choices[G.picked].t)}</div>`;
    const fresh = G.seenPhone !== G.ch; G.seenPhone = G.ch;
    return `<div class="phone-wrap ${fresh ? 'enter' : ''}"><div class="phone"><div class="screen">
      <div class="status"><span>9:41</span><span class="sbar"><i></i><i></i><i></i></span></div>
      <div class="chat-head"><span class="back">‹</span><span class="ava">${esc(c.phone.name[0])}</span><span class="nm">${esc(c.phone.name)}</span></div>
      <div class="chat-body ${fresh ? 'fresh' : ''}" id="chat">${h}</div><div class="chat-input"><span>iMessage</span></div></div>
      <img class="phone-frame" data-cut="assets/phone.jpg" data-seed="1" src="assets/phone.jpg" alt="" aria-hidden="true"></div></div>`;
  }
  const avatar = who => { const w = WHO[who] || WHO['Рассказчик']; return `<span class="av ${w.cls}" aria-hidden="true">${w.ch || ''}</span>`; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const motes = () => Array.from({ length: 14 }, () => `<i style="left:${rnd(0, 100).toFixed(1)}%;--s:${rnd(2, 5).toFixed(1)}px;--t:${rnd(7, 14).toFixed(1)}s;--d:${rnd(-14, 0).toFixed(1)}s;--x:${rnd(-30, 30).toFixed(0)}px"></i>`).join('');
  function speechHtml(c, l) {
    const kind = l.who === 'Рассказчик' ? 'nar' : l.who === 'Ты' ? 'you' : 'npc';
    const actor = c.actors.find(x => x.name === l.who);
    let al = 'left';
    if (kind === 'you') al = 'right'; else if (kind === 'nar') al = 'center';
    else if (actor) al = actor.side === 'center' ? 'mid' : actor.side;
    else if (l.who === 'Акылай') al = 'mid';
    return `<div class="speech ${kind} ${al}" id="speech" data-act="g-next" role="status"><b class="sp-who">${esc(l.who)}</b><span id="sp-text">${esc(l.text)}</span></div>`;
  }
  function stage(c, mini) {
    const enter = !mini && G.step === 'dialog' && G.line === 0 && G.stageSeen !== G.ch;
    if (!mini && G.step === 'dialog') G.stageSeen = G.ch;
    const line = G.step === 'dialog' && !mini ? c.dialog[G.line] : null;
    const speaker = line ? line.who : '';
    return `<div class="stage ${mini ? 'mini' : ''} ${c.actors.length > 2 ? 'crowd' : ''}" data-stage><div class="world">
      <div class="layer l-bg" style="background-image:url(${c.bg})"></div>
      <div class="layer l-mid">${mini ? '' : c.actors.map(a => `<div class="aw ${a.side} ${a.flip ? 'flip' : ''} ${enter ? 'enter' : ''} ${a.name === speaker ? 'talk' : ''}" data-name="${esc(a.name)}"><div class="hop"><img class="actor" data-cut="${a.src}" src="${a.src}" alt="${esc(a.name)}"></div></div>`).join('')}</div>
      <div class="layer l-fg" style="background-image:url(${c.bg})"></div>
      <div class="motes" aria-hidden="true">${motes()}</div></div>
      <div class="vignette"></div><span class="stage-badge">${esc(c.city)} · глава ${G.ch + 1}/${total()}</span>${line ? speechHtml(c, line) : ''}</div>`;
  }
  const top = () => `<div class="g-top"><div class="g-dots" aria-label="Главы">${CH.map((_, i) => `<i class="${i < G.ch ? 'done' : i === G.ch ? 'cur' : ''}"></i>`).join('')}</div>
      <div class="g-imm"><span>Иммунитет</span><div class="meter"><i style="width:${G.shownImm}%"></i></div><b>${G.shownImm}%</b></div>
      <button class="btn ghost sm" data-act="g-quit">Выйти</button></div>`;
  const findInfo = c => [...G.found].map(i => infoItem(flagTech(c, i))).join('');
  function flagTech(c, idx) {
    let i = 0, res = '';
    c.phone.msgs.forEach(m => m.split(/(\[\[\w+\|.+?\]\])/).forEach(part => {
      const mm = part.match(/^\[\[(\w+)\|(.+?)\]\]$/);
      if (mm) { if (i === idx) res = mm[1]; i++; } else if (part.trim()) i += sentences(part).length;
    }));
    return res;
  }
  const infoItem = t => t ? `<div class="finfo-item"><span class="badge warn">${esc(D.tech[t].n)}</span><span>${esc(D.tech[t].d)}</span></div>` : '';

  /* ---------- экраны ---------- */
  function view() {
    const c = chap();
    if (G.step === 'end') return endView();
    if (G.step === 'dialog') {
      const last = G.line === c.dialog.length - 1;
      return `<div class="page quest-page game">${top()}${stage(c, false)}
        <div class="card dlg-bar" data-act="g-next" role="button" tabindex="0"><span class="eyebrow">${esc(c.theme)}</span><span class="sp"></span><span class="eyebrow" id="dlg-prog">${G.line + 1}/${c.dialog.length}</span><button class="btn sm" id="dlg-btn" data-act="g-next">${last ? 'Открыть телефон' : 'Дальше'} ›</button></div></div>`;
    }
    const nFlags = reportOf(c);
    if (G.step === 'phone') {
      const ch = c.choices.map((x, k) => `<button class="choice" data-act="g-pick" data-k="${k}">${esc(x.t)}</button>`).join('');
      return `<div class="page quest-page game">${top()}${stage(c, true)}
        <p class="g-task"><b>Задание:</b> нажимай на фразы, в которых слышно давление или обман. Всего красных флагов: ${nFlags}.</p>
        ${phoneHtml(c)}
        <div class="card g-find"><div class="row"><b id="fcount">Найдено ${G.found.size}/${nFlags}</b><span class="sp"></span>
          <button class="btn ghost sm" data-act="g-hint" ${G.hints <= 0 && !G.hintOpen ? 'disabled' : ''}>Подсказка (${G.hints})</button></div>
          ${G.hintOpen ? `<div class="hint">${avatar(c.helper.who)}<p><b>${esc(c.helper.who)}:</b> ${esc(c.helper.text)}</p></div>` : ''}
          <div id="finfo" class="finfo">${findInfo(c)}</div></div>
        <div class="choices"><div class="eyebrow">Как ответишь?</div>${ch}</div></div>`;
    }
    // fb
    const ch = c.choices[G.picked], r = G.last;
    const missed = [];
    let idx = 0;
    c.phone.msgs.forEach(m => m.split(/(\[\[\w+\|.+?\]\])/).forEach(part => {
      const mm = part.match(/^\[\[(\w+)\|(.+?)\]\]$/);
      if (mm) { if (!G.found.has(idx)) missed.push(mm[1]); idx++; } else if (part.trim()) idx += sentences(part).length;
    }));
    return `<div class="page quest-page game">${top()}${stage(c, true)}${phoneHtml(c)}
      <div class="card fb"><div class="row"><span class="badge ${ch.good ? 'ok' : 'bad'}">${ch.good ? 'Верное решение' : 'Тут ловушка'}</span><span class="sp"></span>${r.cost ? `<span class="badge bad">−${r.cost}% иммунитета</span>` : '<span class="badge ok">Иммунитет цел</span>'}</div>
        <p style="color:var(--ink)">${esc(ch.why)}</p>
        <div class="fb-line"><b>Красные флаги:</b> найдено ${G.found.size} из ${nFlags}${G.neutral.size ? `, ложных тревог: ${G.neutral.size}` : ''}.</div>
        ${missed.length ? `<div class="finfo">${[...new Set(missed)].map(infoItem).join('')}</div>` : ''}
        <div class="safe"><b>Безопасный шаг:</b> ${esc(c.safe)}</div>
        <div class="row"><button class="btn" data-act="g-fnext">${G.ch === total() - 1 ? 'Показать итог' : 'В следующий город'} ›</button></div></div></div>`;
  }

  function endView() {
    const pct = G.immun, techs = [...new Set(CH.flatMap(c => (c.phone.msgs.join(' ').match(/\[\[(\w+)\|/g) || []).map(x => x.slice(2, -1))))];
    const tier = pct >= 85 ? ['Страж пути', 'Ты узнавал приёмы в каждом городе и не поддавался. Расскажи об этом друзьям: знающий человек сам останавливает манипулятора.']
      : pct >= 55 ? ['Внимательный путник', 'Были ловушки, но ты вышел из них и многое заметил. Пройди ещё раз и попробуй найти все красные флаги.']
        : ['Учишься на ошибках', 'Манипуляции рассчитаны на обычных людей, так что дело не в слабости. Пройди игру ещё раз и сравни свои решения с разбором.'];
    return `<div class="page quest-page game">
      <div class="card rim hero"><span class="eyebrow">Путь пройден · ${total()} городов</span><div class="big-score">${pct}%</div><h2>${tier[0]}</h2><p>${tier[1]}</p><div class="meter"><i style="width:${pct}%"></i></div>
        <div class="stats"><div class="stat"><b>${G.flagsFound}/${G.flagsTotal}</b><span>красных флагов найдено</span></div><div class="stat"><b>${G.log.filter(x => x.good).length}/${total()}</b><span>верных решений</span></div></div></div>
      <div class="card post"><h3>Приёмы, которые ты встретил</h3><ul class="clean">${techs.map(k => `<li><b>${esc(D.tech[k].n)}.</b> ${esc(D.tech[k].d)}</li>`).join('')}</ul></div>
      ${window.OB_HELP ? OB_HELP() : ''}
      <div class="row"><button class="btn" data-act="g-start">Пройти заново</button><button class="btn ghost" data-act="g-share">Поделиться</button><a class="btn ghost" href="#/report">Сообщить о случае</a><button class="btn ghost" data-act="g-quit">В меню квестов</button></div></div>`;
  }

  function mount() {
    if (!G) return;
    $$('img[data-cut]').forEach(img => {
      const phoneImg = !!img.dataset.seed;
      const show = () => requestAnimationFrame(() => img.classList.add('ready'));
      cut(img.dataset.cut, phoneImg).then(u => { img.src = u; show(); })
        .catch(() => { img.classList.add('mult'); const p = img.closest('.phone'); if (p) p.classList.add('flat'); show(); });
    });
    const chat = $('#chat'); if (chat) chat.scrollTop = 0;
    if (G.step === 'dialog') typeText($('#sp-text'), chap().dialog[G.line].text);
    if (G.shownImm !== G.immun) {
      const bar = $('.g-imm .meter i'), num = $('.g-imm b'), to = G.immun, from = G.shownImm; G.shownImm = to;
      requestAnimationFrame(() => requestAnimationFrame(() => { if (bar) bar.style.width = to + '%'; }));
      countTo(num, from, to, '%');
    }
    if (G.fx) { const fx = G.fx; G.fx = ''; effect(fx); }
    if (G.step === 'end') {
      const bs = $('.big-score'); if (bs) countTo(bs, 0, G.immun, '%', 1100);
      if (G.immun >= 55) setTimeout(() => burst(innerWidth / 2, innerHeight * .3, 60), 350);
    }
  }

  /* ---------- анимации и эффекты ---------- */
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function countTo(el, from, to, suffix, dur = 700) {
    if (!el) return;
    if (calm() || from === to) { el.textContent = to + suffix; return; }
    const t0 = performance.now();
    const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(from + (to - from) * e) + suffix; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function typeText(el, text) {
    if (!el) return;
    if (window.I18N) text = I18N.tr(text);
    clearInterval(G.tt); G.full = text; G.tel = el; el.setAttribute('aria-label', text);
    if (calm()) { el.textContent = text; G.typing = false; return; }
    let i = 0; G.typing = true; el.textContent = '';
    G.tt = setInterval(() => { i += 2; el.textContent = text.slice(0, i); if (i >= text.length) finishType(); }, 16);
  }
  function finishType() { if (!G) return; clearInterval(G.tt); G.typing = false; if (G.tel) G.tel.textContent = G.full; }
  function updateDialog() {
    const c = chap(), l = c.dialog[G.line], last = G.line === c.dialog.length - 1;
    const old = $('#speech'); if (old) old.outerHTML = speechHtml(c, l);
    $('#dlg-btn').textContent = (last ? 'Открыть телефон' : 'Дальше') + ' ›';
    const pr = $('#dlg-prog'); if (pr) pr.textContent = `${G.line + 1}/${c.dialog.length}`;
    $$('.aw').forEach(x => x.classList.toggle('talk', x.dataset.name === l.who));
    typeText($('#sp-text'), l.text);
  }
  function burst(x, y, n = 36) {
    if (calm()) return;
    const cols = ['#ffa07a', '#e070d8', '#6f8dff', '#ffd166', '#4fd39a'];
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i'); p.className = 'confetti';
      const a = Math.random() * Math.PI * 2, d = rnd(60, 220);
      p.style.cssText = `left:${x}px;top:${y}px;background:${cols[i % cols.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 80}px;--r:${rnd(-540, 540)}deg;animation-delay:${rnd(0, .12)}s`;
      document.body.appendChild(p); setTimeout(() => p.remove(), 1700);
    }
  }
  function floatText(el, text, cls) {
    if (calm()) return;
    const r = el.getBoundingClientRect(), t = document.createElement('span');
    t.className = 'ftext ' + (cls || ''); t.textContent = text; t.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top}px`;
    document.body.appendChild(t); setTimeout(() => t.remove(), 1100);
  }
  function effect(kind) {
    if (calm()) return;
    if (kind === 'hit') {
      const pg = $('.game'); if (pg) { pg.classList.add('shake'); setTimeout(() => pg.classList.remove('shake'), 500); }
      const f = document.createElement('div'); f.className = 'flash'; document.body.appendChild(f); setTimeout(() => f.remove(), 600);
      if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
    } else if (kind === 'good') {
      const ph = $('.phone'); const r = ph ? ph.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
      burst(r.left + r.width / 2, r.top + r.height * .4, 34);
    }
  }
  function travel(c, idx, action) {
    if (calm()) { action(); return; }
    G.busy = true;
    const o = document.createElement('div'); o.className = 'travel';
    o.innerHTML = `<div class="tr-sun"></div><div class="tr-mount m1"></div><div class="tr-mount m2"></div>
      <div class="tr-title"><small>Глава ${idx + 1} из ${total()}</small><b>${esc(c.city)}</b><span>${esc(c.theme)}</span></div>
      <div class="tr-bus"><svg viewBox="0 0 140 70" width="140" height="70"><rect x="4" y="8" width="130" height="44" rx="12" fill="#fff"/><rect x="14" y="16" width="26" height="18" rx="4" fill="#7aa2ff"/><rect x="46" y="16" width="26" height="18" rx="4" fill="#7aa2ff"/><rect x="78" y="16" width="26" height="18" rx="4" fill="#7aa2ff"/><rect x="110" y="16" width="18" height="26" rx="4" fill="#ffa07a"/><rect x="4" y="38" width="130" height="6" fill="#e070d8"/><g class="wh"><circle cx="34" cy="54" r="11" fill="#18181c"/><circle cx="34" cy="54" r="4" fill="#ccc"/></g><g class="wh"><circle cx="104" cy="54" r="11" fill="#18181c"/><circle cx="104" cy="54" r="4" fill="#ccc"/></g></svg></div>
      <div class="tr-road"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>`;
    document.body.appendChild(o);
    setTimeout(action, 1250);
    setTimeout(() => o.classList.add('out'), 1700);
    setTimeout(() => { o.remove(); if (G) G.busy = false; }, 2150);
  }

  /* ---------- параллакс от мыши и наклона телефона ---------- */
  (function () {
    let raf = 0, nx = 0, ny = 0;
    const apply = () => { raf = 0; if (!G || calm()) return; const r = document.documentElement.style; r.setProperty('--mx', nx.toFixed(3)); r.setProperty('--my', ny.toFixed(3)); };
    const queue = () => { if (!raf) raf = requestAnimationFrame(apply); };
    addEventListener('pointermove', e => { nx = e.clientX / innerWidth * 2 - 1; ny = e.clientY / innerHeight * 2 - 1; queue(); }, { passive: true });
    addEventListener('deviceorientation', e => { if (e.gamma == null) return; nx = Math.max(-1, Math.min(1, e.gamma / 28)); ny = Math.max(-1, Math.min(1, (e.beta - 50) / 28)); queue(); }, { passive: true });
  })();

  /* ---------- действия ---------- */
  function handle(a, el, render) {
    const c = G && chap();
    switch (a) {
      case 'g-start': start(); travel(CH[0], 0, () => render()); break;
      case 'g-quit': G = null; render(); break;
      case 'g-next':
        if (G.busy || G.step !== 'dialog') return;
        if (G.typing) { finishType(); break; }
        if (G.line < c.dialog.length - 1) { G.line++; updateDialog(); } else { G.step = 'phone'; render(); }
        break;
      case 'g-hint': if (!G.hintOpen && G.hints > 0) { G.hints--; G.hintOpen = true; } render(true); break;
      case 'g-frag': {
        if (G.step !== 'phone') return;
        const i = +el.dataset.i;
        if (el.dataset.t) { if (!G.found.has(i)) { G.found.add(i); el.classList.add('found'); $('#fcount').textContent = `Найдено ${G.found.size}/${reportOf(c)}`; $('#finfo').insertAdjacentHTML('beforeend', infoItem(el.dataset.t)); floatText(el, '+ флаг!', 'good'); const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 14); if (navigator.vibrate) navigator.vibrate(15); } }
        else if (!G.neutral.has(i)) { G.neutral.add(i); el.classList.add('ok'); floatText(el, 'здесь всё чисто', 'meh'); }
        break; }
      case 'g-pick': {
        const k = +el.dataset.k, ch = c.choices[k], n = reportOf(c);
        const cost = (ch.good ? 0 : BAD) + (n - G.found.size) * MISS + G.neutral.size * FALSE;
        G.immun = Math.max(0, G.immun - cost);
        G.flagsFound += G.found.size; G.flagsTotal += n; G.picked = k; G.last = { cost };
        G.log.push({ good: ch.good }); G.step = 'fb'; G.fx = ch.good ? 'good' : 'hit'; render(); break; }
      case 'g-fnext':
        if (G.busy) return;
        if (G.ch === total() - 1) { G.step = 'end'; LS.set('ob_game', { immun: G.immun }); render(); }
        else travel(CH[G.ch + 1], G.ch + 1, () => { G.ch++; G.step = 'dialog'; G.line = 0; G.found = new Set(); G.neutral = new Set(); G.picked = null; G.hintOpen = false; render(); });
        break;
      case 'g-share': {
        const txt = (window.I18N ? I18N.tr : String)(`Я прошёл игру «Путь пяти городов» в «Ойгон». Мой иммунитет: ${G.immun}%. А твой?`);
        if (navigator.share) navigator.share({ text: txt }).catch(() => { }); else navigator.clipboard && navigator.clipboard.writeText(txt).then(() => { el.textContent = 'Скопировано'; });
        break; }
    }
  }

  window.GAME = { active, view, mount, handle, start, chapters: CH, cities: CH.map(c => c.city) };
})();
