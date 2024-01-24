'use strict';

const notify = e => chrome.notifications.create({
  type: 'basic',
  iconUrl: '/data/icons/48.png',
  title: chrome.runtime.getManifest().name,
  message: e.message || e
});

const download = ({url, prefs, filename}, done) => {
  chrome.downloads.download({
    url,
    saveAs: prefs.saveAs,
    filename
  }, id => {
    const lastError = chrome.runtime.lastError;

    if (lastError) {
      console.warn('filename issue', filename);
      filename = filename.substr(0, filename.length - prefs.extension.length - 1)
        .substr(0, 254)
        .replace(/[*?"<>|:~]/gi, '-') + '.' + prefs.extension;

      chrome.downloads.download({
        url,
        saveAs: prefs.saveAs,
        filename
      }, id => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          console.warn('filename issue', filename);
          chrome.downloads.download({
            url,
            saveAs: prefs.saveAs,
            filename: 'page.mhtml'
          }, done);
        }
        else {
          done(id);
        }
      });
    }
    else {
      done(id);
    }
  });
};

const onClicked = tab => {
  chrome.storage.local.get({
    'method': 'background',
    'blob': true,
    'meta': false,
    'notify': true,
    'saveAs': false,
    'filename': '',
    'extension': 'mht',
    'mime': 'application/x-mimearchive',
    'hint': true,
    'title-length': 150,
    'filename-length': 250
  }, prefs => {
    const next = (callback = () => {}) => chrome.pageCapture.saveAsMHTML({
      tabId: tab.id
    }, async bin => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        return prefs.notify && notify(lastError);
      }

      if (prefs.hint) {
        notify('You can edit the page before saving as MHTML. To open the editor use right-click context menu of the toolbar button');
        notify('If the result misses an image, scroll to the end of the page and retry!');
        chrome.storage.local.set({
          'hint': false
        });
      }

      try {
        if (prefs.method !== 'background') {
          throw Error('user abort');
        }

        let content = (await bin.text());

        // remove blob references
        if (prefs.blob) {
          content.replace(/Content-Location: (blob:https?:\/\/[^\s]+)/g, (a, href) => {
            const r = new RegExp(href.split('').join('(=\\r\\n)?'), 'g');
            content = content.replace(r, href.replace('blob:', 'cid:blob.'));
          });
        }

        const n = new URL(tab.url);
        const current = new Date();
        let filename = (prefs.filename || '[[simplified-hostname]] [YYYY].[MM].[DD]—[title]')
          .replace('[title]', tab.title.substr(0, prefs['title-length']))
          .replace('[hostname]', n.hostname)
          .replace('[simplified-hostname]', n.hostname.replace('www.', ''))
          .replace('[date]', current.toDateString())
          .replace('[current-date]', current.toLocaleDateString())
          .replace('[time]', current.toTimeString())
          .replace('[current-time]', current.toLocaleTimeString())
          .replace('[YYYY]', current.getFullYear())
          .replace('[MM]', ('0' + (current.getMonth() + 1)).substr(-2))
          .replace('[DD]', ('0' + current.getDate()).substr(-2))
          .replace(/[\\/]/gi, '-');
        filename = filename.substr(0, prefs['filename-length']) + '.' + prefs.extension;

        const url = 'data:' + prefs.mime + ';base64,' + btoa(content);
        download({url, prefs, filename}, callback);
      }
      catch (e) {
        console.warn(e);

        const args = new URLSearchParams();
        args.set('id', tab.id);
        args.set('href', tab.url);
        args.set('title', tab.title);

        chrome.windows.getCurrent(win => {
          const width = 400;
          const height = 300;

          chrome.windows.create({
            url: '/data/capture/index.html?' + args.toString(),
            type: 'popup',
            width,
            height,
            left: win.left + Math.round((win.width - width) / 2),
            top: win.top + Math.round((win.height - height) / 2)
          });
        });

        callback();
      }
    });

    if (prefs.meta) {
      chrome.scripting.executeScript({
        target: {
          tabId: tab.id
        },
        files: ['/data/meta.js']
      }).then(() => setTimeout(() => {
        next(() => chrome.scripting.executeScript({
          target: {
            tabId: tab.id
          },
          func: () => [...document.querySelectorAll('.save-as-mhtml')].forEach(f => f.remove())
        }));
      })).catch(() => next());
    }
    else {
      next();
    }
  });
};
chrome.action.onClicked.addListener(onClicked);

{
  const build = () => chrome.storage.local.get({
    'meta': false,
    'blob': true,
    'save-cm': false,
    'edit-cm': false
  }, prefs => {
    chrome.contextMenus.create({
      id: 'edit-page',
      title: 'Toggle Edit Mode',
      contexts: ['action']
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      id: 'meta',
      title: 'Add Meta Data',
      contexts: ['action'],
      type: 'checkbox',
      checked: prefs.meta
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      id: 'blob',
      title: 'Replace "blob:" resources',
      contexts: ['action'],
      type: 'checkbox',
      checked: prefs.blob
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      id: 'reader-view',
      title: 'Reader View (declutter)',
      contexts: ['action']
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      id: 'simplify',
      title: 'Keep Selection Only',
      contexts: ['action']
    }, () => chrome.runtime.lastError);
    if (prefs['save-cm']) {
      chrome.contextMenus.create({
        id: 'save-cm',
        title: 'Save as MHTML',
        contexts: ['page']
      }, () => chrome.runtime.lastError);
    }
    else {
      chrome.contextMenus.remove('save-cm', () => chrome.runtime.lastError);
    }
    if (prefs['edit-cm']) {
      chrome.contextMenus.create({
        id: 'edit-cm',
        title: 'Toggle Edit Mode',
        contexts: ['page']
      }, () => chrome.runtime.lastError);
    }
    else {
      chrome.contextMenus.remove('edit-cm', () => chrome.runtime.lastError);
    }
  });
  chrome.runtime.onInstalled.addListener(build);
  chrome.runtime.onStartup.addListener(build);

  chrome.storage.onChanged.addListener(ps => {
    if (ps['save-cm'] || ps['edit-cm']) {
      build();
    }
  });
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
          files: ['/data/toolbar/inject.js']
        });
      }
      else {
        chrome.tabs.sendMessage(tab.id, {
          method: 'unload'
        }, () => chrome.runtime.lastError);
      }
      chrome.action.setIcon({
        tabId: tab.id,
        path: {
          '16': '/data/icons/' + (result === 'on' ? 'active/' : '') + '16.png',
          '32': '/data/icons/' + (result === 'on' ? 'active/' : '') + '32.png',
          '48': '/data/icons/' + (result === 'on' ? 'active/' : '') + '48.png'
        }
      });
    }
    catch (e) {
      notify(e);
    }
  };
  next();
};

const context = (info, tab) => {
  if (info.menuItemId === 'edit-page' || info.menuItemId === 'edit-cm') {
    onCommand(tab);
  }
  else if (info.menuItemId === 'save-cm') {
    onClicked(tab);
  }
  else if (info.menuItemId === 'reader-view') {
    chrome.scripting.executeScript({
      target: {
        tabId: tab.id
      },
      files: ['/data/reader-view/Readability.js']
    }).then(() => chrome.scripting.executeScript({
      target: {
        tabId: tab.id
      },
      func: () => {
        const article = new window.Readability(document.cloneNode(true)).parse();

        const dom = (new DOMParser()).parseFromString(article.content, `text/html`);
        const title = document.title;
        document.head.replaceWith(dom.querySelector('head'));
        document.body.replaceWith(dom.querySelector('body'));
        document.title = title;
      }
    }));
  }
  else if (info.menuItemId === 'simplify') {
    chrome.scripting.executeScript({
      target: {
        tabId: tab.id
      },
      files: ['/data/simple.js']
    }).catch(notify);
  }
  else if (info.menuItemId === 'meta') {
    chrome.storage.local.set({
      [info.menuItemId]: info.checked
    });
  }
  else if (info.menuItemId === 'blob') {
    chrome.storage.local.set({
      [info.menuItemId]: info.checked
    });
  }
};
chrome.contextMenus.onClicked.addListener(context);
chrome.commands.onCommand.addListener((menuItemId, tab) => context({
  menuItemId
}, tab));

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
  else if (request.method === 'download') {
    download(request, response);
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
