/* Local Storage DB for offline support */
class LocalDB {
  constructor(prefix = 'eva_') {
    this.prefix = prefix;
  }

  _key(k) { return this.prefix + k; }

  set(key, value) {
    localStorage.setItem(this._key(key), JSON.stringify(value));
  }

  get(key, defaultValue = null) {
    const raw = localStorage.getItem(this._key(key));
    return raw ? JSON.parse(raw) : defaultValue;
  }

  remove(key) {
    localStorage.removeItem(this._key(key));
  }

  // Current session data
  get lineId() { return this.get('lineId'); }
  set lineId(v) { this.set('lineId', v); }

  get shiftId() { return this.get('shiftId'); }
  set shiftId(v) { this.set('shiftId', v); }

  get team() { return this.get('team', []); }
  set team(v) { this.set('team', v); }

  get selectedStation() { return this.get('selectedStation'); }
  set selectedStation(v) { this.set('selectedStation', v); }

  get cycleCounts() { return this.get('cycleCounts', {}); }
  set cycleCounts(v) { this.set('cycleCounts', v); }

  get lastTemps() { return this.get('lastTemps', {}); }
  set lastTemps(v) { this.set('lastTemps', v); }

  get mealBreakActive() { return this.get('mealBreakActive', false); }
  set mealBreakActive(v) { this.set('mealBreakActive', v); }

  get mealBreakId() { return this.get('mealBreakId'); }
  set mealBreakId(v) { this.set('mealBreakId', v); }

  get workerBreaks() { return this.get('workerBreaks', {}); }
  set workerBreaks(v) { this.set('workerBreaks', v); }

  // Cached server data
  get stations() { return this.get('stations', []); }
  set stations(v) { this.set('stations', v); }

  get assignments() { return this.get('assignments', []); }
  set assignments(v) { this.set('assignments', v); }

  get workers() { return this.get('workers', []); }
  set workers(v) { this.set('workers', v); }

  get defectTypes() { return this.get('defectTypes', []); }
  set defectTypes(v) { this.set('defectTypes', v); }

  get downtimeTypes() { return this.get('downtimeTypes', []); }
  set downtimeTypes(v) { this.set('downtimeTypes', v); }

  get breakTypes() { return this.get('breakTypes', []); }
  set breakTypes(v) { this.set('breakTypes', v); }

  get recipes() { return this.get('recipes', []); }
  set recipes(v) { this.set('recipes', v); }

  // Increment cycle count for a station
  incrementCycle(stationId) {
    const counts = this.cycleCounts;
    counts[stationId] = (counts[stationId] || 0) + 1;
    this.cycleCounts = counts;
    return counts[stationId];
  }

  // Set break for worker
  setWorkerBreak(workerId, breakId) {
    const breaks = this.workerBreaks;
    breaks[workerId] = breakId;
    this.workerBreaks = breaks;
  }

  clearWorkerBreak(workerId) {
    const breaks = this.workerBreaks;
    delete breaks[workerId];
    this.workerBreaks = breaks;
  }

  // Clear session
  clearSession() {
    this.remove('shiftId');
    this.remove('team');
    this.remove('selectedStation');
    this.remove('cycleCounts');
    this.remove('mealBreakActive');
    this.remove('mealBreakId');
    this.remove('workerBreaks');
  }
}

const db = new LocalDB();

export { db };
