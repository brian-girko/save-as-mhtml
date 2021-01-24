'use strict';

const notify = e => chrome.notifications.create({
  type: 'basic',
  iconUrl: '/data/icons/48.png',
  title: chrome.runtime.getManifest().name,
  message: e.message || e
});

chrome.browserAction.onClicked.addListener(tab => chrome.storage.local.get({
  'meta': false,
  'notify': true,
  'saveAs': false,
  'filename': '',
  'extension': 'mht',
  'mime': 'application/x-mimearchive',
  'hint': true
}, prefs => {
  const next = callback => chrome.pageCapture.saveAsMHTML({
    tabId: tab.id
  }, bin => {
    const blob = new Blob([bin], {
      type: prefs.mime
    });
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
    const n = new URL(tab.url);
    const url = URL.createObjectURL(blob);
    const current = new Date();
    let filename = (prefs.filename || '[[hostname]] [YYYY].[MM].[DD]—[title]')
      .replace('[title]', tab.title)
      .replace('[hostname]', n.hostname)
      .replace('[simplified-hostname]', n.hostname.replace('www.', ''))
      .replace('[date]', current.toDateString())
      .replace('[current-date]', current.toLocaleDateString())
      .replace('[time]', current.toTimeString())
      .replace('[current-time]', current.toLocaleTimeString())
      .replace('[YYYY]', current.getFullYear())
      .replace('[MM]', ('0' + (current.getMonth() + 1)).substr(-2))
      .replace('[DD]', ('0' + current.getDate()).substr(-2))
      .replace(/[\\/]/gi, '-') + '.' + prefs.extension;

    console.log(filename);
    chrome.downloads.download({
      url,
      saveAs: prefs.saveAs,
      filename
    }, () => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        console.warn('filename issue', filename);
        filename = filename.substr(0, filename.length - prefs.extension.length - 1).replace(/[*?"<>|:]/gi, '-') +
          '.' + prefs.extension;

        chrome.downloads.download({
          url,
          saveAs: prefs.saveAs,
          filename
        }, () => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            console.warn('filename issue', filename);
            chrome.downloads.download({
              url,
              saveAs: prefs.saveAs,
              filename: 'page.mhtml'
            }, () => {
              URL.revokeObjectURL(url);
              callback();
            });
          }
          else {
            URL.revokeObjectURL(url);
            callback();
          }
        });
      }
      else {
        URL.revokeObjectURL(url);
        callback();
      }
    });
  });
  if (prefs.meta) {
    chrome.tabs.executeScript({
      file: 'data/meta.js',
      runAt: 'document_start'
    }, () => {
      setTimeout(() => {
        next(() => chrome.tabs.executeScript({
          code: `[...document.querySelectorAll('.save-as-mhtml')].forEach(f => f.remove());`,
          runAt: 'document_start'
        }));
      }, 0);
    });
  }
  else {
    next(() => {});
  }
}));

{
  const startup = () => chrome.storage.local.get({
    meta: false
  }, prefs => {
    chrome.contextMenus.create({
      id: 'edit-page',
      title: 'Toggle Edit Mode',
      contexts: ['browser_action']
    });
    chrome.contextMenus.create({
      id: 'meta',
      title: 'Add Meta Data',
      contexts: ['browser_action'],
      type: 'checkbox',
      checked: prefs.meta
    });
    chrome.contextMenus.create({
      id: 'simplify',
      title: 'Keep Selection Only',
      contexts: ['browser_action']
    });
  });
  chrome.runtime.onInstalled.addListener(startup);
  chrome.runtime.onStartup.addListener(startup);
}
const onCommand = tab => {
  chrome.tabs.executeScript({
    runAt: 'document_start',
    code: `document.designMode`
  }, arr => {
    const lastError = chrome.runtime.lastError;
    if (lastError) {
      return notify(lastError);
    }
    const mode = arr[0] === 'off' ? 'on' : 'off';
    chrome.tabs.executeScript({
      allFrames: true,
      runAt: 'document_start',
      code: `
        document.designMode = '${mode}';
      `
    }, () => {
      if (mode === 'on') {
        chrome.tabs.executeScript({
          file: 'data/toolbar/inject.js',
          runAt: 'document_start'
        });
      }
      else {
        chrome.tabs.sendMessage(tab.id, {
          method: 'unload'
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
};
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'edit-page') {
    onCommand(tab);
  }
  else if (info.menuItemId === 'simplify') {
    chrome.tabs.executeScript({
      file: 'data/simple.js',
      runAt: 'document_start'
    });
  }
  else if (info.menuItemId === 'meta') {
    chrome.storage.local.set({
      meta: info.checked
    });
  }
});
chrome.runtime.onMessage.addListener((request, sender, response) => {
  if (request.method === 'close-me') {
    onCommand(sender.tab);
  }
  else if (request.method === 'introduce') {
    response({
      title: sender.tab.title,
      href: sender.tab.url
    });
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
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
