/* Admin API Client */
const API_BASE = '/api';

class AdminApi {
  constructor() {
    this.baseUrl = API_BASE;
    this.token = localStorage.getItem('eva_admin_token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('eva_admin_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('eva_admin_token');
  }

  async request(method, path, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (this.token) opts.headers['Authorization'] = `Bearer ${this.token}`;
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${this.baseUrl}${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  get(path) { return this.request('GET', path); }
  post(path, body) { return this.request('POST', path, body); }
  put(path, body) { return this.request('PUT', path, body); }
  del(path) { return this.request('DELETE', path); }
}

const api = new AdminApi();

export { api };
