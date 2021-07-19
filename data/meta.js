[...document.querySelectorAll('.save-as-mhtml')].forEach(f => f.remove());
chrome.storage.local.get({
  inlcudes: ['href', 'title', 'date']
}, prefs => chrome.runtime.sendMessage({
  method: 'introduce'
}, response => {
  const div = document.createElement('div');
  div.classList.add('save-as-mhtml');
  div.style = `
    position: sticky;
    margin: 0;
    border: none;
    border-bottom: dashed 1px #ccc;
    display: grid;
    grid-gap: 5px;
    grid-template-columns: min-content 1fr;
    padding: 10px !important;
    z-index: 1000000000000;
    background-color: #fff;
    font-size: 13px;
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
    width: 100vw;
    direction: ltr;
  `;
  const shadow = div.attachShadow({mode: 'open'});

  for (const key of prefs.inlcudes) {
    if (key === 'date') {
      shadow.appendChild(Object.assign(document.createElement('span'), {
        textContent: 'Date'
      }));
      const d = new Date();
      shadow.appendChild(Object.assign(document.createElement('time'), {
        datetime: d.toISOString(),
        textContent: d.toLocaleString()
      }));
    }
    else if (key === 'title') {
      shadow.appendChild(Object.assign(document.createElement('span'), {
        textContent: 'Title'
      }));
      shadow.appendChild(Object.assign(document.createElement('span'), {
        textContent: response.title
      }));
    }
    else if (key === 'href') {
      shadow.appendChild(Object.assign(document.createElement('span'), {
        textContent: 'Link'
      }));
      const a = document.createElement('a');
      a.href = response.href;
      a.textContent = response.href;
      shadow.appendChild(a);
    }
  }

  document.body.insertBefore(div, document.body.firstChild);
}));
