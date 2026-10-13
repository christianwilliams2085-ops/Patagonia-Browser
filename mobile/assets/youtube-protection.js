(function () {
  'use strict';
  if (window.top !== window.self) return;

  const key = '__patagoniaYouTubeProtection';
  if (window[key]) {
    window[key].configure(window.__patagoniaYouTubeConfig || {});
    return;
  }

  const youtubeHosts = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);
  if (!youtubeHosts.has(location.hostname.toLowerCase())) return;
  let excludedHosts = new Set();
  let observer = null;
  let timer = null;
  let disposed = false;
  const clickedAt = new WeakMap();
  const restores = [];

  function active() {
    const host = location.hostname.toLowerCase();
    return !disposed && youtubeHosts.has(host) && !excludedHosts.has(host);
  }

  // Only player advertising fields are removed. Streaming URLs, audio tracks,
  // captions, playabilityStatus and videoDetails retain their original values.
  function cleanPlayer(value) {
    if (!active() || !value || typeof value !== 'object' || Array.isArray(value)) return value;
    let result = value;
    for (const field of ['playerAds', 'adPlacements', 'adSlots']) {
      if (Object.prototype.hasOwnProperty.call(result, field)) {
        if (result === value) result = Object.assign({}, value);
        delete result[field];
      }
    }
    if (value.playerResponse) {
      const player = cleanPlayer(value.playerResponse);
      if (player !== value.playerResponse) {
        if (result === value) result = Object.assign({}, value);
        result.playerResponse = player;
      }
    }
    return result;
  }

  function hookInitialPlayer() {
    const name = 'ytInitialPlayerResponse';
    const previous = Object.getOwnPropertyDescriptor(window, name);
    // Respect nonconfigurable properties and site-owned accessors.
    if (previous && (!previous.configurable || previous.get || previous.set || !previous.writable)) return;
    let value = previous ? previous.value : window[name];
    Object.defineProperty(window, name, {
      configurable: true,
      enumerable: previous ? previous.enumerable : true,
      get: () => cleanPlayer(value),
      set: (next) => { value = next; }
    });
    restores.push(() => {
      if (previous) Object.defineProperty(window, name, Object.assign({}, previous, { value }));
      else {
        delete window[name];
        if (value !== undefined) window[name] = value;
      }
    });
  }

  function playerRequest(input) {
    try {
      const url = new URL(typeof input === 'string' ? input : input.url || String(input), location.href);
      return url.origin === location.origin && /^\/youtubei\/v1\/(player|next)\/?$/.test(url.pathname);
    } catch (_) { return false; }
  }

  function hookFetch() {
    if (typeof window.fetch !== 'function' || typeof Response !== 'function') return;
    const original = window.fetch;
    const wrapped = async function () {
      const input = arguments[0];
      const response = await original.apply(this, arguments);
      if (!active() || !playerRequest(input) || !response.ok ||
          !/application\/json/i.test(response.headers.get('content-type') || '') ||
          (response.url && !playerRequest(response.url))) return response;
      try {
        const data = JSON.parse(await response.clone().text());
        const cleaned = cleanPlayer(data);
        if (data === cleaned) return response;
        const headers = new Headers(response.headers);
        headers.delete('content-length');
        headers.delete('content-encoding');
        const filtered = new Response(JSON.stringify(cleaned), {
          status: response.status, statusText: response.statusText, headers
        });
        for (const property of ['url', 'redirected', 'type']) {
          Object.defineProperty(filtered, property, { value: response[property] });
        }
        return filtered;
      } catch (_) {
        // Unexpected payloads and parsing errors leave the response untouched.
        return response;
      }
    };
    window.fetch = wrapped;
    restores.push(() => { if (window.fetch === wrapped) window.fetch = original; });
  }

  function hookXHR() {
    if (typeof XMLHttpRequest !== 'function') return;
    const prototype = XMLHttpRequest.prototype;
    const open = prototype.open;
    const requests = new WeakMap();
    const wrappedOpen = function (method, url) {
      const result = open.apply(this, arguments);
      requests.set(this, { player: playerRequest(url), raw: undefined, cleaned: undefined });
      return result;
    };
    prototype.open = wrappedOpen;
    restores.push(() => { if (prototype.open === wrappedOpen) prototype.open = open; });
    for (const property of ['responseText', 'response']) {
      const previous = Object.getOwnPropertyDescriptor(prototype, property);
      if (!previous || !previous.get || !previous.configurable) continue;
      const getter = function () {
        const raw = previous.get.call(this);
        const request = requests.get(this);
        if (!active() || !request || !request.player || this.readyState !== 4 ||
            this.status < 200 || this.status >= 300 ||
            (this.responseURL && !playerRequest(this.responseURL))) return raw;
        if (request.raw === raw) return request.cleaned;
        try {
          const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
          const cleaned = cleanPlayer(data);
          request.raw = raw;
          request.cleaned = cleaned === data ? raw :
            (typeof raw === 'string' ? JSON.stringify(cleaned) : cleaned);
          return request.cleaned;
        } catch (_) { return raw; }
      };
      Object.defineProperty(prototype, property, Object.assign({}, previous, { get: getter }));
      restores.push(() => {
        if (Object.getOwnPropertyDescriptor(prototype, property).get === getter) {
          Object.defineProperty(prototype, property, previous);
        }
      });
    }
  }

  function tick() {
    if (!active()) return;
    if (!observer && document.documentElement) {
      observer = new MutationObserver(tick);
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true,
        attributeFilter: ['class', 'disabled', 'hidden'] });
    }
    // Never seek, mute, change playbackRate or call play(). The native player
    // keeps control of audio, the user gesture and non-skippable ad playback.
    for (const player of document.querySelectorAll('.ad-showing, .ad-interrupting')) {
      const button = player.querySelector(
        '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, ' +
        '.ytm-ad-skip-button-container button, .ytp-ad-skip-button-container button'
      );
      if (!button || button.disabled || button.hidden || !button.getClientRects().length) continue;
      const now = Date.now();
      if (now - (clickedAt.get(button) || 0) < 1000) continue;
      clickedAt.set(button, now);
      button.click();
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (observer) observer.disconnect();
    if (timer !== null) clearInterval(timer);
    document.removeEventListener('yt-navigate-finish', tick);
    window.removeEventListener('pagehide', pageHidden);
    window.removeEventListener('pageshow', pageShown);
    for (const restore of restores.reverse()) restore();
    delete window[key];
  }

  function pageHidden(event) {
    if (!event.persisted) dispose();
  }
  function pageShown() { tick(); }

  function configure(options) {
    excludedHosts = new Set((options.unprotectedHosts || []).map(host => String(host).toLowerCase()));
    tick();
  }

  window[key] = { configure, dispose };
  configure(window.__patagoniaYouTubeConfig || {});
  hookInitialPlayer();
  hookFetch();
  hookXHR();
  document.addEventListener('yt-navigate-finish', tick);
  window.addEventListener('pagehide', pageHidden);
  window.addEventListener('pageshow', pageShown);
  timer = setInterval(tick, 300);
})();
