const args = new URLSearchParams(location.search);
const tabId = Number(args.get('id'));

const notify = e => chrome.runtime.sendMessage({
  method: 'notify',
  message: e.message || e
});

chrome.storage.local.get({
  'blob': true,
  'meta': false,
  'notify': true,
  'saveAs': false,
  'filename': '',
  'extension': 'mht',
  'mime': 'application/x-mimearchive',
  'hint': true
}, prefs => {
  const next = callback => chrome.pageCapture.saveAsMHTML({
    tabId: tabId
  }, async bin => {
    let content = (await bin.text());

    // remove blob references
    if (prefs.blob) {
      content.replace(/Content-Location: (blob:https?:\/\/[^\s]+)/g, (a, href) => {
        const r = new RegExp(href.split('').join('(=\\r\\n)?'), 'g');
        content = content.replace(r, href.replace('blob:', 'cid:blob.'));
      });
    }

    const blob = new Blob([content], {
      type: prefs.mime
    });
    const lastError = chrome.runtime.lastError;
    if (lastError) {
      return prefs.notify && notify(lastError);
    }
    if (prefs.hint) {
      notify('You can edit the page before saving as MHTML. To open the editor use right-click context menu of the toolbar button');
      chrome.storage.local.set({
        'hint': false
      });
    }
    const n = new URL(args.get('href'));
    const url = URL.createObjectURL(blob);
    const current = new Date();
    let filename = (prefs.filename || '[[simplified-hostname]] [YYYY].[MM].[DD]—[title]')
      .replace('[title]', args.get('title'))
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

    chrome.downloads.download({
      url,
      saveAs: prefs.saveAs,
      filename
    }, () => {
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
  const closing = () => {
    document.title = 'Done!';
    setTimeout(() => window.close(), 1000);
  };

  if (prefs.meta) {
    chrome.scripting.executeScript({
      target: {
        tabId
      },
      files: ['data/meta.js']
    }).then(() => setTimeout(() => {
      next(() => chrome.scripting.executeScript({
        target: {
          tabId
        },
        function() {
          [...document.querySelectorAll('.save-as-mhtml')].forEach(f => f.remove());
        }
      }).then(() => closing()));
    }, 0)).catch(() => next(() => closing()));
  }
  else {
    next(() => closing());
  }
});
