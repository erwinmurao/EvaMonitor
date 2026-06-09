/* Server Config Screen */
import { serverConfig } from '../config.js';
import { showToast } from '../utils/toast.js';

export function render() {
  const currentUrl = serverConfig.getUrl() || '';
  return `
    <div class="screen server-config-screen" id="screen-server-config">
      <div class="server-config-card">
        <div class="server-config-logo">E</div>
        <h2 class="server-config-title">Server Configuration</h2>
        <p class="server-config-subtitle">Enter the EVA Monitor server address</p>

        <div class="server-config-form">
          <div class="server-config-field">
            <label for="cfg-server-url">Server URL</label>
            <input type="text" id="cfg-server-url" value="${currentUrl}"
              placeholder="http://192.168.1.100:3000"
              autocomplete="off" autocapitalize="off" spellcheck="false">
            <p class="server-config-hint">IP address and port of the server on your network</p>
          </div>

          <div class="server-config-actions">
            <button class="btn btn-primary btn-lg" id="cfg-btn-connect">
              <span class="btn-label">Connect & Save</span>
              <span class="btn-loading" style="display:none">Testing...</span>
            </button>
            ${currentUrl ? '<button class="btn btn-secondary" id="cfg-btn-cancel">Cancel</button>' : ''}
          </div>

          <p class="server-config-error" id="cfg-error"></p>
        </div>

        ${currentUrl ? `
        <div class="server-config-current">
          <p>Currently connected to: <strong>${currentUrl}</strong></p>
          <button class="btn btn-danger btn-sm" id="cfg-btn-disconnect">Disconnect</button>
        </div>
        ` : ''}
      </div>
    </div>
  `;
}

export async function init() {
  const input = document.getElementById('cfg-server-url');
  const btn = document.getElementById('cfg-btn-connect');
  const errorEl = document.getElementById('cfg-error');
  const btnLabel = btn.querySelector('.btn-label');
  const btnLoading = btn.querySelector('.btn-loading');
  const cancelBtn = document.getElementById('cfg-btn-cancel');
  const disconnectBtn = document.getElementById('cfg-btn-disconnect');

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.add('visible');
    btn.disabled = false;
    btnLabel.style.display = '';
    btnLoading.style.display = 'none';
  }

  async function connect() {
    const url = input.value.trim();
    if (!url) { showError('Please enter a server URL'); return; }

    errorEl.classList.remove('visible');
    btn.disabled = true;
    btnLabel.style.display = 'none';
    btnLoading.style.display = '';

    try {
      await serverConfig.testConnection(url);
      const savedUrl = serverConfig.setUrl(url);
      showToast('Connected to ' + savedUrl);
      // Reload the page to use new server URL
      window.location.href = savedUrl + '/kiosk/';
    } catch (err) {
      showError('Cannot connect: ' + err.message);
    }
  }

  btn.addEventListener('click', connect);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') connect();
  });

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      window.App.navigate('shift-start');
    });
  }

  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', () => {
      if (confirm('Disconnect from server and return to setup?')) {
        serverConfig.disconnect();
      }
    });
  }

  input.focus();
}
