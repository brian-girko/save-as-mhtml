'use strict';

const toast = document.getElementById('toast');

chrome.storage.local.get({
  'notify': true,
  'saveAs': false,
  'filename': '[[simplified-hostname]] [YYYY].[MM].[DD]—[title]',
  'extension': 'mht',
  'mime': 'application/x-mimearchive'
}, prefs => {
  document.getElementById('notify').checked = prefs.notify;
  document.getElementById('saveAs').checked = prefs.saveAs;
  document.getElementById('filename').value = prefs.filename;
  document.getElementById('extension').value = prefs.extension;
  document.getElementById('mime').value = prefs.mime;
});

document.getElementById('save').addEventListener('click', () => chrome.storage.local.set({
  'notify': document.getElementById('notify').checked,
  'saveAs': document.getElementById('saveAs').checked,
  'filename': document.getElementById('filename').value || '[[hostname]] [YYYY].[MM].[DD]—[title]',
  'extension': document.getElementById('extension').value || 'mht',
  'mime': document.getElementById('mime').value || 'application/x-mimearchive'
}, () => {
  toast.textContent = 'Options Saved.';
  window.setTimeout(() => toast.textContent = '', 750);
}));
// reset
document.getElementById('reset').addEventListener('click', e => {
  if (e.detail === 1) {
    toast.textContent = 'Double-click to reset!';
    window.setTimeout(() => toast.textContent = '', 750);
  }
  else {
    localStorage.clear();
    chrome.storage.local.clear(() => {
      chrome.runtime.reload();
      window.close();
    });
  }
});
// support
document.getElementById('support').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '?rd=donate'
}));
// usage
document.getElementById('usage').addEventListener('click', () => chrome.tabs.create({
  url: 'https://www.youtube.com/watch?v=vRM5h4roY7o'
}));
// links
for (const a of [...document.querySelectorAll('[data-href]')]) {
  if (a.hasAttribute('href') === false) {
    a.href = chrome.runtime.getManifest().homepage_url + '#' + a.dataset.href;
  }
}
