{
  const div = document.createElement('div');
  div.classList.add('save-as-mhtml');
  div.style = `
    all: initial;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    margin: 0 !important;
    border: none !important;
    border-bottom: dashed 1px #ccc !important;
    display: grid !important;
    grid-gap: 5px !important;
    grid-template-columns: min-content 1fr !important;
    padding: 10px !important;
    z-index: calc(Infinity) !important;
    font-size: 13px !important;
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif !important;
    color: #4d5156 !important;
    background-color: #fff !important;
  `;
  const shadow = div.attachShadow({mode: 'open'});

  for (const key of self.prefs.inlcudes) {
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
        textContent: self.config.title
      }));
    }
    else if (key === 'href') {
      shadow.appendChild(Object.assign(document.createElement('span'), {
        textContent: 'Link'
      }));
      const a = document.createElement('a');
      a.href = self.config.href;
      a.textContent = self.config.href;
      a.style.color = '#5567c7';
      shadow.appendChild(a);
    }
  }
  document.documentElement.append(div);
}
