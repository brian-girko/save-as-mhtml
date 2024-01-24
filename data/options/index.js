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
  'save-cm': false,
  'edit-cm': false
}, prefs => {
  document.getElementById('save-cm').checked = prefs['save-cm'];
  document.getElementById('edit-cm').checked = prefs['edit-cm'];
  document.getElementById('notify').checked = prefs.notify;
  document.getElementById('saveAs').checked = prefs.saveAs;
  document.getElementById('capture').checked = prefs.method !== 'background';
  document.getElementById('filename').value = prefs.filename;
  document.getElementById('extension').value = prefs.extension;
  document.getElementById('mime').value = prefs.mime;
  document.getElementById('title-length').value = prefs['title-length'];
  document.getElementById('filename-length').value = prefs['filename-length'];
});

document.getElementById('save').addEventListener('click', () => chrome.storage.local.set({
  'save-cm': document.getElementById('save-cm').checked,
  'edit-cm': document.getElementById('edit-cm').checked,
  'notify': document.getElementById('notify').checked,
  'saveAs': document.getElementById('saveAs').checked,
  'method': document.getElementById('capture').checked ? 'foreground' : 'background',
  'filename': document.getElementById('filename').value || '[[hostname]] [YYYY].[MM].[DD]—[title]',
  'extension': document.getElementById('extension').value || 'mht',
  'mime': document.getElementById('mime').value || 'application/x-mimearchive',
  'title-length': Number(document.getElementById('title-length').value),
  'filename-length': Number(document.getElementById('filename-length').value)
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
