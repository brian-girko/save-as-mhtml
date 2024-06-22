'use strict';

const notify = (e, timeout = 3000) => chrome.notifications.create({
  type: 'basic',
  iconUrl: '/data/icons/48.png',
  title: chrome.runtime.getManifest().name,
  message: e.message || e
}, id => {
  if (timeout > 0) {
    setTimeout(() => chrome.notifications.clear(id), timeout);
  }
});

const download = ({url, prefs, filename}, done) => {
  const options = {
    url,
    saveAs: prefs.saveAs,
    filename
  };
  chrome.downloads.download(options, id => {
    const lastError = chrome.runtime.lastError;

    if (lastError) {
      console.warn('filename issue', filename);
      filename = download.sanitize(filename, prefs.extension);

      chrome.downloads.download({
        url,
        saveAs: prefs.saveAs,
        filename
      }, id => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          console.warn('FILENAME_ISSUE', filename, lastError);
          chrome.downloads.download({
            ...options,
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
// Define a function to sanitize and adjust the filename based on OS
download.sanitize = (filename, extension) => {
  // Define regex patterns for invalid characters based on OS
  let invalidChars;
  if (navigator.userAgent.includes('Mac')) {
    invalidChars = /[:]/g;
  }
  else if (navigator.userAgent.includes('Linux')) {
    invalidChars = /[/]/g;
  }
  else {
    // Default to Windows invalid characters if OS cannot be determined
    invalidChars = /[\\/:*?"<>|]/g;
  }

  // Remove the existing extension
  const baseName = filename.substr(0, filename.length - extension.length - 1);

  // Ensure the filename length does not exceed 255 characters minus extension length
  const maxBaseNameLength = 255 - extension.length - 1;
  const truncatedBaseName = baseName.substr(0, maxBaseNameLength);

  // Replace invalid characters with a hyphen
  const sanitizedBaseName = truncatedBaseName.replace(invalidChars, '-');

  return sanitizedBaseName + '.' + extension;
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
        notify('You can edit the page before saving as MHTML. To open the editor use right-click context menu of the toolbar button', -1);
        notify('If the result misses an image, scroll to the end of the page and retry!', -1);
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

        const blob = new Blob([content], {
          type: prefs.mime
        });
        const reader = new FileReader();
        reader.onload = e => {
          download({
            url: e.target.result,
            prefs,
            filename
          }, callback);
        };
        reader.readAsDataURL(blob);
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
    'save-cm': true,
    'edit-cm': false,
    'reader-cm': false,
    'simple-cm': false
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
    if (prefs['reader-cm']) {
      chrome.contextMenus.create({
        id: 'reader-cm',
        title: 'Reader View (declutter)',
        contexts: ['page']
      }, () => chrome.runtime.lastError);
    }
    else {
      chrome.contextMenus.remove('reader-cm', () => chrome.runtime.lastError);
    }
    if (prefs['simple-cm']) {
      chrome.contextMenus.create({
        id: 'simple-cm',
        title: 'Keep Selection Only',
        contexts: ['selection']
      }, () => chrome.runtime.lastError);
    }
    else {
      chrome.contextMenus.remove('simple-cm', () => chrome.runtime.lastError);
    }
  });
  chrome.runtime.onInstalled.addListener(build);
  chrome.runtime.onStartup.addListener(build);

  chrome.storage.onChanged.addListener(ps => {
    if (ps['save-cm'] || ps['edit-cm'] || ps['reader-cm']) {
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
  else if (info.menuItemId === 'reader-view' || info.menuItemId === 'reader-cm') {
    chrome.storage.local.get({
      'custom-styling': `body {
  font-size: 14px;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif;
  color: #666
  background-color: #fff;
  width: min(100% - 2rem, 70rem);
  margin-inline: auto;
}`
    }, prefs => {
      chrome.scripting.executeScript({
        target: {
          tabId: tab.id
        },
        files: ['/data/reader-view/Readability.js']
      }).then(() => chrome.scripting.executeScript({
        target: {
          tabId: tab.id
        },
        func: css => {
          const article = new window.Readability(document.cloneNode(true)).parse();

          const dom = (new DOMParser()).parseFromString(article.content, `text/html`);
          const title = document.title;
          document.head.replaceWith(dom.querySelector('head'));
          document.body.replaceWith(dom.querySelector('body'));
          if (css) {
            const style = document.createElement('style');
            style.textContent = css;
            document.head.append(style);
          }
          document.title = title;
        },
        args: [prefs['custom-styling']]
      })).catch(notify);
    });
  }
  else if (info.menuItemId === 'simplify' || info.menuItemId === 'simple-cm') {
    chrome.storage.local.get({
      'custom-styling': `body {
  font-size: 14px;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif;
  color: #666
  background-color: #fff;
  width: min(100% - 2rem, 70rem);
  margin-inline: auto;
}`
    }, prefs => {
      chrome.scripting.executeScript({
        target: {
          tabId: tab.id
        },
        files: ['/data/simple.js']
      }).then(r => {
        if (r && r[0]) {
          if (r[0].result === 'converted') {
            return chrome.scripting.executeScript({
              target: {
                tabId: tab.id
              },
              func: css => {
                if (css) {
                  const style = document.createElement('style');
                  style.textContent = css;
                  document.querySelector('body').append(style);
                }
              },
              args: [prefs['custom-styling']]
            });
          }
          else {
            notify(r[0].result || 'Unknown Error');
          }
        }
      }).catch(notify);
    });
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
            tabs.query({active: true, lastFocusedWindow: true}, tbs => tabs.create({
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
