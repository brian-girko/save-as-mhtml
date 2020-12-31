'use strict';

[...document.querySelectorAll('.edit-toolbar')].forEach(e => e.remove());
{
  const iframe = document.createElement('iframe');

  const unload = (report = true) => {
    window.onmessage = '';
    iframe.remove();
    chrome.runtime.onMessage.removeListener(onmessage);
    if (report) {
      chrome.runtime.sendMessage({
        method: 'close-me'
      });
    }
  };

  window.onmessage = e => {
    const command = e.data.method;
    const stop = () => {
      e.preventDefault();
      e.stopPropagation();
    };

    if (
      command === 'bold' || command === 'italic' || command === 'insertorderedlist' || command === 'removeformat' ||
      command === 'insertunorderedlist' || command === 'indent' || command === 'outdent'
    ) {
      document.execCommand(command);
      stop();
    }
    else if (command === 'link') {
      const href = prompt('Enter a URL (keep blank to remove link):', '');
      if (href) {
        document.execCommand('createlink', false, href);
      }
      else {
        document.execCommand('unlink');
      }
      stop();
    }
    else if (command === 'insertimage') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = () => {
          document.execCommand('insertimage', false, reader.result);
        };
        if (file) {
          reader.readAsDataURL(file);
        }
      };
      input.click();

      stop();
    }
    else if (command === 'heading-0') {
      document.execCommand('formatBlock', false, 'p');
      stop();
    }
    else if (command === 'heading-1') {
      document.execCommand('formatBlock', false, 'h1');
      stop();
    }
    else if (command === 'heading-2') {
      document.execCommand('formatBlock', false, 'h2');
      stop();
    }
    else if (command === 'heading-3') {
      document.execCommand('formatBlock', false, 'h3');
      stop();
    }
    else if (command === 'blockquote') {
      document.execCommand('formatBlock', false, 'blockquote');
      stop();
    }
    else if (command === 'move') {
      iframe.style.left = (parseInt(iframe.style.left) + e.data.data.dx) + 'px';
      iframe.style.top = (parseInt(iframe.style.top) + e.data.data.dy) + 'px';
      stop();
    }
    else if (command === 'close') {
      unload();
      stop();
    }
  };

  iframe.src = chrome.runtime.getURL('/data/toolbar/index.html');
  iframe.classList.add('edit-toolbar');
  iframe.style = `
    z-index: 1000000000000;
    position: fixed;
    top: 10px;
    left: 10px;
    width: 476px;
    height: 38px;
    border: none;
  `;
  document.documentElement.appendChild(iframe);

  const onmessage = request => {
    if (request.method === 'unload') {
      unload(false);
    }
  };

  chrome.runtime.onMessage.addListener(onmessage);
}
