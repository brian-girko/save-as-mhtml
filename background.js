'use strict';

chrome.browserAction.onClicked.addListener(tab => chrome.pageCapture.saveAsMHTML({
  tabId: tab.id
}, bin => {
  const lastError = chrome.runtime.lastError;
  if (lastError) {
    return chrome.notifications.create(null, {
      type: 'basic',
      iconUrl: '/data/icons/48.png',
      title: chrome.runtime.getManifest().name,
      message: lastError.message
    });
  }
  const url = URL.createObjectURL(bin);
  chrome.downloads.download({
    url,
    filename: 'a.mhtml'
  }, () => {
    URL.revokeObjectURL(url);
  });
}));
