const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync('mobile/assets/youtube-protection.js', 'utf8');
function prepare(t, { url = 'https://m.youtube.com/watch?v=content', excluded = [], initial } = {}) {
  const dom = new JSDOM('<div id="player"><video controls></video></div>', { url, runScripts: 'outside-only' });
  const w = dom.window;
  const intervals = new Set();
  w.setInterval = fn => { intervals.add(fn); return fn; };
  w.clearInterval = fn => intervals.delete(fn);
  w.Response = Response;
  w.Headers = Headers;
  w.fetch = async () => new Response('{}', { headers: { 'content-type': 'application/json' } });
  w.__patagoniaYouTubeConfig = { unprotectedHosts: excluded };
  if (initial) w.ytInitialPlayerResponse = initial;
  const originalFetch = w.fetch;
  w.eval(source);
  t.after(() => { w.__patagoniaYouTubeProtection?.dispose(); w.close(); });
  return { w, intervals, originalFetch, tick: () => [...intervals].forEach(fn => fn()) };
}

function payload() {
  return { playerAds: [{ ad: true }], adPlacements: [1], adSlots: [2],
    streamingData: { adaptiveFormats: [{ url: 'https://r1.googlevideo.com/videoplayback', mimeType: 'audio/mp4' }] },
    videoDetails: { videoId: 'content' }, captions: { tracks: ['es'] }, playabilityStatus: { status: 'OK' } };
}

test('initial response loses only ad fields and preserves media objects', t => {
  const input = payload();
  const { w } = prepare(t, { initial: input });
  const cleaned = w.ytInitialPlayerResponse;
  for (const key of ['playerAds', 'adPlacements', 'adSlots']) assert.equal(key in cleaned, false);
  for (const key of ['streamingData', 'videoDetails', 'captions', 'playabilityStatus']) {
    assert.equal(cleaned[key], input[key]);
  }
  assert.ok(input.playerAds, 'the original is not mutated');
  w.ytInitialPlayerResponse = { playerResponse: payload(), continuation: 'next-video' };
  assert.equal(w.ytInitialPlayerResponse.playerResponse.playerAds, undefined);
  assert.equal(w.ytInitialPlayerResponse.continuation, 'next-video');
});

test('ad-free and frozen player responses remain usable', t => {
  const { w } = prepare(t);
  const clean = { streamingData: { formats: [1] } };
  w.ytInitialPlayerResponse = clean;
  assert.equal(w.ytInitialPlayerResponse, clean);
  w.ytInitialPlayerResponse = Object.freeze(payload());
  assert.equal(w.ytInitialPlayerResponse.playerAds, undefined);
});

test('site exception disables filtering and can be changed without another installation', t => {
  const input = payload();
  const { w, intervals } = prepare(t, { excluded: ['m.youtube.com'], initial: input });
  assert.equal(w.ytInitialPlayerResponse, input);
  w.__patagoniaYouTubeProtection.configure({ unprotectedHosts: [] });
  assert.equal(w.ytInitialPlayerResponse.playerAds, undefined);
  w.eval(source);
  assert.equal(intervals.size, 1);
  w.__patagoniaYouTubeProtection.configure({ unprotectedHosts: ['m.youtube.com'] });
  assert.equal(w.ytInitialPlayerResponse, input);
});

test('lookalike host receives no hooks', t => {
  const { w, intervals, originalFetch } = prepare(t, { url: 'https://youtube.com.attacker.invalid/' });
  assert.equal(w.__patagoniaYouTubeProtection, undefined);
  assert.equal(w.fetch, originalFetch);
  assert.equal(intervals.size, 0);
});

test('skip requires an active ad and a visible enabled skip button; media stays unchanged', t => {
  const { w, tick } = prepare(t);
  const player = w.document.getElementById('player');
  const video = player.querySelector('video');
  video.currentTime = 12;
  video.muted = false;
  video.volume = 0.7;
  video.playbackRate = 1;
  const button = w.document.createElement('button');
  button.className = 'ytp-ad-skip-button-modern';
  button.getClientRects = () => [1];
  let clicks = 0;
  button.onclick = () => { clicks++; };
  player.append(button);
  tick(); assert.equal(clicks, 0);
  player.className = 'ad-showing';
  button.disabled = true;
  tick(); assert.equal(clicks, 0);
  button.disabled = false;
  button.hidden = true;
  tick(); assert.equal(clicks, 0);
  button.hidden = false;
  tick(); tick(); assert.equal(clicks, 1);
  assert.equal(video.currentTime, 12);
  assert.equal(video.muted, false);
  assert.equal(video.volume, 0.7);
  assert.equal(video.playbackRate, 1);
  assert.equal(video.controls, true);
});

test('a delayed skip button after SPA navigation is handled without reinstallation', t => {
  const { w, tick, intervals } = prepare(t);
  w.history.pushState({}, '', '/watch?v=second');
  w.document.dispatchEvent(new w.Event('yt-navigate-finish'));
  const player = w.document.getElementById('player');
  player.className = 'ad-interrupting';
  const button = w.document.createElement('button');
  button.className = 'ytp-ad-skip-button';
  button.getClientRects = () => [1];
  let clicks = 0;
  button.onclick = () => { clicks++; };
  player.append(button);
  tick();
  assert.equal(clicks, 1);
  assert.equal(intervals.size, 1);
});

test('a non-skippable ad never causes seeking, autoplay or muting', t => {
  const { w, tick } = prepare(t);
  const player = w.document.getElementById('player');
  player.className = 'ad-showing';
  const video = player.querySelector('video');
  video.currentTime = 3;
  video.play = () => assert.fail('must preserve the user gesture');
  tick();
  assert.equal(video.currentTime, 3);
  assert.equal(video.muted, false);
});

test('fetch filters only player JSON and preserves status, headers and streaming URLs', async t => {
  const { w } = prepare(t);
  w.__patagoniaYouTubeProtection.dispose();
  const input = payload();
  let response;
  const calls = [];
  w.fetch = async (...args) => {
    calls.push(args);
    response = new Response(JSON.stringify(input), { status: 200,
      headers: { 'content-type': 'application/json', 'x-test': 'ok', 'content-length': '99' } });
    Object.defineProperty(response, 'url', { value: 'https://m.youtube.com/youtubei/v1/player' });
    return response;
  };
  w.eval(source);
  const options = { method: 'POST', body: 'request', headers: { 'x-auth': 'kept' } };
  const filtered = await w.fetch('/youtubei/v1/player?key=fixture', options);
  assert.equal(calls[0][1], options);
  const data = await filtered.json();
  assert.equal(data.playerAds, undefined);
  assert.deepEqual(data.streamingData, input.streamingData);
  assert.equal(filtered.status, 200);
  assert.equal(filtered.url, response.url);
  assert.equal(filtered.headers.get('x-test'), 'ok');
  assert.equal(filtered.headers.get('content-length'), null);
  const media = await w.fetch('https://r1.googlevideo.com/videoplayback');
  assert.equal(media, response);
  assert.ok((await media.json()).playerAds);
  const foreign = await w.fetch('https://other.invalid/youtubei/v1/player');
  assert.equal(foreign, response);
});

test('fetch errors, invalid JSON, non-JSON and partial media responses pass through', async t => {
  const { w } = prepare(t);
  for (const response of [
    new Response('invalid', { headers: { 'content-type': 'application/json' } }),
    new Response('media', { status: 206, headers: { 'content-type': 'video/mp4', 'content-range': 'bytes 0-4/5' } }),
    new Response('{}', { status: 403, headers: { 'content-type': 'application/json' } })
  ]) {
    w.__patagoniaYouTubeProtection.dispose();
    w.fetch = async () => response;
    w.eval(source);
    assert.equal(await w.fetch('/youtubei/v1/player'), response);
  }
  w.__patagoniaYouTubeProtection.dispose();
  const error = new Error('network');
  w.fetch = async () => { throw error; };
  w.eval(source);
  await assert.rejects(w.fetch('/youtubei/v1/player'), e => e === error);
});

test('XHR handles JSON/text, reuse and exceptions without consuming the original response', t => {
  const { w } = prepare(t);
  w.__patagoniaYouTubeProtection.dispose();
  class XHR {
    open(method, url) { this.responseURL = new URL(url, w.location.href).href; this.readyState = 1; }
    get responseText() { return this.body; }
    get response() { return this.body; }
  }
  w.XMLHttpRequest = XHR;
  w.eval(source);
  const xhr = new XHR();
  xhr.open('POST', '/youtubei/v1/player');
  xhr.status = 200;
  xhr.body = JSON.stringify(payload());
  assert.ok(JSON.parse(xhr.responseText).playerAds, 'partial response is untouched');
  xhr.readyState = 4;
  assert.equal(JSON.parse(xhr.responseText).playerAds, undefined);
  assert.equal(xhr.responseText, xhr.response, 'text getters agree');
  xhr.body = payload();
  assert.equal(xhr.response.playerAds, undefined);
  assert.equal(xhr.response, xhr.response, 'JSON result is cached');
  w.__patagoniaYouTubeProtection.configure({ unprotectedHosts: ['m.youtube.com'] });
  assert.equal(xhr.response, xhr.body);
  w.__patagoniaYouTubeProtection.configure({ unprotectedHosts: [] });
  xhr.open('GET', '/other'); xhr.readyState = 4;
  assert.equal(xhr.response, xhr.body);
});

test('dispose restores native APIs and releases timers', t => {
  const initial = payload();
  const { w, intervals, originalFetch } = prepare(t, { initial });
  w.__patagoniaYouTubeProtection.dispose();
  assert.equal(w.fetch, originalFetch);
  assert.equal(w.ytInitialPlayerResponse, initial);
  assert.equal(intervals.size, 0);
  assert.equal(w.__patagoniaYouTubeProtection, undefined);
});
