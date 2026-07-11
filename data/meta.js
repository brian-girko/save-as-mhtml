{
  const div = document.createElement('div');
  div.classList.add('save-as-mhtml');
  div.style = `all: initial;`;
  const shadow = div.attachShadow({mode: 'open'});
  const p = document.createElement('div');
  p.style = `
    display: grid;
    grid-template-columns: min-content 1fr;
    grid-gap: 10px;
    position: sticky;
    top: 0;
    z-index: 2147483647;
    box-sizing: border-box;
    width: 100%;
    padding: 10px;
    border-bottom: 1px dashed #ccc;
    background: white;
    font: 13px Arial, sans-serif;
    color: #4d5156;
    direction: ltr;
  `;
  shadow.appendChild(p);

  for (const key of self.prefs.inlcudes) {
    if (key === 'date') {
      p.appendChild(Object.assign(document.createElement('span'), {
        textContent: 'Date'
      }));
      const d = new Date();
      p.appendChild(Object.assign(document.createElement('time'), {
        datetime: d.toISOString(),
        textContent: d.toLocaleString()
      }));
    }
    else if (key === 'title') {
      p.appendChild(Object.assign(document.createElement('span'), {
        textContent: 'Title'
      }));
      p.appendChild(Object.assign(document.createElement('span'), {
        textContent: self.config.title
      }));
    }
    else if (key === 'href') {
      p.appendChild(Object.assign(document.createElement('span'), {
        textContent: 'Link'
      }));
      const a = document.createElement('a');
      a.href = self.config.href;
      a.textContent = self.config.href;
      a.style = `
        color: #5567c7;
        word-break: break-all;
        white-space: break-spaces;
      `;
      p.appendChild(a);
    }
  }
  // document.documentElement.append(div);
  document.documentElement.insertBefore(div, document.body);
}
