'use strict';

chrome.browserAction.onClicked.addListener(tab => chrome.pageCapture.saveAsMHTML({
  tabId: tab.id
}, bin => {
  const blob = new Blob([bin], {
    type: 'plain/mhtml'
  });
  chrome.storage.local.get({
    'notify': true,
    'saveAs': false,
    'filename': '[title]',
    'extension': 'mhtml'
  }, prefs => {
    const lastError = chrome.runtime.lastError;
    if (lastError) {
      return prefs.notify && chrome.notifications.create(null, {
        type: 'basic',
        iconUrl: '/data/icons/48.png',
        title: chrome.runtime.getManifest().name,
        message: lastError.message
      });
    }
    const url = URL.createObjectURL(blob);
    const current = new Date();
    const filename = prefs.filename
      .replace('[title]', tab.title)
      .replace('[date]', current.toLocaleDateString())
      .replace('[current-date]', current.toLocaleDateString())
      .replace('[time]', current.toLocaleTimeString())
      .replace('[current-time]', current.toLocaleTimeString())
      .replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/gi, '-') + '.' + prefs.extension;

    chrome.downloads.download({
      url,
      saveAs: prefs.saveAs,
      filename
    }, () => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        chrome.downloads.download({
          url,
          saveAs: prefs.saveAs
        }, () => URL.revokeObjectURL(url));
      }
      else {
        URL.revokeObjectURL(url);
      }
    });
  });
}));

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install'
            });
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
