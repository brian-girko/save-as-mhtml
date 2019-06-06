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
  chrome.storage.local.get({
    filename: '[title]',
    extension: 'mhtml'
  }, prefs => {
    const filename = prefs.filename
      .replace(/\[title\]/g, tab.title)
      .replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/gi, '-');

    chrome.downloads.download({
      url,
      filename: filename + '.' + prefs.extension
    }, () => {
      URL.revokeObjectURL(url);
    });
  });
}));

// FAQs and Feedback
{
  const {onInstalled, setUninstallURL, getManifest} = chrome.runtime;
  const {name, version} = getManifest();
  const page = getManifest().homepage_url;
  onInstalled.addListener(({reason, previousVersion}) => {
    chrome.storage.local.get({
      'faqs': true,
      'last-update': 0
    }, prefs => {
      if (reason === 'install' || (prefs.faqs && reason === 'update')) {
        const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
        if (doUpdate && previousVersion !== version) {
          chrome.tabs.create({
            url: page + '?version=' + version +
              (previousVersion ? '&p=' + previousVersion : '') +
              '&type=' + reason,
            active: reason === 'install'
          });
          chrome.storage.local.set({'last-update': Date.now()});
        }
      }
    });
  });
  setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
}
