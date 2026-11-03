'use strict';
// Solo responde cuando Patagonia lo pide (al abrir Patagonia AI). El texto queda en el teléfono.
(() => {
  let port;
  try {
    port = browser.runtime.connectNative('patagonia');
  } catch (_) {
    return;
  }
  port.onMessage.addListener((message) => {
    if (!message || message.type !== 'read') return;
    const body = document.body;
    port.postMessage({
      id: message.id,
      title: document.title || '',
      url: location.href || '',
      text: ((body && body.innerText) || '').slice(0, 30000),
    });
  });
})();
