/* Kiosk API Client */
const API_BASE = window.location.origin + '/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE;
    this.token = localStorage.getItem('eva_token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('eva_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('eva_token');
  }

  async request(method, path, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (this.token) opts.headers['Authorization'] = `Bearer ${this.token}`;
    if (body) opts.body = JSON.stringify(body);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, opts);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    } catch (err) {
      // Queue for offline sync
      if (!navigator.onLine && method !== 'GET') {
        this.queueOffline(method, path, body);
        return { offline: true, queued: true };
      }
      throw err;
    }
  }

  queueOffline(method, path, body) {
    const queue = JSON.parse(localStorage.getItem('eva_offline_queue') || '[]');
    queue.push({ method, path, body, timestamp: Date.now() });
    localStorage.setItem('eva_offline_queue', JSON.stringify(queue));
  }

  async syncOfflineQueue() {
    const queue = JSON.parse(localStorage.getItem('eva_offline_queue') || '[]');
    if (queue.length === 0) return { synced: 0 };

    const results = { synced: 0, errors: [] };
    const remaining = [];

    for (const item of queue) {
      try {
        await this.request(item.method, item.path, item.body);
        results.synced++;
      } catch (err) {
        results.errors.push({ item, error: err.message });
        remaining.push(item);
      }
    }

    localStorage.setItem('eva_offline_queue', JSON.stringify(remaining));
    return results;
  }

  // Convenience methods
  get(path) { return this.request('GET', path); }
  post(path, body) { return this.request('POST', path, body); }
  put(path, body) { return this.request('PUT', path, body); }
  del(path) { return this.request('DELETE', path); }

  // Domain-specific shortcuts
  auth = {
    workerPin: (pin) => this.post('/auth/worker-pin', { pin }),
    verify: () => this.get('/auth/verify')
  };

  shifts = {
    list: (params) => this.get(`/shifts?${new URLSearchParams(params)}`),
    get: (id) => this.get(`/shifts/${id}`),
    start: (data) => this.post('/shifts', data),
    end: (id) => this.put(`/shifts/${id}/end`),
    checkin: (id, data) => this.post(`/shifts/${id}/checkin`, data),
    logout: (id, workerId) => this.put(`/shifts/${id}/logout/${workerId}`),
    reassign: (id, data) => this.put(`/shifts/${id}/reassign`, data),
    roster: (id) => this.get(`/shifts/${id}/roster`)
  };

  stations = {
    list: (lineId) => this.get(`/stations?line_id=${lineId}`),
    get: (id) => this.get(`/stations/${id}`)
  };

  cycles = {
    list: (params) => this.get(`/cycles?${new URLSearchParams(params)}`),
    create: (data) => this.post('/cycles', data),
    last: (stationId) => this.get(`/cycles/last/${stationId}`)
  };

  evaMixes = {
    list: (params) => this.get(`/eva-mixes?${new URLSearchParams(params)}`),
    create: (data) => this.post('/eva-mixes', data)
  };

  defects = {
    list: (params) => this.get(`/defects?${new URLSearchParams(params)}`),
    create: (data) => this.post('/defects', data),
    types: () => this.get('/defects/types')
  };

  downtime = {
    list: (params) => this.get(`/downtime?${new URLSearchParams(params)}`),
    start: (data) => this.post('/downtime', data),
    end: (id) => this.put(`/downtime/${id}/end`),
    types: () => this.get('/downtime/types')
  };

  breaks = {
    list: (params) => this.get(`/breaks?${new URLSearchParams(params)}`),
    start: (data) => this.post('/breaks', data),
    end: (id) => this.put(`/breaks/${id}/end`),
    endMeal: (lineId, shiftId) => this.put(`/breaks/end-meal/${lineId}/${shiftId}`),
    types: () => this.get('/breaks/types')
  };

  workers = {
    list: () => this.get('/workers?is_active=1')
  };

  recipes = {
    list: (params) => this.get(`/recipes?${new URLSearchParams(params)}`),
    lookup: (data) => this.post('/recipes/lookup', data)
  };

  assignments = {
    list: (lineId) => this.get(`/mold-assignments?line_id=${lineId}`),
    byStation: (stationId) => this.get(`/mold-assignments?station_id=${stationId}`)
  };
}

const api = new ApiClient();

export { api };
