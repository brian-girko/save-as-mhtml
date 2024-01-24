'use strict';

const toast = document.getElementById('toast');

chrome.storage.local.get({
  'notify': true,
  'saveAs': false,
  'method': 'background',
  'filename': '[[simplified-hostname]] [YYYY].[MM].[DD]—[title]',
  'extension': 'mht',
  'mime': 'application/x-mimearchive',
  'title-length': 150,
  'filename-length': 250,
  'save-cm': true,
  'edit-cm': false,
  'reader-cm': false,
  'simple-cm': false,
  'custom-styling': `body {
  font-size: 14px;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif;
  color: #666
  background-color: #fff;
  width: min(100% - 2rem, 70rem);
  margin-inline: auto;
}`
}, prefs => {
  document.getElementById('save-cm').checked = prefs['save-cm'];
  document.getElementById('edit-cm').checked = prefs['edit-cm'];
  document.getElementById('reader-cm').checked = prefs['reader-cm'];
  document.getElementById('simple-cm').checked = prefs['simple-cm'];
  document.getElementById('notify').checked = prefs.notify;
  document.getElementById('saveAs').checked = prefs.saveAs;
  document.getElementById('capture').checked = prefs.method !== 'background';
  document.getElementById('filename').value = prefs.filename;
  document.getElementById('extension').value = prefs.extension;
  document.getElementById('mime').value = prefs.mime;
  document.getElementById('title-length').value = prefs['title-length'];
  document.getElementById('filename-length').value = prefs['filename-length'];
  document.getElementById('custom-styling').value = prefs['custom-styling'];
});

document.getElementById('save').addEventListener('click', () => chrome.storage.local.set({
  'save-cm': document.getElementById('save-cm').checked,
  'edit-cm': document.getElementById('edit-cm').checked,
  'reader-cm': document.getElementById('reader-cm').checked,
  'simple-cm': document.getElementById('simple-cm').checked,
  'notify': document.getElementById('notify').checked,
  'saveAs': document.getElementById('saveAs').checked,
  'method': document.getElementById('capture').checked ? 'foreground' : 'background',
  'filename': document.getElementById('filename').value || '[[hostname]] [YYYY].[MM].[DD]—[title]',
  'extension': document.getElementById('extension').value || 'mht',
  'mime': document.getElementById('mime').value || 'application/x-mimearchive',
  'title-length': Number(document.getElementById('title-length').value),
  'filename-length': Number(document.getElementById('filename-length').value),
  'custom-styling': document.getElementById('custom-styling').value
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
