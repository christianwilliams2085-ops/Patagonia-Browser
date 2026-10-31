// Development check: node --test test/youtube-protection.test.cjs (requires jsdom).
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(
  path.join(__dirname, '../assets/youtube-protection.js'),
  'utf8'
);

function page(url = 'https://m.youtube.com/watch?v=live') {
  const dom = new JSDOM(`<!doctype html><head></head><body>
    <ytm-rich-item-renderer id="organic">Video solicitado</ytm-rich-item-renderer>
    <ytm-ad-slot-renderer id="sponsored">Publicidad</ytm-ad-slot-renderer>
    <div class="html5-video-player" id="movie_player">
      <video></video>
    </div></body>`, {
    url,
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const { document } = dom.window;
  const player = document.querySelector('#movie_player');
  const video = document.querySelector('video');
  visible(player);
  visible(video);
  return { dom, window: dom.window, document, player, video };
}

function visible(element) {
  element.getClientRects = () => [{ width: 80, height: 30 }];
  return element;
}

function skipButton(p, { text = 'Saltar', className = '', tag = 'div' } = {}) {
  const button = p.document.createElement(tag);
  button.setAttribute('role', 'button');
  button.className = className;
  button.textContent = text;
  visible(button);
  p.player.appendChild(button);
  return button;
}

function responsePayload() {
  return {
    adPlacements: [{ adPlacementRenderer: { id: 'pre-roll' } }],
    adSlots: [{ id: 'slot-1' }],
    playerAds: [{ id: 'legacy-ad' }],
    playerResponse: {
      adPlacements: [{ id: 'nested-ad' }],
      videoDetails: { videoId: 'requested', title: 'Video elegido' },
      streamingData: { formats: [{ itag: 18 }] }
    },
    playabilityStatus: { status: 'OK' }
  };
}

function assertSanitized(payload) {
  assert.equal(payload.adPlacements, undefined);
  assert.equal(payload.adSlots, undefined);
  assert.equal(payload.playerAds, undefined);
  assert.equal(payload.playerResponse.adPlacements, undefined);
  assert.equal(payload.playerResponse.videoDetails.videoId, 'requested');
  assert.equal(payload.playerResponse.streamingData.formats[0].itag, 18);
  assert.equal(payload.playabilityStatus.status, 'OK');
}

const wait = (milliseconds = 280) =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

test('elimina anuncios del valor inicial antes de crear el reproductor', () => {
  const p = page();
  try {
    p.window.eval(source);
    p.window.eval(
      'var ytInitialPlayerResponse = ' +
      JSON.stringify(responsePayload()) +
      ';'
    );
    assertSanitized(p.window.ytInitialPlayerResponse);
  } finally { p.dom.window.close(); }
});

test('limpia respuestas analizadas con JSON.parse y conserva el video solicitado', () => {
  const p = page();
  try {
    p.window.eval(source);
    const result = p.window.JSON.parse(JSON.stringify(responsePayload()));
    assertSanitized(result);
  } finally { p.dom.window.close(); }
});

test('limpia fetch JSON de /youtubei/v1/player antes de entregarlo a YouTube', async () => {
  const p = page();
  const response = () => ({
    url: 'https://m.youtube.com/youtubei/v1/player?key=test',
    json: async () => responsePayload(),
    text: async () => JSON.stringify(responsePayload()),
    clone: () => response()
  });
  p.window.fetch = async () => response();
  try {
    p.window.eval(source);
    const response = await p.window.fetch(
      'https://m.youtube.com/youtubei/v1/player?key=test'
    );
    assertSanitized(await response.json());
    const text = await response.text();
    assert.equal(text.includes('"adPlacements"'), false);
    assertSanitized(JSON.parse(text));
    assertSanitized(await response.clone().json());
  } finally { p.dom.window.close(); }
});

test('no modifica una respuesta fetch que no pertenece al reproductor', async () => {
  const p = page();
  p.window.fetch = async () => ({
    url: 'https://m.youtube.com/youtubei/v1/browse',
    json: async () => responsePayload()
  });
  try {
    p.window.eval(source);
    const response = await p.window.fetch(
      'https://m.youtube.com/youtubei/v1/browse'
    );
    const result = await response.json();
    assert.ok(result.adPlacements);
  } finally { p.dom.window.close(); }
});

test('limpia respuestas XHR del reproductor', () => {
  const p = page();
  class FakeXHR {
    constructor() {
      this.responseType = '';
      this.payload = '';
    }
    open(method, url) {
      this.method = method;
      this.url = url;
    }
    get responseText() {
      return this.payload;
    }
    get response() {
      return this.responseType === 'json'
        ? this.payload
        : this.payload;
    }
  }
  p.window.XMLHttpRequest = FakeXHR;
  try {
    p.window.eval(source);
    const textRequest = new p.window.XMLHttpRequest();
    textRequest.open(
      'POST',
      'https://m.youtube.com/youtubei/v1/player?key=test'
    );
    textRequest.payload = JSON.stringify(responsePayload());
    assert.equal(textRequest.responseText.includes('"adPlacements"'), false);

    const jsonRequest = new p.window.XMLHttpRequest();
    jsonRequest.responseType = 'json';
    jsonRequest.open(
      'POST',
      'https://m.youtube.com/youtubei/v1/player?key=test'
    );
    jsonRequest.payload = responsePayload();
    assertSanitized(jsonRequest.response);
  } finally { p.dom.window.close(); }
});

test('salta un anuncio SSAP aun sin clase, cartel ni boton visible', async () => {
  const p = page();
  let destination = null;
  p.player.getStatsForNerds = () => ({ debug_info: 'SSAP, AD, pre-roll' });
  p.player.getProgressState = () => ({ current: 2, duration: 21 });
  p.player.getPlayerResponse = () => responsePayload();
  p.player.seekTo = (seconds) => { destination = seconds; };
  try {
    p.window.eval(source);
    await wait(60);
    assert.equal(destination, 21);
    assert.equal(p.video.currentTime, 0);
    assert.equal(p.video.playbackRate, 1);
  } finally { p.dom.window.close(); }
});

test('oculta publicidad del feed y conserva publicaciones normales y video', () => {
  const p = page();
  try {
    p.window.eval(source);
    assert.equal(
      p.window.getComputedStyle(p.document.querySelector('#sponsored')).display,
      'none'
    );
    assert.notEqual(
      p.window.getComputedStyle(p.document.querySelector('#organic')).display,
      'none'
    );
    assert.notEqual(p.window.getComputedStyle(p.player).display, 'none');
    assert.notEqual(p.window.getComputedStyle(p.video).display, 'none');
  } finally { p.dom.window.close(); }
});

test('reconoce Saltar aunque el control no tenga clase de anuncio', async () => {
  const p = page();
  const button = skipButton(p);
  let clicks = 0;
  button.onclick = () => clicks++;
  try {
    p.window.eval(source);
    await wait(60);
    assert.equal(clicks, 1);
    await wait();
    assert.equal(clicks, 1);
  } finally { p.dom.window.close(); }
});

test('reconoce accesibilidad, idiomas y Shadow DOM', async () => {
  for (const text of ['Omitir anuncio', 'Skip ad', 'Pular anúncio']) {
    const p = page();
    const host = p.document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const button = p.document.createElement('button');
    button.setAttribute('aria-label', text);
    visible(button);
    shadow.appendChild(button);
    p.player.appendChild(host);
    let clicks = 0;
    button.onclick = () => clicks++;
    try {
      p.window.eval(source);
      await wait(60);
      assert.equal(clicks, 1, text);
    } finally { p.dom.window.close(); }
  }
});

test('adelanta un anuncio DOM no omitible y restaura silencio y velocidad', async () => {
  const p = page();
  Object.defineProperty(p.video, 'duration', {
    configurable: true,
    value: 15
  });
  p.video.currentTime = 2;
  p.video.muted = false;
  p.video.playbackRate = 1;
  p.player.classList.add('ad-showing');
  try {
    p.window.eval(source);
    await wait(60);
    assert.ok(p.video.currentTime >= 14.9);
    assert.equal(p.video.muted, true);
    assert.equal(p.video.playbackRate, 16);
    p.player.classList.remove('ad-showing');
    await wait(850);
    assert.equal(p.video.muted, false);
    assert.equal(p.video.playbackRate, 1);
  } finally { p.dom.window.close(); }
});

test('mantiene intacto el video normal y un boton ajeno', async () => {
  const p = page();
  const unrelated = skipButton(p, {
    text: 'Saltar al capítulo siguiente'
  });
  let clicks = 0;
  unrelated.onclick = () => clicks++;
  p.video.currentTime = 37;
  p.video.muted = false;
  p.video.playbackRate = 1;
  try {
    p.window.eval(source);
    await wait();
    assert.equal(clicks, 0);
    assert.equal(p.video.currentTime, 37);
    assert.equal(p.video.muted, false);
    assert.equal(p.video.playbackRate, 1);
  } finally { p.dom.window.close(); }
});

test('usa proxies reversibles y no reemplaza play del medio', () => {
  const p = page();
  const originalParse = p.window.JSON.parse;
  const originalOpen = p.window.XMLHttpRequest.prototype.open;
  const originalPlay = p.window.HTMLMediaElement.prototype.play;
  try {
    p.window.eval(source);
    assert.notEqual(p.window.JSON.parse, originalParse);
    assert.notEqual(p.window.XMLHttpRequest.prototype.open, originalOpen);
    assert.equal(p.window.HTMLMediaElement.prototype.play, originalPlay);
    assert.match(
      p.window.Function.prototype.toString.call(p.window.JSON.parse),
      /\[native code\]/
    );
    p.window.__patagoniaYoutubeAdsV3.stop();
    assert.equal(p.window.JSON.parse, originalParse);
    assert.equal(p.window.XMLHttpRequest.prototype.open, originalOpen);
    assert.equal(p.window.HTMLMediaElement.prototype.play, originalPlay);
  } finally { p.dom.window.close(); }
});

test('se instala una sola vez y reemplaza la revision anterior', () => {
  const p = page();
  let oldStopped = 0;
  p.window.__patagoniaYoutubeAdsV2 = {
    stop() {
      oldStopped++;
      delete p.window.__patagoniaYoutubeAdsV2;
    }
  };
  try {
    p.window.eval(source);
    const installed = p.window.__patagoniaYoutubeAdsV3;
    assert.equal(oldStopped, 1);
    for (let index = 0; index < 20; index++) p.window.eval(source);
    assert.equal(p.window.__patagoniaYoutubeAdsV3, installed);
    assert.equal(
      p.document.querySelectorAll('#patagonia-youtube-ad-style').length,
      1
    );
  } finally { p.dom.window.close(); }
});

test('no se instala fuera de un dominio real de YouTube', () => {
  for (const host of [
    'chatgpt.com',
    'youtube.com.example.org',
    'notyoutube.com'
  ]) {
    const p = page(`https://${host}/`);
    const originalParse = p.window.JSON.parse;
    try {
      p.window.eval(source);
      assert.equal(p.window.__patagoniaYoutubeAdsV3, undefined);
      assert.equal(p.window.JSON.parse, originalParse);
      assert.equal(p.document.querySelectorAll('style').length, 0);
    } finally { p.dom.window.close(); }
  }
});
