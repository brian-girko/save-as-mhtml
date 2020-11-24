'use strict';

// if (typeof chrome.pageCapture === 'undefined') {
var cache = {};
if (true) {
  chrome.pageCapture = {};
  chrome.pageCapture.saveAsMHTML = ({tabId}, callback) => {
    cache[tabId] = [];
    cache[tabId].callback = callback;

    chrome.tabs.executeScript(tabId, {
      runAt: 'document_start',
      allFrames: true,
      code: `{
        const i2d = i => new Promise((resolve, reject) => {
          const canvas = document.createElement('canvas');
          canvas.width = i.naturalWidth;
          canvas.height = i.naturalHeight;
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            canvas.getContext('2d').drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          };
          img.onerror = reject;
          img.src = i.src;
        });
        const l2d = link => new Promise((resolve, reject) => {
          const r = new XMLHttpRequest();
          r.open('GET', link.href);
          r.onload = () => {
            resolve({
              content: r.responseText,
              mime: r.getResponseHeader('Content-Type')
            });
          };
          r.onerror = r.timeout = reject;
          r.send();
        });
        const post = obj => new Promise(resolve => chrome.runtime.sendMessage(obj, resolve));

        (async (imgs, links) => {
          for (const img of imgs) {
            if (img.src && (img.src.startsWith('http') || img.src.startsWith('//'))) {
              try {
                await post({
                  method: 'data',
                  value: await i2d(img),
                  src: img.src
                });
              }
              catch (e) {}
            }
          }
          for (const link of links) {
            if (link.src && (link.href.startsWith('http') || link.href.startsWith('//'))) {
              try {
                const {mime, content} = await l2d(link);
                await post({
                  method: 'data',
                  value: 'data:' + mime + ';base64,' + btoa(content),
                  src: img.src
                });
              }
              catch (e) {}
            }
          }
          if (window === window.top) {
            post({
              method: 'body',
              content: document.documentElement.outerHTML,
              location: location.href,
              title: document.title
            })
          }
        })([...document.images], [...document.querySelectorAll('link[rel="stylesheet"]')]);
      }`
    });
  };
}

chrome.runtime.onMessage.addListener((request, sender, response) => {
  console.log(request);
  if (request.method === 'data') {
    cache[sender.tab.id].push(request);
    response(true);
  }
  else if (request.method === 'body') {
    const boundary = `----MultipartBoundary--${Math.random().toString(36).substring(7)}----`;
    const d = (new Date()).toString();
    const content = [`From: <Saved by Save as MHTML extension>
Snapshot-Content-Location: ${request.location}
Subject: ${request.title}
Date: ${d}
MIME-Version: 1.0
Content-Type: multipart/related;
\ttype="text/html";
\tboundary="${boundary}"


`, `
Content-Type: text/html
Content-ID: <frame-897C6B74266BA083B50FBB43113D7C90@mhtml.blink>
Content-Location: ${request.location}

${request.content}
`, ...cache[sender.tab.id].map(r => {
      const [mime, uri] = r.value.split(',');
      return `
Content-Type: ${mime.split(';')[0].replace('data:', '')}
Content-Transfer-Encoding: base64
Content-Location: ${r.src}

${uri}
`;
    })].join('--' + boundary) + '\n--' + boundary + '--\n';
    cache[sender.tab.id].callback(new Blob([content.replace(/\n/g, '\r\n')], {
      type: 'text/mhtml'
    }));
    delete cache[sender.tab.id];
  }
});
