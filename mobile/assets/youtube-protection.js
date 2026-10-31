// Patagonia YouTube protection.
// Preventive filters run at document start and remove ad fields before the
// player consumes them. DOM/media handling remains as a last-resort fallback.
(() => {
  'use strict';
  const host = location.hostname.toLowerCase();
  if (host !== 'youtube.com' && !host.endsWith('.youtube.com')) return;

  const oldProtection =
    window.__patagoniaYoutubeAdsV2 || window.__patagoniaYoutubeAdsV1;
  if (oldProtection && typeof oldProtection.stop === 'function') {
    oldProtection.stop();
  }

  const key = '__patagoniaYoutubeAdsV3';
  if (window[key]) {
    window[key].refresh();
    return;
  }

  const nativeParse = JSON.parse;
  const nativeStringify = JSON.stringify;
  const responseKeys = new Set([
    'adPlacements',
    'adSlots',
    'playerAds',
    'adBreakHeartbeatParams'
  ]);
  const adRendererKeys = new Set([
    'adPlacementRenderer',
    'adSlotRenderer',
    'linearAdSequenceRenderer',
    'instreamAdPlayerOverlayRenderer',
    'promotedSparklesWebRenderer',
    'promotedVideoRenderer'
  ]);
  const responseMarker =
    /"(?:adPlacements|adSlots|playerAds|adBreakHeartbeatParams|adPlacementRenderer|adSlotRenderer|linearAdSequenceRenderer|instreamAdPlayerOverlayRenderer|promotedSparklesWebRenderer|promotedVideoRenderer)"\s*:/;
  const restorers = [];
  const patchedResponses = new WeakSet();

  function sanitizeText(text) {
    if (typeof text !== 'string' || !responseMarker.test(text)) return text;
    try {
      return nativeStringify(prune(nativeParse(text)));
    } catch (_) {
      return text
        .replace(/"adPlacements"\s*:/g, '"no_ads":')
        .replace(/"adSlots"\s*:/g, '"no_ads":')
        .replace(/"playerAds"\s*:/g, '"no_ads":')
        .replace(/"adBreakHeartbeatParams"\s*:/g, '"no_ads":');
    }
  }

  function prune(value, seen = new WeakSet()) {
    if (value === null || typeof value !== 'object' || seen.has(value)) {
      return value;
    }
    seen.add(value);
    if (Array.isArray(value)) {
      for (let index = value.length - 1; index >= 0; index--) {
        const item = value[index];
        if (item && typeof item === 'object' &&
            Object.keys(item).some((name) => adRendererKeys.has(name))) {
          value.splice(index, 1);
        } else {
          prune(item, seen);
        }
      }
      return value;
    }

    let names;
    try { names = Object.keys(value); } catch (_) { return value; }
    for (const name of names) {
      if (responseKeys.has(name) || adRendererKeys.has(name)) {
        try { delete value[name]; } catch (_) {}
        continue;
      }
      let child;
      try { child = value[name]; } catch (_) { continue; }
      if ((name === 'playerResponse' || name === 'player_response') &&
          typeof child === 'string') {
        try { value[name] = sanitizeText(child); } catch (_) {}
      } else {
        prune(child, seen);
      }
    }
    return value;
  }

  function replaceValue(target, name, replacement) {
    const before = Object.getOwnPropertyDescriptor(target, name);
    try {
      Object.defineProperty(target, name, {
        configurable: before ? before.configurable : true,
        enumerable: before ? before.enumerable : false,
        writable: before && 'writable' in before ? before.writable : true,
        value: replacement
      });
    } catch (_) {
      try { target[name] = replacement; } catch (_) { return false; }
    }
    restorers.push(() => {
      try {
        if (target[name] !== replacement) return;
        if (before) Object.defineProperty(target, name, before);
        else delete target[name];
      } catch (_) {}
    });
    return true;
  }

  function replaceGetter(target, name, transform) {
    const before = Object.getOwnPropertyDescriptor(target, name);
    if (!before || typeof before.get !== 'function' || !before.configurable) {
      return false;
    }
    const originalGet = before.get;
    const replacementGet = new Proxy(originalGet, {
      apply(callable, receiver, args) {
        return transform(Reflect.apply(callable, receiver, args), receiver);
      }
    });
    try {
      Object.defineProperty(target, name, {
        ...before,
        get: replacementGet
      });
    } catch (_) {
      return false;
    }
    restorers.push(() => {
      try {
        if (Object.getOwnPropertyDescriptor(target, name)?.get ===
            replacementGet) {
          Object.defineProperty(target, name, before);
        }
      } catch (_) {}
    });
    return true;
  }

  function isYouTubeResponse(input) {
    let value;
    try {
      value = typeof input === 'string' ? input : input && input.url;
      if (!value) return false;
      const url = new URL(value, location.href);
      const requestHost = url.hostname.toLowerCase();
      if (requestHost !== 'youtube.com' &&
          !requestHost.endsWith('.youtube.com')) {
        return false;
      }
      return /^\/(?:youtubei\/v1\/(?:player|get_watch|next|browse|search)|get_watch|playlist|watch)(?:[/?]|$)/.test(
        url.pathname
      );
    } catch (_) {
      return false;
    }
  }

  function patchFetchResponse(response, input) {
    if (!response ||
        (!isYouTubeResponse(input) && !isYouTubeResponse(response.url))) {
      return response;
    }
    if (patchedResponses.has(response)) return response;
    patchedResponses.add(response);
    if (typeof response.json === 'function') {
      const originalJson = response.json;
      const patchedJson = new Proxy(originalJson, {
        apply(callable, receiver, args) {
          return Promise.resolve(Reflect.apply(callable, receiver, args))
            .then(prune);
        }
      });
      try {
        Object.defineProperty(response, 'json', {
          configurable: true,
          value: patchedJson
        });
      } catch (_) {}
    }
    if (typeof response.text === 'function') {
      const originalText = response.text;
      const patchedText = new Proxy(originalText, {
        apply(callable, receiver, args) {
          return Promise.resolve(Reflect.apply(callable, receiver, args))
            .then(sanitizeText);
        }
      });
      try {
        Object.defineProperty(response, 'text', {
          configurable: true,
          value: patchedText
        });
      } catch (_) {}
    }
    if (typeof response.clone === 'function') {
      const originalClone = response.clone;
      const patchedClone = new Proxy(originalClone, {
        apply(callable, receiver, args) {
          return patchFetchResponse(
            Reflect.apply(callable, receiver, args),
            response.url || input
          );
        }
      });
      try {
        Object.defineProperty(response, 'clone', {
          configurable: true,
          value: patchedClone
        });
      } catch (_) {}
    }
    return response;
  }

  function installResponseFilters() {
    const parseProxy = new Proxy(nativeParse, {
      apply(callable, receiver, args) {
        const parsed = Reflect.apply(callable, receiver, args);
        return typeof args[0] === 'string' && responseMarker.test(args[0])
          ? prune(parsed)
          : parsed;
      }
    });
    replaceValue(JSON, 'parse', parseProxy);

    if (typeof window.fetch === 'function') {
      const originalFetch = window.fetch;
      const fetchProxy = new Proxy(originalFetch, {
        apply(callable, receiver, args) {
          return Promise.resolve(Reflect.apply(callable, receiver, args))
            .then((response) => patchFetchResponse(response, args[0]));
        }
      });
      replaceValue(window, 'fetch', fetchProxy);
    }

    const xhr = window.XMLHttpRequest;
    if (!xhr || !xhr.prototype) return;
    const requestUrls = new WeakMap();
    if (typeof xhr.prototype.open === 'function') {
      const originalOpen = xhr.prototype.open;
      const openProxy = new Proxy(originalOpen, {
        apply(callable, receiver, args) {
          requestUrls.set(receiver, args[1]);
          return Reflect.apply(callable, receiver, args);
        }
      });
      replaceValue(xhr.prototype, 'open', openProxy);
    }
    replaceGetter(xhr.prototype, 'responseText', (value, request) =>
      isYouTubeResponse(requestUrls.get(request)) ? sanitizeText(value) : value
    );
    replaceGetter(xhr.prototype, 'response', (value, request) => {
      if (!isYouTubeResponse(requestUrls.get(request))) return value;
      return typeof value === 'string' ? sanitizeText(value) : prune(value);
    });
  }

  function trapBootstrapValue(name) {
    const before = Object.getOwnPropertyDescriptor(window, name);
    if (before && !before.configurable) {
      try { prune(window[name]); } catch (_) {}
      return;
    }
    let current;
    try {
      current = prune(before && before.get
        ? before.get.call(window)
        : before && before.value);
    } catch (_) {
      current = undefined;
    }
    const getter = () => current;
    const setter = (value) => { current = prune(value); };
    try {
      Object.defineProperty(window, name, {
        configurable: true,
        enumerable: before ? before.enumerable : true,
        get: getter,
        set: setter
      });
    } catch (_) {
      return;
    }
    restorers.push(() => {
      try {
        const descriptor = Object.getOwnPropertyDescriptor(window, name);
        if (descriptor?.get !== getter) return;
        delete window[name];
        if (current !== undefined) window[name] = current;
      } catch (_) {}
    });
  }

  installResponseFilters();
  trapBootstrapValue('ytInitialPlayerResponse');
  trapBootstrapValue('ytInitialData');
  trapBootstrapValue('ytplayer');

  const style = document.createElement('style');
  style.id = 'patagonia-youtube-ad-style';
  style.textContent = [
    'ytm-ad-slot-renderer, ytd-ad-slot-renderer,',
    'ytm-display-ad-renderer, ytd-display-ad-renderer,',
    'ytm-promoted-sparkles-web-renderer, ytd-promoted-sparkles-web-renderer,',
    'ytm-promoted-video-renderer, ytd-promoted-video-renderer,',
    'ytm-companion-ad-renderer, ytd-companion-slot-renderer,',
    'ytm-in-feed-ad-layout-renderer, ytd-in-feed-ad-layout-renderer,',
    'ytd-player-legacy-desktop-watch-ads-renderer, ytm-player-ads,',
    '.ytp-ad-overlay-container { display: none !important; }',
    'ytd-rich-item-renderer:has(ytd-ad-slot-renderer),',
    'ytm-rich-item-renderer:has(ytm-ad-slot-renderer) {',
    '  display: none !important;',
    '}'
  ].join('\n');

  const roots = new Set([document]);
  const clicked = new WeakMap();
  const serverSideSeek = new WeakMap();
  const mediaState = new Map();
  let stopped = false;
  let scheduled = null;
  let interval = null;
  let lastRootScan = 0;
  let lastAdSeen = 0;

  const playerSelector = [
    '#movie_player',
    '.html5-video-player',
    'ytm-player',
    'yt-player',
    '[class*="player-container"]'
  ].join(',');
  const skipSelector = [
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button-container button',
    '[class*="skip-ad"]',
    '[id*="skip-ad"]',
    'ytm-skip-ad-button',
    'yt-skip-ad-button',
    'button',
    '[role="button"]'
  ].join(',');
  const adMarkerSelector = [
    '.html5-video-player.ad-showing',
    '.html5-video-player.ad-interrupting',
    '#movie_player.ad-showing',
    '#movie_player.ad-interrupting',
    '.ytp-ad-player-overlay',
    '.ytp-ad-text',
    '.ytp-ad-simple-ad-badge',
    '.ytp-ad-preview-container',
    '.ytp-ad-duration-remaining',
    'ytm-player-ads'
  ].join(',');
  const skipWords =
    /^(saltar|omitir|skip|pular|ignorar)(?:\s+(?:este\s+)?(?:anuncio|anuncios|ad|ads|publicidad))?(?:\s+\d+)?$/;
  const adWords =
    /(^|\s)(patrocinado|sponsored|anuncio|publicidad|ir al sitio web del anunciante|visit advertiser)(\s|$)/;

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function labels(element) {
    return [
      element.getAttribute?.('aria-label'),
      element.getAttribute?.('title'),
      element.textContent
    ].filter(Boolean).map(normalize);
  }

  function label(element) {
    return labels(element).join(' ');
  }

  function discoverRoots(force = false) {
    const now = Date.now();
    if (!force && now - lastRootScan < 1500) return;
    lastRootScan = now;
    for (const root of Array.from(roots)) {
      for (const element of root.querySelectorAll?.('*') || []) {
        if (element.shadowRoot) roots.add(element.shadowRoot);
      }
    }
  }

  function all(selector) {
    const found = new Set();
    for (const root of roots) {
      for (const element of root.querySelectorAll?.(selector) || []) {
        found.add(element);
      }
    }
    return Array.from(found);
  }

  function composedParent(element) {
    if (element.parentElement) return element.parentElement;
    const root = element.getRootNode?.();
    return root && root.host ? root.host : null;
  }

  function closestPlayer(element) {
    for (let current = element; current; current = composedParent(current)) {
      if (current.matches?.(playerSelector)) return current;
    }
    return null;
  }

  function isVisible(element) {
    if (!element || element.hidden || element.disabled ||
        element.getAttribute?.('aria-disabled') === 'true') return false;
    const appearance = getComputedStyle(element);
    if (appearance.display === 'none' || appearance.visibility === 'hidden' ||
        appearance.opacity === '0' || appearance.pointerEvents === 'none') {
      return false;
    }
    const rectangles = element.getClientRects?.();
    return !rectangles || rectangles.length > 0;
  }

  function ensureStyle() {
    if (!style.isConnected) {
      (document.head || document.documentElement)?.appendChild(style);
    }
  }

  function applyBootstrapFilters() {
    try { prune(window.ytInitialPlayerResponse); } catch (_) {}
    try { prune(window.ytInitialData); } catch (_) {}
    try { prune(window.ytplayer); } catch (_) {}
    try {
      const flags = window.ytcfg?.data_?.EXPERIMENT_FLAGS;
      if (flags && typeof flags === 'object') {
        flags.all_web_enable_network_machine = false;
        flags.all_web_network_machine_raw_request = false;
      }
    } catch (_) {}
    for (const player of all(playerSelector)) {
      try { prune(player.getPlayerResponse?.()); } catch (_) {}
    }
  }

  function isExplicitSkipControl(element) {
    const identity = normalize(
      String(element.id || '') + ' ' + String(element.className || '')
    );
    return identity.includes('skip-ad') || identity.includes('ad-skip') ||
      identity.includes('skip ad') || identity.includes('ad skip');
  }

  function clickSkipControl() {
    const now = Date.now();
    for (const element of all(skipSelector)) {
      if (!isVisible(element)) continue;
      if (!closestPlayer(element)) continue;
      if (!isExplicitSkipControl(element) &&
          !labels(element).some((value) => skipWords.test(value))) continue;
      if (now - (clicked.get(element) ?? -Infinity) < 1200) continue;
      clicked.set(element, now);
      element.click();
      return true;
    }
    return false;
  }

  function skipServerSideAd() {
    const now = Date.now();
    for (const player of all(playerSelector)) {
      let debug = '';
      try {
        const stats = player.getStatsForNerds?.();
        debug = normalize(stats?.debug_info || stats?.debugInfo);
      } catch (_) {}
      if (!debug.startsWith('ssap, ad')) continue;
      lastAdSeen = now;
      if (now - (serverSideSeek.get(player) ?? -Infinity) < 400) return true;
      let duration = 0;
      try {
        duration = Number(player.getProgressState?.()?.duration);
      } catch (_) {}
      if (duration > 0 && typeof player.seekTo === 'function') {
        serverSideSeek.set(player, now);
        try { player.seekTo(duration, true); } catch (_) {}
        return true;
      }
      for (const video of videosIn([player])) accelerateAd(video);
      return true;
    }
    return false;
  }

  function activeAdPlayers() {
    const players = new Set();
    for (const marker of all(adMarkerSelector)) {
      const classState = marker.matches?.(
        '.ad-showing,.ad-interrupting,.html5-video-player.ad-showing,' +
        '.html5-video-player.ad-interrupting,#movie_player.ad-showing,' +
        '#movie_player.ad-interrupting'
      );
      if (!classState && !isVisible(marker)) continue;
      const player = closestPlayer(marker);
      if (player) players.add(player);
    }
    for (const marker of all(
      '.ytp-ad-text,[class*="ad-badge"],[class*="ad-preview"],' +
      '[class*="sponsored"]'
    )) {
      if (!isVisible(marker) || !adWords.test(label(marker))) continue;
      const player = closestPlayer(marker);
      if (player) players.add(player);
    }
    return Array.from(players);
  }

  function belongsTo(element, ancestor) {
    for (let current = element; current; current = composedParent(current)) {
      if (current === ancestor) return true;
    }
    return false;
  }

  function videosIn(players) {
    const videos = all('video');
    const scoped = videos.filter((video) =>
      players.some((player) => belongsTo(video, player))
    );
    return scoped;
  }

  function accelerateAd(video) {
    if (!mediaState.has(video)) {
      mediaState.set(video, {
        muted: video.muted,
        playbackRate: video.playbackRate
      });
    }
    try { video.muted = true; } catch (_) {}
    try { video.playbackRate = 16; } catch (_) {}
    try {
      const duration = Number(video.duration);
      if (Number.isFinite(duration) && duration > 0 &&
          duration - Number(video.currentTime || 0) > 0.1) {
        video.currentTime = Math.max(0, duration - 0.05);
      }
    } catch (_) {}
  }

  function restoreMedia(force = false) {
    if (!force && Date.now() - lastAdSeen < 650) return;
    for (const [video, state] of mediaState) {
      try { video.muted = state.muted; } catch (_) {}
      try { video.playbackRate = state.playbackRate; } catch (_) {}
    }
    mediaState.clear();
  }

  function refresh() {
    scheduled = null;
    if (stopped) return;
    ensureStyle();
    discoverRoots();
    applyBootstrapFilters();

    const serverSideAd = skipServerSideAd();
    const skipped = clickSkipControl();
    const players = activeAdPlayers();
    if (players.length > 0) {
      lastAdSeen = Date.now();
      if (!serverSideAd && !skipped) {
        for (const video of videosIn(players)) accelerateAd(video);
      }
    } else if (!serverSideAd) {
      restoreMedia();
    }
  }

  function schedule() {
    if (!stopped && scheduled === null) scheduled = setTimeout(refresh, 25);
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      'class', 'style', 'hidden', 'disabled', 'aria-disabled', 'aria-label',
      'title'
    ]
  });
  document.addEventListener('yt-navigate-finish', schedule);
  document.addEventListener('yt-page-data-updated', schedule);
  interval = setInterval(refresh, 200);

  window[key] = {
    refresh: schedule,
    prune,
    stop() {
      stopped = true;
      observer.disconnect();
      if (scheduled !== null) clearTimeout(scheduled);
      if (interval !== null) clearInterval(interval);
      document.removeEventListener('yt-navigate-finish', schedule);
      document.removeEventListener('yt-page-data-updated', schedule);
      restoreMedia(true);
      style.remove();
      delete window[key];
      for (const restore of restorers.reverse()) restore();
    }
  };
  discoverRoots(true);
  refresh();
})();
