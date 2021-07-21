'use strict';

const notify = e => chrome.notifications.create({
  type: 'basic',
  iconUrl: '/data/icons/48.png',
  title: chrome.runtime.getManifest().name,
  message: e.message || e
});

chrome.action.onClicked.addListener(tab => {
  const args = new URLSearchParams();
  args.set('id', tab.id);
  args.set('href', tab.url);
  args.set('title', tab.title);


  chrome.windows.getCurrent(win => {
    const width = 500;
    const height = 300;

    chrome.windows.create({
      url: 'data/capture/index.html?' + args.toString(),
      type: 'popup',
      width,
      height,
      left: win.left + Math.round((win.width - width) / 2),
      top: win.top + Math.round((win.height - height) / 2)
    });
  });
});

{
  const startup = () => chrome.storage.local.get({
    meta: false,
    blob: true
  }, prefs => {
    chrome.contextMenus.create({
      id: 'edit-page',
      title: 'Toggle Edit Mode',
      contexts: ['action']
    });
    chrome.contextMenus.create({
      id: 'meta',
      title: 'Add Meta Data',
      contexts: ['action'],
      type: 'checkbox',
      checked: prefs.meta
    });
    chrome.contextMenus.create({
      id: 'blob',
      title: 'Replace "blob:" resources',
      contexts: ['action'],
      type: 'checkbox',
      checked: prefs.blob
    });
    chrome.contextMenus.create({
      id: 'simplify',
      title: 'Keep Selection Only',
      contexts: ['action']
    });
  });
  chrome.runtime.onInstalled.addListener(startup);
  chrome.runtime.onStartup.addListener(startup);
}
const onCommand = tab => {
  const next = async () => {
    try {
      const [{result}] = await chrome.scripting.executeScript({
        target: {tabId: tab.id},
        function() {
          const mode = document.designMode === 'off' ? 'on' : 'off';
          document.designMode = mode;
          return document.designMode;
        }
      });
      if (result === 'on') {
        chrome.scripting.executeScript({
          target: {tabId: tab.id},
          files: ['data/toolbar/inject.js']
        });
      }
      else {
        chrome.tabs.sendMessage(tab.id, {
          method: 'unload'
        });
      }
      chrome.action.setIcon({
        tabId: tab.id,
        path: {
          '16': 'data/icons/' + (result === 'on' ? 'active/' : '') + '16.png',
          '32': 'data/icons/' + (result === 'on' ? 'active/' : '') + '32.png',
          '48': 'data/icons/' + (result === 'on' ? 'active/' : '') + '48.png'
        }
      });
    }
    catch (e) {
      notify(e);
    }
  };
  try {
    chrome.permissions.request({
      permissions: ['scripting']
    }, () => next());
  }
  catch (e) {
    next();
  }
};
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'edit-page') {
    onCommand(tab);
  }
  else if (info.menuItemId === 'simplify') {
    chrome.permissions.request({
      permissions: ['scripting']
    }, () => {
      chrome.scripting.executeScript({
        target: {
          tabId: tab.id
        },
        files: ['data/simple.js']
      });
    });
  }
  else if (info.menuItemId === 'meta') {
    chrome.permissions.request({
      permissions: ['scripting']
    }, granted => {
      if (granted) {
        chrome.storage.local.set({
          [info.menuItemId]: info.checked
        });
      }
      else {
        chrome.contextMenus.update(info.menuItemId, {
          checked: false
        });
      }
    });
  }
  else if (info.menuItemId === 'blob') {
    chrome.storage.local.set({
      [info.menuItemId]: info.checked
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
  else if (request.method === 'notify') {
    notify(request.message);
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
