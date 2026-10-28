// Injected by CouchFrame (an unofficial TV app for frameXTV) into the site and into every iframe inside it.
// Every frame gets Netflix-style D-pad focus movement over its own buttons; a video surface takes
// OK = play/pause and ←/→ = seek. Moving past a frame's edge hands focus back to the parent page.
(function () {
  if (window.__tvInit) return;
  window.__tvInit = true;

  var TOP = window === window.top;
  // A native bridge is only available through TVNative on the exact trusted HTTPS origin.
  var ARROWS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Up: 'up', Down: 'down', Left: 'left', Right: 'right' };
  var CODES = { 38: 'up', 40: 'down', 37: 'left', 39: 'right' };

  // Tradução cuidadosa apenas de rótulos curtos da interface principal.
  // A tradução não modifica títulos de obras, sinopses nem conteúdo dos vídeos.
  if (TOP) {
    var PT_BR_LABELS = {"Home":"Início","Movies":"Filmes","TV Shows":"Séries","TV Series":"Séries","Series":"Séries","Anime":"Anime","Animes":"Animes","Search":"Buscar","Search movies and shows":"Buscar filmes e séries","Search movies, TV shows...":"Buscar filmes e séries...","Search titles...":"Buscar títulos...","Trending":"Em alta","Trending Now":"Em alta agora","Trending Today":"Em alta hoje","Popular":"Populares","Popular Movies":"Filmes populares","Popular TV Shows":"Séries populares","Top Rated":"Mais bem avaliados","Top 10":"Top 10","Top 10 This Week":"Top 10 da semana","Recently Added":"Adicionados recentemente","New Releases":"Lançamentos","New":"Novidades","Discover":"Explorar","Browse":"Explorar","Browse All":"Ver todos","See All":"Ver todos","View All":"Ver todos","Explore More":"Explorar mais","Watch":"Assistir","Watch Now":"Assistir agora","Play":"Reproduzir","Play Now":"Reproduzir agora","Resume":"Continuar","Continue Watching":"Continue assistindo","More Info":"Mais informações","Details":"Detalhes","My List":"Minha lista","Favorites":"Favoritos","Settings":"Configurações","Profile":"Perfil","Language":"Idioma","Sign In":"Entrar","Log In":"Entrar","Sign Up":"Cadastrar","Welcome":"Boas-vindas","Get Started":"Começar","Continue":"Continuar","Close":"Fechar","Cancel":"Cancelar","Back":"Voltar","Next":"Próximo","Previous":"Anterior","Episodes":"Episódios","Episode":"Episódio","Seasons":"Temporadas","Season":"Temporada","Subtitles":"Legendas","Audio":"Áudio","Quality":"Qualidade","Fullscreen":"Tela cheia","Loading...":"Carregando...","Load More":"Carregar mais","No results found":"Nenhum resultado encontrado","Try Again":"Tentar novamente","Retry":"Tentar novamente","Movies & TV Shows":"Filmes e séries","Recommended":"Recomendados","For You":"Para você","Action":"Ação","Comedy":"Comédia","Drama":"Drama","Horror":"Terror","Documentary":"Documentário","Animation":"Animação","Romance":"Romance","Family":"Família","Sci-Fi":"Ficção científica","Fantasy":"Fantasia","Thriller":"Suspense","Mystery":"Mistério"};
    var ptBrTimer = null;
    function translatePtBr() {
      if (!document.documentElement) return;
      document.documentElement.lang = 'pt-BR';
      var labels = document.querySelectorAll(
        'header a, header button, nav a, nav button, footer a, footer button, ' +
        '[role="tab"], [role="menuitem"], [data-testid="discovery-rail"] h2, ' +
        '[data-testid="discovery-rail"] h3, button, input[placeholder], ' +
        'input[aria-label], [role="searchbox"]'
      );
      for (var n = 0; n < labels.length; n++) {
        var el = labels[n];
        if (el.tagName === 'INPUT') {
          var placeholder = el.getAttribute('placeholder');
          if (placeholder && PT_BR_LABELS[placeholder]) el.setAttribute('placeholder', PT_BR_LABELS[placeholder]);
        }
        var aria = el.getAttribute('aria-label');
        if (aria && PT_BR_LABELS[aria]) el.setAttribute('aria-label', PT_BR_LABELS[aria]);
        // Só altera rótulos que são texto puro: evita interferir com componentes React e players.
        if (el.childNodes.length === 1 && el.firstChild.nodeType === 3) {
          var original = el.textContent.trim();
          if (PT_BR_LABELS[original]) el.textContent = PT_BR_LABELS[original];
        }
      }
    }
    function schedulePtBr() {
      if (ptBrTimer !== null) return;
      ptBrTimer = setTimeout(function () {
        ptBrTimer = null;
        translatePtBr();
      }, 180);
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        translatePtBr();
        new MutationObserver(schedulePtBr).observe(document.documentElement, { subtree: true, childList: true });
      }, { once: true });
    } else {
      translatePtBr();
      new MutationObserver(schedulePtBr).observe(document.documentElement, { subtree: true, childList: true });
    }
  }


  function dirOf(e) { return ARROWS[e.key] || CODES[e.keyCode]; }
  function isOk(e) { return e.key === 'Enter' || e.keyCode === 13; }
  function stop(e) { e.preventDefault(); e.stopImmediatePropagation(); }
  function call(fn, arg) {
    try {
      if (fn === 'remoteOk') return TOP && (Date.now() - (window.__lastNativeOk || 0) < 800);
      if (!TOP || !window.TVNative) return;
      if (fn === 'showKeyboard') window.TVNative.postMessage('keyboard');
      else if (fn === 'playing') window.TVNative.postMessage(arg ? 'playing:1' : 'playing:0');
    } catch (x) {}
  }
  function area(r) { return r.width * r.height; }
  function screenArea() { return innerWidth * innerHeight; }

  // ---------------------------------------------------------------- styles

  var STYLE =
    '.tv-focus{outline:3px solid #fff!important;outline-offset:3px!important;box-shadow:0 0 0 7px rgba(229,9,20,.55)!important}' +
    'iframe.tv-focus,[data-tvf="player"].tv-focus{outline-offset:-4px!important;box-shadow:none!important}' +
    'html.tv-frame [data-tvf="player"].tv-focus{outline:none!important}' +
    // Site-specific (top page): poster cards grow instead of getting a box ring.
    '[data-testid="pwa-install-banner"]{display:none!important}' +
    // Frosted-glass blur is very expensive to draw on a TV chip; plain translucent backgrounds look nearly the same.
    '*{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}' +
    '[data-testid="media-card"].tv-focus{outline:none!important;box-shadow:none!important;transform:scale(1.05);z-index:5;transition:transform .15s}' +
    // The ring is drawn inside the poster: cards use paint containment (below), which clips anything outside them.
    '[data-testid="media-card"].tv-focus>div:first-child::after{content:"";position:absolute;inset:0;z-index:30;pointer-events:none;' +
    'border:3px solid #fff;border-radius:inherit;box-shadow:inset 0 0 0 5px rgba(229,9,20,.6)}' +
    '[data-testid="media-card"].tv-focus h4{color:#fff}' +
    // Room inside the horizontal rails so the enlarged card isn't clipped.
    '[data-testid="discovery-rail"] .no-scrollbar{padding:24px 22px!important;margin:-20px -18px!important}' +
    // Off-screen rows and posters skip layout and painting entirely: the biggest saving on a slow TV chip.
    '[data-testid="discovery-rail"]{content-visibility:auto;contain-intrinsic-size:auto 440px}' +
    '[data-testid="media-card"]{content-visibility:auto;contain-intrinsic-size:auto 330px}' +
    // "Fullscreen" for the player: pin it over the whole page.
    'html.tv-fs,html.tv-fs body{overflow:hidden!important}' +
    'html.tv-fs .tv-fs-anc{transform:none!important;filter:none!important;contain:none!important;will-change:auto!important;z-index:2147483646!important}' +
    'html.tv-fs .tv-fsel{position:fixed!important;left:0!important;top:0!important;right:auto!important;bottom:auto!important;' +
    'width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;margin:0!important;' +
    'border:0!important;border-radius:0!important;background:#000!important;outline:none!important;box-shadow:none!important;' +
    'transform:none!important;z-index:2147483647!important}';

  function addStyle() {
    if (document.getElementById('tv-style')) return true;
    if (!document.head) return false;
    var s = document.createElement('style');
    s.id = 'tv-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
    if (!TOP) document.documentElement.classList.add('tv-frame');
    return true;
  }
  if (!addStyle()) document.addEventListener('DOMContentLoaded', addStyle);

  // ---------------------------------------------------------------- video

  // ------------------------------------------------------------- preferências de reprodução
  // Aplicadas somente quando o player disponibiliza seleção por faixas/controles web.
  // Não se altera URLs de mídia e não se tenta contornar DRM ou controles do provedor.
  var playStates = new WeakMap();
  var playbackPreference = {
    maximumQuality: true,
    brazilianAudio: true,
    portugueseSubtitlesFallback: true,
    infoDurationMs: 10000
  };

  function ptScore(s) {
    s = String(s || '').toLowerCase().replace(/[_–—]/g, '-').trim();
    if (/(?:^|[^a-z])pt-br(?:$|[^a-z])|portugu[eê]s.{0,15}brasil|brazilian.{0,12}portuguese|dublado.{0,10}brasil/.test(s)) return 2;
    if (/(?:^|[^a-z])pt(?:$|[^a-z])|portugu[eê]s|portuguese/.test(s)) return 1;
    return 0;
  }

  function languageName(track) {
    if (!track) return 'Não informado';
    var code = String(track.language || track.lang || '').toLowerCase().replace('_', '-');
    if (code === 'pt-br') return 'Português (Brasil)';
    if (code === 'pt' || code.startsWith('pt-')) return code === 'pt-pt' ? 'Português (Portugal)' : 'Português';
    if (code.startsWith('en')) return 'Inglês';
    if (code.startsWith('es')) return 'Espanhol';
    if (code.startsWith('ja')) return 'Japonês';
    var label = String(track.label || '').trim();
    return label ? label.slice(0, 65) : code ? code.slice(0, 30) : 'Não informado';
  }

  function trackList(list) {
    var tracks = [];
    try { for (var i = 0; list && i < list.length; i++) if (list[i]) tracks.push(list[i]); }
    catch (_) {}
    return tracks;
  }

  function selectTracks(v) {
    var audio = trackList(v.audioTracks);
    var subtitles = trackList(v.textTracks).filter(function(t) {
      return t.kind === 'subtitles' || t.kind === 'captions';
    });
    var activeAudio = audio.find(function(t) { return !!t.enabled; }) || null;
    if (playbackPreference.brazilianAudio && audio.length) {
      var wanted = audio.reduce(function(best, t) {
        return ptScore(t.language + ' ' + t.label) > ptScore(best && (best.language + ' ' + best.label))
          ? t : best;
      }, null);
      if (wanted && ptScore(wanted.language + ' ' + wanted.label)) {
        try {
          audio.forEach(function(t) { t.enabled = (t === wanted); });
          activeAudio = audio.find(function(t) { return !!t.enabled; }) || activeAudio;
        } catch (_) {}
      }
    }

    var audiblePt = activeAudio && ptScore(activeAudio.language + ' ' + activeAudio.label) > 0;
    var activeText = subtitles.find(function(t) { return t.mode === 'showing'; }) || null;
    if (playbackPreference.portugueseSubtitlesFallback && !audiblePt && subtitles.length) {
      var candidate = subtitles.reduce(function(best, t) {
        return ptScore(t.language + ' ' + t.label) > ptScore(best && (best.language + ' ' + best.label))
          ? t : best;
      }, null);
      if (candidate && ptScore(candidate.language + ' ' + candidate.label)) {
        try {
          subtitles.forEach(function(t) { t.mode = (t === candidate) ? 'showing' : 'disabled'; });
          activeText = subtitles.find(function(t) { return t.mode === 'showing'; }) || activeText;
        } catch (_) {}
      }
    } else if (audiblePt && activeText && ptScore(activeText.language + ' ' + activeText.label)) {
      // Se houver dublagem PT, desligar apenas legendas PT ativadas automaticamente por este app.
      var state = playStates.get(v);
      if (state && state.autoSubtitle === activeText) {
        try { activeText.mode = 'disabled'; activeText = null; } catch (_) {}
      }
    }
    var state = playStates.get(v);
    if (state && !audiblePt && activeText && ptScore(activeText.language + ' ' + activeText.label)) {
      state.autoSubtitle = activeText;
    }
    return {audio: languageName(activeAudio), subtitles: activeText ? languageName(activeText) : (subtitles.length ? 'Desativadas' : 'Não identificadas')};
  }

  function qualityRank(label) {
    var s = String(label || '').toLowerCase();
    if (/\b8k\b|4320p?/.test(s)) return 4320;
    if (/\b4k\b|\buhd\b|2160p?/.test(s)) return 2160;
    var m = s.match(/\b(1440|1080|720|576|480|360|240)p?\b/);
    return m ? +m[1] : 0;
  }

  function selectNativeQuality(v, state) {
    if (!playbackPreference.maximumQuality || state.qualityChosen) return;
    state.qualityChosen = true;
    // Controle de qualidade exposto como <select>. Não clicar às cegas nos menus externos.
    var selectors = document.querySelectorAll('select');
    for (var i = 0; i < selectors.length; i++) {
      var el = selectors[i], name = ((el.name || '') + ' ' + (el.id || '') + ' ' + (el.getAttribute('aria-label') || '')).toLowerCase();
      if (!/quality|qualidade|resolution|resolu[cç][aã]o/.test(name)) continue;
      var best = null, rank = 0;
      for (var j = 0; j < el.options.length; j++) {
        var opt = el.options[j];
        var score = qualityRank((opt.textContent || '') + ' ' + opt.value);
        if (score > rank && !opt.disabled) { rank = score; best = opt; }
      }
      if (best && el.value !== best.value) {
        try {
          el.value = best.value;
          el.dispatchEvent(new Event('input', {bubbles: true}));
          el.dispatchEvent(new Event('change', {bubbles: true}));
        } catch (_) {}
      }
    }
    // HLS.js: apenas se o player publicar a instância e ela controlar este mesmo vídeo.
    try {
      var hls = window.hls || window.hlsPlayer;
      if (hls && hls.media === v && hls.levels && hls.levels.length && typeof hls.currentLevel === 'number') {
        var bestIdx = -1, bestScore = -1;
        for (var k = 0; k < hls.levels.length; k++) {
          var level = hls.levels[k], score = (+level.height || 0) * 100000 + (+level.bitrate || 0) / 1000;
          if (score > bestScore) { bestScore = score; bestIdx = k; }
        }
        if (bestIdx >= 0) hls.currentLevel = bestIdx;
      }
    } catch (_) {}
  }

  function actualResolution(v) {
    var w = v.videoWidth || 0, h = v.videoHeight || 0;
    if (!w || !h) return 'Aguardando informação';
    var largest = Math.max(w, h), smallest = Math.min(w, h);
    var tier = largest >= 7680 || smallest >= 4320 ? '8K' :
      largest >= 3840 || smallest >= 2160 ? '4K' :
      smallest >= 1440 ? '1440p' : smallest >= 1080 ? '1080p' :
      smallest >= 720 ? '720p' : smallest >= 480 ? '480p' : smallest + 'p';
    return tier + ' (' + w + '×' + h + ')';
  }

  function playbackStatus(v, state) {
    var tracks = selectTracks(v);
    return {
      id: state.id,
      resolution: actualResolution(v),
      audio: tracks.audio,
      subtitles: tracks.subtitles
    };
  }

  function sendPlaybackStatus(info) {
    if (TOP) {
      try {
        if (window.TVNative && typeof window.TVNative.postMessage === 'function') {
          window.TVNative.postMessage('playback:' + JSON.stringify(info));
        }
      } catch (_) {}
    } else {
      try { window.parent.postMessage({tvPlaybackStatus: info}, '*'); } catch (_) {}
    }
  }

  function updatePlayback(v) {
    var state = playStates.get(v);
    if (!state || v.paused || v.ended) return;
    selectNativeQuality(v, state);
    if (Date.now() - state.started >= playbackPreference.infoDurationMs) return;
    sendPlaybackStatus(playbackStatus(v, state));
  }

  function startPlayback(v) {
    var state = playStates.get(v);
    if (!state || state.ended) {
      state = {
        id: String(Date.now()) + '-' + Math.random().toString(36).slice(2),
        started: Date.now(),
        qualityChosen: false,
        autoSubtitle: null,
        ended: false
      };
      playStates.set(v, state);
    }
    updatePlayback(v);
  }

  function attachVideo(v) {
    if (v.__tvPlaybackAttached) return;
    v.__tvPlaybackAttached = true;
    v.addEventListener('playing', function() { startPlayback(v); });
    v.addEventListener('loadedmetadata', function() { startPlayback(v); });
    v.addEventListener('resize', function() { updatePlayback(v); });
    v.addEventListener('ended', function() {
      var state = playStates.get(v);
      if (state) state.ended = true;
    });
    try {
      if (v.audioTracks && v.audioTracks.addEventListener) v.audioTracks.addEventListener('addtrack', function(){ updatePlayback(v); });
      if (v.textTracks && v.textTracks.addEventListener) v.textTracks.addEventListener('addtrack', function(){ updatePlayback(v); });
    } catch (_) {}
    if (!v.paused && !v.ended) startPlayback(v);
  }

  function scanPlayback() {
    var videos = document.querySelectorAll('video');
    for (var i = 0; i < videos.length; i++) {
      attachVideo(videos[i]);
      if (!videos[i].paused && !videos[i].ended) updatePlayback(videos[i]);
    }
  }
  document.addEventListener('playing', function(ev) {
    if (ev.target && ev.target.tagName === 'VIDEO') startPlayback(ev.target);
  }, true);
  setInterval(scanPlayback, 1000);
  if (document.readyState !== 'loading') scanPlayback();
  else document.addEventListener('DOMContentLoaded', scanPlayback, {once: true});


  function bestVideo() {
    var vs = document.getElementsByTagName('video'), best = null, bestA = -1;
    for (var i = 0; i < vs.length; i++) {
      var a = area(vs[i].getBoundingClientRect());
      if (a > bestA || (a === bestA && !vs[i].paused)) { bestA = a; best = vs[i]; }
    }
    return best;
  }

  function largestFrame(min) {
    var fs = document.getElementsByTagName('iframe'), best = null, bestA = min || 0;
    for (var i = 0; i < fs.length; i++) {
      var a = area(fs[i].getBoundingClientRect());
      if (a > bestA) { bestA = a; best = fs[i]; }
    }
    return best;
  }

  function relay(msg) {
    var fs = document.getElementsByTagName('iframe');
    for (var i = 0; i < fs.length; i++) {
      try { fs[i].contentWindow.postMessage(msg, '*'); } catch (x) {}
    }
  }

  function fmt(t) {
    if (t !== t) return '--:--';
    if (!isFinite(t)) return 'LIVE';
    t = Math.max(0, Math.floor(t));
    var h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60;
    return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  // Small seek/progress bar at the top of the player, clear of the site's own control bar.
  var osd, osdTimer;
  function showOsd(v, label) {
    if (!document.body) return;
    if (!osd) {
      osd = document.createElement('div');
      osd.style.cssText = 'position:fixed;left:50%;top:6%;width:min(560px,70%);transform:translateX(-50%);' +
        'z-index:2147483647;pointer-events:none;padding:12px 18px;border-radius:12px;background:rgba(0,0,0,.72);' +
        'font:600 18px/1.3 system-ui,sans-serif;color:#fff;transition:opacity .3s;opacity:0';
      osd.innerHTML = '<div style="display:flex;justify-content:space-between;margin-bottom:8px">' +
        '<span data-l></span><span data-t></span></div>' +
        '<div style="height:5px;background:rgba(255,255,255,.25);border-radius:3px;overflow:hidden">' +
        '<div data-p style="height:100%;width:0;background:#e50914"></div></div>';
    }
    var host = document.fullscreenElement || document.webkitFullscreenElement || document.body;
    if (host.tagName === 'VIDEO') host = document.body;
    if (osd.parentNode !== host) host.appendChild(osd);
    osd.querySelector('[data-l]').textContent = label || (v.paused ? '❚❚  Paused' : '▶  Playing');
    osd.querySelector('[data-t]').textContent = fmt(v.currentTime) + ' / ' + fmt(v.duration);
    osd.querySelector('[data-p]').style.width = (isFinite(v.duration) && v.duration ? v.currentTime / v.duration * 100 : 0) + '%';
    osd.style.opacity = '1';
    clearTimeout(osdTimer);
    osdTimer = setTimeout(function () { osd.style.opacity = '0'; }, v.paused ? 5000 : 2500);
  }

  // Returns false when this document has no video to act on.
  function media(action, repeat) {
    var v = bestVideo();
    if (!v) return false;
    if (action === 'playpause') action = v.paused ? 'play' : 'pause';
    if (action === 'play') {
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
      showOsd(v, '▶  Play');
    } else if (action === 'pause') {
      v.pause();
      showOsd(v, '❚❚  Paused');
    } else if (action === 'ff' || action === 'rew') {
      var step = repeat ? 30 : 10, fwd = action === 'ff';
      if (!(v.duration > 0)) return true;
      var end = isFinite(v.duration) ? v.duration - 1 : v.currentTime + step;
      v.currentTime = Math.max(0, Math.min(end, v.currentTime + (fwd ? step : -step)));
      showOsd(v, (fwd ? '» +' : '« −') + step + 's');
    } else if (action === 'osd') {
      showOsd(v);
    }
    return true;
  }

  // Players hide their controls until the mouse moves; nudge them on every key press.
  function wakeControls() {
    var x = innerWidth / 2, y = innerHeight / 2, el = document.elementFromPoint(x, y);
    if (!el) return;
    var init = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };
    try { el.dispatchEvent(new PointerEvent('pointermove', init)); } catch (x1) {}
    el.dispatchEvent(new MouseEvent('mousemove', init));
  }

  function clickCenter() {
    var x = innerWidth / 2, y = innerHeight / 2, el = document.elementFromPoint(x, y);
    if (!el) return;
    ['mousedown', 'mouseup'].forEach(function (t) {
      el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }));
    });
    el.click();
  }

  function notifyPlaying() {
    var v = bestVideo();
    var on = !!(v && !v.paused && !v.ended);
    call('playing', on);
    if (!TOP) window.top.postMessage({ tvPlaying: on }, '*');
    if (!on) return;
    if (TOP) window.top.postMessage({ tvPlaying: true }, '*');
    // Watching now: put focus on the picture so OK pauses and ←/→ seek (↑/↓ reach the buttons).
    var s = surfaceEl(), cur = document.activeElement;
    if (s && s.getAttribute('data-tvf') === 'player' && cur !== s && document.hasFocus() && modalScope() === document) focusEl(s, true);
  }
  document.addEventListener('play', notifyPlaying, true);
  document.addEventListener('pause', notifyPlaying, true);
  document.addEventListener('ended', notifyPlaying, true);

  // ---------------------------------------------------------------- what can take focus

  var SEL = 'a[href],button,input,select,textarea,summary,iframe,[tabindex],[role="button"],[role="tab"],[role="link"],' +
    '[role="menuitem"],[role="option"],[role="switch"],[role="checkbox"],[role="radio"],[data-tvf]';
  // Things that trap focus while open. role=menu covers the player's ⚙ and subtitle pop-up lists.
  var MODAL = '[role="dialog"],[aria-modal="true"],[role="menu"],[data-testid="welcome-modal"],[data-testid="episode-drawer"],[data-testid="shortcuts-modal"]';

  function inViewport(r) { return r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight; }

  // The site's own <video> player: its box becomes a single focus stop (the "surface").
  function localPlayer() {
    var v = bestVideo();
    if (!v || area(v.getBoundingClientRect()) < screenArea() * 0.2) return null;
    var box = v.closest('[data-testid="video-aspect-container"]') || v.parentElement;
    if (box.getAttribute('data-tvf') !== 'player') { box.setAttribute('data-tvf', 'player'); box.setAttribute('tabindex', '-1'); }
    return box;
  }

  // Where the video is in this document: a local video box, or the iframe that holds the player.
  var surfaceEl = memo(function () {
    var box = localPlayer();
    if (box) return box;
    var f = document.querySelector('iframe[data-testid="player-iframe"]');
    if (f && area(f.getBoundingClientRect()) > 0) return f;
    return largestFrame(screenArea() * 0.2);
  }, 200);

  function isSurface(el) {
    return !!el && el.nodeType === 1 && (el.getAttribute('data-tvf') === 'player' || (el.tagName === 'IFRAME' && el === surfaceEl()));
  }

  function isText(el) {
    if (!el) return false;
    if (el.tagName === 'TEXTAREA' || el.isContentEditable) return true;
    return el.tagName === 'INPUT' && /^(text|search|email|url|tel|password|number|)$/.test(el.type || '');
  }

  function activatesOnEnter(el) {
    var t = el.tagName;
    if (t === 'A' || t === 'BUTTON' || t === 'SUMMARY' || t === 'SELECT') return true;
    return t === 'INPUT' && /^(submit|button|reset|image)$/.test(el.type);
  }

  // Results that are expensive to work out but don't change within a key press are kept briefly.
  function memo(fn, ms) {
    var at = -1e9, val;
    return function () {
      var now = performance.now();
      if (now - at > ms) { val = fn(); at = now; }
      return val;
    };
  }

  var modalScope = memo(function () {
    var ms = document.querySelectorAll(MODAL);
    for (var i = ms.length - 1; i >= 0; i--) {
      var m = ms[i], r = m.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || !inViewport(r) || m.closest('[aria-hidden="true"]')) continue;
      if (getComputedStyle(m).visibility === 'hidden') continue;
      if (m.querySelector(SEL)) return m;
    }
    return document;
  }, 150);

  // Focusable things in scope. near: skip anything more than ~2 screens away (much cheaper on long pages).
  function candidates(scope, near) {
    var list = scope.querySelectorAll(SEL), out = [], h = innerHeight, rails = near ? new Map() : null;
    for (var i = 0; i < list.length; i++) {
      var el = list[i], tag = el.tagName;
      // Cheapest checks first, and nothing that measures layout until we know we need it:
      // measuring an element inside a skipped (content-visibility) row would force that row's layout.
      if (el.disabled || el.type === 'hidden') continue;
      if (el.getAttribute('tabindex') === '-1' && !el.hasAttribute('data-tvf') && tag !== 'IFRAME') continue;
      if (tag === 'BUTTON' && /^Scroll /.test(el.getAttribute('aria-label') || '')) continue; // rail arrows; focus scrolls rails itself
      var parent = el.parentElement && el.parentElement.closest('a[href],button,[role="button"]');
      if (parent) continue; // e.g. the "My List" heart inside a poster card: the card is one stop
      if (near) {
        var rail = el.closest('[data-testid="discovery-rail"]');
        if (rail) {
          var far = rails.get(rail);
          if (far === undefined) {
            var rr = rail.getBoundingClientRect();
            far = rr.bottom < -h * 1.5 || rr.top > h * 2.5;
            rails.set(rail, far);
          }
          if (far) continue;
        }
      }
      var r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue; // collapsed or hidden-away elements
      if (near && (r.bottom < -h * 1.5 || r.top > h * 2.5)) continue;
      if (tag === 'IFRAME' && area(r) < 60000 && el.getAttribute('data-testid') !== 'player-iframe') continue;
      if (el.closest('[aria-hidden="true"],[inert]')) continue;
      var cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
      out.push({ el: el, r: r });
    }
    return out;
  }

  // How much of el is horizontally visible, after clipping by scrolling rails and the screen.
  function visibleWidth(el, r, cache) {
    var l = Math.max(r.left, 0), rt = Math.min(r.right, innerWidth);
    for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      var clip = cache.get(p);
      if (clip === undefined) {
        clip = getComputedStyle(p).overflowX !== 'visible' ? p.getBoundingClientRect() : null;
        cache.set(p, clip);
      }
      if (clip) { l = Math.max(l, clip.left); rt = Math.min(rt, clip.right); }
    }
    return rt - l;
  }

  // Like valid(), but without measuring layout (which on this site forces a slow full re-layout).
  // Used by the twice-a-second background check.
  function present(el, scope) {
    if (!el || el === document.body || el === document.documentElement || !el.isConnected) return false;
    if (scope !== document && !scope.contains(el)) return false;
    return !el.checkVisibility || el.checkVisibility();
  }

  function valid(el, scope) {
    if (!el || el === document.body || el === document.documentElement || !el.isConnected) return false;
    if (scope !== document && !scope.contains(el)) return false;
    var r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  }

  // ---------------------------------------------------------------- moving focus

  // From a video surface, ↑ goes to the top-most control over the video (e.g. the server picker)
  // and ↓ to the bottom control bar.
  function edgeCandidate(surf, dir, list) {
    var s = surf.getBoundingClientRect(), best = null;
    list.forEach(function (c) {
      if (c.el === surf || isSurface(c.el)) return;
      var cx = c.r.left + c.r.width / 2, cy = c.r.top + c.r.height / 2;
      if (cx < s.left || cx > s.right || cy < s.top || cy > s.bottom) return;
      if (!best) { best = c; return; }
      if (dir === 'up' ? (c.r.top < best.r.top - 4 || (Math.abs(c.r.top - best.r.top) <= 4 && c.r.left > best.r.left))
                       : (c.r.bottom > best.r.bottom + 4 || (Math.abs(c.r.bottom - best.r.bottom) <= 4 && c.r.left < best.r.left))) best = c;
    });
    return best && best.el;
  }

  // Returns false when nothing lies in that direction (the caller may hand focus to the parent frame).
  function move(dir, repeat, from) {
    var scope = modalScope(), cur = from || document.activeElement;
    if (!valid(cur, scope)) return focusInitial(scope);
    var horiz = dir === 'left' || dir === 'right', list = candidates(scope, true);
    if (!horiz && isSurface(cur)) {
      var inner = edgeCandidate(cur, dir, list);
      if (inner) { focusEl(inner, repeat); return true; }
    }
    var a = cur.getBoundingClientRect();
    var acx = a.left + a.width / 2, acy = a.top + a.height / 2;
    var cache = new Map(), found = [];

    list.forEach(function (c) {
      var el = c.el, b = c.r, surf = isSurface(el);
      if (el === cur || cur.contains(el) || (el.contains(cur) && !surf)) return;
      if (surf && horiz) return;
      var bcx = b.left + b.width / 2, bcy = b.top + b.height / 2, primary, orth;
      if (dir === 'right') { if (bcx <= acx + 1 || b.right <= a.right) return; primary = b.left - a.right; }
      else if (dir === 'left') { if (bcx >= acx - 1 || b.left >= a.left) return; primary = a.left - b.right; }
      else if (dir === 'down') { if (bcy <= acy + 1 || b.bottom <= a.bottom) return; primary = b.top - a.bottom; }
      else { if (bcy >= acy - 1 || b.top >= a.top) return; primary = a.top - b.bottom; }
      primary = Math.max(0, primary);
      if (horiz) {
        // Stay in the same row: left/right never jumps to another row.
        var ov = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ov < Math.min(a.height, b.height) * 0.3) return;
        orth = Math.abs(bcy - acy);
      } else {
        // Up/down only lands on cards actually showing in their rail.
        if (visibleWidth(el, b, cache) < Math.min(40, b.width * 0.5)) return;
        // From something much wider (search box, player) line up with its left edge, so ↓ lands on the first result.
        var ax = a.width > b.width * 2.5 ? a.left + Math.min(b.width, a.width) / 2 : acx;
        orth = b.left <= ax && ax <= b.right ? 0 : Math.min(Math.abs(b.left - ax), Math.abs(b.right - ax));
      }
      found.push({ el: el, primary: primary, orth: orth });
    });
    if (!horiz && !inFixed(cur)) {
      // The pinned top menu sits over the row above while scrolled; prefer real page content over it.
      var posCache = new Map(), inFlow = found.filter(function (c) { return !inFixed(c.el, posCache); });
      if (inFlow.length) found = inFlow;
    }
    if (!found.length) return false;
    // The video surface wraps all the player's buttons, so it always looks "0 px away". Only fall back to it
    // when no real button is close by: ↑ from ⚙ must reach the menu that just opened above it.
    var buttons = found.filter(function (c) { return !isSurface(c.el); });
    if (buttons.length && buttons.length < found.length) {
      var nearest = Math.min.apply(null, buttons.map(function (c) { return c.primary; }));
      if (nearest < Math.max(120, a.height * 3)) found = buttons;
    }

    var best;
    if (horiz) {
      best = found.reduce(function (m, c) { return c.primary + c.orth * 2 < m.primary + m.orth * 2 ? c : m; });
    } else {
      // Nearest "row" first, then the item closest to where we are horizontally.
      var minP = Math.min.apply(null, found.map(function (c) { return c.primary; }));
      var band = minP + Math.max(80, Math.min(a.height * 0.6, 220));
      best = found.filter(function (c) { return c.primary <= band; })
        .reduce(function (m, c) { return c.orth + c.primary * 0.5 < m.orth + m.primary * 0.5 ? c : m; });
    }
    focusEl(best.el, repeat);
    return true;
  }

  var focused = null;
  function mark(el) {
    if (focused && focused !== el) focused.classList.remove('tv-focus');
    focused = el;
    if (el && el.classList) el.classList.add('tv-focus');
  }

  function focusEl(el, instant) {
    if (!el.matches('a[href],button,input,select,textarea,summary,iframe,[tabindex]')) {
      el.setAttribute('tabindex', '-1');
      el.setAttribute('data-tvf', '1');
    }
    // Landing on a text box shouldn't pop the keyboard up; OK opens it (see handleKey).
    if (isText(el) && !el.hasAttribute('inputmode')) { el.setAttribute('inputmode', 'none'); el.setAttribute('data-tvim', '1'); }
    mark(el); // style first, so focus() does a single style/layout pass
    try { el.focus({ preventScroll: true }); } catch (x) { el.focus(); }
    if (!(TOP && fs)) scrollToEl(el, instant);
    if (TOP) remember(el);
  }

  function inFixed(el, cache) {
    for (var p = el; p && p !== document.body; p = p.parentElement) {
      var pos = cache && cache.get(p);
      if (pos === undefined) { pos = getComputedStyle(p).position; if (cache) cache.set(p, pos); }
      if (pos === 'fixed' || pos === 'sticky') return true;
    }
    return false;
  }

  function scrollToEl(el, instant) {
    var behavior = instant ? 'auto' : 'smooth';
    var r = el.getBoundingClientRect(), vScroller = null;
    for (var p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      var cs = getComputedStyle(p);
      if (!vScroller && /(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 2) vScroller = p;
      if (/(auto|scroll)/.test(cs.overflowX) && p.scrollWidth > p.clientWidth + 2) {
        var pr = p.getBoundingClientRect(), pad = Math.min(r.width * 0.6, pr.width * 0.12);
        if (r.left < pr.left + pad) p.scrollBy({ left: r.left - pr.left - pad, behavior: behavior });
        else if (r.right > pr.right - pad) p.scrollBy({ left: r.right - pr.right + pad, behavior: behavior });
      }
    }
    if (vScroller) { el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: behavior }); return; }
    if (inFixed(el)) {
      // Moving up into the top menu scrolls the page back to the top, like Netflix.
      if (r.top < innerHeight * 0.25 && scrollY > 0) window.scrollTo({ top: 0, behavior: behavior });
      return;
    }
    // Keep the item inside the area below the fixed top menu, with room for the row title above it.
    var hdr = document.querySelector('header');
    var top = hdr && inFixed(hdr) ? Math.max(0, hdr.getBoundingClientRect().bottom) : 0;
    var avail = innerHeight - top, margin = Math.min(60, avail * 0.1);
    if (r.top < top + margin || r.bottom > innerHeight - margin / 2) {
      var dy = r.height + margin * 1.5 > avail ? r.top - top - margin : r.top + r.height / 2 - (top + avail / 2);
      window.scrollBy({ top: dy, behavior: behavior });
    }
  }

  // Where focus should start on a page. anywhere: also consider items scrolled out of view.
  function pickInitial(scope, anywhere) {
    var cache = new Map(), list = candidates(scope, true).filter(function (c) {
      return (anywhere || inViewport(c.r)) && visibleWidth(c.el, c.r, cache) > c.r.width * 0.5;
    });
    if (!list.length) list = candidates(scope);
    if (!list.length) return null;
    var pick = null;
    if (scope === document && (!TOP || location.pathname.indexOf('/watch') === 0)) {
      var s = surfaceEl();
      pick = s && list.filter(function (c) { return c.el === s; })[0];
    }
    if (!pick && !TOP && scope === document) {
      // Inside a player frame with no video yet: start on the control nearest the middle (the big ▶).
      var mx = innerWidth / 2, my = innerHeight / 2;
      pick = list.reduce(function (m, c) {
        var d = Math.hypot(c.r.left + c.r.width / 2 - mx, c.r.top + c.r.height / 2 - my);
        return !m || d < m.d ? { el: c.el, d: d } : m;
      }, null);
    }
    if (!pick) {
      // Start on content, not the menu; skip text boxes unless this is the search page.
      var searching = location.pathname.indexOf('/search') === 0;
      var content = scope === document ? list.filter(function (c) { return !c.el.closest('header,nav'); }) : list;
      var noText = content.filter(function (c) { return searching ? isText(c.el) : !isText(c.el); });
      if (noText.length) content = noText;
      // In a dialog, start on its main button rather than the ✕.
      if (scope !== document) {
        var main = content.filter(function (c) {
          var label = (c.el.getAttribute('aria-label') || '') + (c.el.getAttribute('data-testid') || '');
          return !/close|dismiss/i.test(label);
        });
        if (main.length) content = main;
      }
      if (!content.length) content = list;
      // A row's "View all" link is never a good place to start.
      var notRailLinks = content.filter(function (c) {
        return !(c.el.closest('[data-testid="discovery-rail"]') && c.el.getAttribute('data-testid') !== 'media-card');
      });
      if (notRailLinks.length) content = notRailLinks;
      content.sort(function (x, y) { return Math.round(x.r.top / 24) - Math.round(y.r.top / 24) || x.r.left - y.r.left; });
      pick = content[0];
    }
    return pick.el;
  }

  function focusInitial(scope) {
    scope = scope || modalScope();
    var cur = document.activeElement;
    if (scope !== document && cur && cur !== document.body && !scope.contains(cur)) opener = cur;
    var el = pickInitial(scope);
    if (!el) return false;
    focusEl(el);
    return true;
  }

  // Nothing further in this frame: let the page around it move on from our iframe.
  function bubble(dir) {
    if (!TOP) window.parent.postMessage({ tvNav: dir }, '*');
  }

  function childFrame(win) {
    var fs = document.getElementsByTagName('iframe');
    for (var i = 0; i < fs.length; i++) if (fs[i].contentWindow === win) return fs[i];
    return null;
  }

  // ---------------------------------------------------------------- keys

  function handleKey(k, repeat, e) {
    var cur = document.activeElement;
    if (TOP && fs) return fsKey(k, repeat);
    if (!TOP && bestVideo()) wakeControls();

    if (isSurface(cur) && cur.tagName !== 'IFRAME') {
      if (k === 'ok') { media('playpause'); return; }
      if (k === 'left' || k === 'right') { media(k === 'right' ? 'ff' : 'rew', repeat); return; }
    }

    if (k === 'ok') {
      if (isText(cur)) {
        // Remote OK on a text box opens the on-screen keyboard; the keyboard's own Enter passes through.
        if (call('remoteOk')) {
          if (e) stop(e);
          if (cur.hasAttribute('data-tvim')) {
            cur.removeAttribute('inputmode');
            cur.removeAttribute('data-tvim');
            cur.blur();
            cur.focus({ preventScroll: true });
          }
          setTimeout(function () { call('showKeyboard'); }, 60);
        }
        return;
      }
      if (e) stop(e);
      if (!valid(cur, modalScope())) {
        if (!focusInitial() && !TOP) clickCenter();
        return;
      }
      if (!e || !activatesOnEnter(cur)) cur.click();
      return;
    }

    if (isText(cur) && (k === 'left' || k === 'right')) {
      var s = cur.selectionStart, len = (cur.value || '').length;
      if (s != null && ((k === 'left' && s > 0) || (k === 'right' && cur.selectionEnd < len))) return; // move the caret
    }
    if (e) stop(e);
    if (!move(k, repeat)) bubble(k);
  }

  window.addEventListener('keydown', function (e) {
    var dir = dirOf(e), ok = isOk(e);
    if (!dir && !ok) return;
    if (TOP) userMoved = true;
    if (ok && !(TOP && fs)) {
      // Let the browser activate links/buttons itself (keeps it a real user gesture).
      var cur = document.activeElement;
      if (cur && valid(cur, modalScope()) && activatesOnEnter(cur) && !isSurface(cur)) {
        setTimeout(tick, 250); // if that opened a menu, move into it right away
        return;
      }
    }
    if (!ok) stop(e);
    handleKey(dir || 'ok', e.repeat, e);
  }, true);

  window.addEventListener('message', function (ev) {
    var d = ev.data;
    if (!d || typeof d !== 'object') return;
    // Ignore messages not received from the embedding parent or a known child frame.
    if (TOP && ev.source !== window && !childFrame(ev.source)) return;
    if (!TOP && ev.source !== window.parent && !childFrame(ev.source)) return;
    if (d.tvPlaybackStatus && childFrame(ev.source)) {
      var info = d.tvPlaybackStatus;
      if (info && typeof info === 'object' &&
          typeof info.id === 'string' && info.id.length <= 70 &&
          typeof info.resolution === 'string' && typeof info.audio === 'string' &&
          typeof info.subtitles === 'string') {
        if (TOP) sendPlaybackStatus(info);
        else window.parent.postMessage({tvPlaybackStatus: info}, '*');
      }
    }
    if (d.tvMedia && !TOP && ev.source === window.parent) { media(d.tvMedia); relay(d); }
    if (d.tvKey && !TOP && ev.source === window.parent) handleKey(d.tvKey, d.rep, null);
    if (TOP && 'tvMenu' in d) menuFrame = d.tvMenu ? ev.source : (menuFrame === ev.source ? null : menuFrame);
    if (d.tvBack && !TOP) {
      var m = modalScope();
      if (m !== document) closeModal(m);
    }
    if (d.tvNav) {
      var from = childFrame(ev.source);
      if (!from) return;
      if (TOP && fs) return;
      if (TOP) userMoved = true;
      if (!move(d.tvNav, false, from)) bubble(d.tvNav);
    }
    if (TOP && typeof d.tvPlaying === 'boolean' && childFrame(ev.source)) {
      call('playing', d.tvPlaying);
      if (d.tvPlaying) onPlaying();
    }
  });

  // Focus just entered this frame: start on the video.
  if (!TOP) {
    window.addEventListener('focus', function () {
      setTimeout(function () {
        var cur = document.activeElement;
        if (cur && cur.tagName === 'IFRAME') return;
        var s = surfaceEl();
        if (s) focusEl(s, true);
        else if (!valid(cur, modalScope())) focusInitial();
      }, 0);
    });
  }

  // ---------------------------------------------------------------- keeping focus somewhere sensible

  var memory = {}, restore = null, routeAt = Date.now(), lastHref = location.href, userMoved = false;

  function pageKey() { return location.pathname + location.search; }

  function remember(el) {
    var sel = null, id = el.getAttribute('data-media-id'), tid = el.getAttribute('data-testid');
    if (id) sel = '[data-media-id="' + CSS.escape(id) + '"]';
    else if (tid) sel = '[data-testid="' + CSS.escape(tid) + '"]';
    else if (el.tagName === 'A') sel = 'a[href="' + CSS.escape(el.getAttribute('href')) + '"]';
    if (!sel) return;
    var same = document.querySelectorAll(sel);
    memory[pageKey()] = { sel: sel, idx: Array.prototype.indexOf.call(same, el) };
  }

  function tryRestore() {
    var m = restore;
    if (!m) return false;
    var el = document.querySelectorAll(m.sel)[m.idx];
    if (!el || !valid(el, document)) return false;
    restore = null;
    userMoved = true; // back where the viewer left off: keep it there
    focusEl(el, true);
    return true;
  }

  function tick() {
    if (!TOP) {
      var fScope = modalScope(), open = fScope !== document;
      // Tell the page whether a menu is open in here, so the Back button can close it.
      if (open !== menuOpen) { menuOpen = open; window.top.postMessage({ tvMenu: open }, '*'); }
      // Only the frame that has focus looks after it (e.g. a closed menu took the focused button with it).
      var c = document.activeElement;
      if (!document.hasFocus() || (c && c.tagName === 'IFRAME')) return;
      if (open && !fScope.contains(c)) { focusInitial(fScope); return; }
      if (!present(c, fScope)) {
        if (!open && opener) returnToOpener();
        if (!present(document.activeElement, fScope)) focusInitial(fScope);
      }
      return;
    }
    if (location.href !== lastHref) {
      lastHref = location.href;
      routeAt = Date.now();
      userMoved = false;
      restore = memory[pageKey()] || null;
      if (fs) exitFs();
    }
    var age = Date.now() - routeAt;
    if (restore && (tryRestore() || age < 10000)) return;
    restore = null;
    var scope = modalScope(), cur = document.activeElement;
    if (scope !== document && !scope.contains(cur)) { focusInitial(scope); return; }
    if (!present(cur, scope) && scope === document && opener) {
      returnToOpener(); // a dialog/menu just closed
      cur = document.activeElement;
    }
    if (!present(cur, scope)) {
      // Fresh page: wait a moment for its content before falling back to the menu.
      var hasContent = candidates(scope, true).some(function (c) { return !c.el.closest('header,nav'); });
      if (hasContent || age > 1500) focusInitial(scope);
    } else if (!userMoved && domChanged && performance.now() - lastFollow > 1500 && scope === document && cur.tagName !== 'IFRAME') {
      lastFollow = performance.now();
      domChanged = false;
      // Page still loading and no key pressed yet: follow the best starting point as content arrives
      // (e.g. the hero's "Watch Now" showing up after we had settled on a row below it).
      var best = pickInitial(scope, true);
      if (best && best !== cur) focusEl(best, true);
      else if (cur !== focused) mark(cur);
    } else if (cur !== focused && cur.tagName !== 'IFRAME') {
      mark(cur);
    }
  }
  // Cheap "did the page change?" flag, so idle pages aren't re-scanned every tick.
  var domChanged = true;
  new MutationObserver(function () { domChanged = true; }).observe(document, { childList: true, subtree: true });
  var lastFollow = -1e9;
  var menuOpen = false;
  setInterval(function () { tick(); }, 500);

  document.addEventListener('focusin', function (e) { if (e.target !== document.body) mark(e.target); });

  // ---------------------------------------------------------------- player fullscreen (top page)

  var fs = false, fsEl = null, menuFrame = null;

  function focusPlayer(p) {
    mark(p);
    try { p.focus({ preventScroll: true }); } catch (x) { p.focus(); }
  }

  function enterFs() {
    var p = surfaceEl();
    if (!p) return;
    fs = true;
    fsEl = p;
    document.documentElement.classList.add('tv-fs');
    p.classList.add('tv-fsel');
    for (var a = p.parentElement; a && a !== document.body; a = a.parentElement) a.classList.add('tv-fs-anc');
    if (document.activeElement !== p) focusPlayer(p);
  }

  function exitFs() {
    fs = false;
    document.documentElement.classList.remove('tv-fs');
    var els = document.querySelectorAll('.tv-fsel,.tv-fs-anc');
    for (var i = 0; i < els.length; i++) els[i].classList.remove('tv-fsel', 'tv-fs-anc');
    if (fsEl && fsEl.isConnected) scrollToEl(fsEl, true);
    fsEl = null;
  }

  // A key that reached the top page while the player is fullscreen: it belongs to the player.
  function fsKey(k, repeat) {
    var p = fsEl && fsEl.isConnected ? fsEl : surfaceEl();
    if (!p) { exitFs(); return; }
    if (p.tagName === 'IFRAME') {
      if (document.activeElement !== p) focusPlayer(p);
      try { p.contentWindow.postMessage({ tvKey: k, rep: repeat }, '*'); } catch (x) {}
      return;
    }
    if (k === 'ok') media('playpause');
    else if (k === 'left' || k === 'right') media(k === 'right' ? 'ff' : 'rew', repeat);
    else if (!move(k, repeat)) media('osd');
  }

  // Video started playing on the watch page → fill the screen, like Netflix.
  function onPlaying() {
    if (fs || location.pathname.indexOf('/watch') !== 0) return;
    enterFs();
  }

  function closeModal(m) {
    var btn = m.querySelector('[data-testid$="close-btn"],[data-testid$="-close"],[data-testid="welcome-continue-btn"],' +
      '[data-testid="next-prompt-cancel"],button[aria-label*="lose"]');
    var prev = m.previousElementSibling;
    if (btn) btn.click();
    // The player's pop-up menus close on a click on the invisible layer behind them.
    else if (prev && prev.getAttribute('aria-hidden') === 'true') prev.click();
    else {
      var t = document.activeElement || document.body;
      t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true }));
    }
    setTimeout(returnToOpener, 150);
  }

  // Focus goes back to whatever opened a dialog/menu (e.g. the ⚙ button) once it closes.
  var opener = null;
  function returnToOpener() {
    var o = opener;
    if (!o || modalScope() !== document) return;
    opener = null;
    if (present(o, document)) focusEl(o, true);
  }

  // Called by the app (Back button and remote media keys).
  if (TOP) {
    window.__tv = {
      back: function () {
        // A menu open inside the player (⚙, subtitles) closes first; fullscreen stays.
        if (menuFrame) {
          try { menuFrame.postMessage({ tvBack: 1 }, '*'); } catch (x) {}
          menuFrame = null;
          return true;
        }
        if (fs) { exitFs(); return true; }
        var m = modalScope();
        if (m !== document) { closeModal(m); return true; }
        if (location.pathname === '/' && scrollY > innerHeight) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setTimeout(function () { focusInitial(document); }, 400);
          return true;
        }
        return false;
      },
      media: function (action) {
        media(action);
        relay({ tvMedia: action });
      }
    };
  }
})();
