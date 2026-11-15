/* Верхний баннер-объявление: показывается, пока пользователь его не закрыл (запоминается в браузере). */
(function () {
  'use strict';
  var KEY = 'ob_banner_v1', b = document.getElementById('banner'), x = document.getElementById('bn-x');
  if (!b) return;
  var closed = false;
  try { closed = localStorage.getItem(KEY) === '1'; } catch (e) { }
  if (!closed) b.hidden = false;
  if (x) x.addEventListener('click', function () {
    b.hidden = true;
    try { localStorage.setItem(KEY, '1'); } catch (e) { }
  });
})();
