'use strict';

const notify = e => chrome.notifications.create({
  type: 'basic',
  iconUrl: '/data/icons/48.png',
  title: chrome.runtime.getManifest().name,
  message: e.message || e
});

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
    'extension': 'mhtml',
    'hint': true
  }, prefs => {
    const lastError = chrome.runtime.lastError;
    if (lastError) {
      return prefs.notify && notify(lastError);
    }
    if (prefs.hint) {
      notify('You can edit the page before saving as MHTML. To open the editor use right-click contet menu of the toolbar button');
      chrome.storage.local.set({
        'hint': false
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

{
  const startup = () => {
    chrome.contextMenus.create({
      id: 'edit-page',
      title: 'Toggle Edit Mode',
      contexts: ['browser_action']
    });
  };
  chrome.runtime.onInstalled.addListener(startup);
  chrome.runtime.onStartup.addListener(startup);
}
const onCommand = (info, tab) => {
  chrome.tabs.executeScript({
    runAt: 'document_start',
    code: `document.designMode`
  }, arr => {
    const lastError = chrome.runtime.lastError;
    if (lastError) {
      return notify(lastError);
    }
    chrome.storage.local.get({
      'notify': true
    }, prefs => {
      const mode = arr[0] === 'off' ? 'on' : 'off';
      chrome.tabs.executeScript({
        allFrames: true,
        runAt: 'document_start',
        code: `
          document.designMode = '${mode}';
        `
      }, () => {
        if (prefs.notify && mode === 'on') {
          chrome.tabs.executeScript({
            file: 'data/toolbar/inject.js',
            runAt: 'document_start'
          });
        }
      });
      chrome.browserAction.setIcon({
        tabId: tab.id,
        path: {
          '16': 'data/icons/' + (mode === 'on' ? 'active/' : '') + '16.png',
          '19': 'data/icons/' + (mode === 'on' ? 'active/' : '') + '19.png',
          '32': 'data/icons/' + (mode === 'on' ? 'active/' : '') + '32.png',
          '38': 'data/icons/' + (mode === 'on' ? 'active/' : '') + '38.png',
          '48': 'data/icons/' + (mode === 'on' ? 'active/' : '') + '48.png'
        }
      });
    });
  });
};
chrome.contextMenus.onClicked.addListener(onCommand);
chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.method === 'close-me') {
    onCommand({}, sender.tab);
  }
});

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
