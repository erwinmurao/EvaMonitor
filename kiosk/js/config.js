/* Server URL Configuration */
const STORAGE_KEY = 'eva_server_url';

const serverConfig = {
  /** Get the saved server URL, or null if not set */
  getUrl() {
    return localStorage.getItem(STORAGE_KEY) || null;
  },

  /** Save a new server URL */
  setUrl(url) {
    url = url.trim().replace(/\/+$/, '');
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url;
    }
    localStorage.setItem(STORAGE_KEY, url);
    return url;
  },

  /** Clear the saved server URL */
  clearUrl() {
    localStorage.removeItem(STORAGE_KEY);
  },

  /** Test connection to a server URL */
  async testConnection(url) {
    url = url.trim().replace(/\/+$/, '');
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url;
    }
    const res = await fetch(url + '/api/health', { method: 'GET', mode: 'cors' });
    if (!res.ok) throw new Error('Server returned ' + res.status);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error('Invalid server response');
    return data;
  },

  /** Check if running inside Capacitor (native Android) */
  isNative() {
    return typeof window.Capacitor !== 'undefined';
  },

  /** Disconnect: clear URL and return to bootstrap */
  disconnect() {
    this.clearUrl();
    // Navigate back to bootstrap (file:// origin)
    window.location.href = 'index.html';
  }
};

export { serverConfig };
